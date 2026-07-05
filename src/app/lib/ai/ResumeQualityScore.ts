// lib/ai/ResumeQualityScore.ts
import { ResumeQualityMetrics } from './types';



export class ResumeQualityScore {
  analyze(text: string): ResumeQualityMetrics {
    const structure = this.scoreStructure(text);
    const formatting = this.scoreFormatting(text);
    const completeness = this.scoreCompleteness(text);
    const grammar = this.scoreGrammar(text);
    const atsCompatibility = this.scoreATS(text);
    
  const professionalism = this.scoreProfessionalism(text);
    const readability = this.scoreReadability(text);
    const keywordCoverage = this.scoreKeywords(text);
    const projectQuality = this.scoreProjects(text);
    const experienceQuality = this.scoreExperience(text);
    const educationQuality = this.scoreEducation(text);
    const achievementsQuality = this.scoreAchievements(text);
    const contactCompleteness = this.scoreContact(text);

const overall = (
      structure + formatting + completeness + grammar + atsCompatibility +
      professionalism + readability + keywordCoverage + projectQuality +
      experienceQuality + educationQuality + achievementsQuality + contactCompleteness
    ) / 13;

      return {
      structure,
      professionalism,
      formatting,
      grammar,
      readability,
      atsCompatibility,
      keywordCoverage,
      completeness,
      projectQuality,
      experienceQuality,
      educationQuality,
      achievementsQuality,
      contactCompleteness,
      overall: Math.round(overall),
    };

    }

  private scoreStructure(text: string): number {
    const score = 50;
    // Check for standard sections
    const sections = ['experience', 'education', 'skills', 'projects'];
    let found = 0;
    for (const section of sections) {
      if (text.match(new RegExp(section, 'i'))) found++;
    }
    return Math.min(50 + (found / sections.length) * 50, 100);
  }

  private scoreFormatting(text: string): number {
    // Check for consistent bullet points, dates, etc.
    const bulletCount = (text.match(/[•\-*]\s/g) || []).length;
    const dateCount = (text.match(/\d{4}/g) || []).length;
    if (bulletCount > 10 && dateCount > 3) return 90;
    if (bulletCount > 5 && dateCount > 2) return 70;
    return 50;
  }

  private scoreCompleteness(text: string): number {
    const hasContact = text.match(/@|phone|mobile/i) ? 20 : 0;
    const hasSummary = text.match(/summary|profile|about/i) ? 20 : 0;
    const hasExperience = text.match(/experience|work|employment/i) ? 20 : 0;
    const hasEducation = text.match(/education|university|college/i) ? 20 : 0;
    const hasSkills = text.match(/skills|technologies|expertise/i) ? 20 : 0;
    return hasContact + hasSummary + hasExperience + hasEducation + hasSkills;
  }

  private scoreATS(text: string): number {
  // FIXED: Removed extra backslashes
  const hasStructured = text.match(/experience|education|skills|projects/i) ? 30 : 0;
  
  // FIXED: Correct word boundary regex
  const words = text.match(/\b\w+\b/g);
  const hasKeywords = words?.length || 0;
  const keywordScore = Math.min((hasKeywords / 100) * 40, 40);
  
  // FIXED: Correct digit regex
  const hasDates = text.match(/\d{4}/g) ? 30 : 0;
  
  return Math.min(hasStructured + keywordScore + hasDates, 100);
}

private scoreGrammar(text: string): number {
  // Use a more sophisticated approach
  let score = 50;
  
  // Check for proper capitalization
  const sentences = text.split(/[.!?]+\s/);
  let properCapCount = 0;
  for (const sentence of sentences) {
    if (sentence.length > 0 && sentence[0] === sentence[0].toUpperCase()) {
      properCapCount++;
    }
  }
  const capRatio = sentences.length > 0 ? properCapCount / sentences.length : 0;
  score += capRatio * 20;
  
  // Check for common spelling issues
  const commonWords = ['the', 'and', 'for', 'with', 'experience', 'skills', 'education'];
  for (const word of commonWords) {
    if (text.match(new RegExp(`\\b${word}\\b`, 'i'))) {
      score += 2;
    }
  }
  
  return Math.min(score, 100);
}

private scoreProfessionalism(text: string): number {
    let score = 80;
    // Penalty for informal/unprofessional language patterns
    const redFlags = [/lol\b/i, /wanna\b/i, /gonna\b/i, /stuff\b/i, /etc\b/];
    for (const flag of redFlags) {
      if (text.match(flag)) score -= 10;
    }
    // Boost for strong professional action words
    const actionVerbs = [/led\b/i, /managed\b/i, /developed\b/i, /designed\b/i, /optimized\b/i];
    for (const verb of actionVerbs) {
      if (text.match(verb)) score += 4;
    }
    return Math.max(0, Math.min(score, 100));
  }

