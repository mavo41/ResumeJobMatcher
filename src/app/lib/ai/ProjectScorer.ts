import { SkillSynonyms } from "./SkillSynonyms";

export interface Project {

  name: string;

  description: string;

  technologies: string[];

  url?: string;

}

export interface ProjectEvaluation {

  score: number;

  details: string[];

  strengths: string[];

  weaknesses: string[];

}

export class ProjectScorer {

  private synonyms = new SkillSynonyms();

  /**
   * Modern technologies receive
   * slightly higher scores.
   */

  private modernTech = [

    "react",
    "next.js",
    "typescript",
    "node.js",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "graphql",
    "postgresql",
    "mongodb",
    "tailwind",
    "python",
    "fastapi",
    "nestjs"

  ];

  /**
   * Indicates measurable impact.
   */

  private impactKeywords = [

    "improved",
    "reduced",
    "saved",
    "optimized",
    "generated",
    "boosted",
    "increased",
    "decreased",
    "accelerated",
    "automated",
    "scaled"

  ];

  /**
   * Leadership indicators.
   */

  private leadershipKeywords = [

    "led",

    "managed",

    "architected",

    "mentored",

    "coordinated",

    "owned"

  ];

  /**
   * Innovation indicators.
   */

  private innovationKeywords = [

    "ai",

    "machine learning",

    "artificial intelligence",

    "blockchain",

    "computer vision",

    "nlp",

    "recommendation system",

    "predictive",

    "semantic search"

  ];

  /**
   * Production deployment.
   */

  private deploymentPlatforms = [

    "vercel",

    "netlify",

    "aws",

    "azure",

    "railway",

    "render",

    "firebase"

  ];

  /**
   * Score one project.
   */

  scoreProject(
    project: Project
  ): ProjectEvaluation {

    let score = 30;

    const strengths: string[] = [];

    const weaknesses: string[] = [];

    const details: string[] = [];

    const description =
      project.description.toLowerCase();

    /**
     * Public repository.
     */

    if (project.url) {

      score += 10;

      strengths.push(
        "Public repository available"
      );

    } else {

      weaknesses.push(
        "No public repository"
      );

    }

    /**
     * Description quality.
     */

    if (project.description.length > 250) {

      score += 10;

      strengths.push(
        "Detailed description"
      );

    }

    else if (
      project.description.length > 120
    ) {

      score += 6;

    }

    else {

      weaknesses.push(
        "Description is short"
      );

    }

    /**
     * Technology diversity.
     */

    const uniqueTech =
      new Set(
        project.technologies.map(
          t => this.synonyms.getCanonical(t)
        )
      );

    if (uniqueTech.size >= 6) {

      score += 12;

      strengths.push(
        "Uses diverse technologies"
      );

    }

    else if (uniqueTech.size >= 3) {

      score += 7;

    }

    else {

      weaknesses.push(
        "Limited technology stack"
      );

    }

    /**
     * Modern stack.
     */

    let modernCount = 0;

    uniqueTech.forEach(tech => {

      if (
        this.modernTech.includes(
          tech.toLowerCase()
        )
      ) {

        modernCount++;

      }

    });

    score += Math.min(modernCount * 2, 12);

    if (modernCount >= 4) {

      strengths.push(
        "Uses modern technologies"
      );

    }

        /**
     * Business impact.
     */

    let impactHits = 0;

    for (const keyword of this.impactKeywords) {

      if (description.includes(keyword)) {
        impactHits++;
      }

    }

    if (impactHits > 0) {

      score += Math.min(impactHits * 3, 15);

      strengths.push(
        "Project demonstrates measurable impact"
      );

    } else {

      weaknesses.push(
        "No measurable business impact described"
      );

    }

    /**
     * Quantified achievements.
     */

    const quantified =
      /\d+%|\d+x|\d+\+|\$\d+|\d+\s*(users|customers|downloads|requests|transactions)/i;

    if (quantified.test(project.description)) {

      score += 8;

      strengths.push(
        "Includes quantified achievements"
      );

    }

    /**
     * Innovation.
     */

    let innovationHits = 0;

    for (const keyword of this.innovationKeywords) {

      if (description.includes(keyword)) {
        innovationHits++;
      }

    }

    if (innovationHits > 0) {

      score += Math.min(innovationHits * 3, 10);

      strengths.push(
        "Demonstrates innovation"
      );

    }

    /**
     * Leadership.
     */

    let leadershipHits = 0;

    for (const keyword of this.leadershipKeywords) {

      if (description.includes(keyword)) {
        leadershipHits++;
      }

    }

    if (leadershipHits > 0) {

      score += 6;

      strengths.push(
        "Shows leadership responsibilities"
      );

    }

    /**
     * Deployment detection.
     */

    let deployed = false;

    if (project.url) {

      deployed = true;

    } else {

      for (const platform of this.deploymentPlatforms) {

        if (description.includes(platform)) {

          deployed = true;
          break;

        }

      }

    }

    if (deployed) {

      score += 8;

      strengths.push(
        "Production deployment available"
      );

    } else {

      weaknesses.push(
        "No deployment information"
      );

    }

    /**
     * Documentation quality.
     */

    if (

      description.includes("architecture") ||

      description.includes("design") ||

      description.includes("api") ||

      description.includes("database")

    ) {

      score += 5;

      strengths.push(
        "Good technical documentation"
      );

    }

    /**
     * ATS keyword richness.
     */

    const atsKeywords = [

      "scalable",
      "responsive",
      "secure",
      "authentication",
      "authorization",
      "performance",
      "optimization",
      "testing",
      "deployment",
      "ci/cd"

    ];

    let atsHits = 0;

    for (const keyword of atsKeywords) {

      if (description.includes(keyword)) {
        atsHits++;
      }

    }

    score += Math.min(atsHits, 5);

    /**
     * Final explanation.
     */

    details.push(...strengths);

    if (weaknesses.length > 0) {

      details.push(
        `Areas for improvement: ${weaknesses.join(", ")}`
      );

    }

    return {

      score: Math.min(
        Math.round(score),
        100
      ),

      details,

      strengths,

      weaknesses

    };

  }

  /**
   * Evaluate every project.
   */

  scoreProjects(
    projects: Project[]
  ): {

    score: number;

    details: string[];

    strongestProject?: string;

    weakestProject?: string;

  } {

    if (!projects || projects.length === 0) {

      return {

        score: 0,

        details: [

          "No projects provided."

        ]

      };

    }

    const evaluations =
      projects.map(project => ({

        project,

        result:
          this.scoreProject(project)

      }));

    const average =

      evaluations.reduce(

        (sum, item) =>
          sum + item.result.score,

        0

      ) / evaluations.length;

    const strongest =
      evaluations.reduce((a, b) =>
        a.result.score > b.result.score ? a : b
      );

    const weakest =
      evaluations.reduce((a, b) =>
        a.result.score < b.result.score ? a : b
      );

    const summary: string[] = [];

    summary.push(

      `${projects.length} projects analysed.`

    );

    summary.push(

      `Strongest project: ${strongest.project.name}.`

    );

    summary.push(

      `Average project quality: ${Math.round(average)}/100.`

    );

    summary.push(

      `Most common strengths: ${strongest.result.strengths.slice(0,3).join(", ")}.`

    );

    if (weakest.result.weaknesses.length > 0) {

      summary.push(

        `Common improvements: ${weakest.result.weaknesses.slice(0,3).join(", ")}.`

      );

    }

    return {

      score: Math.round(average),

      details: summary,

      strongestProject: strongest.project.name,

      weakestProject: weakest.project.name

    };

  }

}