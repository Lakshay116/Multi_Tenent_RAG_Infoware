import { ChunkRecord, DocumentRecord, Tenant } from "../models/types";
import { db } from "./db";

function asPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function createTenant(tenant: Tenant): Promise<Tenant> {
  const result = await db.query(
    `INSERT INTO tenants (id, name, created_at)
     VALUES ($1, $2, $3)
     RETURNING id, name, created_at`,
    [tenant.id, tenant.name, tenant.createdAt]
  );
  const row = result.rows[0];
  return { id: row.id, name: row.name, createdAt: row.created_at.toISOString() };
}

export async function getTenant(tenantId: string): Promise<Tenant | undefined> {
  const result = await db.query(`SELECT id, name, created_at FROM tenants WHERE id = $1`, [tenantId]);
  if (result.rowCount === 0) return undefined;
  const row = result.rows[0];
  return { id: row.id, name: row.name, createdAt: row.created_at.toISOString() };
}

export async function saveDocument(document: DocumentRecord): Promise<DocumentRecord> {
  const result = await db.query(
    `INSERT INTO documents (id, tenant_id, file_name, raw_text, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, tenant_id, file_name, raw_text, created_at`,
    [document.id, document.tenantId, document.fileName, document.rawText, document.createdAt]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fileName: row.file_name,
    rawText: row.raw_text,
    createdAt: row.created_at.toISOString()
  };
}

export async function listDocumentsByTenant(tenantId: string): Promise<DocumentRecord[]> {
  const result = await db.query(
    `SELECT id, tenant_id, file_name, raw_text, created_at
     FROM documents
     WHERE tenant_id = $1
     ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    fileName: row.file_name,
    rawText: row.raw_text,
    createdAt: row.created_at.toISOString()
  }));
}

export async function getDocumentByTenant(
  tenantId: string,
  documentId: string
): Promise<DocumentRecord | undefined> {
  const result = await db.query(
    `SELECT id, tenant_id, file_name, raw_text, created_at
     FROM documents
     WHERE id = $1 AND tenant_id = $2`,
    [documentId, tenantId]
  );
  if (result.rowCount === 0) return undefined;
  const row = result.rows[0];
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fileName: row.file_name,
    rawText: row.raw_text,
    createdAt: row.created_at.toISOString()
  };
}

export async function deleteDocumentByTenant(tenantId: string, documentId: string): Promise<boolean> {
  const result = await db.query(`DELETE FROM documents WHERE id = $1 AND tenant_id = $2`, [documentId, tenantId]);
  return (result.rowCount ?? 0) > 0;
}

export async function saveChunks(chunks: ChunkRecord[]): Promise<void> {
  for (const chunk of chunks) {
    await db.query(
      `INSERT INTO chunks (id, tenant_id, document_id, chunk_text, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)`,
      [chunk.id, chunk.tenantId, chunk.documentId, chunk.chunkText, asPgVector(chunk.embedding)]
    );
  }
}

export async function listChunksByTenant(tenantId: string): Promise<ChunkRecord[]> {
  const result = await db.query(
    `SELECT id, tenant_id, document_id, chunk_text, embedding::text AS embedding_text
     FROM chunks
     WHERE tenant_id = $1`,
    [tenantId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    documentId: row.document_id,
    chunkText: row.chunk_text,
    embedding: row.embedding_text
      .slice(1, -1)
      .split(",")
      .map((n: string) => Number(n))
  }));
}

export async function searchTopChunksByTenant(
  tenantId: string,
  queryEmbedding: number[],
  limit = 4
): Promise<Array<{ chunk: ChunkRecord; score: number; fileName: string }>> {
  const result = await db.query(
    `SELECT
       c.id,
       c.tenant_id,
       c.document_id,
       c.chunk_text,
       c.embedding::text AS embedding_text,
       d.file_name,
       1 - (c.embedding <=> $2::vector) AS score
     FROM chunks c
     JOIN documents d ON d.id = c.document_id AND d.tenant_id = c.tenant_id
     WHERE c.tenant_id = $1
       AND vector_dims(c.embedding) = vector_dims($2::vector)
     ORDER BY c.embedding <=> $2::vector
     LIMIT $3`,
    [tenantId, asPgVector(queryEmbedding), limit]
  );

  return result.rows.map((row: any) => ({
    chunk: {
      id: row.id,
      tenantId: row.tenant_id,
      documentId: row.document_id,
      chunkText: row.chunk_text,
      embedding: row.embedding_text
        .slice(1, -1)
        .split(",")
        .map((n: string) => Number(n))
    },
    score: Number(row.score),
    fileName: row.file_name
  }));
}
