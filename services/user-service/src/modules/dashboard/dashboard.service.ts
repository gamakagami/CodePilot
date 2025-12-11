import axios from "axios";

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:4002";
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://localhost:7000";

/* -------------------------------------------------------
   1. Get GitHub Token (from User Service)
--------------------------------------------------------*/
const getUserGitHubToken = async (userId: string, authToken: string) => {
  const debug: any = {
    userServiceUrl: USER_SERVICE_URL,
    authTokenProvided: !!authToken
  };

  if (!authToken) return { token: null, debug };

  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const token =
      response.data.githubToken ||
      response.data.github_token ||
      response.data.data?.githubToken ||
      response.data.data?.github_token ||
      null;

    debug.userServiceResponse = response.data;
    debug.extractedToken = token;

    return { token, debug };
  } catch (err: any) {
    debug.error = err.response?.data || err.message;
    return { token: null, debug };
  }
};

/* -------------------------------------------------------
   2. MAIN DASHBOARD SUMMARY
--------------------------------------------------------*/
export const getDashboardSummary = async (userId: string, authToken: string) => {
  const debug: any = { userId, step: "start" };

  // Fetch GitHub token
  const { token: githubToken, debug: tokenDebug } =
    await getUserGitHubToken(userId, authToken);

  debug.githubTokenDebug = tokenDebug;

  if (!githubToken) {
    debug.step = "github_token_missing";
    return {
      success: false,
      reason: "GitHub token not found",
      debug,
      data: getEmpty()
    };
  }

  // Fetch orchestrator analytics
  debug.step = "fetching_orchestrator";

  const response = await axios.get(`${ORCHESTRATOR_URL}/api/analytics`, {
    headers: { Authorization: `Bearer ${authToken}` },
    validateStatus: () => true
  });

  debug.dashboardStatus = response.status;
  debug.dashboardRaw = response.data;

  if (response.status !== 200 || !response.data?.success) {
    debug.step = "orchestrator_failed";
    return {
      success: false,
      reason: "Orchestrator dashboard unavailable",
      debug,
      data: getEmpty()
    };
  }

  const analytics = response.data.data;

  debug.step = "success";

  // Return EXACT orchestrator fields
  return {
    success: true,
    debug,
    data: {
      averageCILatency: analytics.averageCILatency,
      modelAccuracy: analytics.modelAccuracy,
      activeRepositories: analytics.activeRepositories,
      totalPRsAnalyzed: analytics.totalPRsAnalyzed,
      llmFeedbackQuality: analytics.llmFeedbackQuality,
      lastUpdated: analytics.lastUpdated
    }
  };
};

const getEmpty = () => ({
  averageCILatency: 0,
  modelAccuracy: 0,
  activeRepositories: 0,
  totalPRsAnalyzed: 0,
  llmFeedbackQuality: 0,
  lastUpdated: null
});
