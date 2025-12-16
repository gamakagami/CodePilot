import { Request, Response } from "express";
import * as githubService from "../services/github.service";
import * as userService from "../services/user.service";
import * as jwtService from "../services/jwt.service";
import * as userProfileService from "../services/userProfile.service";
import { loadEnv } from "../utils/env";

const env = loadEnv();

export const redirectToGitHub = (req: Request, res: Response) => {
  const GITHUB_URL =
    `https://github.com/login/oauth/authorize?` +
    `client_id=${env.GITHUB_CLIENT_ID}&` +
    `redirect_uri=${env.GITHUB_REDIRECT_URI}&` +
    `scope=read:user user:email`;

  res.redirect(GITHUB_URL);
};

export const githubCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const gitUser = await githubService.getGitHubUser(code);

    const user = await userService.findOrCreateGitHubUser(gitUser);

    const token = jwtService.generateToken(user);

    console.log("JWT Token issued for user:", user.email || user.githubId);
    console.log("TOKEN:", token);

    await userProfileService.createUserProfile(user.id, gitUser, token);

    return res.redirect(`${env.FRONTEND_URL}/auth/success?token=${token}`);
  } catch (error: any) {
    console.error("GitHub callback error:", error);
    return res.redirect(`${env.FRONTEND_URL}/auth/error?message=${error.message}`);
  }
};

export const getCurrentUser = async (req: any, res: Response) => {
  return res.json(req.user);
};

export const logout = async (req: Request, res: Response) => {
  return res.json({ message: "Logged out successfully. Please remove token on client side." });
};
