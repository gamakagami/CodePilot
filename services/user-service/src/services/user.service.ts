import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getProfile = async (userId: string) => {
  return prisma.userProfile.findUnique({
    where: { userId }
  });
};

export const updateProfile = async (userId: string, data: any) => {
  // Filter out undefined values
  const updateData: any = {};
  const createData: any = { userId };

  if (data.name !== undefined) {
    updateData.name = data.name;
    createData.name = data.name;
  }
  if (data.email !== undefined) {
    updateData.email = data.email;
    createData.email = data.email;
  }
  if (data.avatarUrl !== undefined) {
    updateData.avatarUrl = data.avatarUrl;
    createData.avatarUrl = data.avatarUrl;
  }
  if (data.githubUsername !== undefined) {
    updateData.githubUsername = data.githubUsername;
    createData.githubUsername = data.githubUsername;
  }
  if (data.theme !== undefined) {
    updateData.theme = data.theme;
    createData.theme = data.theme || "dark";
  }

  return prisma.userProfile.upsert({
    where: { userId },
    update: updateData,
    create: createData,
  });
};

export const updateApiSettings = async (userId: string, data: any) => {
  // Filter out undefined values
  const updateData: any = {};
  const createData: any = { userId };

  if (data.claudeApiKey !== undefined) {
    updateData.claudeApiKey = data.claudeApiKey;
    createData.claudeApiKey = data.claudeApiKey;
  }
  if (data.githubToken !== undefined) {
    updateData.githubToken = data.githubToken;
    createData.githubToken = data.githubToken;
  }
  if (data.modelEndpoint !== undefined) {
    updateData.modelEndpoint = data.modelEndpoint;
    createData.modelEndpoint = data.modelEndpoint;
  }

  return prisma.userProfile.upsert({
    where: { userId },
    update: updateData,
    create: createData,
  });
};

export const updateAiSettings = async (userId: string, data: any) => {
  // Filter out undefined values
  const updateData: any = {};
  const createData: any = { userId };

  if (data.riskThreshold !== undefined) {
    updateData.riskThreshold = data.riskThreshold;
    createData.riskThreshold = data.riskThreshold;
  }
  if (data.enableLlmReview !== undefined) {
    updateData.enableLlmReview = data.enableLlmReview;
    createData.enableLlmReview = data.enableLlmReview;
  }
  if (data.enableMlPrediction !== undefined) {
    updateData.enableMlPrediction = data.enableMlPrediction;
    createData.enableMlPrediction = data.enableMlPrediction;
  }

  return prisma.userProfile.upsert({
    where: { userId },
    update: updateData,
    create: createData,
  });
};