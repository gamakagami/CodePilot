import { Request, Response } from "express";
import * as userService from "../services/user.service";

export const getProfile = async (req: any, res: Response) => {
  const userId = req.user.id; // this is already a string
  const profile = await userService.getProfile(userId);
  return res.json(profile);
};

export const updateProfile = async (req: any, res: Response) => {
  const userId = req.user.id;
  const updated = await userService.updateProfile(userId, req.body);
  return res.json(updated);
};

export const updateApiSettings = async (req: any, res: Response) => {
  const userId = req.user.id;
  const updated = await userService.updateApiSettings(userId, req.body);
  return res.json(updated);
};

export const updateAiSettings = async (req: any, res: Response) => {
  const userId = req.user.id;
  const updated = await userService.updateAiSettings(userId, req.body);
  return res.json(updated);
};
