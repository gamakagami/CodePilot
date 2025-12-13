import { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  // add other JWT fields here if needed
  // email?: string;
  // roles?: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
