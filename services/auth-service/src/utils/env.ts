import dotenv from "dotenv";
dotenv.config();

export const loadEnv = () => ({
  PORT: process.env.PORT || 4001,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID!,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET!,
  GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI!,
  JWT_SECRET: process.env.JWT_SECRET!
});
