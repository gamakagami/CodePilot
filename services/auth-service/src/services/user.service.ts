// FILE: auth-service/src/services/user.service.ts

import prisma from "../models/prisma";

interface GitHubUser {
  githubId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  githubAccessToken?: string;
  login?: string;
}

export const findOrCreateGitHubUser = async (gitUser: GitHubUser) => {
  let user = await prisma.user.findUnique({
    where: { githubId: gitUser.githubId }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        githubId: gitUser.githubId,
        name: gitUser.name,
        email: gitUser.email,
        avatarUrl: gitUser.avatarUrl,
        githubAccessToken: gitUser.githubAccessToken
      }
    });
    console.log("✅ New user created in auth DB:", user.id);
  } else {
    console.log("✅ Existing user found in auth DB:", user.id);
  }

  return user;
};