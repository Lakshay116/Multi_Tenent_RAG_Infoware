import { Pool } from "pg";

const rawConnectionString =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/multi_tenant_rag";

function normalizeConnectionString(input: string): string {
  try {
    const url = new URL(input);
    // Prevent pg connection-string sslmode from overriding Pool ssl config.
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return input;
  }
}

const connectionString = normalizeConnectionString(rawConnectionString);

export const db = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function initDb(): Promise<void> {
  await db.query(`
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      chunk_text TEXT NOT NULL,
      embedding VECTOR NOT NULL
    );

    DROP INDEX IF EXISTS idx_chunks_embedding_cosine;

    ALTER TABLE chunks
    ALTER COLUMN embedding TYPE VECTOR;

    CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_tenant_id ON chunks(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
    -- NOTE:
    -- For high-dimension embedding models (for example 3072 dims),
    -- IVFFlat index compatibility can be limited. Keeping exact search
    -- avoids dimension/index conflicts during assignment demos.
  `);
}
