import express from "express";
import cors from "cors";
import { reviewController } from "./controllers/review.controller";

export const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.post("/generate-review", reviewController.generateReview);
