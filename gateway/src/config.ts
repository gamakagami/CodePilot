export const config = {
  port: process.env.PORT || 3000,
  services: {
    auth: process.env.AUTH_SERVICE_URL || "http://localhost:4001",
    project: process.env.PROJECT_SERVICE_URL || "http://localhost:4002",
    task: process.env.TASK_SERVICE_URL || "http://localhost:4003",
    llm: process.env.LLM_SERVICE_URL || "http://localhost:4004",
  },
  jwtSecret: process.env.JWT_SECRET || "your-secret-key"
};
