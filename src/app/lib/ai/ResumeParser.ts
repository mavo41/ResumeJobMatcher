// lib/ai/ResumeParser.ts
import { Achievement, CandidateContact, ParsedResume, ProfessionalSummary, Skill } from './types';


export class ResumeParser {
  // Skill patterns - comprehensive list (all as RegExp)
  private skillPatterns: RegExp[] = [
    // Programming Languages
    /python|java|javascript|typescript|go|rust|swift|kotlin|c\+\+|c#|ruby|php|perl|r|matlab/i,
    /react|vue|angular|svelte|next\.js|nuxt\.js|gatsby|solidjs/i,
    /node\.js|express|fastapi|django|flask|spring|rails|laravel|asp\.net/i,
    /aws|azure|gcp|cloud|docker|kubernetes|terraform|jenkins|github\s+actions|gitlab\s+ci|circleci/i,
    /postgresql|mysql|mongodb|redis|elasticsearch|cassandra|dynamodb|sqlite|mariadb/i,
    /graphql|rest|api|websocket|grpc|protobuf/i,
    /machine\s+learning|deep\s+learning|nlp|computer\s+vision|llm|ai|artificial\s+intelligence/i,
    /react\s+native|flutter|ionic|expo|android|ios|swiftui|jetpack\s+compose/i,
    /figma|sketch|adobe\s+xd|design\s+systems|ui\/ux|prototyping|wireframing/i,
    /agile|scrum|kanban|jira|confluence|leadership|team\s+management|project\s+management/i,
    /linux|unix|bash|zsh|shell\s+scripting|powershell|windows|macos/i,
    /blockchain|solidity|ethereum|web3|smart\s+contracts/i,
    /cybersecurity|penetration\s+testing|network\s+security|encryption|auth/i,
  ];

  // Experience patterns
  private experiencePatterns: RegExp[] = [
    /(\d+)\s*(?:years?|yrs?)\s*(?:of)?\s*experience/i,
    /(\d+)\s*(?:months?|mos?)\s*experience/i,
    /(\d+)\s*(?:years?|yrs?)\s*(?:of)?\s*work/i,
    /(\d+)\s*(?:months?|mos?)\s*work/i,
  ];

  private rolePatterns: RegExp[] = [
    /(?:software|frontend|backend|full-stack|fullstack|data|devops|cloud|infrastructure|machine learning|ai|product|project|engineering|developer|architect|engineer|scientist|analyst|manager|lead|head|director|vp|cto|ceo)/i,
  ];

  private educationPatterns: RegExp[] = [
    /(?:bachelor|bsc|ba|bs|b\.?s\.?c\.?)\s+(?:of\s+)?(?:science|arts|engineering|technology|computer science|information technology|business administration|economics|finance|mathematics|physics|statistics)/i,
    /(?:master|msc|ma|ms|m\.?s\.?c\.?)\s+(?:of\s+)?(?:science|arts|engineering|technology|computer science|information technology|business administration|economics|finance|mathematics|physics|statistics|data science)/i,
    /(?:phd|doctorate|doctor\s+of\s+philosophy|d\.?phil\.?)\s+(?:in\s+)?(?:computer science|engineering|technology|mathematics|physics|statistics|data science|ai|machine learning)/i,
    /(?:certificate|certification|diploma)\s+in\s+(?:computer science|programming|web development|data science|cloud computing|cybersecurity|project management)/i,
  ];

  private projectPatterns: RegExp[] = [
    /project[s]?[:;]\s*([^\n]+(?:\n[^\n]+)*)/i,
    /portfolio[:;]\s*([^\n]+(?:\n[^\n]+)*)/i,
    /github[:;]\s*(?:https?:\/\/)?(?:www\.)?github\.com\/([^\s\n]+)/i,
    /built\s+([^\n,.]+(?:\s+with\s+[^\n,]+)?)/i,
    /developed\s+([^\n,.]+(?:\s+with\s+[^\n,]+)?)/i,
    /created\s+([^\n,.]+(?:\s+with\s+[^\n,]+)?)/i,
    /designed\s+([^\n,.]+(?:\s+with\s+[^\n,]+)?)/i,
  ];

