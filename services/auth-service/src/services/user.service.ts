import prisma from "../models/prisma";
import { GitHubUser } from "../types/User";

export const findOrCreateGitHubUser = async (gitUser: GitHubUser) => {
  let user = await prisma.user.findUnique({
    where: { githubId: gitUser.githubId }
  });

  if (!user) {
    user = await prisma.user.create({
      data: gitUser
    });
  }

  return user;
};
