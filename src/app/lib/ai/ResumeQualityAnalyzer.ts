// lib/ai/ResumeQualityAnalyzer.ts

import {
    ParsedResume,
    ResumeQualityMetrics,
} from "./types";

export interface ResumeQualityReport {
    metrics: ResumeQualityMetrics;
    recommendations: string[];
    strengths: string[];
    weaknesses: string[];
}

export class ResumeQualityAnalyzer {
    analyze(
        resume: ParsedResume
    ): ResumeQualityReport {
        const structure =
            this.scoreStructure(resume);

        const formatting =
            this.scoreFormatting(resume);

        const completeness =
            this.scoreCompleteness(resume);

        const grammar =
            this.scoreGrammar(resume);

        const ats =
            this.scoreATSCompatibility(resume);

        const overall =
            Math.round(
                (
                    structure +
                    formatting +
                    completeness +
                    grammar +
                    ats
                ) / 5
            );

        const metrics: ResumeQualityMetrics = {
            structure,
            formatting,
            completeness,
            grammar,
            atsCompatibility: ats,
            overall,
            professionalism: 0, 
    readability: 0,     
    keywordCoverage: 0, 
    projectQuality: 0,  
    experienceQuality: 0,
    educationQuality: 0,
    achievementsQuality: 0,
    contactCompleteness: 0

        };
        return {
            metrics,
            strengths:
                this.findStrengths(metrics),
            weaknesses:
                this.findWeaknesses(metrics),
            recommendations:
                this.generateRecommendations(
                    metrics,
                    resume
                ),
        };
    }
   private scoreStructure(

        resume: ParsedResume

    ): number {

        let score = 0;

        if (resume.summary)
            score += 15;

        if (resume.skills.length)
            score += 20;

        if (
            resume.experience.roles.length
        )
            score += 25;

        if (
            resume.education.degree
        )
            score += 15;

        if (
            resume.projects.length
        )
            score += 15;

        if (
            resume.certifications.length
        )
            score += 5;

        if (
            resume.languages.length
        )
            score += 5;

        return Math.min(score, 100);

    }

