import jwt from "jsonwebtoken";
import { loadEnv } from "../utils/env";

const env = loadEnv();

export const generateToken = (user: any) => {
  return jwt.sign(
    {
      id: user.id,
      githubId: user.githubId,
      name: user.name,
      email: user.email
    },
    env.JWT_SECRET
  );
};
