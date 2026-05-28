import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn()
}));

vi.mock("../services/db", () => ({
  db: {
    query: queryMock
  }
}));

import {
  deleteDocumentByTenant,
  getDocumentByTenant,
  listChunksByTenant,
  listDocumentsByTenant,
  searchTopChunksByTenant
} from "../services/repositories";

describe("repositories tenant isolation", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("listDocumentsByTenant filters by tenant_id", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await listDocumentsByTenant("tenant-1");
    expect(queryMock).toHaveBeenCalledOnce();
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("WHERE tenant_id = $1");
    expect(params).toEqual(["tenant-1"]);
  });

  it("getDocumentByTenant filters by document id and tenant_id", async () => {
    queryMock.mockResolvedValue({ rowCount: 0, rows: [] });
    await getDocumentByTenant("tenant-1", "doc-1");
    expect(queryMock).toHaveBeenCalledOnce();
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("WHERE id = $1 AND tenant_id = $2");
    expect(params).toEqual(["doc-1", "tenant-1"]);
  });

  it("deleteDocumentByTenant filters by tenant_id", async () => {
    queryMock.mockResolvedValue({ rowCount: 1, rows: [] });
    await deleteDocumentByTenant("tenant-1", "doc-1");
    expect(queryMock).toHaveBeenCalledOnce();
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("WHERE id = $1 AND tenant_id = $2");
    expect(params).toEqual(["doc-1", "tenant-1"]);
  });

  it("listChunksByTenant filters by tenant_id", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await listChunksByTenant("tenant-1");
    expect(queryMock).toHaveBeenCalledOnce();
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("WHERE tenant_id = $1");
    expect(params).toEqual(["tenant-1"]);
  });

  it("searchTopChunksByTenant filters and joins by tenant_id", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await searchTopChunksByTenant("tenant-1", [0.1, 0.2, 0.3], 4);
    expect(queryMock).toHaveBeenCalledOnce();
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("JOIN documents d ON d.id = c.document_id AND d.tenant_id = c.tenant_id");
    expect(sql).toContain("WHERE c.tenant_id = $1");
    expect(params[0]).toBe("tenant-1");
    expect(params[2]).toBe(4);
  });
});
