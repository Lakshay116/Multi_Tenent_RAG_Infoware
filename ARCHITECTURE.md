# Multi-Tenant RAG Backend Architecture

## 1. Goal
Build a Retrieval-Augmented Generation backend where each tenant can upload and query only its own knowledge base, with strong isolation and guardrails.

## 2. High-Level Components
- API Layer (`src/api/routes.ts`)
  - Exposes tenant, document, and query endpoints.
  - Validates request payloads (`zod`).
- Middleware Layer (`src/middleware/*`)
  - Async error wrapping.
  - Global error handling and 404 handling.
- RAG Layer (`src/rag/*`)
  - Chunking.
  - Embedding generation via OpenAI embeddings API.
  - Tenant-scoped vector retrieval via pgvector cosine search.
  - Answer generation via OpenAI chat model using retrieved context.
  - Guardrails (prompt-injection, out-of-scope, low-confidence fallback).
- Data Layer (`src/services/*`)
  - PostgreSQL connection pool.
  - DB initialization (tables + `pgvector` extension + indexes).
  - Repository methods for tenant/document/chunk operations.

## 3. Data Model
### `tenants`
- `id UUID PRIMARY KEY`
- `name TEXT`
- `created_at TIMESTAMPTZ`

### `documents`
- `id UUID PRIMARY KEY`
- `tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`
- `file_name TEXT`
- `raw_text TEXT`
- `created_at TIMESTAMPTZ`

### `chunks`
- `id UUID PRIMARY KEY`
- `tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`
- `document_id UUID REFERENCES documents(id) ON DELETE CASCADE`
- `chunk_text TEXT`
- `embedding VECTOR`

## 4. Tenant Isolation Strategy
- Every persisted row includes `tenant_id` where relevant.
- Reads and writes always include tenant scoping in SQL:
  - Document fetch/delete: `WHERE tenant_id = $1`
  - Chunk retrieval/search: `WHERE c.tenant_id = $1`
- Join between `chunks` and `documents` also enforces same tenant:
  - `JOIN documents d ON d.id = c.document_id AND d.tenant_id = c.tenant_id`
- Result: cross-tenant retrieval is blocked at query level.

## 5. Ingestion Flow
1. `POST /tenant/:tenantId/documents`
2. Validate tenant exists.
3. Save document row.
4. Chunk raw text.
5. Generate embeddings for each chunk using OpenAI embeddings model.
6. Save chunk rows with `tenant_id` and vector embedding.

## 6. Query Flow
1. `POST /tenant/:tenantId/query`
2. Validate tenant exists.
3. Run guardrails:
  - prompt injection
  - out-of-scope
4. Generate query embedding using OpenAI embeddings model.
5. Vector search in tenant-scoped chunks using pgvector cosine distance.
6. Send retrieved context + query to OpenAI chat model.
7. Return answer + source citations.
8. If confidence is below threshold, return safe fallback.

## 7. Guardrails
- Prompt injection keyword filter.
- Out-of-scope keyword filter.
- Low-confidence fallback when similarity confidence is weak.
- No cross-tenant data exposure due to mandatory tenant SQL filters.

## 8. Deployment Topology
- API container (Node.js)
- PostgreSQL container with `pgvector` image
- `docker-compose.yml` wires API and DB with internal network.

## 9. Current Limits and Planned Upgrades
- Current version uses keyword-based guardrails; can be upgraded with classifier-based checks.
- Planned:
  - JWT auth carrying tenant claims
  - File upload and PDF extraction pipeline
  - Broader integration tests (end-to-end API + DB)
  - Optional Redis caching and streaming responses
