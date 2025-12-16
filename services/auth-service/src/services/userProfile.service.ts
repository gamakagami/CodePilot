import axios from "axios";
import { loadEnv } from "../utils/env";

const env = loadEnv();

export const createUserProfile = async (
  userId: string,
  githubData: any,
  token: string
) => {
  try {
    const response = await axios.put(
      `${env.USER_SERVICE_URL}/users/profile`,
      {
        name: githubData.name,
        email: githubData.email,
        avatarUrl: githubData.avatarUrl,
        githubUsername: githubData.login,
        theme: "dark",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("User profile created in user-service:", response.data);

    await axios.put(
      `${env.USER_SERVICE_URL}/users/settings/api`,
      {
        githubToken: githubData.githubAccessToken,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("GitHub token stored in user-service");

    return response.data;
  } catch (error: any) {
    console.error(
      "Failed to create user profile:",
      error.response?.data || error.message
    );
    return null;
  }
};
