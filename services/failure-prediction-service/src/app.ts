import express from "express";
import bodyParser from "body-parser";
import predictionRouter from "./modules/prediction/prediction.routes";
import errorHandler from "./middleware/errorHandler";

const app = express();

app.use(bodyParser.json({ limit: '10mb' })); // Increase limit for large codebase context

app.use("/predict", predictionRouter);

app.use(errorHandler);

export default app;