import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import prisma from "./models/prisma";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "auth-service ok" });
});

app.get("/test-db", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json({ ok: true, users });
  } catch (err: any) {
    res.json({ ok: false, error: err.message });
  }
});


export default app;
