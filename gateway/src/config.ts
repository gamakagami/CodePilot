export const config = {
  port: process.env.PORT || 3000,
  services: {
    auth: process.env.AUTH_SERVICE_URL!,
    project: process.env.PROJECT_SERVICE_URL!,
    task: process.env.TASK_SERVICE_URL!,
    llm: process.env.LLM_SERVICE_URL!,
  },
  jwtSecret: process.env.JWT_SECRET!
};
