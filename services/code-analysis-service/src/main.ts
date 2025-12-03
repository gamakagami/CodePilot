import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";

const PORT = process.env.PORT || 5003;

async function start() {
  try {
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`🚀 Code Analysis Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();
