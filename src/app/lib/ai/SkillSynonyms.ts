export interface SkillMatch {
  original: string;
  normalized: string;
  confidence: number;
  source:
    | "exact"
    | "synonym"
    | "alias"
    | "fuzzy"
    | "semantic"
    | "manual";
}

export interface SkillDictionary {
  canonical: string;
  aliases: string[];
  category: string;
  importance?: number;
}

export class SkillSynonyms {

  /**
   * Internal lookup tables
   */
  private dictionary = new Map<string, SkillDictionary>();

  private reverseLookup = new Map<string, string>();

  /**
   * Recruiter custom aliases
   */
  private customAliases = new Map<string, string>();

  /**
   * Constructor
   */
  constructor() {
    this.initializeDictionary();
    this.buildReverseLookup();
  }

  // Core Dictionary

  private initializeDictionary(): void {

    const skills: SkillDictionary[] = [

      // Programming Languages

      {
        canonical: "JavaScript",
        category: "Programming",
        aliases: [
          "js",
          "javascript",
          "ecmascript",
          "es6",
          "es7",
          "es8",
          "es2015"
        ]
      },

      {
        canonical: "TypeScript",
        category: "Programming",
        aliases: [
          "ts",
          "typescript",
          "typed javascript"
        ]
      },

      {
        canonical: "Python",
        category: "Programming",
        aliases: [
          "python",
          "py"
        ]
      },

      {
        canonical: "Java",
        category: "Programming",
        aliases: [
          "java",
          "jdk",
          "j2ee",
          "java se",
          "java ee"
        ]
      },

      {
        canonical: "C#",
        category: "Programming",
        aliases: [
          "c#",
          "csharp",
          "dotnet",
          ".net",
          ".net core",
          "asp.net"
        ]
      },

      {
        canonical: "PHP",
        category: "Programming",
        aliases: [
          "php"
        ]
      },

      {
        canonical: "Go",
        category: "Programming",
        aliases: [
          "go",
          "golang"
        ]
      },

      {
        canonical: "Rust",
        category: "Programming",
        aliases: [
          "rust",
          "rustlang"
        ]
      },

      {
        canonical: "Kotlin",
        category: "Programming",
        aliases: [
          "kotlin"
        ]
      },

      {
        canonical: "Swift",
        category: "Programming",
        aliases: [
          "swift"
        ]
      },

      // Frontend

      {
        canonical: "React",
        category: "Frontend",
        aliases: [
          "react",
          "reactjs",
          "react.js"
        ]
      },

      {
        canonical: "Next.js",
        category: "Frontend",
        aliases: [
          "next",
          "nextjs",
          "next.js"
        ]
      },

      {
        canonical: "Vue",
        category: "Frontend",
        aliases: [
          "vue",
          "vuejs",
          "vue.js"
        ]
      },

      {
        canonical: "Angular",
        category: "Frontend",
        aliases: [
          "angular",
          "angularjs",
          "ng"
        ]
      },

      {
        canonical: "Tailwind CSS",
        category: "Frontend",
        aliases: [
          "tailwind",
          "tailwindcss",
          "tailwind css"
        ]
      },

      {
        canonical: "Bootstrap",
        category: "Frontend",
        aliases: [
          "bootstrap"
        ]
      },

      {
        canonical: "HTML",
        category: "Frontend",
        aliases: [
          "html",
          "html5"
        ]
      },

      {
        canonical: "CSS",
        category: "Frontend",
        aliases: [
          "css",
          "css3",
          "scss",
          "sass"
        ]
      },

      // Backend

      {
        canonical: "Node.js",
        category: "Backend",
        aliases: [
          "node",
          "nodejs",
          "node.js"
        ]
      },

      {
        canonical: "Express",
        category: "Backend",
        aliases: [
          "express",
          "expressjs",
          "express.js"
        ]
      },

      {
        canonical: "Laravel",
        category: "Backend",
        aliases: [
          "laravel"
        ]
      },

      {
        canonical: "Spring Boot",
        category: "Backend",
        aliases: [
          "spring",
          "springboot",
          "spring boot"
        ]
      },

      {
        canonical: "Django",
        category: "Backend",
        aliases: [
          "django"
        ]
      },

      {
        canonical: "Flask",
        category: "Backend",
        aliases: [
          "flask"
        ]
      },

      // Databases

      {
        canonical: "MySQL",
        category: "Database",
        aliases: [
          "mysql",
          "my sql"
        ]
      },

      {
        canonical: "PostgreSQL",
        category: "Database",
        aliases: [
          "postgres",
          "postgresql",
          "psql"
        ]
      },

      {
        canonical: "MongoDB",
        category: "Database",
        aliases: [
          "mongodb",
          "mongo"
        ]
      },

      {
        canonical: "SQLite",
        category: "Database",
        aliases: [
          "sqlite",
          "sqlite3"
        ]
      },

      {
        canonical: "Redis",
        category: "Database",
        aliases: [
          "redis"
        ]
      },

      {
        canonical: "Elasticsearch",
        category: "Database",
        aliases: [
          "elastic",
          "elasticsearch",
          "elk"
        ]
      },

      // Cloud Platforms

      {
        canonical: "AWS",
        category: "Cloud",
        aliases: [
          "aws",
          "amazon web services",
          "ec2",
          "lambda",
          "cloudformation",
          "s3",
          "iam",
          "rds"
        ]
      },

      {
        canonical: "Microsoft Azure",
        category: "Cloud",
        aliases: [
          "azure",
          "microsoft azure",
          "azure cloud"
        ]
      },

      {
        canonical: "Google Cloud",
        category: "Cloud",
        aliases: [
          "gcp",
          "google cloud",
          "google cloud platform"
        ]
      },

      // DevOps

      {
        canonical: "Docker",
        category: "DevOps",
        aliases: [
          "docker",
          "containers",
          "containerization"
        ]
      },

      {
        canonical: "Kubernetes",
        category: "DevOps",
        aliases: [
          "kubernetes",
          "k8s",
          "kube"
        ]
      },

      {
        canonical: "Terraform",
        category: "DevOps",
        aliases: [
          "terraform",
          "iac",
          "infrastructure as code"
        ]
      },

      {
        canonical: "Jenkins",
        category: "DevOps",
        aliases: [
          "jenkins",
          "jenkins ci"
        ]
      },

      {
        canonical: "GitHub Actions",
        category: "DevOps",
        aliases: [
          "github actions",
          "github workflows",
          "github ci"
        ]
      },

      {
        canonical: "CI/CD",
        category: "DevOps",
        aliases: [
          "ci",
          "cd",
          "ci/cd",
          "continuous integration",
          "continuous delivery",
          "continuous deployment"
        ]
      },

      // AI / Machine Learning

      {
        canonical: "Machine Learning",
        category: "Artificial Intelligence",
        aliases: [
          "machine learning",
          "ml"
        ]
      },

      {
        canonical: "Deep Learning",
        category: "Artificial Intelligence",
        aliases: [
          "deep learning",
          "dl",
          "neural networks"
        ]
      },

      {
        canonical: "Natural Language Processing",
        category: "Artificial Intelligence",
        aliases: [
          "nlp",
          "natural language processing",
          "language model",
          "llm",
          "large language model"
        ]
      },

      {
        canonical: "TensorFlow",
        category: "Artificial Intelligence",
        aliases: [
          "tensorflow",
          "tf"
        ]
      },

      {
        canonical: "PyTorch",
        category: "Artificial Intelligence",
        aliases: [
          "torch",
          "pytorch"
        ]
      },

      {
        canonical: "Computer Vision",
        category: "Artificial Intelligence",
        aliases: [
          "computer vision",
          "cv",
          "image processing"
        ]
      },

      // APIs

      {
        canonical: "REST API",
        category: "API",
        aliases: [
          "rest",
          "rest api",
          "restful api",
          "restful services"
        ]
      },

      {
        canonical: "GraphQL",
        category: "API",
        aliases: [
          "graphql",
          "gql"
        ]
      },

      // Mobile Development

      {
        canonical: "Android",
        category: "Mobile",
        aliases: [
          "android",
          "android sdk"
        ]
      },

      {
        canonical: "iOS",
        category: "Mobile",
        aliases: [
          "ios",
          "iphone development"
        ]
      },

      {
        canonical: "React Native",
        category: "Mobile",
        aliases: [
          "react native"
        ]
      },

      {
        canonical: "Flutter",
        category: "Mobile",
        aliases: [
          "flutter",
          "dart"
        ]
      },

      // Testing

      {
        canonical: "Jest",
        category: "Testing",
        aliases: [
          "jest"
        ]
      },

      {
        canonical: "Cypress",
        category: "Testing",
        aliases: [
          "cypress"
        ]
      },

      {
        canonical: "Playwright",
        category: "Testing",
        aliases: [
          "playwright"
        ]
      },

      {
        canonical: "Selenium",
        category: "Testing",
        aliases: [
          "selenium"
        ]
      },

      {
        canonical: "Unit Testing",
        category: "Testing",
        aliases: [
          "unit testing",
          "unit tests",
          "testing"
        ]
      },

      // Version Control

      {
        canonical: "Git",
        category: "Version Control",
        aliases: [
          "git",
          "gitlab",
          "github",
          "bitbucket"
        ]
      },

     // Methodologies

      {
        canonical: "Agile",
        category: "Methodology",
        aliases: [
          "agile",
          "agile development"
        ]
      },

      {
        canonical: "Scrum",
        category: "Methodology",
        aliases: [
          "scrum"
        ]
      },

      {
        canonical: "Kanban",
        category: "Methodology",
        aliases: [
          "kanban"
        ]
      },

      // Architecture

      {
        canonical: "Microservices",
        category: "Architecture",
        aliases: [
          "microservices",
          "microservice architecture"
        ]
      },

      {
        canonical: "Event Driven Architecture",
        category: "Architecture",
        aliases: [
          "eda",
          "event driven",
          "event driven architecture"
        ]
      },

      // Security

      {
        canonical: "OAuth",
        category: "Security",
        aliases: [
          "oauth",
          "oauth2",
          "oauth 2.0"
        ]
      },

      {
        canonical: "JWT",
        category: "Security",
        aliases: [
          "jwt",
          "json web token"
        ]
      },

      {
        canonical: "Authentication",
        category: "Security",
        aliases: [
          "authentication",
          "identity management"
        ]
      },

      {
        canonical: "Authorization",
        category: "Security",
        aliases: [
          "authorization",
          "role based access control",
          "rbac"
        ]
      }
    ];

    for (const skill of skills) {
      this.dictionary.set(skill.canonical.toLowerCase(), skill);
    }
  }
// Build Reverse Lookup

