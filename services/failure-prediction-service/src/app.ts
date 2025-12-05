import express from "express";
import bodyParser from "body-parser";
import predictionRoutes from "./modules/prediction/prediction.routes";
import predictionRouter from "./modules/prediction/prediction.routes";



const app = express();
app.use(bodyParser.json());

app.use("/predict", predictionRouter);

export default app;
