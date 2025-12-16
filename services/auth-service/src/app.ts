import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import prisma from "./models/prisma";

const app = express();

app.use(cors());
app.use(express.json());

// Auth routes
app.use("/auth", authRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "auth-service ok" });
});

// DB test route
app.get("/test-db", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json({ ok: true, users });
  } catch (err: any) {
    res.json({ ok: false, error: err.message });
  }
});

export default app;
