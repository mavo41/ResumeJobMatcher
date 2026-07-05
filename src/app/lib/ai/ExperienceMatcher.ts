import { SkillEmbeddings } from "./SkillEmbeddings";
import { SkillSynonyms } from "./SkillSynonyms";

export interface ExperienceRole {
  title: string;
  company: string;
  duration: number; // months
  description: string;
  achievements: string[];
  technologies?: string[];
}

export interface ExperienceScoreResult {
  score: number;
  details: string;
  reasoning: string[];
  matchedRoles: string[];
  unmatchedRoles: string[];
  relevantYears: number;
  leadershipScore: number;
  progressionScore: number;
}

export class ExperienceMatcher {

  private embeddings: SkillEmbeddings;
  private synonyms = new SkillSynonyms();

  private semanticThreshold = 0.58;

  constructor(convexUrl?: string) {
    this.embeddings = new SkillEmbeddings(convexUrl);
  }

  /**
   * Common equivalent job titles.
   * These prevent unnecessary embedding calls.
   */

  private roleSynonyms = new Map<string, string[]>([

    [
      "software engineer",
      [
        "software developer",
        "developer",
        "programmer",
        "application developer",
        "backend developer",
        "frontend developer",
        "full stack developer",
        "fullstack developer"
      ]
    ],

    [
      "frontend developer",
      [
        "frontend engineer",
        "react developer",
        "angular developer",
        "vue developer",
        "ui engineer"
      ]
    ],

    [
      "backend developer",
      [
        "api developer",
        "node developer",
        "java developer",
        "server engineer"
      ]
    ],

    [
      "devops engineer",
      [
        "cloud engineer",
        "site reliability engineer",
        "sre",
        "platform engineer"
      ]
    ],

    [
      "data scientist",
      [
        "ml engineer",
        "machine learning engineer",
        "ai engineer",
        "data analyst"
      ]
    ],

    [
      "project manager",
      [
        "delivery manager",
        "project lead",
        "technical project manager"
      ]
    ]

  ]);

  /**
   * Detect job seniority.
   */

  private detectLevel(role: string): number {

    const r = role.toLowerCase();

    if (
      r.includes("principal") ||
      r.includes("staff engineer")
    ) {
      return 6;
    }

    if (
      r.includes("head") ||
      r.includes("director")
    ) {
      return 5;
    }

    if (
      r.includes("lead")
    ) {
      return 4;
    }

    if (
      r.includes("senior")
    ) {
      return 3;
    }

    if (
      r.includes("mid")
    ) {
      return 2;
    }

    if (
      r.includes("junior")
    ) {
      return 1;
    }

    return 2;

  }

  /**
   * Leadership keyword detection.
   */

  private leadershipKeywords = [

    "managed",
    "led",
    "mentored",
    "coached",
    "architected",
    "supervised",
    "owned",
    "directed",
    "designed strategy",
    "team lead"

  ];

  /**
   * Domain keywords.
   */

  private domains = [

    "finance",
    "healthcare",
    "education",
    "banking",
    "insurance",
    "retail",
    "telecommunications",
    "manufacturing",
    "government",
    "cybersecurity",
    "artificial intelligence",
    "machine learning"

  ];

    /**
   * Match one candidate role against the required role.
   */
  async matchRole(
    candidateRole: string,
    requiredRole: string
  ): Promise<{
    match: boolean;
    score: number;
    reasoning: string;
  }> {

    const candidate = candidateRole.toLowerCase().trim();
    const required = requiredRole.toLowerCase().trim();

    // Exact match
    if (candidate === required) {
      return {
        match: true,
        score: 1,
        reasoning: "Exact role match"
      };
    }

    // Synonym match
    const synonyms = this.roleSynonyms.get(required);

    if (synonyms) {
      for (const synonym of synonyms) {
        if (
          candidate.includes(synonym) ||
          synonym.includes(candidate)
        ) {
          return {
            match: true,
            score: 0.9,
            reasoning: `Matched synonym (${synonym})`
          };
        }
      }
    }

    // Semantic similarity
    try {

      const similarity =
        await this.embeddings.calculateSimilarity(
          candidateRole,
          requiredRole
        );

      if (similarity >= this.semanticThreshold) {

        return {
          match: true,
          score: similarity,
          reasoning:
            `Semantic similarity ${(similarity * 100).toFixed(0)}%`
        };

      }

    } catch (err) {
      console.warn("Embedding comparison failed.", err);
    }

    return {
      match: false,
      score: 0,
      reasoning: "No meaningful similarity"
    };

  }