  private certificationPatterns: RegExp[] = [
    /certified\s+([^\n,.]+)/i,
    /certification[s]?[:;]\s*([^\n]+(?:\n[^\n]+)*)/i,
    /(?:aws|azure|gcp)\s+(?:certified|associate|professional|expert)\s+([^\n,]+)/i,
    /(?:scrum|agile|project\s+management)\s+(?:certified|master)\s+([^\n,]+)/i,
    /(?:ccna|ccnp|ccie|security\+|network\+|a\+)\s+certification/i,
    /(?:cissp|ceh|cism|cisa|crisc|oscp|gcih)\s+certification/i,
  ];

  private achievementPatterns: RegExp[] = [
    /achieved\s+([^\n,.]+)/i,
    /accomplished\s+([^\n,.]+)/i,
    /recognized\s+(?:for|as)\s+([^\n,.]+)/i,
    /awarded\s+([^\n,.]+)/i,
    /won\s+([^\n,.]+)/i,
    /(?:increased|improved|boosted|enhanced|optimized|reduced|decreased)\s+([^\n,.]+(?:\s+by\s+\d+%)?)/i,
    /(?:delivered|implemented|executed)\s+([^\n,.]+(?:\s+resulting\s+in\s+[^\n,]+)?)/i,
  ];

  private languagePatterns: RegExp[] = [
    /(?:fluent|native|proficient|conversational|intermediate|basic)\s+(?:in\s+)?([^\n,]+)/i,
    /(?:english|french|spanish|german|mandarin|cantonese|japanese|korean|arabic|hindi|swahili|portuguese|italian|russian|dutch)/i,
  ];

  parse(text: string): ParsedResume {
    // Clean text
    const cleanText = this.cleanText(text);
    
    // Extract all sections
    const skills = this.extractSkills(cleanText);
    const experience = this.extractExperience(cleanText);
    const education = this.extractEducation(cleanText);
    const projects = this.extractProjects(cleanText);
    const certifications = this.extractCertifications(cleanText);
    const achievements = this.extractAchievements(cleanText);
    const languages = this.extractLanguages(cleanText);
    const contact = this.extractContact ? this.extractContact(cleanText) : {
    fullName: "",
    email: "",
    phone: ""
  };
const rawSummaryText = this.extractSummary(cleanText);
  const summary: ProfessionalSummary = {
    headline: "Professional Profile",
    summary: rawSummaryText,
    yearsExperience: experience.years || 0,
    primaryRole: experience.roles[0]?.title || "",
    industries: [],
    strengths: []
  };

    return {
    // FIX: Map string[] -> Skill[] using valid categories
    skills: this.extractSkills(cleanText).map((s: string) => ({
      name: s,
      canonical: s.toLowerCase(),
      category: "other"
    })),
    
    // FIX: Map string[] -> Certification[]
    certifications: this.extractCertifications(cleanText).map((c: string) => ({
      name: c
    })),
    
    // FIX: Map string[] -> Achievement[] 
    achievements: this.extractAchievements(cleanText).map((a: string) => ({
      title: "Achievement",
      description: a,
      quantified: a.match(/\d+/) ? true : false
    })),
    
    // FIX: Map string[] -> CandidateLanguage[] (Assuming structure has 'name' or 'language')
    languages: this.extractLanguages(cleanText).map((l: string) => ({
      name: l,
      language: l // Fallback key based on your local CandidateLanguage shape
    }) as any), // Use 'as any' safely here if CandidateLanguage has distinct strict properties

    experience,
    contact,
    education,
    projects,
    summary,
  };
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  private extractContact(text: string): CandidateContact {
  // Simple extraction regex placeholders
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return {
    email: emailMatch ? emailMatch[0] : "",
  } as CandidateContact;
}

  private extractSkills(text: string): string[] {
    const skills = new Set<string>();
    
    const sectionText = this.extractSectionText(
    text,
    ["skills", "technologies", "expertise", "competencies", "tech stack", "technical skills"],
    ["experience", "education", "projects", "certifications", "achievements", "work experience"]
  );
  if (sectionText) {
    // Category sub-headers (e.g. "Frontend & FullStack") sit on their
    // own line above the actual skill list — flattening newlines to
    // commas before splitting means real skills always get captured,
    // at the minor cost of an occasional bogus category-label entry.
    const flattened = sectionText.replace(/\n/g, ", ");
    const items = flattened.split(/[,;•]\s*/);
  
      items.forEach(item => {
       const cleaned = item.trim().replace(/^[-–]\s*/, "");
      if (cleaned.length > 1 && cleaned.length < 50) { 
          skills.add(cleaned);
        }
      });
    }

    // Fallback: check for skill patterns in the entire text
    if (skills.size < 3) {
      for (const pattern of this.skillPatterns) {
        const globalPattern = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
      const matches = text.match(globalPattern);
        if (matches) {
          matches.forEach(m => {
            const cleaned = m.trim().toLowerCase();
            if (cleaned.length > 2) {
              // Get the full skill name
              const fullMatch = text.match(new RegExp(`\\b${this.escapeRegex(cleaned)}\\b\\s*(?:[\\w#+\\.-]+)?`, 'i'));
              if (fullMatch) {
                skills.add(fullMatch[0].trim());
              } else {
                skills.add(cleaned);
              }
            }
          });
        }
      }
    }

    return Array.from(skills);
  }

  // Helper to escape regex special characters
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private extractExperience(text: string): ParsedResume['experience'] {
    const roles: ParsedResume['experience']['roles'] = [];
    
    // Try to find work experience section - FIXED: removed 's' flag
       const expSection = text.match(/(?:^|\n)\s*(?:work|professional|internship|employment)?\s*experience\s*[:\n]([\s\S]*?)(?=\n\s*(?:education|skills|projects|certifications|$))/i);

    let totalMonths = 0;

    if (expSection) {
      const expText = expSection[1];
      // Split by roles
      const dateRangePattern = /((?:[A-Za-z]{3,9}\.?\s*)?\d{4})\s*[-–—]\s*((?:[A-Za-z]{3,9}\.?\s*)?\d{4}|present|current|now)/gi;
      let match;
      while ((match = dateRangePattern.exec(expText)) !== null) {
        totalMonths += this.monthsBetween(match[1], match[2]);
      }
     const roleBlocks = expText.split(/\n(?=[A-Z][A-Za-z&.,'-]*(?:\s+[A-Za-z&.,'-]+)*\s*(?:[A-Za-z]{3,9}\.?\s*\d{4}|\d{4}))/);
   
     for (const block of roleBlocks) {
        const role = this.parseRole(block);
        if (role) {
          roles.push(role);
        }
      }
    }

    // Calculate total years of experience
    const years = Math.round((totalMonths / 12) * 10) / 10;

    return { years, roles };
  }

