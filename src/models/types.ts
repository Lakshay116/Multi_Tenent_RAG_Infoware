export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  tenantId: string;
  fileName: string;
  rawText: string;
  createdAt: string;
}

export interface ChunkRecord {
  id: string;
  tenantId: string;
  documentId: string;
  chunkText: string;
  embedding: number[];
}

export interface QueryAnswer {
  answer: string;
  sources: Array<{
    documentId: string;
    chunkId: string;
    fileName: string;
    snippet: string;
    score: number;
  }>;
  confidence: number;
}
