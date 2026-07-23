import { SkillEmbeddings } from "./SkillEmbeddings";
import { SkillSynonyms } from "./SkillSynonyms";

export interface EducationMatchResult {
  score: number;
  matched: boolean;
  confidence: number;
  reasoning: string;
  matchedLevel: string;
  matchedField: string;
  semanticSimilarity: number;
}

export interface EducationLevelResult {
  score: number;
  matched: boolean;
  reasoning: string;
}

export class EducationMatcher {

  private embeddings: SkillEmbeddings;

  private synonyms = new SkillSynonyms();

  private semanticThreshold = 0.72;


  private educationLevels = {
    high_school: 1,
    diploma: 2,
    associate: 3,
    bachelors: 4,
    honours: 5,
    masters: 6,
    phd: 7,
  };


  private degreeAliases: Record<string, string[]> = {

    bachelors: [
      "bachelor",
      "bsc",
      "b.sc",
      "ba",
      "b.a",
      "beng",
      "b.eng",
      "btech",
      "b.tech",
      "bs",
      "undergraduate"
    ],

    honours: [
      "honours",
      "honors"
    ],

    masters: [
      "master",
      "msc",
      "m.sc",
      "ma",
      "mba",
      "meng",
      "m.eng",
      "mtech",
      "m.tech"
    ],

    phd: [
      "doctor",
      "doctorate",
      "phd",
      "dphil"
    ],

    diploma: [
      "diploma",
      "higher diploma",
      "national diploma"
    ],

    associate: [
      "associate",
      "associate degree"
    ],

    high_school: [
      "kcse",
      "high school",
      "secondary",
      "form four"
    ]
  };


  private fieldRelationships: Record<string, string[]> = {

    "computer science": [
      "software engineering",
      "information technology",
      "informatics",
      "computer engineering",
      "computing",
      "ict",
      "information systems"
    ],

    "software engineering": [
      "computer science",
      "information technology",
      "computer engineering",
      "application development"
    ],

    "information technology": [
      "computer science",
      "software engineering",
      "network engineering",
      "information systems"
    ],

    "information systems": [
      "information technology",
      "computer science",
      "business information systems"
    ],

    "cyber security": [
      "computer science",
      "information technology",
      "network security"
    ],

    "data science": [
      "statistics",
      "computer science",
      "artificial intelligence",
      "machine learning",
      "analytics"
    ],

    "artificial intelligence": [
      "computer science",
      "data science",
      "machine learning"
    ],

    "machine learning": [
      "artificial intelligence",
      "data science",
      "computer science"
    ],

    "computer engineering": [
      "computer science",
      "electrical engineering",
      "software engineering"
    ],

    "electrical engineering": [
      "computer engineering",
      "electronics"
    ],

    "business administration": [
      "commerce",
      "economics",
      "management"
    ],

    "economics": [
      "finance",
      "business administration",
      "commerce"
    ],

    "statistics": [
      "mathematics",
      "data science"
    ],

    "mathematics": [
      "statistics",
      "computer science"
    ]
  };

  private stemFields = [

    "computer science",
    "software engineering",
    "information technology",
    "computer engineering",
    "cyber security",
    "information systems",
    "artificial intelligence",
    "machine learning",
    "data science",
    "mathematics",
    "statistics",
    "physics",
    "engineering",
    "electrical engineering"
  ];

  constructor(convexUrl?: string) {

    this.embeddings = new SkillEmbeddings(convexUrl);

  }

    
  async matchEducation(
    candidateDegree: string,
    candidateField: string,
    requiredField: string
  ): Promise<EducationMatchResult> {

    const normalizedCandidate =
      this.normalizeField(candidateField);

    const normalizedRequired =
      this.normalizeField(requiredField);


    if (
      normalizedCandidate === normalizedRequired
    ) {
      return {
        score: 100,
        matched: true,
        confidence: 100,
        reasoning:
          `Exact education field match (${candidateField})`,
        matchedLevel: candidateDegree,
        matchedField: normalizedCandidate,
        semanticSimilarity: 1,
      };
    }

    const related =
      this.fieldRelationships[
        normalizedRequired
      ] ?? [];

    if (
      related.includes(normalizedCandidate)
    ) {
      return {
        score: 90,
        matched: true,
        confidence: 95,
        reasoning:
          `${candidateField} is closely related to ${requiredField}`,
        matchedLevel: candidateDegree,
        matchedField: normalizedCandidate,
        semanticSimilarity: 0.90,
      };
    }



    const reverse =
      this.fieldRelationships[
        normalizedCandidate
      ] ?? [];

    if (
      reverse.includes(normalizedRequired)
    ) {
      return {
        score: 90,
        matched: true,
        confidence: 95,
        reasoning:
          `${candidateField} belongs to the same education family as ${requiredField}`,
       matchedLevel: candidateDegree,
       matchedField: normalizedCandidate,
       semanticSimilarity: 0.90,
      };
    }

    if (
      this.stemFields.includes(normalizedCandidate)
      &&
      this.stemFields.includes(normalizedRequired)
    ) {
      return {
        score: 75,
        matched: true,
        confidence: 80,
        reasoning:
          `${candidateField} is a STEM discipline related to ${requiredField}`,
        matchedLevel: candidateDegree,
        matchedField: normalizedCandidate,
        semanticSimilarity: 0.75,
      };
    }

    // try {
    //   const similarity =
    //     await this.embeddings.calculateSimilarity(
    //       normalizedCandidate,
    //       normalizedRequired
    //     );

    //   if (
    //     similarity >= this.semanticThreshold
    //   ) {
    //     return {
    //       score: Math.round(similarity * 100),
    //       matched: true,
    //       confidence: Math.round(similarity * 100),
    //       reasoning:
    //         `Semantic AI determined ${candidateField} is closely related to ${requiredField} (${Math.round(similarity * 100)}%)`,
    //       matchedLevel: candidateDegree,
    //       matchedField: normalizedCandidate,
    //       semanticSimilarity: similarity,
    //     };
    //   }
    // }

    // catch (error) {
    //   console.warn(
    //     "Education semantic matching failed",
    //     error
    //   );
    // }

    return {
      score: 0,
      matched: false,
      confidence: 100,
      reasoning:
        `${candidateField} does not satisfy the required education field (${requiredField})`,
      matchedLevel: candidateDegree,
      matchedField: normalizedCandidate,
      semanticSimilarity: 0,

    };

  }

