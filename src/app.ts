import "dotenv/config";
import express from "express";
import { apiRouter } from "./api/routes";
import { errorHandler, notFound } from "./middleware/errors";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
