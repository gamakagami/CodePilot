import express from "express";
import cors from "cors";
import { reviewController } from "./controllers/review.controller";

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for large code

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "review-service ok" });
});

// Main review endpoint
app.post("/review", reviewController.generateReview);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error"
  });
});