  scoreEducationLevel(
    candidateLevel:
      | "high_school"
      | "diploma"
      | "associate"
      | "bachelors"
      | "honours"
      | "masters"
      | "phd",

    requiredLevel:
      | "high_school"
      | "diploma"
      | "associate"
      | "bachelors"
      | "honours"
      | "masters"
      | "phd"
  ): EducationLevelResult {
    const candidate =
      this.educationLevels[candidateLevel];

    const required =
      this.educationLevels[requiredLevel];

    if (candidate >= required) {

      return {
        score: 100,
        matched: true,
        reasoning:
          `${candidateLevel} satisfies the required ${requiredLevel}.`
      };

    }

    const percentage =
      Math.round((candidate / required) * 100);

    return {
      score: percentage,
      matched: false,
      reasoning:
        `${candidateLevel} is below the required ${requiredLevel}.`
    };
  }
  detectEducationLevel(
    degree: string
  ):
    | "high_school"
    | "diploma"
    | "associate"
    | "bachelors"
    | "honours"
    | "masters"
    | "phd" {
    const lower =
      degree.toLowerCase();

    for (const [level, aliases] of Object.entries(
      this.degreeAliases
    )) {

      if (
        aliases.some(alias =>
          lower.includes(alias)
        )
      ) {
        return level as any;
      }
    }
    return "bachelors";
  }

  private normalizeField(
    field: string
  ): string {
    const normalized =
      field
        .trim()
        .toLowerCase();

    for (

      const [canonical, related]

      of Object.entries(
        this.fieldRelationships
      )

    ) {

      if (normalized === canonical) {

        return canonical;

      }

      if (

        related.includes(normalized)

      ) {

        return canonical;

      }

    }

    return normalized;

  }
  getCanonicalDegree(

    degree: string

  ): string {

    return this.detectEducationLevel(
      degree
    );

  }
  isStemField(field: string): boolean {

    const normalized = this.normalizeField(field);

    return this.stemFields.includes(normalized);

  }
  isRelatedField(
    candidateField: string,
    requiredField: string
  ): boolean {

    const candidate = this.normalizeField(candidateField);
    const required = this.normalizeField(requiredField);

    if (candidate === required) {
      return true;
    }

    const requiredRelations =
      this.fieldRelationships[required] ?? [];

    if (requiredRelations.includes(candidate)) {
      return true;
    }

    const candidateRelations =
      this.fieldRelationships[candidate] ?? [];

    return candidateRelations.includes(required);

  }
  async compareEducationFields(
    candidateField: string,
    requiredField: string
  ): Promise<number> {

    const result = await this.matchEducation(
      "",
      candidateField,
      requiredField
    );

    return result.score;

  }
  async calculateOverallEducationScore(
    degree: string,
    candidateField: string,
    requiredLevel:
      | "high_school"
      | "diploma"
      | "associate"
      | "bachelors"
      | "honours"
      | "masters"
      | "phd",
    requiredField: string
  ): Promise<{
    score: number;
    reasoning: string;
  }> {

    const detectedLevel =
      this.detectEducationLevel(degree);

    const levelResult =
      this.scoreEducationLevel(
        detectedLevel,
        requiredLevel
      );

    const fieldResult =
      await this.matchEducation(
        degree,
        candidateField,
        requiredField
      );

    const score = Math.round(
      levelResult.score * 0.40 +
      fieldResult.score * 0.60
    );

    return {

      score,

      reasoning:
        `${fieldResult.reasoning}. ${levelResult.reasoning}`

    };

  }

  getSupportedLevels(): Array<
    | "high_school"
    | "diploma"
    | "associate"
    | "bachelors"
    | "honours"
    | "masters"
    | "phd"
  > {

    return Object.keys(
      this.educationLevels
    ) as Array<
      | "high_school"
      | "diploma"
      | "associate"
      | "bachelors"
      | "honours"
      | "masters"
      | "phd"
    >;
  }
  
  getRelatedFields(
    field: string
  ): string[] {

    const normalized =
      this.normalizeField(field);
    return this.fieldRelationships[
      normalized
    ] ?? [];
  }
}