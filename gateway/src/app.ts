import express from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";

import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.routes";
import llmRoutes from "./routes/llm.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use("/auth", authRoutes);
  app.use("/projects", projectRoutes);
  app.use("/tasks", taskRoutes);
  app.use("/llm", llmRoutes);

  app.get("/health", (req, res) => {
  res.json({ status: "gateway ok" });
});


  app.use(errorHandler);

  return app;
}
