import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";

const PORT = process.env.PORT || 7000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 Orchestrator Service running on port ${PORT}`);
  console.log(`📊 Analysis: ${process.env.ANALYSIS_SERVICE_URL || 'http://localhost:5003'}`);
  console.log(`🎯 Prediction: ${process.env.PREDICTION_SERVICE_URL || 'http://localhost:5000'}`);
  console.log(`📝 Review: ${process.env.REVIEW_SERVICE_URL || 'http://localhost:6000'}`);
});