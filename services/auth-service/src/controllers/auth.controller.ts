import { Request, Response } from "express";
import * as githubService from "../services/github.service";
import * as userService from "../services/user.service";
import * as jwtService from "../services/jwt.service";

export const redirectToGitHub = (req: Request, res: Response) => {
  const GITHUB_URL =
    `https://github.com/login/oauth/authorize?` +
    `client_id=${process.env.GITHUB_CLIENT_ID}&` +
    `redirect_uri=${process.env.GITHUB_REDIRECT_URI}&` +
    `scope=read:user user:email`;

  res.redirect(GITHUB_URL);
};

export const githubCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const gitUser = await githubService.getGitHubUser(code);

  // create or find user in DB
  const user = await userService.findOrCreateGitHubUser(gitUser);

  // issue JWT
  const token = jwtService.generateToken(user);

  // redirect to frontend with token
  return res.redirect(`http://localhost:3000/auth/success?token=${token}`);
};

export const getCurrentUser = async (req: any, res: Response) => {
  return res.json(req.user);
};
