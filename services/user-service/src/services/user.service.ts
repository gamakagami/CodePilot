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
  const profile = await prisma.userProfile.findUnique({ 
    where: { userId },
    include: { repositories: { where: { name: repoName }, include: { _count: { select: { files: true } } } } }
  });

  if (!profile?.githubToken || !profile.githubUsername) {
    throw new Error("GitHub credentials missing");
  }

  // 1. Upsert the Repository record
  const createdRepo = await prisma.repository.upsert({
    where: { name_userProfileId: { name: repoName, userProfileId: profile.id } },
    update: { lastAnalyzed: new Date() },
    create: { name: repoName, userProfileId: profile.id }
  });

  // 2. Initial Content Sync (Only runs if the repo has 0 files)
  const existingFilesCount = profile.repositories[0]?._count.files || 0;
  
  if (existingFilesCount === 0) {
    const repoInfo = await axios.get(
      `https://api.github.com/repos/${profile.githubUsername}/${repoName}`,
      { headers: { Authorization: `Bearer ${profile.githubToken}` } }
    );
    const defaultBranch = repoInfo.data.default_branch;

    const treeResponse = await axios.get(
      `https://api.github.com/repos/${profile.githubUsername}/${repoName}/git/trees/${defaultBranch}?recursive=1`,
      { headers: { Authorization: `Bearer ${profile.githubToken}` } }
    );

    const files = treeResponse.data.tree.filter((item: any) => item.type === "blob");

    const skipDirs = [
      "node_modules/",
      "vendor/",
      "dist/",
      "build/",
      "out/",
      ".next/",
      ".nuxt/",
      ".cache/",
      "target/",
      "bin/",
      "obj/",
    ];

    for (const file of files) {
      const normalizedPath = file.path.replace(/\\/g, "/");

      // Skip dependency/build directories
      if (skipDirs.some(dir => normalizedPath.includes(dir))) {
        console.log(`Skipping dependency/build file: ${file.path}`);
        continue;
      }

      // Skip hidden/system folders
      if (normalizedPath.startsWith(".")) {
        console.log(`Skipping hidden/system file: ${file.path}`);
        continue;
      }

      const contentResponse = await axios.get(file.url, {
        headers: { Authorization: `Bearer ${profile.githubToken}` }
      });

      const raw = Buffer.from(contentResponse.data.content, "base64");

      // Skip binary files
      if (raw.includes(0x00)) {
        console.log(`Skipping binary file: ${file.path}`);
        continue;
      }

      const content = raw.toString("utf-8");

      await prisma.file.upsert({
        where: { path_repositoryId: { path: file.path, repositoryId: createdRepo.id } },
        update: { content },
        create: { path: file.path, content, repositoryId: createdRepo.id }
      });
    }
  }

  // 3. PR Sync
  const prsResponse = await axios.get(
    `https://api.github.com/repos/${profile.githubUsername}/${repoName}/pulls`,
    {
      params: { state: "all", per_page: 100 },
      headers: { Authorization: `Bearer ${profile.githubToken}` }
    }
  );

  for (const pr of prsResponse.data) {
    await prisma.pullRequest.upsert({
      where: { number_repositoryId: { number: pr.number, repositoryId: createdRepo.id } },
      update: { title: pr.title, status: pr.state },
      create: { 
        number: pr.number, 
        title: pr.title, 
        author: pr.user.login, 
        status: pr.state, 
        repositoryId: createdRepo.id,
        repoName: repoName
      }
    });
  }

  // 4. Store repository context in Neo4j
  try {
    const repositoryFullName = `${profile.githubUsername}/${repoName}`;

    const repoFiles = await prisma.file.findMany({
      where: { repositoryId: createdRepo.id },
      select: { path: true, content: true }
    });

    if (repoFiles.length > 0) {
      console.log(`📦 Storing ${repoFiles.length} files in Neo4j for ${repositoryFullName}...`);

      const codeAnalysisUrl = process.env.CODE_ANALYSIS_SERVICE_URL || "http://localhost:5003";

      await axios.post(
        `${codeAnalysisUrl}/analysis/store-repo-context`,
        {
          repositoryFullName,
          files: repoFiles.map(f => ({
            path: f.path,
            content: f.content || ""
          }))
        },
        { timeout: 120000 }
      );

      console.log(`✅ Successfully stored repository context in Neo4j`);
    } else {
      console.log(`⚠️ No files to store in Neo4j for ${repositoryFullName}`);
    }
  } catch (error: any) {
    console.error(`⚠️ Failed to store repository context in Neo4j:`, error.message);
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

export const storePullRequestAnalysis = async (prId: number, result: any) => {
  return prisma.$transaction(async (tx) => {
    console.log('🔍 [USER SERVICE] storePullRequestAnalysis called for PR:', prId);
    
    const pr = await tx.pullRequest.findUnique({
      where: { id: prId },
      select: { repositoryId: true }
    });

    if (!pr) throw new Error("Pull request not found");

    // ✅ Validate result exists
    if (!result || typeof result !== 'object') {
      console.error('❌ [USER SERVICE] Invalid result:', result);
      throw new Error('Invalid analysis result: result is null or not an object');
    }

    // 🔍 DEBUG: Log to understand the structure
    const resultKeys = Object.keys(result);
    console.log('🔍 [USER SERVICE] Result keys:', resultKeys);
    
    if (resultKeys.length === 0) {
      console.error('❌ [USER SERVICE] Result object is empty');
      throw new Error('Invalid analysis result: result object is empty');
    }

    // Show structure safely
    try {
      const structurePreview = JSON.stringify(result, null, 2).substring(0, 800);
      console.log('🔍 [USER SERVICE] Result structure preview:', structurePreview);
    } catch (e) {
      console.log('⚠️  [USER SERVICE] Could not stringify result');
    }

    // ✅ Safely extract data with null checks
    const analysis = result.analysis || {};
    const prediction = result.prediction || {};
    const review = result.review || {};
    const performance = result.performance || {};

    console.log('🔍 [USER SERVICE] Extracted components:');
    console.log('   - analysis:', !!analysis, '(has metrics:', !!analysis.metrics, ')');
    console.log('   - prediction:', !!prediction, '(failure_probability:', prediction.failure_probability, ')');
    console.log('   - review:', !!review, '(has summary:', !!review.summary, ')');
    console.log('   - performance:', !!performance);

    // 🔍 CRITICAL: Check review.issues specifically
    console.log('🔍 [USER SERVICE] Review issues analysis:');
    console.log('   - review object exists:', !!review);
    console.log('   - has "issues" property:', 'issues' in review);
    console.log('   - issues is array:', Array.isArray(review.issues));
    console.log('   - issues count:', review.issues?.length || 0);
    
    if (review.issues && Array.isArray(review.issues) && review.issues.length > 0) {
      console.log('   - First issue keys:', Object.keys(review.issues[0]));
      console.log('   - First issue:', JSON.stringify(review.issues[0], null, 2));
    } else {
      console.log('   ⚠️  No issues in review object');
    }

    // Update the pull request with analysis results
    const updatedPr = await tx.pullRequest.update({
      where: { id: prId },
      data: {
        // Review data
        analysisSummary: review.summary ?? null,
        
        // Prediction data
        riskScore: prediction.failure_probability ?? null,
        predictedFailure: prediction.will_fail ?? null,
        
        // Performance data
        analysisDuration: performance.totalDuration ?? null,
        
        // Other fields
        lastAnalyzed: new Date(),
        rating: result.rating ?? null
      }
    });

    console.log('✅ [USER SERVICE] Pull request updated with analysis data');

    // Calculate failure rate for the repository
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
      console.log(`📊 [USER SERVICE] Repository failure rate: ${(failureRate * 100).toFixed(1)}% (${failures}/${allPrs.length})`);
    }

    await tx.repository.update({
      where: { id: pr.repositoryId },
      data: {
        lastAnalyzed: new Date(),
        failureRate: failureRate ?? undefined
      }
    });

    // Clear old review comments
    await tx.reviewComment.deleteMany({
      where: { pullRequestId: prId }
    });
    console.log('[USER SERVICE] Old review comments cleared');

    // Create new review comments from issues
    console.log('[USER SERVICE] Attempting to create review comments...');
    
    if (!review) {
      console.log('[USER SERVICE] Review object is null/undefined');
      return updatedPr;
    }
    
    if (!review.issues) {
      console.log('[USER SERVICE] Review.issues is null/undefined');
      return updatedPr;
    }
    
    if (!Array.isArray(review.issues)) {
      console.log('[USER SERVICE] Review.issues is not an array, it is:', typeof review.issues);
      return updatedPr;
    }

    const issueCount = review.issues.length;
    console.log(`[USER SERVICE] Found ${issueCount} issues in review`);

    if (issueCount === 0) {
      console.log('ℹ[USER SERVICE] Issues array is empty - no comments to create');
      return updatedPr;
    }

    // Filter out any invalid issues
    console.log('[USER SERVICE] Validating issues...');
    const validIssues = review.issues.filter((issue: any, index: number) => {
      const isValid = issue && 
                     typeof issue === 'object' && 
                     issue.title && 
                     issue.description;
      
      if (!isValid) {
        console.warn(`[USER SERVICE] Issue #${index} is invalid:`, JSON.stringify(issue));
      } else {
        console.log(`[USER SERVICE] Issue #${index} is valid: "${issue.title}"`);
      }
      
      return isValid;
    });

    console.log(`[USER SERVICE] Found ${validIssues.length} valid issues out of ${issueCount}`);

    if (validIssues.length === 0) {
      console.log('[USER SERVICE] No valid issues to create comments for');
      return updatedPr;
    }

    // Create the comments
    console.log(`[USER SERVICE] Creating ${validIssues.length} review comments in database...`);
    
    try {
      await tx.reviewComment.createMany({
        data: validIssues.map((issue: any, index: number) => {
          const comment = {
            file: issue.location || "global",
            line: issue.line || 0,
            comment: `**${issue.severity?.toUpperCase() || 'INFO'}**: ${issue.title}\n\n${issue.description}\n\n**Suggestion:** ${issue.suggestion || 'Review this issue'}`,
            pullRequestId: prId
          };
          console.log(`   - Comment #${index}:`, {
            file: comment.file,
            line: comment.line,
            severity: issue.severity
          });
          return comment;
        })
      });
      console.log(`[USER SERVICE] Successfully created ${validIssues.length} review comments in database!`);
    } catch (error: any) {
      console.error('[USER SERVICE] Failed to create review comments:', error.message);
      throw error;
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
