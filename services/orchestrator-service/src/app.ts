import express from "express";
import cors from "cors";
import helmet from "helmet";
import orchestratorRoutes from "./routes/orchestrator.routes";

export function createApp() {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  
  app.get("/health", (req, res) => {
    res.json({ status: "orchestrator ok" });
  });
  
  app.use("/api", orchestratorRoutes);
  
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  });
  
  return app;
}