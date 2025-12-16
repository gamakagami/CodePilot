import dotenv from "dotenv";
dotenv.config();

export const loadEnv = () => {
  if (
    !process.env.GITHUB_CLIENT_ID ||
    !process.env.GITHUB_CLIENT_SECRET ||
    !process.env.GITHUB_REDIRECT_URI ||
    !process.env.JWT_SECRET
  ) {
    throw new Error("Missing required environment variables");
  }

  return {
    PORT: process.env.PORT || 4001,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
    USER_SERVICE_URL: process.env.USER_SERVICE_URL || "http://localhost:4002"
  };
};
