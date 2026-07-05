// lib/ai/BiasMitigator.ts
import { BiasReport } from './types';

export class BiasMitigator {
  // PII patterns for removal
  private patterns = {
    name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    phone: /\b\d{10,11}\b/g,
    gender: /\b(?:Male|Female|Non-binary|M|F)\b/gi,
    nationality: /\b(?:American|British|Canadian|Chinese|Indian|Nigerian|Kenyan|South African)\b/gi,
    age: /\b\d{1,2}\s*(?:years old|yo|yr)\b/gi,
    address: /\b\d{1,5}\s+\w+\s+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd)\b/gi,
    religion: /\b(?:Christian|Muslim|Hindu|Buddhist|Jewish|Atheist|Catholic|Protestant)\b/gi,
  };

  anonymize(text: string): BiasReport {
    let anonymized = text;
    const issues = [];

    for (const [type, pattern] of Object.entries(this.patterns)) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        anonymized = anonymized.replace(pattern, `[REMOVED_${type.toUpperCase()}]`);
        issues.push({
          type: `Potential ${type} bias`,
          severity: this.getSeverity(type, matches.length),
          suggestion: `Remove ${type} information from resumes`,
          evidence: `Found ${matches.length} instance(s) of ${type}`,
        });
      }
    }

    // Calculate bias score (lower is better)
    const score = Math.min(issues.reduce((sum, i) => {
      return sum + (i.severity === 'HIGH' ? 10 : i.severity === 'MEDIUM' ? 5 : 2);
    }, 0), 100);

    return {
      score,
      passed: score < 20,
      anonymized,
    };
  }

  private getSeverity(type: string, count: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (count > 3) return 'HIGH';
    if (count > 1) return 'MEDIUM';
    return 'LOW';
  }
}