  /**
   * Detect leadership contribution.
   */
  private leadershipScore(role: ExperienceRole): number {

    let score = 0;

    const text =
      (
        role.description +
        " " +
        role.achievements.join(" ")
      ).toLowerCase();

    for (const keyword of this.leadershipKeywords) {

      if (text.includes(keyword)) {
        score += 10;
      }

    }

    return Math.min(score, 100);

  }

  /**
   * Detect domain relevance.
   */

  private domainScore(role: ExperienceRole): number {

    const text =
      (
        role.description +
        " " +
        role.company
      ).toLowerCase();

    let score = 0;

    for (const domain of this.domains) {

      if (text.includes(domain)) {
        score += 20;
      }

    }

    return Math.min(score, 100);

  }

  /**
   * Career progression score.
   */

  private progressionScore(
    roles: ExperienceRole[]
  ): number {

    if (roles.length < 2) {
      return 50;
    }

    let improvements = 0;

    for (let i = 1; i < roles.length; i++) {

      const previous =
        this.detectLevel(roles[i - 1].title);

      const current =
        this.detectLevel(roles[i].title);

      if (current > previous) {
        improvements++;
      }

    }

    return Math.round(
      (improvements /
        (roles.length - 1)) *
        100
    );

  }

  /**
   * Calculate total relevant experience.
   */

  private calculateRelevantYears(
    roles: ExperienceRole[]
  ): number {

    let totalMonths = 0;

    for (const role of roles) {
      totalMonths += role.duration;
    }

    return totalMonths / 12;

  }

  /**
   * Main scoring algorithm.
   */

  async scoreExperience(
    candidateRoles: ExperienceRole[],
    requiredRole: string,
    minimumYears: number
  ): Promise<ExperienceScoreResult> {

    if (!candidateRoles.length) {

      return {

        score: 0,

        details: "No work experience found.",

        reasoning: [
          "Candidate has no employment history."
        ],

        matchedRoles: [],

        unmatchedRoles: [],

        relevantYears: 0,

        leadershipScore: 0,

        progressionScore: 0

      };

    }

    const matchedRoles: string[] = [];
    const unmatchedRoles: string[] = [];
    const reasoning: string[] = [];

    let similarityTotal = 0;

    for (const role of candidateRoles) {

      const result =
        await this.matchRole(
          role.title,
          requiredRole
        );

      if (result.match) {

        matchedRoles.push(role.title);

        reasoning.push(
          `${role.title}: ${result.reasoning}`
        );

        similarityTotal += result.score;

      } else {

        unmatchedRoles.push(role.title);

      }

    }

    const averageSimilarity =
      similarityTotal /
      Math.max(matchedRoles.length, 1);

    const years =
      this.calculateRelevantYears(
        candidateRoles
      );

    const yearsScore =
      Math.min(
        (years /
          Math.max(minimumYears, 1))
        * 100,
        100
      );

    const leadership =
      candidateRoles.reduce(
        (sum, role) =>
          sum + this.leadershipScore(role),
        0
      ) / candidateRoles.length;

    const progression =
      this.progressionScore(candidateRoles);

    const domain =
      candidateRoles.reduce(
        (sum, role) =>
          sum + this.domainScore(role),
        0
      ) / candidateRoles.length;

    /**
     * Weighted score.
     */

    const finalScore =

      averageSimilarity * 100 * 0.40 +

      yearsScore * 0.30 +

      leadership * 0.10 +

      progression * 0.10 +

      domain * 0.10;

    return {

      score:
        Math.round(
          Math.min(finalScore, 100)
        ),

      details:
        `${years.toFixed(1)} years of relevant experience.`,

      reasoning,

      matchedRoles,

      unmatchedRoles,

      relevantYears: years,

      leadershipScore:
        Math.round(leadership),

      progressionScore:
        Math.round(progression)

    };

  }

}