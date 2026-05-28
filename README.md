# Multi-Tenant RAG Backend (Node.js + TypeScript)

Backend API for a multi-tenant RAG system where each tenant can upload and query only its own knowledge, with guardrails and vector search.

## Stack

- Node.js + TypeScript
- Express
- PostgreSQL + `pgvector`
- Google Gemini API (Embeddings + LLM)
- Vitest

Note: Assignment mentions Fastify; this implementation uses Express with equivalent API behavior and isolation guarantees.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment in `.env`:

```env
PORT=4000
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<db>?sslmode=require
GEMINI_API_KEY=<your_gemini_api_key>
EMBEDDING_MODEL=gemini-embedding-001
CHAT_MODEL=gemini-2.5-flash
```

Note: keep `.env` secret values private.

3. Start the API:

```bash
npm run dev
```

Server: `http://localhost:4000`

## Database initialization

On startup, `initDb()` ensures:

- `vector` extension exists
- core tables are created
- vector indexes are created
- `chunks.embedding` is in `VECTOR` format for real model embeddings

## API Endpoints

Base URL: `http://localhost:4000`

1. `GET /health`
2. `POST /tenant`
3. `GET /tenant/:id`
4. `POST /tenant/:tenantId/documents`
5. `GET /tenant/:tenantId/documents`
6. `DELETE /tenant/:tenantId/documents/:documentId`
7. `POST /tenant/:tenantId/query`

### Example request bodies

`POST /tenant`

```json
{
  "name": "Infoware"
}
```

`POST /tenant/:tenantId/documents`

```json
{
  "fileName": "policy.txt",
  "content": "Refunds are allowed within 30 days with receipt."
}
```

`POST /tenant/:tenantId/documents` (PDF upload)

- Content-Type: `multipart/form-data`
- Form fields:
  - `file`: select a `.pdf` file
  - `fileName` (optional): custom document name

`POST /tenant/:tenantId/query`

```json
{
  "query": "What is the refund policy?"
}
```

## Guardrails

- Prompt injection keyword detection
- Out-of-scope query detection
- Low-confidence fallback response

## Tenant Isolation

- Every tenant-scoped query includes `tenant_id` filters.
- Retrieval joins enforce tenant consistency across tables.
- Cross-tenant document/query access is blocked by design.

## Tests

Run:

```bash
npm test
```

Current coverage focus:

- Guardrail behavior
- Tenant isolation SQL constraints in repositories

## Submission Checklist

1. Start service and confirm `GET /health`.
2. Create two tenants.
3. Upload different docs to each tenant.
4. Query tenant A and verify results only cite tenant A docs.
5. Query tenant B and verify results only cite tenant B docs.
