import axios from "axios";
import { loadEnv } from "../utils/env";
const env = loadEnv();

export const getGitHubUser = async (code: string) => {
  // Get GitHub Access Token
  const tokenRes = await axios.post(
    `https://github.com/login/oauth/access_token`,
    {
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_REDIRECT_URI,
    },
    { headers: { Accept: "application/json" } }
  );

  const accessToken = tokenRes.data.access_token;

  // Fetch GitHub User Info
  const userRes = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const emailRes = await axios.get("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const primaryEmail = emailRes.data.find((e: any) => e.primary)?.email;

  return {
    githubId: userRes.data.id.toString(),
    name: userRes.data.name || userRes.data.login || primaryEmail || "GitHub User",
    avatarUrl: userRes.data.avatar_url,
    email: primaryEmail,
    githubAccessToken: accessToken,
    login: userRes.data.login 
  };
};