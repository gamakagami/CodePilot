import express from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import gatewayRoutes from "./routes/index";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());



  app.get("/health", (req, res) => {
  res.json({ status: "gateway ok" });
});

  app.use("/api", gatewayRoutes);


  app.use(errorHandler);

  return app;
}
