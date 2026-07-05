// lib/ai/HybridResumeParser.ts
import { ResumeParser,  } from './ResumeParser';
import {ParsedResume} from './types'
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = process.env.GEMINI_API_KEY;

export class HybridResumeParser {
  private regexParser = new ResumeParser();
  private model: any;

  constructor() {
    if (GEMINI_KEY) {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      this.model = genAI.getGenerativeModel({ model: "gemini-pro" });
    }
  }

  async parse(text: string): Promise<ParsedResume> {
    // 1. First, try regex parsing
    let parsed = this.regexParser.parse(text);

    // 2. If regex parsing is incomplete, use LLM to fill gaps
    if (this.needsLLMEnhancement(parsed)) {
      const llmParsed = await this.parseWithLLM(text);
      parsed = this.mergeParsedResults(parsed, llmParsed);
    }

    return parsed;
  }

  private needsLLMEnhancement(parsed: ParsedResume): boolean {
    // If missing critical fields, use LLM
    return (
      parsed.skills.length < 3 ||
      !parsed.education.degree ||
      parsed.experience.years === 0
    );
  }

  private async parseWithLLM(text: string): Promise<Partial<ParsedResume>> {
    if (!this.model) {
      throw new Error("Gemini model not configured");
    }

    const prompt = `
      Extract the following information from this resume as JSON:
      - skills: array of strings
      - experience: { years: number, roles: [{ title, company, duration, description, achievements }] }
      - education: { degree, field, institution, graduationYear }
      - projects: [{ name, description, technologies, url }]
      - certifications: array of strings
      - achievements: array of strings
      - languages: array of strings
      - summary: string

      Resume:
      ${text.substring(0, 8000)}

      Return ONLY valid JSON.
    `;

    const result = await this.model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error("LLM parsing failed:", error);
      return {};
    }
  }

  private mergeParsedResults(
    regex: ParsedResume,
    llm: Partial<ParsedResume>
  ): ParsedResume {
    return {
      skills: this.mergeArrays(regex.skills, llm.skills || []),
      experience: {
        years: Math.max(regex.experience.years, llm.experience?.years || 0),
        roles: this.mergeArrays(regex.experience.roles, llm.experience?.roles || []),
      },
      education: llm.education || regex.education,
      projects: this.mergeArrays(regex.projects, llm.projects || []),
      certifications: this.mergeArrays(regex.certifications, llm.certifications || []),
      achievements: this.mergeArrays(regex.achievements, llm.achievements || []),
      languages: this.mergeArrays(regex.languages, llm.languages || []),
      summary: regex.summary || llm.summary || '',
    };
  }

  private mergeArrays<T>(arr1: T[], arr2: T[]): T[] {
    const merged = new Set([...arr1, ...arr2]);
    return Array.from(merged);
  }
}