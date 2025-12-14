import express from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import parseRouter from "./modules/parse/parser.routes";
import embedRouter from "./modules/embeddings/embed.routes";
import graphRouter from "./modules/graph/graph.routes";
import analysisRouter from "./modules/analysis/analysis.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));


  app.get("/health", (_req, res) => {
    res.json({ status: "code-analysis-service ok" });
  });

  app.use("/parse", parseRouter);
  app.use("/embeddings", embedRouter);
  app.use("/graph", graphRouter);
  app.use("/analysis", analysisRouter);

  return app;
}
