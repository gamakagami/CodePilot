import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import gatewayRoutes from "./routes";
import { errorHandler } from "./middleware/errorHandler";

console.log("ENV CHECK:", {
  AUTH: process.env.AUTH_SERVICE_URL,
  USER: process.env.USER_SERVICE_URL,
  JWT: process.env.JWT_SECRET,
});

const app = express();

app.use(helmet());
app.use(cors());

app.get("/health", (req, res) => {
  res.json({ status: "gateway ok" });
});

app.use("/api", gatewayRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
