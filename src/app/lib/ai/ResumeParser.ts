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
    
    // Look for explicit skills sections
    const skillsSection = text.match(/(?:skills|technologies|expertise|competencies|tech\s+stack)[:;]\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*\n|$)/i);
    if (skillsSection) {
      const skillText = skillsSection[1];
      // Split by common separators
      const items = skillText.split(/[,;•\n]\s*/);
      items.forEach(item => {
        const cleaned = item.trim();
        if (cleaned.length > 0 && cleaned.length < 50) {
          skills.add(cleaned);
        }
      });
    }

    // Fallback: check for skill patterns in the entire text
    if (skills.size < 3) {
      for (const pattern of this.skillPatterns) {
        const matches = text.match(pattern);
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
    const expSection = text.match(/(?:work|professional|employment)\s+experience[:;]\s*([\s\S]*?)(?=\n\s*(?:education|skills|projects|certifications|$))/i);
    if (expSection) {
      const expText = expSection[1];
      // Split by roles
      const roleBlocks = expText.split(/\n(?=\s*[A-Z][a-z]+.*\s+at\s+[A-Z][a-z]+|\s*•\s*[A-Z][a-z]+|\s*-\s*[A-Z][a-z]+)/);
      
      for (const block of roleBlocks) {
        const role = this.parseRole(block);
        if (role) {
          roles.push(role);
        }
      }
    }

    // Calculate total years of experience
    const totalMonths = roles.reduce((sum, r) => sum + r.durationMonths, 0);
    const years = Math.round((totalMonths / 12) * 10) / 10;

    return { years, roles };
  }

  private parseRole(block: string): ParsedResume['experience']['roles'][0] | null {
    if (!block || block.trim().length === 0) return null;
    
    // Extract title
    const titleMatch = block.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?=\s+at\s+)/);
    if (!titleMatch) return null;
    
    const title = titleMatch[1].trim();
    
    // Extract company
    const companyMatch = block.match(/at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    const company = companyMatch ? companyMatch[1].trim() : 'Unknown';

    // Extract duration
    let duration = 0;
    const yearsMatch = block.match(/(\d+)\s+(?:years?|yrs?)/i);
    if (yearsMatch) {
      duration = parseInt(yearsMatch[1]) * 12;
    } else {
      const monthsMatch = block.match(/(\d+)\s+(?:months?|mos?)/i);
      if (monthsMatch) {
        duration = parseInt(monthsMatch[1]);
      }
    }

    // If no duration found, estimate from date range
    if (duration === 0) {
      const dateMatch = block.match(/(\d{4})\s*-\s*(\d{4}|present)/i);
      if (dateMatch) {
        const start = parseInt(dateMatch[1]);
        const end = dateMatch[2].toLowerCase() === 'present' ? new Date().getFullYear() : parseInt(dateMatch[2]);
        if (end > start) {
          duration = (end - start) * 12;
        }
      }
    }

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

    // Find education section - FIXED: removed 's' flag
    const eduSection = text.match(/(?:education|academic|qualifications)[:;]\s*([\s\S]*?)(?=\n\s*(?:work|experience|skills|projects|$))/i);
    if (eduSection) {
      const eduText = eduSection[1];
      
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
      const institutionMatch = eduText.match(/at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
      if (institutionMatch) {
        education.institution = institutionMatch[1].trim();
      }

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
    const projectSection = text.match(/(?:projects|portfolio|personal\s+work)[:;]\s*([\s\S]*?)(?=\n\s*(?:experience|education|skills|$))/i);
    if (projectSection) {
      const projectText = projectSection[1];
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

    // Extract name
    const nameMatch = lines[0].match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    const name = nameMatch ? nameMatch[1].trim() : 'Project';
    
    // Extract description
    const description = lines.slice(1).join(' ').trim();
    
    // Extract technologies
    const techMatch = block.match(/(?:with|using)\s+([A-Za-z#+\-.]+(?:\s*,\s*[A-Za-z#+\-.]+)*)/);
const rawTech = techMatch ? techMatch[1].split(',').map(t => t.trim()) : [];

// FIX: Format raw strings into explicit 'Skill' objects using your required properties
const formattedTechnologies: Skill[] = rawTech.map(t => ({
  name: t,
  canonical: t.toLowerCase(),
  category: "other" // Fallback category matching your type definition
}));

// Extract URL
const urlMatch = block.match(/(?:https?:\/\/)?(?:www\.)?[^\s]+\.(?:com|org|io|dev|app|tech)/);
// FIX: Named 'githubUrl' directly so it is in scope for the shorthand return
const githubUrl = urlMatch ? urlMatch[0] : undefined;

return { name, description, technologies: formattedTechnologies, githubUrl };

  }

  private extractCertifications(text: string): string[] {
    const certifications: string[] = [];
    
    // Find certifications section - FIXED: removed 's' flag
    const certSection = text.match(/(?:certifications|certificates|qualifications)[:;]\s*([\s\S]*?)(?=\n\s*(?:experience|education|skills|$))/i);
    if (certSection) {
      const certText = certSection[1];
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
}