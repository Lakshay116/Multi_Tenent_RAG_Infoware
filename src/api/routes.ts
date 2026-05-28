import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { answerQuery, ingestDocument } from "../rag/ragService";
import { detectOutOfScopeQuery, detectPromptInjection, safeFallback } from "../rag/guardrails";
import { asyncHandler } from "../middleware/asyncHandler";
import { extractTextFromPdf } from "../services/pdf";
import {
  createTenant,
  deleteDocumentByTenant,
  getTenant,
  listDocumentsByTenant,
  saveDocument
} from "../services/repositories";

const createTenantSchema = z.object({
  name: z.string().min(2).max(100)
});

const uploadDocumentSchema = z.object({
  fileName: z.string().min(1),
  content: z.string().min(1)
});

const querySchema = z.object({
  query: z.string().min(2)
});

export const apiRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

apiRouter.post(
  "/tenant",
  asyncHandler(async (req, res) => {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenant = await createTenant({
    id: uuidv4(),
    name: parsed.data.name,
    createdAt: new Date().toISOString()
  });

  return res.status(201).json(tenant);
  })
);

apiRouter.get(
  "/tenant/:id",
  asyncHandler(async (req, res) => {
  const tenant = await getTenant(req.params.id);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });
  return res.json(tenant);
  })
);

apiRouter.post(
  "/tenant/:tenantId/documents",
  upload.single("file"),
  asyncHandler(async (req, res) => {
  const tenant = await getTenant(req.params.tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  let fileName = "";
  let content = "";

  if (req.file) {
    const isPdf = req.file.mimetype === "application/pdf" || req.file.originalname.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return res.status(400).json({ error: "Only PDF files are allowed in multipart upload." });
    }
    fileName = req.body.fileName || req.file.originalname;
    content = await extractTextFromPdf(req.file.buffer);
    if (!content) {
      return res.status(400).json({ error: "Could not extract text from PDF." });
    }
  } else {
    const parsed = uploadDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    fileName = parsed.data.fileName;
    content = parsed.data.content;
  }

  const document = await saveDocument({
    id: uuidv4(),
    tenantId: tenant.id,
    fileName,
    rawText: content,
    createdAt: new Date().toISOString()
  });

  const ingestion = await ingestDocument(tenant.id, document.id, document.rawText);
  return res.status(201).json({ document, ingestion });
  })
);

apiRouter.get(
  "/tenant/:tenantId/documents",
  asyncHandler(async (req, res) => {
  const tenant = await getTenant(req.params.tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  return res.json({
    tenantId: tenant.id,
    documents: await listDocumentsByTenant(tenant.id)
  });
  })
);

apiRouter.delete(
  "/tenant/:tenantId/documents/:documentId",
  asyncHandler(async (req, res) => {
  const tenant = await getTenant(req.params.tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const deleted = await deleteDocumentByTenant(tenant.id, req.params.documentId);
  if (!deleted) return res.status(404).json({ error: "Document not found for this tenant" });

  return res.status(204).send();
  })
);

apiRouter.post(
  "/tenant/:tenantId/query",
  asyncHandler(async (req, res) => {
  const tenant = await getTenant(req.params.tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const parsed = querySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const query = parsed.data.query;
  if (detectPromptInjection(query)) {
    return res.status(200).json(safeFallback("Unsafe query detected. Please ask a normal knowledge question."));
  }
  if (detectOutOfScopeQuery(query)) {
    return res.status(200).json(safeFallback("This question appears out of scope for uploaded tenant knowledge."));
  }

  const answer = await answerQuery(tenant.id, query);
  if (answer.confidence < 0.25) {
    return res.status(200).json(safeFallback("Low confidence answer. Please upload more relevant documents."));
  }

  return res.json(answer);
  })
);
