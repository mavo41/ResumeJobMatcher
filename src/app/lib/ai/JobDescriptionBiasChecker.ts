// lib/ai/JobDescriptionBiasChecker.ts

export interface BiasFlag {
  category: "gendered" | "age" | "ableist" | "culture_fit" | "exclusionary";
  phrase: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  explanation: string;
  suggestion: string;
}

export interface JobDescriptionBiasReport {
  overallRisk: "LOW" | "MEDIUM" | "HIGH";
  score: number; // 0-100, higher = more biased language detected
  flags: BiasFlag[];
}

// Research-informed term lists (Gaucher, Friesen & Kay 2011 on gendered
// wording in job ads; common EEOC/ADEA age-discrimination-adjacent
// phrasing; common ableist idioms in professional listings).
const GENDERED_MASCULINE = [
  "ninja", "rockstar", "guru", "dominant", "aggressive", "competitive nature",
  "assertive", "battle-tested", "killer instinct", "superhero", "warrior",
];

const AGE_CODED = [
  "young", "energetic", "digital native", "recent grad only", "fresh graduate",
  "youthful", "new blood",
];

const ABLEIST = [
  "must be able to stand for long periods", "walk-in only", "no accommodations",
  "physically fit", "able-bodied",
];

const CULTURE_FIT_VAGUE = [
  "culture fit", "like family", "work hard play hard", "fit right in",
  "beer on tap culture", "bro culture",
];

const EXCLUSIONARY_REQUIREMENTS = [
  "must have graduated from a top-tier university", "ivy league",
  "native english speaker only", "no visa sponsorship considered",
];

function scanTerms(
  text: string,
  terms: string[],
  category: BiasFlag["category"],
  severity: BiasFlag["severity"],
  explanation: string,
  suggestion: string
): BiasFlag[] {
  const flags: BiasFlag[] = [];
  const lower = text.toLowerCase();
  for (const term of terms) {
    if (lower.includes(term.toLowerCase())) {
      flags.push({ category, phrase: term, severity, explanation, suggestion });
    }
  }
  return flags;
}

export function checkJobDescriptionBias(description: string, requirements: string[] = []): JobDescriptionBiasReport {
  const fullText = [description, ...requirements].join(" ");
  const flags: BiasFlag[] = [
    ...scanTerms(
      fullText, GENDERED_MASCULINE, "gendered", "MEDIUM",
      "Research (Gaucher et al., 2011) links masculine-coded wording like this to reduced application rates from women, independent of the actual role requirements.",
      "Consider a neutral alternative describing the actual skill or trait needed."
    ),
    ...scanTerms(
      fullText, AGE_CODED, "age", "HIGH",
      "Phrasing that implies a preference for younger candidates can constitute age discrimination and discourages qualified older applicants.",
      "Describe the actual skills needed (e.g. 'proficient with modern tools') rather than age-coded traits."
    ),
    ...scanTerms(
      fullText, ABLEIST, "ableist", "HIGH",
      "This phrasing may exclude qualified candidates with disabilities unless it reflects a genuine, unavoidable physical requirement of the role.",
      "If this is a real requirement, phrase it as a specific, job-essential function. If not, remove it."
    ),
    ...scanTerms(
      fullText, CULTURE_FIT_VAGUE, "culture_fit", "MEDIUM",
      "Vague 'culture fit' language is a well-documented vector for unconsciously screening out candidates who don't resemble the existing team demographically.",
      "Replace with specific, observable behaviors or values you're actually looking for."
    ),
    ...scanTerms(
      fullText, EXCLUSIONARY_REQUIREMENTS, "exclusionary", "HIGH",
      "This requirement excludes qualified candidates for reasons often unrelated to actual job performance, and may carry legal risk depending on jurisdiction.",
      "Consider whether this credential is truly required, or whether equivalent experience should qualify."
    ),
  ];

  const score = Math.min(
    flags.reduce((sum, f) => sum + (f.severity === "HIGH" ? 15 : f.severity === "MEDIUM" ? 8 : 3), 0),
    100
  );

  const overallRisk: JobDescriptionBiasReport["overallRisk"] = score >= 40 ? "HIGH" : score >= 15 ? "MEDIUM" : "LOW";

  return { overallRisk, score, flags };
}