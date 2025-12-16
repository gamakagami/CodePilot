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
    if (Number.isNaN(prId)) return res.status(400).json({ error: "Invalid PR ID" });

    // 1. Build PR payload (diffs/metadata)
    const payload = await userService.buildPullRequestPayload(prId);

    // 2. Fetch PR with Repository and its Files
    const pr = await prisma.pullRequest.findUnique({
      where: { id: prId },
      include: {
        repository: { 
          include: { 
            userProfile: true,
            files: true // <--- Fetch the stored repo files
          } 
        }
      }
    });

    if (!pr) return res.status(404).json({ error: "Pull request not found" });

    const repo = pr.repository;
    const userProfile = repo.userProfile;

    // 3. Prepare Orchestrator Payload with Repository Context
    const orchestratorPayload = {
      ...payload,
      repositoryFullName: `${userProfile.githubUsername}/${repo.name}`,
      prId: pr.number,
      prUrl: `https://github.com/${userProfile.githubUsername}/${repo.name}/pull/${pr.number}`,
      // ADDING REPO CONTEXT HERE:
      repoContext: repo.files.map(f => ({
        path: f.path,
        content: f.content 
      }))
    };

    console.log(`📤 Sending PR #${pr.number} with ${repo.files.length} context files...`);

    // 4. Call orchestrator
    const response = await axios.post(
      `${process.env.ORCHESTRATOR_URL}/api/analyze-pr`,
      orchestratorPayload,
      { 
        headers: { Authorization: req.headers.authorization },
        timeout: 180000 // Increased to 3 mins as payload is now larger
      }
    );

    console.log('📥 Orchestrator response received');
    console.log('Response structure:', JSON.stringify({
      success: response.data.success,
      hasData: !!response.data.data,
      dataKeys: response.data.data ? Object.keys(response.data.data) : []
    }));

    // Step 5: Validate response structure
    if (!response.data) {
      throw new Error('Orchestrator returned empty response');
    }

    if (!response.data.success) {
      throw new Error(`Orchestrator failed: ${response.data.error || 'Unknown error'}`);
    }

    if (!response.data.data) {
      throw new Error('Orchestrator response missing data field');
    }

    const result = response.data.data;

    // Validate result has required fields
    if (!result.analysis || !result.prediction || !result.review) {
      console.warn('⚠️ Incomplete orchestrator response:', {
        hasAnalysis: !!result.analysis,
        hasPrediction: !!result.prediction,
        hasReview: !!result.review
      });
    }

    console.log('💾 Storing analysis results...');

    // Step 6: Store the analysis
    await userService.storePullRequestAnalysis(prId, result);
    
    console.log('✅ Analysis stored successfully');

    // Step 7: Fetch and store changed files
    console.log('📂 Fetching changed files from GitHub...');
    
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
    console.log(`📄 Found ${files.length} changed files`);

    // Clear old files and add new ones
    await prisma.changedFile.deleteMany({ where: { pullRequestId: prId } });

    if (files.length > 0) {
      await prisma.changedFile.createMany({
        data: files.map((f: any) => ({
          filename: f.filename,
          additions: f.additions || 0,
          deletions: f.deletions || 0,
          complexity: result.analysis?.metrics?.cyclomaticComplexity ?? null,
          diff: f.patch ?? null,
          pullRequestId: prId
        }))
      });
      console.log('✅ Changed files stored');
    }

    console.log('🎉 PR submission complete!');

    return res.json({ success: true, analysis: response.data.data });

  } catch (err: any) {
    console.error("❌ SUBMIT ERROR:", err.message);
    return res.status(500).json({ error: "Failed to submit PR", details: err.message });
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
