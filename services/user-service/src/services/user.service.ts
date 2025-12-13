import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

export const getProfile = async (userId: string) => {
  return prisma.userProfile.findUnique({
    where: { userId },
    include: {
      repositories: {
        include: {
          pullRequests: {
            orderBy: {
              number: "desc"
            }
          }
        }
      }
    }
  });
};

export const updateProfile = async (userId: string, data: any) => {
  const updateData: any = {};
  const createData: any = { userId };

  if (data.name !== undefined) {
    updateData.name = data.name;
    createData.name = data.name;
  }
  if (data.email !== undefined) {
    updateData.email = data.email;
    createData.email = data.email;
  }
  if (data.avatarUrl !== undefined) {
    updateData.avatarUrl = data.avatarUrl;
    createData.avatarUrl = data.avatarUrl;
  }
  if (data.githubUsername !== undefined) {
    updateData.githubUsername = data.githubUsername;
    createData.githubUsername = data.githubUsername;
  }
  if (data.theme !== undefined) {
    updateData.theme = data.theme;
    createData.theme = data.theme || "dark";
  }

  return prisma.userProfile.upsert({
    where: { userId },
    update: updateData,
    create: createData
  });
};

export const updateApiSettings = async (userId: string, data: any) => {
  const updateData: any = {};
  const createData: any = { userId };

  if (data.claudeApiKey !== undefined) {
    updateData.claudeApiKey = data.claudeApiKey;
    createData.claudeApiKey = data.claudeApiKey;
  }
  if (data.githubToken !== undefined) {
    updateData.githubToken = data.githubToken;
    createData.githubToken = data.githubToken;
  }
  if (data.modelEndpoint !== undefined) {
    updateData.modelEndpoint = data.modelEndpoint;
    createData.modelEndpoint = data.modelEndpoint;
  }

  return prisma.userProfile.upsert({
    where: { userId },
    update: updateData,
    create: createData
  });
};

export const updateAiSettings = async (userId: string, data: any) => {
  const updateData: any = {};
  const createData: any = { userId };

  if (data.riskThreshold !== undefined) {
    updateData.riskThreshold = data.riskThreshold;
    createData.riskThreshold = data.riskThreshold;
  }
  if (data.enableLlmReview !== undefined) {
    updateData.enableLlmReview = data.enableLlmReview;
    createData.enableLlmReview = data.enableLlmReview;
  }
  if (data.enableMlPrediction !== undefined) {
    updateData.enableMlPrediction = data.enableMlPrediction;
    createData.enableMlPrediction = data.enableMlPrediction;
  }

  return prisma.userProfile.upsert({
    where: { userId },
    update: updateData,
    create: createData
  });
};

export const addRepository = async (userId: string, data: any) => {
  const user = await getProfile(userId);
  if (!user) throw new Error("User not found");

  return prisma.repository.create({
    data: {
      name: data.name,
      lastAnalyzed: data.lastAnalyzed,
      failureRate: data.failureRate,
      userProfileId: user.id
    }
  });
};

export const addPullRequest = async (data: any) => {
  return prisma.pullRequest.create({
    data: {
      title: data.title,
      author: data.author,
      status: data.status,
      repositoryId: data.repositoryId
    }
  });
};

export const syncRepositories = async (userId: string) => {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile?.githubToken) throw new Error("GitHub token missing");

  const reposResponse = await axios.get("https://api.github.com/user/repos", {
    headers: {
      Authorization: `Bearer ${profile.githubToken}`,
      Accept: "application/vnd.github+json"
    }
  });

  const repos = reposResponse.data;

  for (const repo of repos) {
    const createdRepo = await prisma.repository.upsert({
      where: {
        name_userProfileId: {
          name: repo.name,
          userProfileId: profile.id
        }
      },
      update: {},
      create: {
        name: repo.name,
        userProfileId: profile.id
      }
    });

    const prsResponse = await axios.get(
      `https://api.github.com/repos/${repo.owner.login}/${repo.name}/pulls`,
      {
        headers: { Authorization: `token ${profile.githubToken}` }
      }
    );

    const prs = prsResponse.data;

    for (const pr of prs) {
      await prisma.pullRequest.upsert({
        where: {
          number_repositoryId: {
            number: pr.number,
            repositoryId: createdRepo.id
          }
        },
        update: {},
        create: {
          number: pr.number,
          title: pr.title,
          author: pr.user.login,
          status: pr.state,
          repositoryId: createdRepo.id
        }
      });
    }
  }

  return getProfile(userId);
};

