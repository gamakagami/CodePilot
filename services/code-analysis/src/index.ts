import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { analyzeCode, analyzeCodebase } from "./analyzer";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increase limit for multiple files

// Single file analysis
app.post("/analyze", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: "Code is required" });
    return;
  }

  try {
    const result = await analyzeCode(code);
    res.json({ analysis: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "LLM error" });
  }
});

// Multiple files / codebase analysis
app.post("/analyze-codebase", async (req, res) => {
  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: "Files array is required" });
    return;
  }

  try {
    const result = await analyzeCodebase(files);
    res.json({ analysis: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "LLM error" });
  }
});

app.listen(3001, () => {
  console.log("Code analysis service running on http://localhost:3001");
});