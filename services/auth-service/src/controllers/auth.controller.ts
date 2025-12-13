import { Request, Response } from "express";
import * as githubService from "../services/github.service";
import * as userService from "../services/user.service";
import * as jwtService from "../services/jwt.service";
import * as userProfileService from "../services/userProfile.service";

export const redirectToGitHub = (req: Request, res: Response) => {
  const GITHUB_URL =
    `https://github.com/login/oauth/authorize?` +
    `client_id=${process.env.GITHUB_CLIENT_ID}&` +
    `redirect_uri=${process.env.GITHUB_REDIRECT_URI}&` +
    `scope=read:user user:email`;

  res.redirect(GITHUB_URL);
};

export const githubCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const gitUser = await githubService.getGitHubUser(code);

    // Create or find user in auth DB
    const user = await userService.findOrCreateGitHubUser(gitUser);

    // Issue JWT
    const token = jwtService.generateToken(user);

    console.log("JWT Token issued for user:", user.email || user.githubId);
    console.log("TOKEN:", token);

    // Create user profile in user-service
    await userProfileService.createUserProfile(user.id, gitUser, token);

    console.log("====================================================");

    // Redirect to frontend with token
    return res.redirect(`http://localhost:3000/auth/success?token=${token}`);
  } catch (error: any) {
    console.error("GitHub callback error:", error);
    return res.redirect(`http://localhost:3000/auth/error?message=${error.message}`);
  }
};

export const getCurrentUser = async (req: any, res: Response) => {
  return res.json(req.user);
};

export const logout = async (req: Request, res: Response) => {
  try {
    return res.json({ message: "Logged out successfully. Please remove token on client side." });

  } catch (error: any) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Logout failed" });
  }
};