    /**
     * Formatting quality
     */
    private scoreFormatting(

        resume: ParsedResume
    ): number {
        let score = 100;

        if (
        resume.summary && resume.summary.summary.length < 50
        )
            score -= 15;
        if (
            resume.skills.length < 5
        )
            score -= 10;
        if (
            resume.projects.length === 0
        )
            score -= 15;
        resume.experience.roles.forEach(
            role => {
                if (
                    role.description.length < 80
                )
                    score -= 5;
            }
        );
        return Math.max(score, 0);
    }
    private scoreCompleteness(
        resume: ParsedResume
    ): number {

        let score = 0;

        if (
            resume.summary
        )
            score += 10;
        if (
            resume.skills.length >= 8
        )
            score += 20;
        if (
            resume.experience.roles.length
        )
            score += 25;
        if (
            resume.projects.length >= 2
        )
            score += 20;
        if (
            resume.education.degree
        )
            score += 10;
        if (
            resume.certifications.length
        )
            score += 5;
        if (
            resume.achievements.length
        )
            score += 5;
        if (
            resume.languages.length
        )
            score += 5;
        return score;
    }
    private scoreGrammar(
        resume: ParsedResume
    ): number {
        let score = 100;

        const text = [
            resume.summary,
            ...resume.experience.roles.map(
                r => r.description
            ),
            ...resume.projects.map(
                p => p.description
            ),
        ].join(" ");
        if (
            text.includes("...")
        )
            score -= 10;
        if (
            text.includes("etc")
        )
            score -= 10;
        if (
            text.length < 300
        )
            score -= 20;
        return Math.max(score, 0);
    }
    private scoreATSCompatibility(
        resume: ParsedResume
    ): number {
        let score = 100;
        if (
            resume.skills.length < 8
        )
            score -= 15;
        if (
        resume.summary && resume.summary.summary.length < 80
        )
            score -= 10;
        if (
            resume.projects.length === 0
        )
            score -= 20;
        if (
            resume.experience.roles.length === 0
        )
            score -= 30;
        return Math.max(score, 0);
    }
    private findStrengths(
        metrics: ResumeQualityMetrics
    ): string[] {

        const strengths: string[] = [];

        if (metrics.structure >= 90)
            strengths.push("Excellent resume structure");

        if (metrics.formatting >= 90)
            strengths.push("Professional formatting");

        if (metrics.completeness >= 90)
            strengths.push("Very complete resume");

        if (metrics.grammar >= 90)
            strengths.push("Strong writing quality");

        if (metrics.atsCompatibility >= 90)
            strengths.push("Highly ATS compatible");

        return strengths;
    }
    private findWeaknesses(
        metrics: ResumeQualityMetrics
    ): string[] {

        const weaknesses: string[] = [];

        if (metrics.structure < 70)
            weaknesses.push("Resume structure needs improvement");

        if (metrics.formatting < 70)
            weaknesses.push("Formatting could be improved");

        if (metrics.completeness < 70)
            weaknesses.push("Several important sections are missing");

        if (metrics.grammar < 70)
            weaknesses.push("Writing quality needs improvement");

        if (metrics.atsCompatibility < 70)
            weaknesses.push("Resume is not fully ATS optimized");

        return weaknesses;
    }
    private generateRecommendations(
        metrics: ResumeQualityMetrics,
        resume: ParsedResume
    ): string[] {
        const recommendations: string[] = [];

        if (!resume.summary || resume.summary && resume.summary.summary.length < 50
) {

            recommendations.push(
                "Expand the professional summary to clearly communicate your experience, strengths, and career objectives."
            );
        }
        if (resume.skills.length < 8) {
            recommendations.push(
                "Add more relevant technical and professional skills that align with your target job."
            );
        }

        if (resume.projects.length === 0) {
            recommendations.push(
                "Include personal, academic, or professional projects that demonstrate practical experience."
            );
        } else {
            resume.projects.forEach(project => {
                if (!project.githubUrl) {
                    recommendations.push(
                        `Add a GitHub or live project link for "${project.name}" to strengthen credibility.`
                    );
                }

                if (project.description.length < 120) {
                    recommendations.push(
                        `Expand the description for "${project.name}" by explaining your impact, technologies used, and measurable outcomes.`
                    );
                }
            });
        }

        if (resume.experience.roles.length === 0) {
            recommendations.push(
                "Include relevant work experience, internships, freelance work, or volunteer positions."
            );
        } else {
            resume.experience.roles.forEach(role => {
                if (role.achievements.length === 0) {
                    recommendations.push(
                        `Add measurable achievements for your ${role.title} role instead of only responsibilities.`
                    );
                }

                if (role.description.length < 100) {
                    recommendations.push(
                        `Provide a more detailed description for your ${role.title} position.`
                    );
                }
            });
        }

        if (resume.certifications.length === 0) {
            recommendations.push(
                "Consider adding industry-recognized certifications relevant to your profession."
            );
        }

        if (resume.languages.length === 0) {
            recommendations.push(
                "List spoken languages if applicable."
            );
        }

        if (!resume.education.degree) {
            recommendations.push(
                "Include your educational background."
           );
        }

        if (metrics.atsCompatibility < 85) {
            recommendations.push(
                "Use standard section headings such as Experience, Education, Skills, and Projects for better ATS parsing."
            );
            recommendations.push(
                "Include important keywords from the target job description naturally throughout your resume."
            );
        }

        if (metrics.grammar < 85) {
            recommendations.push(
                "Review grammar, punctuation, and sentence clarity before submitting your resume."
            );
        }

        if (metrics.completeness < 90) {
            recommendations.push(
                "Aim to complete every major resume section for a stronger professional profile."
            );
        }

        return [...new Set(recommendations)];

    }

}