  private buildReverseLookup(): void {
    this.reverseLookup.clear();

    for (const [, skill] of this.dictionary) {

      this.reverseLookup.set(
        skill.canonical.toLowerCase(),
        skill.canonical
      );

      for (const alias of skill.aliases) {
        this.reverseLookup.set(
          alias.toLowerCase(),
          skill.canonical
        );
      }
    }
  }
  // Normalize Single Skill
  normalizeSkill(skill: string): SkillMatch {
    const original = skill;
    const normalized = skill.trim().toLowerCase();
    // Recruiter custom aliases
    if (this.customAliases.has(normalized)) {
      return {
        original,
        normalized: this.customAliases.get(normalized)!,
        confidence: 1,
        source: "manual"
      };
    }
    // Exact lookup
    if (this.reverseLookup.has(normalized)) {
      const canonical = this.reverseLookup.get(normalized)!;
      return {
        original,
        normalized: canonical,
        confidence: 1,
        source:
          canonical.toLowerCase() === normalized
            ? "exact"
            : "alias"
      };
    }
   // Partial lookup

    for (const [alias, canonical] of this.reverseLookup.entries()) {

      if (
        normalized.includes(alias) ||
        alias.includes(normalized)
      ) {
        return {
          original,
          normalized: canonical,
          confidence: 0.90,
          source: "synonym"
        };
      }
    }
    // -------------------------------
    // Fuzzy matching
    // -------------------------------
    const fuzzy = this.findClosestSkill(normalized);
    if (fuzzy) {
      return {
        original,
        normalized: fuzzy.skill,
        confidence: fuzzy.score,
        source: "fuzzy"
      };
    }
    // -------------------------------
    // Unknown skill
    // -------------------------------
    return {
      original,
      normalized: original,
      confidence: 0,
      source: "exact"
    };
  }
  // =====================================================
  // Normalize Array
  // =====================================================
  normalizeSkills(skills: string[]): SkillMatch[] {

    const seen = new Set<string>();

    const normalized: SkillMatch[] = [];

    for (const skill of skills) {

      const match = this.normalizeSkill(skill);

      if (!seen.has(match.normalized.toLowerCase())) {
        normalized.push(match);
        seen.add(match.normalized.toLowerCase());
      }
    }
    return normalized;
  }
  // =====================================================
  // Are Skills Equivalent
  // =====================================================
  areSynonyms(skillA: string, skillB: string): boolean {
    return (
      this.normalizeSkill(skillA).normalized.toLowerCase() ===
      this.normalizeSkill(skillB).normalized.toLowerCase()
    );
  }
  // =====================================================
  // Find Canonical Name
  // =====================================================
  getCanonical(skill: string): string {
    return this.normalizeSkill(skill).normalized;
  }
  // =====================================================
  // Get All Known Aliases
  // =====================================================
  getAliases(skill: string): string[] {

    const canonical = this.getCanonical(skill);

    const entry =
      this.dictionary.get(canonical.toLowerCase());
    return entry?.aliases ?? [];
  }
  // =====================================================
  // Skill Category
  // =====================================================
  getCategory(skill: string): string | undefined {

    const canonical = this.getCanonical(skill);
    return this.dictionary.get(
      canonical.toLowerCase()
    )?.category;
  }
  // =====================================================
  // Register Recruiter Alias
  // =====================================================
  addCustomAlias(
    alias: string,
    canonical: string
  ): void {
    this.customAliases.set(
      alias.toLowerCase(),
      canonical
    );
 }
  // =====================================================
  // Remove Recruiter Alias
  // =====================================================
  removeCustomAlias(alias: string): void {
    this.customAliases.delete(alias.toLowerCase());
  }
  // =====================================================
  // Clear Recruiter Aliases
  // =====================================================
  clearCustomAliases(): void {
    this.customAliases.clear();
  }
    // =====================================================
  // Fuzzy Skill Matching
  // =====================================================
  private findClosestSkill(
    input: string
  ): { skill: string; score: number } | null {

    let bestSkill: string | null = null;
    let bestScore = 0;

    for (const [canonical, skill] of this.dictionary.entries()) {

      const candidates = [
        canonical,
        ...skill.aliases.map(a => a.toLowerCase())
      ];

      for (const candidate of candidates) {

        const distance = this.levenshteinDistance(
          input,
          candidate
        );
        const similarity =
          1 - distance / Math.max(input.length, candidate.length);
        if (similarity > bestScore) {
          bestScore = similarity;
          bestSkill = skill.canonical;
        }
      }
    }
    if (bestScore >= 0.80 && bestSkill) {
      return {
        skill: bestSkill,
        score: Number(bestScore.toFixed(2))
      };
    }
    return null;
  }
  // =====================================================
  // Levenshtein Distance
  // =====================================================
  private levenshteinDistance(
    a: string,
    b: string
  ): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
  // =====================================================
  // Find Similar Skills
  // =====================================================
  findSimilarSkills(
    input: string,
    limit = 5
  ): SkillMatch[] {

    const results: SkillMatch[] = [];

    for (const [, skill] of this.dictionary) {

      const match = this.normalizeSkill(skill.canonical);

      const distance = this.levenshteinDistance(
        input.toLowerCase(),
        skill.canonical.toLowerCase()
      );
      const similarity =
        1 -
        distance /
          Math.max(
            input.length,
            skill.canonical.length
          );
      results.push({
        original: input,
        normalized: match.normalized,
        confidence: similarity,
        source: "fuzzy"
      });
    }
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }
  // =====================================================
  // Dictionary Management
  // =====================================================
  addSkill(
    canonical: string,
    aliases: string[],
    category: string
  ): void {
    this.dictionary.set(
      canonical.toLowerCase(),
      {
        canonical,
        aliases,
        category
      }
    );
    this.buildReverseLookup();
  }
  removeSkill(canonical: string): void {
    this.dictionary.delete(canonical.toLowerCase());
    this.buildReverseLookup();
  }
  hasSkill(skill: string): boolean {
    return this.reverseLookup.has(
      skill.toLowerCase()
    );
  }
  // =====================================================
  // Export Dictionary
  // =====================================================
  exportDictionary(): SkillDictionary[] {
    return [...this.dictionary.values()];
  }
  // =====================================================
  // Import Dictionary
  // =====================================================
  importDictionary(
    skills: SkillDictionary[]
  ): void {
    this.dictionary.clear();
    for (const skill of skills) {
      this.dictionary.set(
        skill.canonical.toLowerCase(),
        skill
      );
    }
    this.buildReverseLookup();
  }
  // =====================================================
  // Known Skills
  // =====================================================

  getKnownSkills(): string[] {
    return [...this.dictionary.values()]
      .map(skill => skill.canonical)
      .sort();
  }

  // =====================================================
  // Statistics
  // =====================================================

  statistics() {

   const categories = new Map<string, number>();

    for (const skill of this.dictionary.values()) {
      categories.set(
        skill.category,
        (categories.get(skill.category) ?? 0) + 1
      );
    }

    return {
      totalSkills: this.dictionary.size,
      totalAliases: [...this.dictionary.values()]
        .reduce(
          (sum, s) => sum + s.aliases.length,
          0
        ),
      recruiterAliases:
        this.customAliases.size,
      categories:
        Object.fromEntries(categories)

    };
  }
}