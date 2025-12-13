import { Response, Request } from "express";
import * as userService from "../services/user.service";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { AuthenticatedRequest } from "../types/authenticated-request";

const prisma = new PrismaClient();

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const profile = await userService.getProfile(userId);
  return res.json(profile);
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const updated = await userService.updateProfile(userId, req.body);
  return res.json(updated);
};

export const updateApiSettings = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const updated = await userService.updateApiSettings(userId, req.body);
  return res.json(updated);
};

export const updateAiSettings = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const updated = await userService.updateAiSettings(userId, req.body);
  return res.json(updated);
};

export const addRepository = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const user = await userService.getProfile(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const repo = await prisma.repository.create({
    data: {
      name: req.body.name,
      lastAnalyzed: req.body.lastAnalyzed,
      failureRate: req.body.failureRate,
      userProfileId: user.id
    }
  });

  return res.json(repo);
};

export const addPullRequest = async (req: AuthenticatedRequest, res: Response) => {
  const repoId = req.body.repositoryId;
  const pr = await prisma.pullRequest.create({
    data: {
      title: req.body.title,
      author: req.body.author,
      status: req.body.status,
      repositoryId: repoId
    }
  });

  return res.json(pr);
};

export const syncRepositories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const result = await userService.syncRepositories(userId);
    return res.json(result);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to sync repositories" });
  }
};

export const syncSingleRepository = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const repoName = req.params.repoName;

    const result = await userService.syncSingleRepository(userId, repoName);
    return res.json(result);
  } catch (err: any) {
    console.error(err.response?.data || err);
    return res.status(500).json({
      error: "Failed to sync repository",
      message: err.message
    });
  }
};

export const analyzePullRequest = async (req: Request, res: Response) => {
  try {
    const prId = Number(req.params.prId);
    if (Number.isNaN(prId)) {
      return res.status(400).json({ error: "Invalid pull request id" });
    }

    const payload = await userService.buildPullRequestPayload(prId);

    return res.json(payload);
  } catch (err: any) {
    console.error("FORMAT PR ERROR:", err.response?.data || err.message || err);
    return res.status(500).json({ error: "Failed to format pull request" });
  }
};

export const submitPullRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prId = Number(req.params.prId);

    const payload = await userService.buildPullRequestPayload(prId);

    const pr = await prisma.pullRequest.findUnique({
      where: { id: prId },
      include: {
        repository: { include: { userProfile: true } }
      }
    });

    if (!pr) {
      return res.status(404).json({ error: "Pull request not found" });
    }

    const repo = pr.repository;
    const userProfile = repo.userProfile;

    const orchestratorPayload = {
      ...payload,
      repositoryFullName: `${userProfile.githubUsername}/${repo.name}`,
      prId: pr.number,
      prUrl: `https://github.com/${userProfile.githubUsername}/${repo.name}/pull/${pr.number}`
    };

    const response = await axios.post(
      `${process.env.ORCHESTRATOR_URL}/api/analyze-pr`,
      orchestratorPayload,
      { headers: { Authorization: req.headers.authorization } }
    );

    const result = response.data.data;

    await userService.storePullRequestAnalysis(prId, result);

    const filesResponse = await axios.get(
      `https://api.github.com/repos/${userProfile.githubUsername}/${repo.name}/pulls/${pr.number}/files`,
      {
        headers: {
          Authorization: `Bearer ${userProfile.githubToken}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    const files = filesResponse.data;

    await prisma.changedFile.deleteMany({ where: { pullRequestId: prId } });

    if (files.length > 0) {
      await prisma.changedFile.createMany({
        data: files.map((f: any) => ({
          filename: f.filename,
          additions: f.additions,
          deletions: f.deletions,
          complexity: result.analysis?.metrics?.cyclomaticComplexity ?? null,
          diff: f.patch ?? null,
          pullRequestId: prId
        }))
      });
    }

    return res.json({
      success: true,
      stored: true,
      analysis: result
    });
  } catch (err: any) {
    console.error("SUBMIT ERROR:", err);
    return res
      .status(500)
      .json({ error: "Failed to submit PR to orchestrator" });
  }
};

export const getMetrics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true }
    });

    if (!profile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const profileId = profile.id;

    const avgAnalysis = await prisma.pullRequest.aggregate({
      _avg: { analysisDuration: true },
      where: {
        repository: {
          userProfileId: profileId
        },
        analysisDuration: { not: null }
      }
    });

    const activeRepositories = await prisma.repository.count({
      where: { userProfileId: profileId }
    });

    const correctPredictions = await prisma.pullRequest.count({
      where: {
        repository: { userProfileId: profileId },
        predictedFailure: { not: null },
        actualFailure: { not: null },
        predictedFailure: { equals: prisma.pullRequest.fields.actualFailure }
      }
    });

    const totalEvaluated = await prisma.pullRequest.count({
      where: {
        repository: { userProfileId: profileId },
        predictedFailure: { not: null },
        actualFailure: { not: null }
      }
    });

    const modelAccuracy =
      totalEvaluated === 0 ? 0 : (correctPredictions / totalEvaluated) * 100;

    return res.json({
      avgAnalysisDuration: avgAnalysis._avg.analysisDuration || 0,
      activeRepositories,
      modelAccuracy
    });
  } catch (err: any) {
    console.error("METRICS ERROR:", err);
    return res.status(500).json({ error: "Failed to load metrics" });
  }
};

export const submitPredictionFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prId = Number(req.params.prId);
    const { actualFailure } = req.body;

    if (Number.isNaN(prId)) {
      return res.status(400).json({ error: "Invalid pull request id" });
    }

    if (typeof actualFailure !== "boolean") {
      return res.status(400).json({
        error: "actualFailure must be a boolean value"
      });
    }

    const userId = req.user.id;

    const pr = await prisma.pullRequest.findFirst({
      where: {
        id: prId,
        repository: {
          userProfile: {
            userId
          }
        }
      },
      include: {
        repository: true
      }
    });

    if (!pr) {
      return res.status(404).json({
        error: "Pull request not found or access denied"
      });
    }

    if (pr.predictedFailure === null) {
      return res.status(400).json({
        error: "No prediction exists for this pull request"
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedPr = await tx.pullRequest.update({
        where: { id: prId },
        data: { actualFailure }
      });

      const allPrs = await tx.pullRequest.findMany({
        where: {
          repositoryId: pr.repositoryId,
          actualFailure: { not: null }
        },
        select: { actualFailure: true }
      });

      if (allPrs.length > 0) {
        const failures = allPrs.filter((p) => p.actualFailure === true).length;
        const failureRate = failures / allPrs.length;

        await tx.repository.update({
          where: { id: pr.repositoryId },
          data: { failureRate }
        });
      }

      return updatedPr;
    });

    return res.json({
      success: true,
      pullRequest: {
        id: updated.id,
        predictedFailure: updated.predictedFailure,
        actualFailure: updated.actualFailure,
        wasCorrect: updated.predictedFailure === updated.actualFailure
      }
    });
  } catch (err: any) {
    console.error("FEEDBACK ERROR:", err);
    return res.status(500).json({
      error: "Failed to submit prediction feedback"
    });
  }
};
