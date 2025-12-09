import express from "express";
import userRoutes from "./routes/user.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";

const app = express();

app.use(express.json());
app.use("/users", userRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/analytics", analyticsRoutes);

export default app;
