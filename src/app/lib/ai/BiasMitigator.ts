// lib/ai/BiasMitigator.ts
import { BiasReport } from './types';
type RemovedFieldType = "name" | "email" | "phone" | "address" | "gender" | "age" | "religion" | "nationality" | "photo";


export class BiasMitigator {
  // PII patterns for removal
  private patterns = {
  //  name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    phone: /\b\d{10,11}\b/g,
    gender: /\b(?:Male|Female|Non-binary|M|F)\b/gi,
    nationality: /\b(?:American|British|Canadian|Chinese|Indian|Nigerian|Kenyan|South African)\b/gi,
    age: /\b\d{1,2}\s*(?:years old|yo|yr)\b/gi,
    address: /\b\d{1,5}\s+\w+\s+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd)\b/gi,
    religion: /\b(?:Christian|Muslim|Hindu|Buddhist|Jewish|Atheist|Catholic|Protestant)\b/gi,
  };
  //Attempts to identify the candidate's actual name using
   // high-confidence, context-specific signals rather than generic    * capitalization patterns: 
// a name that follows linkedin  which often displays the full name
// if no it displays null in that case no name redaction is attempted instead of redacting unrelated content
  private extractCandidateName(text: string): string[] {
    const candidates = new Set<string>();

    const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 0);
    if (firstLine) {
   const headerMatch = firstLine.match(/^([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,3})$/);
      if (headerMatch && headerMatch[1].length < 50) {
        candidates.add(headerMatch[1].trim());
      }
    }

    const linkedinMatch = text.match(/linkedin[:\s]*@?([A-Z][A-Za-z'-]+(?:\s+[A-Za-z'-]+){1,3})/i);
    if (linkedinMatch) candidates.add(linkedinMatch[1].trim());

    return Array.from(candidates);
  }

  anonymize(text: string): BiasReport {
    let anonymized = text;
    const issues: Array<{ type: string; severity: "LOW" | "MEDIUM" | "HIGH"; suggestion: string; evidence: string }> = [];
     //
    const candidateNames = this.extractCandidateName(text);
   let nameMatchCount = 0;
    for (const fullName of candidateNames) {
      const parts = fullName.split(/\s+/).filter((p) => p.length > 1);
     
      // Redact the full name first (longest match), then each individual part
      const allVariants = [fullName, ...parts].sort((a, b) => b.length - a.length);
      for (const variant of allVariants) {
        const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const variantPattern = new RegExp(`\\b${escaped}\\b`, "g");
        const matches = anonymized.match(variantPattern);
        if (matches && matches.length > 0) {
          nameMatchCount += matches.length;
          anonymized = anonymized.replace(variantPattern, "[NAME]");
        }
      }
    }
    if (nameMatchCount > 0) {
      issues.push({
        type: "Potential name bias",
        severity: this.getSeverity("name", nameMatchCount),
        suggestion: "Remove name information from resumes",
        evidence: `Found ${nameMatchCount} instance(s) of the candidate's name`,
      });
    }

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
      issues,
    };
  }

 
   anonymizeDetailed(text: string): {
    anonymized: string;
    removedFields: Array<{ type: RemovedFieldType; originalValue?: string; replacement: string }>;
    biasScore: number;
    biasIssues: Array<{ type: string; severity: "LOW" | "MEDIUM" | "HIGH"; suggestion: string }>;
  } {
    const report = this.anonymize(text);
    
    const fields: Array<{ type: RemovedFieldType; originalValue?: string; replacement: string }> = [];
    const knownTypes: RemovedFieldType[] = ["name", "email", "phone", "address", "gender", "age", "religion", "nationality", "photo"];
    for (const issue of (report as any).issues || []) {
    const cleaned = issue.type.replace("Potential ", "").replace(" bias", "").trim().toLowerCase();
      if (!knownTypes.includes(cleaned as RemovedFieldType)) continue; // skip anything outside the schema's known set
      const fieldType = cleaned as RemovedFieldType;
      fields.push({ type: fieldType, replacement: fieldType === "name" ? "[NAME]" : `[REMOVED_${fieldType.toUpperCase()}]` });
    }
    return {
      anonymized: report.anonymized,
      removedFields: fields,
      biasScore: report.score,
      biasIssues: ((report as any).issues || []).map((i: any) => ({
        type: i.type,
        severity: i.severity,
        suggestion: i.suggestion,
      })),
    };
  }




  private getSeverity(type: string, count: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (count > 3) return 'HIGH';
    if (count > 1) return 'MEDIUM';
    return 'LOW';
  }
}