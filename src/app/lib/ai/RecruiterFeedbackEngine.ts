// lib/ai/RecruiterFeedbackEngine.ts

import {
    CandidateScore,
    RecruiterFeedback,
    RecruiterLearningProfile,
    ScoringWeights,
} from "./types";

export class RecruiterFeedbackEngine {

    private learningRate = 0.08;

    /**
     * Default scoring weights
     */
    getDefaultWeights(): ScoringWeights {

        return {
            skills: 30,
            experience: 15,
            education: 15,
            projects: 10,
            certifications: 10,
            achievements: 10,
            resumeQuality: 10,
       };

    }

    /**
     * Initialize recruiter profile
     */
    createProfile(recruiterId: string): RecruiterLearningProfile {

        return {

            recruiterId,

            totalFeedback: 0,
            accuracy: 0.5,
            learnedWeights: this.getDefaultWeights(),
            preferredWeights: this.getDefaultWeights(),

lastUpdated: Date.now().toString()
        };

    }

    /**
     * Learn from recruiter decision
     */
    updateProfile(

        profile: RecruiterLearningProfile,

        feedback: RecruiterFeedback

    ): RecruiterLearningProfile {

        const updated = {

            ...profile,

            preferredWeights: {

                ...profile.preferredWeights,

            },

        };

        updated.totalFeedback++;

        updated.lastUpdated = Date.now().toString();

        const multiplier = feedback.finalOutcome === "hired"

            ? 1

            : -1;

        this.adjustWeights(

            updated.preferredWeights,

            feedback,

            multiplier

        );

        updated.accuracy = this.calculateAccuracy(

            updated.totalFeedback

        );

        return updated;

    }

        /**
     * Adjust scoring weights
     */
    private adjustWeights(

        weights: ScoringWeights,

        feedback: RecruiterFeedback,

        multiplier: number

    ) {

        const breakdown = feedback.recruiterRatings;

        weights.skills +=

            breakdown.skills*

            this.learningRate *

            multiplier;

        weights.experience +=

            breakdown.experience *

            this.learningRate *

            multiplier;

        weights.education +=

            breakdown.education *

            this.learningRate *

            multiplier;

        weights.projects +=

            breakdown.projects *

            this.learningRate *

            multiplier;

        weights.certifications +=

            breakdown.certifications *

            this.learningRate *

            multiplier;

        weights.achievements +=

            breakdown.achievements *

            this.learningRate *

            multiplier;

        this.normalizeWeights(weights);

    }

    /**
     * Normalize weights to total 100
     */
    private normalizeWeights(

        weights: ScoringWeights

    ) {

        const total =

            weights.skills +

            weights.experience +

            weights.education +

            weights.projects +

            weights.certifications +

            weights.achievements;

        Object.keys(weights).forEach((key) => {

            const typed = key as keyof ScoringWeights;

            weights[typed] =

                (weights[typed] / total) * 100;

        });

    }

        /**
     * Apply learned weights
     */
    applyLearning(

        score: CandidateScore,

        profile: RecruiterLearningProfile

    ): CandidateScore {

        const w = profile.preferredWeights;

        const updatedScore =

            score.breakdown.skills.score * (w.skills / 100) +

            score.breakdown.experience.score * (w.experience / 100) +

            score.breakdown.education.score * (w.education / 100) +

            score.breakdown.projects.score * (w.projects / 100) +

            score.breakdown.certifications.score * (w.certifications / 100) +

            score.breakdown.achievements.score * (w.achievements / 100);

        return {

            ...score,

            overall: Math.round(updatedScore),

        };

    }

    /**
     * Recruiter confidence
     */
    private calculateAccuracy(

        totalFeedback: number

    ): number {

        if (totalFeedback === 0) return 0.5;

        return Math.min(

            0.5 +

                totalFeedback *

                    0.01,

            0.95

        );

    }

}