import express from "express";
import cors from "cors";
import helmet from "helmet";
import orchestratorRoutes from "./routes/orchestrator.routes";
import mongoose from "mongoose";

export function createApp() {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/codepilot";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));
  
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