  private monthsBetween(startStr: string, endStr: string): number {
    const start = this.parseMonthYear(startStr);
    const endLower = endStr.toLowerCase();
    const end = /present|current|now/.test(endLower)
      ? { month: new Date().getMonth(), year: new Date().getFullYear() }
      : this.parseMonthYear(endStr);
    if (!start || !end) return 0;
    const months = (end.year - start.year) * 12 + (end.month - start.month);
    return months > 0 ? months : 1;
  }

  private parseMonthYear(str: string): { month: number; year: number } | null {
    const m = str.match(/([A-Za-z]{3,9})?\.?\s*(\d{4})/);
    if (!m) return null;
    const year = parseInt(m[2]);
    const monthName = (m[1] || "").toLowerCase().replace(/\.$/, "");
    const MONTHS: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
      may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
      sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
    };
    const month = MONTHS[monthName] ?? 0;
    return { month, year };
  }

  private extractDurationMonths(block: string): number {
    const m = block.match(/((?:[A-Za-z]{3,9}\.?\s*)?\d{4})\s*[-–—]\s*((?:[A-Za-z]{3,9}\.?\s*)?\d{4}|present|current|now)/i);
    if (!m) return 0;
    return this.monthsBetween(m[1], m[2]);
  }

  private parseRole(block: string): ParsedResume['experience']['roles'][0] | null {
    if (!block || block.trim().length === 0) return null;
    
   let title = 'Not specified';
    let company = 'Unknown';

    const atMatch = block.match(/^([A-Z][A-Za-z&.,'-]+(?:\s+[A-Za-z&.,'-]+)*)\s+at\s+([A-Z][A-Za-z&.,'-]+(?:\s+[A-Za-z&.,'-]+)*)/);
    if (atMatch) {
      title = atMatch[1].trim();
      company = atMatch[2].trim();
    } else {
      const leadingCompany = block.match(/^([A-Z][A-Za-z&.,'-]+(?:\s+[A-Za-z&.,'-]+){0,3})\s+(?=(?:[A-Za-z]{3,9}\.?\s*)?\d{4}\s*[-–—])/);
      const trailingCompany = block.match(/\d{4}\s+([A-Z][A-Za-z&.,'-]+(?:\s+[A-Za-z&.,'-]+){0,3})\s*$/m);
      if (leadingCompany) company = leadingCompany[1].trim();
      else if (trailingCompany) company = trailingCompany[1].trim();
      else return null;
    }

    const duration = this.extractDurationMonths(block);

    // Extract description and achievements
    const description = this.extractJobDescription(block);
    const rawAchievements: string[] = this.extractJobAchievements(block);
