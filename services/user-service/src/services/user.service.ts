import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getProfile = async (userId: number) => {
  return prisma.userProfile.findUnique({
    where: { userId }
  });
};

export const updateProfile = async (userId: number, data: any) => {
  return prisma.userProfile.upsert({
    where: { userId },
    update: {
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl,
      theme: data.theme,
    },
    create: {
      userId,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl,
      theme: data.theme,
    },
  });
};

export const updateApiSettings = async (userId: number, data: any) => {
  return prisma.userProfile.upsert({
    where: { userId },
    update: {
      claudeApiKey: data.claudeApiKey,
      githubToken: data.githubToken,
      modelEndpoint: data.modelEndpoint,
    },
    create: {
      userId,
      claudeApiKey: data.claudeApiKey,
      githubToken: data.githubToken,
      modelEndpoint: data.modelEndpoint,
    },
  });
};

export const updateAiSettings = async (userId: number, data: any) => {
  return prisma.userProfile.upsert({
    where: { userId },
    update: {
      riskThreshold: data.riskThreshold,
      enableLlmReview: data.enableLlmReview,
      enableMlPrediction: data.enableMlPrediction,
    },
    create: {
      userId,
      riskThreshold: data.riskThreshold,
      enableLlmReview: data.enableLlmReview,
      enableMlPrediction: data.enableMlPrediction,
    },
  });
};
