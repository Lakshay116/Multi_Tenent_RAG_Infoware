import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTenant: vi.fn(),
  listDocumentsByTenant: vi.fn(),
  answerQuery: vi.fn()
}));

vi.mock("../services/repositories", () => ({
  createTenant: vi.fn(),
  deleteDocumentByTenant: vi.fn(),
  getTenant: mocks.getTenant,
  listDocumentsByTenant: mocks.listDocumentsByTenant,
  saveDocument: vi.fn()
}));

vi.mock("../rag/ragService", () => ({
  ingestDocument: vi.fn(),
  answerQuery: mocks.answerQuery
}));

import { createApp } from "../app";

describe("api integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses tenantId from path when listing documents", async () => {
    mocks.getTenant.mockResolvedValue({
      id: "tenant-a",
      name: "Tenant A",
      createdAt: new Date().toISOString()
    });
    mocks.listDocumentsByTenant.mockResolvedValue([]);

    const app = createApp();
    const res = await request(app).get("/tenant/tenant-a/documents");

    expect(res.status).toBe(200);
    expect(mocks.getTenant).toHaveBeenCalledWith("tenant-a");
    expect(mocks.listDocumentsByTenant).toHaveBeenCalledWith("tenant-a");
  });

  it("returns 404 for unknown tenant on query", async () => {
    mocks.getTenant.mockResolvedValue(undefined);
    const app = createApp();

    const res = await request(app).post("/tenant/missing-tenant/query").send({
      query: "What is refund policy?"
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Tenant not found");
  });
});