const achievements: Achievement[] = rawAchievements.map(text => ({
  title: text.substring(0, 30) + "...", // Create a short title summary
  description: text,
  quantified: text.match(/\d+/) ? true : false, // Dynamically flag if numbers exist in achievement
}));


    return {
      title,
      company,
      durationMonths: typeof duration === 'number' ? duration : 0, 
      description,
      achievements,
      responsibilities: [],
      technologies: [],
      leadership: false
    };
  }

  private extractJobDescription(block: string): string {
    const lines = block.split('\n').filter(l => l.trim());
    if (lines.length === 0) return '';
    
    // Skip header lines
    const startIndex = lines.findIndex(l => 
      l.match(/^[A-Z][a-z]+/i) || l.match(/at\s+/i)
    );
    if (startIndex === -1) return '';
    
    return lines.slice(startIndex + 1).join(' ').trim();
  }

  private extractJobAchievements(block: string): string[] {
    const achievements: string[] = [];
    const lines = block.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[•\-]\s*[A-Z]/) || 
          trimmed.match(/^(?:increased|improved|boosted|enhanced|optimized|reduced|decreased|delivered|implemented|executed)/i)) {
        achievements.push(trimmed.replace(/^[•\-]\s*/, ''));
      }
    }
    
    return achievements;
  }

  private extractEducation(text: string): ParsedResume['education'] {
    let education: ParsedResume['education'] = {
      degree: '',
      level: 'bachelors',
      field: '',
      institution: '',
    };

    const eduText = this.extractSectionText(
    text,
    ["education", "academic background", "academic", "qualifications"],
    ["experience", "skills", "projects", "certifications", "work experience"]
  );
  if (eduText) {
      
      // Extract degree
      for (const pattern of this.educationPatterns) {
        const match = eduText.match(pattern);
        if (match) {
          education.degree = match[0].trim();
          break;
        }
      }

      // Extract field
      const fieldMatch = eduText.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
      if (fieldMatch) {
        education.field = fieldMatch[1].trim();
      }

      // Extract institution
      const atInstitution = eduText.match(/at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    const namedInstitution = eduText.match(/([A-Z][A-Za-z.&\s]*(?:University|Institute|College|Polytechnic)[A-Za-z\s]*)/);
    if (atInstitution) education.institution = atInstitution[1].trim();
    else if (namedInstitution) education.institution = namedInstitution[1].trim();


      // Extract graduation year
      const yearMatch = eduText.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        education.graduationYear = parseInt(yearMatch[1]);
      }
    }

    return education;
  }

  private extractProjects(text: string): ParsedResume['projects'] {
    const projects: ParsedResume['projects'] = [];
    
    // Find projects section - FIXED: removed 's' flag
    const projectText = this.extractSectionText(
    text,
    ["projects", "portfolio", "personal work"],
    ["experience", "education", "skills", "certifications", "work experience"]
  );
  if (projectText) {
      const blocks = projectText.split(/\n(?=\s*[A-Z][a-z]+)/);
      
      for (const block of blocks) {
        if (block.trim()) {
          const project = this.parseProject(block);
          if (project) {
            projects.push(project);
          }
        }
      }
    }

    return projects;
  }

  private parseProject(block: string): ParsedResume['projects'][0] | null {
    if (!block || block.trim().length === 0) return null;
    
    const lines = block.split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;

    const firstLine = lines[0];
  const colonIdx = firstLine.indexOf(':');
  let name: string;
  let firstLineRest = '';
  if (colonIdx > -1 && colonIdx < 60) {
    name = firstLine.slice(0, colonIdx).trim();
    firstLineRest = firstLine.slice(colonIdx + 1).trim();
  } else {
    name = firstLine.trim().slice(0, 60);
  }
  const description = [firstLineRest, ...lines.slice(1)].filter(Boolean).join(' ').trim();
  const techMatch = block.match(/(?:with|using)\s+([A-Za-z#+.,\s]+?)(?:\.|$)/i);
  const rawTech = techMatch ? techMatch[1].split(',').map(t => t.trim()).filter(Boolean) : [];

   
// FIX: Format raw strings into explicit 'Skill' objects using your required properties
const formattedTechnologies: Skill[] = rawTech.map(t => ({
  name: t,
  canonical: t.toLowerCase(),
  category: "other" // Fallback category matching your type definition
}));

// Extract URL
  const urlMatch = block.match(/https?:\/\/[^\s]+/);
// FIX: Named 'githubUrl' directly so it is in scope for the shorthand return
  const githubUrl = urlMatch ? urlMatch[0] : undefined;

return { name, description, technologies: formattedTechnologies, githubUrl };

  }

  private extractCertifications(text: string): string[] {
    const certifications: string[] = [];
    
    // Find certifications section - FIXED: removed 's' flag
    const certText = this.extractSectionText(
    text,
    ["certifications", "certificates", "licenses"],
    ["experience", "education", "skills", "work experience"]
  );
  if (certText) {
      for (const pattern of this.certificationPatterns) {
        const matches = certText.match(pattern);
        if (matches) {
          matches.forEach(m => {
            const cleaned = m.trim();
            if (cleaned.length > 3) {
              certifications.push(cleaned);
            }
          });
        }
      }
    }

    return certifications;
  }

  private extractAchievements(text: string): string[] {
    const achievements: string[] = [];
    
    // Find achievements in various sections
    const sections = ['experience', 'projects', 'summary'];
    for (const section of sections) {
      const sectionMatch = text.match(new RegExp(`${section}[:;]\\s*([\\s\\S]*?)(?=\\n\\s*(?:experience|education|skills|$))`, 'i'));
      if (sectionMatch) {
        const sectionText = sectionMatch[1];
        for (const pattern of this.achievementPatterns) {
          const matches = sectionText.match(pattern);
          if (matches) {
            matches.forEach(m => {
              const cleaned = m.trim();
              if (cleaned.length > 10) {
                achievements.push(cleaned);
              }
            });
          }
        }
      }
    }

    return achievements;
  }

  private extractLanguages(text: string): string[] {
    const languages: string[] = [];
    
    // Find languages section
    const langSection = text.match(/(?:languages|language)[:;]\s*([^\n]+)/i);
    if (langSection) {
      const langText = langSection[1];
      const items = langText.split(/[,;•\n]\s*/);
      for (const item of items) {
        const cleaned = item.trim();
        if (cleaned.length > 0) {
          languages.push(cleaned);
        }
      }
    }

    return languages;
  }

  private extractSummary(text: string): string {
    // Find summary/profile section at the beginning - FIXED: removed 's' flag
    const summaryMatch = text.match(/^(?:summary|profile|about|objective)[:;]\s*([\s\S]*?)(?=\n\s*(?:experience|education|skills|$))/i);
    if (summaryMatch) {
      return summaryMatch[1].trim();
    }
    
    // If no explicit summary, take first paragraph
    const firstParagraph = text.split('\n\n')[0];
    if (firstParagraph && firstParagraph.length > 20) {
      return firstParagraph.trim();
    }
    
    return '';
  }
  private extractSectionText(
  text: string,
  headerNames: string[],
  stopHeaderNames: string[]
): string | null {
  const headerAlt = headerNames.map((h) => h.replace(/\s+/g, "\\s+")).join("|");
  const stopAlt = stopHeaderNames.map((h) => h.replace(/\s+/g, "\\s+")).join("|");
  const pattern = new RegExp(
    `(?:^|\\n)[ \\t]*(?:${headerAlt})[ \\t]*[:;]?[ \\t]*\\n?([\\s\\S]*?)(?=\\n[ \\t]*(?:${stopAlt})[ \\t]*[:\\n]|$)`,
    "i"
  );
  const match = text.match(pattern);
  return match && match[1].trim().length > 0 ? match[1].trim() : null;
}
}