export const syncSingleRepository = async (userId: string, repoName: string) => {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile?.githubToken) throw new Error("GitHub token missing");

  if (!profile.githubUsername) {
    throw new Error("GitHub username missing");
  }

  const repoResponse = await axios.get(
    `https://api.github.com/repos/${profile.githubUsername}/${repoName}`,
    {
      headers: {
        Authorization: `Bearer ${profile.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  const repo = repoResponse.data;

  const createdRepo = await prisma.repository.upsert({
    where: {
      name_userProfileId: {
        name: repo.name,
        userProfileId: profile.id
      }
    },
    update: {
      lastAnalyzed: new Date()
    },
    create: {
      name: repo.name,
      userProfileId: profile.id
    }
  });

  const prsResponse = await axios.get(
    `https://api.github.com/repos/${repo.owner.login}/${repo.name}/pulls`,
    {
      params: {
        state: "all",
        per_page: 100
      },
      headers: {
        Authorization: `Bearer ${profile.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  const prs = prsResponse.data;

  for (const pr of prs) {
    await prisma.pullRequest.upsert({
      where: {
        number_repositoryId: {
          number: pr.number,
          repositoryId: createdRepo.id
        }
      },
      update: {
        title: pr.title,
        author: pr.user.login,
        status: pr.state,
        repoName: repo.name
      },
      create: {
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        status: pr.state,
        repositoryId: createdRepo.id,
        repoName: repo.name
      }
    });
  }

  return getProfile(userId);
};

export const analyzePullRequest = async (prId: number) => {
  const pr = await prisma.pullRequest.findUnique({
    where: { id: prId },
    include: {
      repository: {
        include: {
          userProfile: true
        }
      }
    }
  });

  if (!pr) {
    throw new Error("Pull request not found");
  }

  const { repository } = pr;
  const { userProfile } = repository;

  if (!userProfile.githubToken) throw new Error("GitHub token missing");
  if (!userProfile.githubUsername) throw new Error("GitHub username missing");

  const ghPrsResponse = await axios.get(
    `https://api.github.com/repos/${userProfile.githubUsername}/${repository.name}/pulls`,
    {
      headers: {
        Authorization: `Bearer ${userProfile.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  const ghPrs = ghPrsResponse.data;
  const matchingGhPr = ghPrs.find((p: any) => p.title === pr.title);

  if (!matchingGhPr) {
    throw new Error("Matching GitHub PR not found for this title");
  }

  const prNumber = matchingGhPr.number;

  const prDetailsResponse = await axios.get(
    `https://api.github.com/repos/${userProfile.githubUsername}/${repository.name}/pulls/${prNumber}`,
    {
      headers: {
        Authorization: `Bearer ${userProfile.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  const prDetails = prDetailsResponse.data;

  const filesResponse = await axios.get(
    `https://api.github.com/repos/${userProfile.githubUsername}/${repository.name}/pulls/${prNumber}/files`,
    {
      headers: {
        Authorization: `Bearer ${userProfile.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  const files = filesResponse.data;

  const payload = buildOrchestratorPayload(pr, prDetails, files, repository);

  const orchestratorResponse = await axios.post(
    process.env.ORCHESTRATOR_URL || "http://orchestrator:3000/analyze",
    payload
  );

  const analysis = orchestratorResponse.data;

  const updatedPr = await prisma.pullRequest.update({
    where: { id: prId },
    data: {
      analysisSummary: analysis.summary ?? null,
      riskScore: analysis.riskScore ?? null,
      llmReview: analysis.llmReview ?? null,
      lastAnalyzed: new Date()
    }
  });

  await prisma.repository.update({
    where: { id: repository.id },
    data: {
      lastAnalyzed: new Date(),
      failureRate: analysis.failureRate ?? repository.failureRate
    }
  });

  return updatedPr;
};

type OrchestratorPayload = {
  code: string;
  fileId: string;
  developer: string;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
  codeCoverageChange: number;
  buildDuration: number;
  previousFailureRate: number;
};

const buildOrchestratorPayload = (
  pr: any,
  prDetails: any,
  files: any[],
  repo: any
): OrchestratorPayload => {
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const f of files) {
    totalAdditions += f.additions ?? 0;
    totalDeletions += f.deletions ?? 0;
  }

  const combinedCode = files
    .map((f) => `// File: ${f.filename}\n${f.patch ?? ""}`)
    .join("\n\n");

  return {
    code: combinedCode || "// No code diff available",
    fileId: `${repo.name}-pr-${prDetails.number}`,
    developer: pr.author,
    linesAdded: totalAdditions,
    linesDeleted: totalDeletions,
    filesChanged: files.length,
    codeCoverageChange: 0,
    buildDuration: 0,
    previousFailureRate: repo.failureRate ?? 0
  };
};

export const buildPullRequestPayload = async (prId: number) => {
  const pr = await prisma.pullRequest.findUnique({
    where: { id: prId },
    include: {
      repository: {
        include: {
          userProfile: true
        }
      }
    }
  });

  if (!pr) throw new Error("Pull request not found");

  const { repository } = pr;
  const { userProfile } = repository;

  if (!userProfile.githubToken) throw new Error("GitHub token missing");
  if (!userProfile.githubUsername) throw new Error("GitHub username missing");

  const ghPrsResponse = await axios.get(
    `https://api.github.com/repos/${userProfile.githubUsername}/${repository.name}/pulls`,
    {
      headers: {
        Authorization: `Bearer ${userProfile.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  const ghPrs = ghPrsResponse.data;
  const matchingGhPr = ghPrs.find((p: any) => p.title === pr.title);

  if (!matchingGhPr) throw new Error("Matching GitHub PR not found");

  const prNumber = matchingGhPr.number;

  const prDetailsResponse = await axios.get(
    `https://api.github.com/repos/${userProfile.githubUsername}/${repository.name}/pulls/${prNumber}`,
    {
      headers: {
        Authorization: `Bearer ${userProfile.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  const prDetails = prDetailsResponse.data;

  const filesResponse = await axios.get(
    `https://api.github.com/repos/${userProfile.githubUsername}/${repository.name}/pulls/${prNumber}/files`,
    {
      headers: {
        Authorization: `Bearer ${userProfile.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  const files = filesResponse.data;

  return buildOrchestratorPayload(pr, prDetails, files, repository);
};

export const getAverageAnalysisDuration = async () => {
  const result = await prisma.pullRequest.aggregate({
    _avg: {
      analysisDuration: true
    }
  });

  return result._avg.analysisDuration || 0;
};

export const storePullRequestAnalysis = async (prId: number, analysis: any) => {
  return prisma.$transaction(async (tx) => {
    const pr = await tx.pullRequest.findUnique({
      where: { id: prId },
      select: { repositoryId: true }
    });

    if (!pr) throw new Error("Pull request not found");

    const updatedPr = await tx.pullRequest.update({
      where: { id: prId },
      data: {
        analysisSummary: analysis.review?.summary ?? null,
        riskScore: analysis.prediction?.failure_probability ?? null,
        predictedFailure: analysis.prediction?.will_fail ?? null,
        analysisDuration: analysis.performance?.totalDuration ?? null,
        lastAnalyzed: new Date(),
        rating: analysis.rating ?? null
      }
    });

    const allPrs = await tx.pullRequest.findMany({
      where: {
        repositoryId: pr.repositoryId,
        actualFailure: { not: null }
      },
      select: { actualFailure: true }
    });

    let failureRate: number | null = null;
    if (allPrs.length > 0) {
      const failures = allPrs.filter((p) => p.actualFailure === true).length;
      failureRate = failures / allPrs.length;
    }

    await tx.repository.update({
      where: { id: pr.repositoryId },
      data: {
        lastAnalyzed: new Date(),
        failureRate: failureRate ?? undefined
      }
    });

    await tx.reviewComment.deleteMany({
      where: { pullRequestId: prId }
    });

    if (analysis.review?.issues?.length) {
      await tx.reviewComment.createMany({
        data: analysis.review.issues.map((issue: any) => ({
          file: issue.location || "global",
          line: 0,
          comment: `${issue.title}: ${issue.description}\nSuggestion: ${issue.suggestion}`,
          pullRequestId: prId
        }))
      });
    }

    return updatedPr;
  });
};

export const ratePullRequest = async (prId: number, rating: number) => {
  return prisma.pullRequest.update({
    where: { id: prId },
    data: { rating }
  });
};
