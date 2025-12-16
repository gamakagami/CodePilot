import dotenv from "dotenv";
import app from "./app";

// Load environment variables before anything else uses them
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
