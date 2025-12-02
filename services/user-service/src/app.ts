import express from "express";
import userRoutes from "./routes/user.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import prRoutes from "./modules/pull-requests/pr.routes";

const app = express();

app.use(express.json());
app.use("/users", userRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/pull-requests", prRoutes);

export default app;
