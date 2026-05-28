import "dotenv/config";
import { createApp } from "./app";
import { initDb } from "./services/db";

const port = Number(process.env.PORT || 4000);
const app = createApp();

async function bootstrap() {
  await initDb();
  app.listen(port, () => {
    console.log(`Multi-tenant RAG API running on port ${port}`);
  });
}

void bootstrap();