  private scoreReadability(text: string): number {
    const sentences = text.split(/[.!?]+\s/).filter(s => s.trim().length > 0);
    const words = text.match(/\b\w+\b/g) || [];
    if (sentences.length === 0 || words.length === 0) return 50;

    const avgSentenceLength = words.length / sentences.length;
    // Resumes are most readable with sweet-spot sentence lengths (around 10-18 words)
    if (avgSentenceLength >= 10 && avgSentenceLength <= 18) return 95;
    if (avgSentenceLength > 18 && avgSentenceLength <= 25) return 75;
    return 55;
  }

  private scoreKeywords(text: string): number {
    let matches = 0;
    // High-value industry tech and soft-skill keywords
    const coreKeywords = [
      /typescript/i, /javascript/i, /react/i, /node/i, /python/i, /sql/i, /git/i,
      /agile/i, /scrum/i, /management/i, /collaboration/i, /architecture/i
    ];
    for (const keyword of coreKeywords) {
      if (text.match(keyword)) matches++;
    }
    return Math.min(40 + (matches / coreKeywords.length) * 60, 100);
  }

  private scoreProjects(text: string): number {
  if (!text.match(/projects/i)) return 0;
  let score = 60;
  
  if (text.match(/github\.com|bitbucket|gitlab/i)) score += 20;
  
  // FIX: Separate the evaluations properly using logical OR outside the match methods
  if (text.match(/\d+%/) || text.match(/deployed/i) || text.match(/built/i)) {
    score += 20;
  }
  
  return Math.min(score, 100);
}


  private scoreExperience(text: string): number {
    if (!text.match(/experience|work|employment/i)) return 0;
    let score = 60;
    // Check for metrics/deliverables (numbers/percentages) and timelines
    const numbersCount = (text.match(/\b\d+\b/g) || []).length;
    const yearRanges = (text.match(/\d{4}\s*[-–]\s*(\d{4}|present)/i) || []).length;
    
    if (numbersCount > 5) score += 20;
    if (yearRanges > 0) score += 20;
    return Math.min(score, 100);
  }

  private scoreEducation(text: string): number {
    if (!text.match(/education|university|college|degree/i)) return 0;
    let score = 70;
    // Check for explicit degree types or graduation years
    if (text.match(/\b(bachelor|master|phd|b\.s|b\.a|m\.s|diploma)\b/i)) score += 15;
    if (text.match(/\b(gpa|honors|cum laude|graduated)\b/i)) score += 15;
    return Math.min(score, 100);
  }

  private scoreAchievements(text: string): number {
    let score = 50;
    // Look for high-value impact nouns/verbs
    const indicators = [/award/i, /achieved/i, /won/i, /promoted/i, /successful/i, /increased/i, /decreased/i];
    for (const indicator of indicators) {
      if (text.match(indicator)) score += 10;
    }
    return Math.min(score, 100);
  }

  private scoreContact(text: string): number {
    let score = 40;
    if (text.match(/@/)) score += 20; // Email
    if (text.match(/phone|mobile|\+?\d{10,}/i)) score += 20; // Phone
    if (text.match(/linkedin\.com/i)) score += 20; // LinkedIn Profile
    return Math.min(score, 100);
  }

}