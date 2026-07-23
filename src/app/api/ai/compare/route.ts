// app/api/ai/compare/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { AIPipeline } from "../../../lib/ai/AIPipeline";
import { JobRequirements } from "../../../lib/ai/types";
import { fetchAction } from "convex/nextjs";
// ============================================================
// Helper Functions
// ============================================================

function getTopSkill(results: any[]): string {
  const skillCount: Record<string, number> = {};
  for (const result of results) {
    const skills = result.parsedResume?.skills || [];
    for (const skill of skills) {
      const name = typeof skill === "string" ? skill : skill.name;
      if (name) {
        skillCount[name] = (skillCount[name] || 0) + 1;
      }
    }
  }

  let topSkill = "Unknown";
  let topCount = 0;
  for (const [skill, count] of Object.entries(skillCount)) {
    if (count > topCount) {
      topCount = count;
      topSkill = skill;
    }
  }
  return topSkill;
}

function getMostMissingSkill(results: any[]): string {
  const skillCount: Record<string, number> = {};
  const totalCandidates = results.length;

  for (const result of results) {
    const skills = result.parsedResume?.skills || [];
    const skillNames = skills.map((s: any) => (typeof s === "string" ? s : s.name));
    const uniqueSkills = new Set<string>(skillNames);
    for (const skill of uniqueSkills) {
      if (skill && typeof skill === "string") {
        skillCount[skill] = (skillCount[skill] || 0) + 1;
      }
    }
  }

  let mostMissing = "Unknown";
  let lowestCount = totalCandidates + 1;
  for (const [skill, count] of Object.entries(skillCount)) {
    if (count < lowestCount) {
      lowestCount = count;
      mostMissing = skill;
    }
  }
  return mostMissing;
}

