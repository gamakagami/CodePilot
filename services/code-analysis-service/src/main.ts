import dotenv from "dotenv";
dotenv.config();

import { checkServiceHealth } from "./utils/health";
import { createApp } from "./app";

const PORT = process.env.PORT || 5003;

async function start() {
  try {

    console.log("🔍 Checking service dependencies...");
    
    const health = await checkServiceHealth();
    
    if (!health.overall) {
      console.error("❌ Service dependencies not healthy");
      console.error("Please ensure Neo4j and Pinecone are configured correctly");
      process.exit(1);
    }
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