function generateComparisonRecommendations(rankings: any[], insights: any): string[] {
  const recommendations: string[] = [];

  const topCandidates = rankings.filter((r: any) => r.score >= 80);
  const goodCandidates = rankings.filter((r: any) => r.score >= 60 && r.score < 80);

  if (topCandidates.length > 0) {
    recommendations.push(
      `Top candidate: ${topCandidates[0].name} (${topCandidates[0].score}%) - ${topCandidates[0].recommendation}`
    );
  }

  if (goodCandidates.length > 0) {
    recommendations.push(`${goodCandidates.length} candidate(s) are strong backups`);
  }

  if (insights.missingSkill !== "Unknown") {
    recommendations.push(
      `Most candidates lack "${insights.missingSkill}" - consider adjusting job requirements`
    );
  }

  if (insights.distribution.top === 0 && insights.distribution.middle === 0) {
    recommendations.push(
      "No candidates meet minimum requirements - consider broadening your search criteria"
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("All candidates meet basic requirements. Consider interviewing the top 3.");
  }

  return recommendations;
}

// ============================================================
// POST Handler
// ============================================================

export async function POST(request: Request) {
  try {
    // 1. Authenticate the caller server-side. The employerId used for
    //    every downstream read/write below comes ONLY from this verified
    //    session — never from the request body.
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = (await getToken({ template: "convex" })) ?? undefined;
    if (!token) {
      return NextResponse.json(
        { error: "Unable to verify session with Convex" },
        { status: 401 }
      );
    }

    const employerId = userId;

    const { candidateIds, jobId } = await request.json();

    if (!candidateIds || candidateIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 candidate IDs are required for comparison" },
        { status: 400 }
      );
    }

    // 2. Fetch job requirements and verify the job actually belongs to
    //    the authenticated employer before using or persisting anything
    //    against it.
    let jobRequirements: JobRequirements | null = null;
    if (jobId) {
      const job = await fetchQuery(
        api.jobs.getJobById,
        { jobId: jobId as Id<"jobs"> },
        { token }
      );

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      if (job.employerId !== employerId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      jobRequirements = {
        jobRole: job.title || "Software Engineer",
        requiredSkills: (job.requirements || []).map((r: any) => ({
          name: typeof r === "string" ? r : r.name || r,
          mandatory: true,
        })),
        preferredSkills: [],
        mandatorySkills: [],
        certifications: [],
        educationLevel: "bachelors",
        educationField: "Computer Science",
        minExperience: 3,
      };
    }

    // 3. Fetch this employer's applications. getEmployerApplications now
    //    also independently verifies identity.subject === employerId
    //    (see convex/applications.ts change below) — defense in depth.
    let allApplications: any[] = [];
    try {
      allApplications = await fetchQuery(
        api.applications.getEmployerApplications,
        { employerId },
        { token }
      );
    } catch (error) {
      console.warn("Could not fetch applications, using fallback:", error);
    }

    // Only compare candidates that actually belong to this employer's
    // applicant pool — ignore any candidateIds that don't resolve.
    const applicationsMap = new Map();
    for (const app of allApplications) {
      if (candidateIds.includes(app._id)) {
        applicationsMap.set(app._id, app);
      }
    }

    const validCandidateIds = candidateIds.filter((id: string) => applicationsMap.has(id));

    if (validCandidateIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 valid candidates belonging to this employer are required" },
        { status: 400 }
      );
    }

    // 4. Run each candidate through the AI Pipeline
    const pipeline = new AIPipeline();
    const results = await Promise.all(
      validCandidateIds.map(async (id: string) => {
        const application = applicationsMap.get(id);

        let resumeText = "No resume text available";
               if (application?.resumeFileId) {
                  try {
                    resumeText = await fetchAction(
                      api.applicationResume.getResumeTextForApplication,
                      { applicationId: id as Id<"applications"> },
                      { token }
                    );
                  } catch (e) {
                    console.warn(`Could not extract resume text for candidate ${id}:`, e);
                  }
                }

        const defaultJob: JobRequirements = jobRequirements || {
          jobRole: "Software Engineer",
          requiredSkills: [{ name: "JavaScript", mandatory: true }],
          preferredSkills: [],
          mandatorySkills: [],
          certifications: [],
          educationLevel: "bachelors",
          educationField: "Computer Science",
          minExperience: 2,
        };

        const result = await pipeline.processResume(resumeText, defaultJob, id, token);

        return {
          candidateId: id,
          candidateName: application?.candidateName || "Unknown Candidate",
          ...result,
        };
      })
    );

    // 5. Rank candidates by overall score
    const rankings = results
      .map((r) => ({
        candidateId: r.candidateId,
        name: r.candidateName,
        score: r.score.overall,
        confidence: r.confidence.score,
        risk: r.score.risk,
        strengths: r.score.explainability?.strongestFactors || [],
        weaknesses: r.score.explainability?.weakestFactors || [],
        recommendation: r.recommendations[0] || "Review candidate",
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // 6. Generate comparison insights
    const insights = {
      topSkill: getTopSkill(results),
      missingSkill: getMostMissingSkill(results),
      averageScore: Math.round(
        rankings.reduce((sum, r) => sum + r.score, 0) / rankings.length
      ),
      totalCandidates: rankings.length,
      distribution: {
        top: rankings.filter((r) => r.score >= 80).length,
        middle: rankings.filter((r) => r.score >= 60 && r.score < 80).length,
        bottom: rankings.filter((r) => r.score < 60).length,
      },
    };

    // 7. Save comparison to Convex, scoped to the authenticated employer.
    //    saveComparison also independently verifies ownership.
    let comparisonId = null;
    try {
      comparisonId = await fetchMutation(
        api.ai.saveComparison,
        {
          employerId,
          jobId: jobId ? (jobId as Id<"jobs">) : undefined,
          candidateIds: validCandidateIds,
          rankings: rankings.map((r) => ({
            candidateId: r.candidateId,
            rank: r.rank,
            score: r.score,
            recommendation: r.recommendation,
            strengths: r.strengths,
            weaknesses: r.weaknesses,
          })),
          insights,
        },
        { token }
      );
    } catch (error) {
      console.warn("Failed to save comparison to Convex:", error);
    }

    // 8. Generate recommendations
    const recommendations = generateComparisonRecommendations(rankings, insights);

    return NextResponse.json({
      success: true,
      comparisonId,
      rankings,
      insights,
      recommendations,
    });
  } catch (error) {
    console.error("Comparison Error:", error);
    return NextResponse.json({ error: "Failed to compare candidates" }, { status: 500 });
  }
}