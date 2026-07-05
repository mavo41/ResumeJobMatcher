// lib/ai/AnalyticsEngine.ts

import {
    AnalyticsSnapshot,
    CandidateScore,
} from "./types";

export interface AnalyticsCandidate {

    id: string;

    score: CandidateScore;

    status:
        | "SOURCED"
        | "APPLIED"
        | "INTERVIEW"
        | "OFFER"
        | "HIRED"
        | "REJECTED";

    recruiterId: string;

    appliedDate: number;

    hiredDate?: number;

    missingSkills: string[];

    strengths: string[];
}

export interface RecruiterMetrics {

    recruiterId: string;

    totalCandidates: number;

    interviews: number;

    hires: number;

    interviewRate: number;

    hireRate: number;

    averageScore: number;

    averageTimeToHire: number;
}

export class AnalyticsEngine {

    /**
     * Main analytics snapshot
     */
    generateSnapshot(

        candidates: AnalyticsCandidate[]

    ): AnalyticsSnapshot {

        const averageScore =
            this.calculateAverageScore(candidates);

        const interviewRate =
            this.calculateInterviewRate(candidates);

        const hireRate =
            this.calculateHireRate(candidates);

        const timeToHire =
            this.calculateTimeToHire(candidates);

        const missingSkills =
            this.aggregateMissingSkills(candidates);

        const strengths =
            this.aggregateStrengths(candidates);

        return {

            averageScore,

            interviewRate,

            hireRate,

            timeToHire,





            interviewConversion:
                this.calculateInterviewConversion(candidates),

            offerConversion:
                this.calculateOfferConversion(candidates),

            recruiterSuccessRate:
                this.calculateRecruiterSuccess(candidates),

        };

    }

    /**
     * Average AI score
     */
    private calculateAverageScore(

        candidates: AnalyticsCandidate[]

    ): number {

        if (!candidates.length)
            return 0;

        const total =
            candidates.reduce(

                (sum, candidate) =>
                    sum + candidate.score.overall,

                0

            );

        return Math.round(

            total / candidates.length

        );

    }

    /**
     * Interview %

     */
    private calculateInterviewRate(

        candidates: AnalyticsCandidate[]

    ): number {

        if (!candidates.length)
            return 0;

        const interviews =
            candidates.filter(

                c =>
                    c.status === "INTERVIEW" ||
                    c.status === "OFFER" ||
                    c.status === "HIRED"

            ).length;

        return Number(

            (
                (interviews /
                    candidates.length) *
                100
            ).toFixed(1)

        );

    }

    /**
     * Hire %
     */
    private calculateHireRate(

        candidates: AnalyticsCandidate[]

    ): number {

        if (!candidates.length)
            return 0;

        const hires =
            candidates.filter(

                c =>
                    c.status === "HIRED"

            ).length;

        return Number(

            (

                hires /

                candidates.length

            ).toFixed(2)

        ) * 100;

    }

        /**
     * Average hiring time
     */
    private calculateTimeToHire(

        candidates: AnalyticsCandidate[]

    ): number {

        const hired =
            candidates.filter(

                c =>
                    c.status === "HIRED" &&
                    c.hiredDate

            );

        if (!hired.length)
            return 0;

        const totalDays =
            hired.reduce(

                (sum, candidate) => {

                    const days =

                        (

                            candidate.hiredDate!

                            -

                            candidate.appliedDate

                        )

                        /

                        (1000 * 60 * 60 * 24);

                    return sum + days;

                },

                0

            );

        return Math.round(

            totalDays / hired.length

        );

    }

    /**
     * Missing skills
     */
    private aggregateMissingSkills(

        candidates: AnalyticsCandidate[]

    ) {

        const map =
            new Map<string, number>();

        candidates.forEach(candidate => {

            candidate.missingSkills.forEach(skill => {

                map.set(

                    skill,

                    (map.get(skill) || 0) + 1

                );

            });

        });

        return [...map.entries()]

            .sort((a, b) => b[1] - a[1])

            .slice(0, 10)

            .map(

                ([skill, count]) => ({

                    skill,

                    count,

                })

            );

    }

    /**
     * Candidate strengths
     */
    private aggregateStrengths(

        candidates: AnalyticsCandidate[]

    ) {

        const map =
            new Map<string, number>();

        candidates.forEach(candidate => {

            candidate.strengths.forEach(skill => {

                map.set(

                    skill,

                    (map.get(skill) || 0) + 1

                );

            });

        });

        return [...map.entries()]

            .sort((a, b) => b[1] - a[1])

            .slice(0, 10)

            .map(

                ([skill, count]) => ({

                    skill,

                    count,

                })

            );

    }

        /**
     * Hiring funnel
     */
    private calculateHiringFunnel(
        candidates: AnalyticsCandidate[]
    ) {

        return {

            sourced: candidates.filter(
                c => c.status === "SOURCED"
            ).length,

            applied: candidates.filter(
                c => c.status === "APPLIED"
            ).length,

            interviewed: candidates.filter(
                c =>
                    c.status === "INTERVIEW" ||
                    c.status === "OFFER" ||
                    c.status === "HIRED"
            ).length,

            offered: candidates.filter(
                c =>
                    c.status === "OFFER" ||
                    c.status === "HIRED"
            ).length,

            hired: candidates.filter(
                c => c.status === "HIRED"
            ).length,

        };

    }

    /**
     * Weekly application trend
     */
    private calculateWeeklyTrend(
        candidates: AnalyticsCandidate[]
    ) {

        const weeks = new Map<
            string,
            {
                applications: number;
                hires: number;
            }
        >();

        candidates.forEach(candidate => {

            const date = new Date(candidate.appliedDate);

            const week =
                `${date.getFullYear()}-W${this.getWeekNumber(date)}`;

            if (!weeks.has(week)) {

                weeks.set(week, {

                    applications: 0,

                    hires: 0,

                });

            }

            const current = weeks.get(week)!;

            current.applications++;

            if (candidate.status === "HIRED") {

                current.hires++;

            }

        });

        return [...weeks.entries()]

            .sort((a, b) => a[0].localeCompare(b[0]))

            .map(([week, values]) => ({

                week,

                applications: values.applications,

                hires: values.hires,

            }));

    }

    /**
     * ISO week helper
     */
    private getWeekNumber(date: Date): number {

        const firstDay = new Date(date.getFullYear(), 0, 1);

        const diff =
            (date.getTime() - firstDay.getTime()) /
            86400000;

        return Math.ceil(
            (diff + firstDay.getDay() + 1) / 7
        );

    }

    /**
     * Interview conversion
     */
    private calculateInterviewConversion(
        candidates: AnalyticsCandidate[]
    ): number {

        const interviewed =
            candidates.filter(

                c =>
                    c.status === "INTERVIEW" ||
                    c.status === "OFFER" ||
                    c.status === "HIRED"

            ).length;

        const applied =
            candidates.filter(

                c =>
                    c.status !== "SOURCED"

            ).length;

        if (!applied) return 0;

        return Number(

            (

                interviewed /

                applied *

                100

            ).toFixed(1)

        );

    }

    /**
     * Offer conversion
     */
    private calculateOfferConversion(
        candidates: AnalyticsCandidate[]
    ): number {

        const offers =
            candidates.filter(

                c =>
                    c.status === "OFFER" ||
                    c.status === "HIRED"

            ).length;

        const interviews =
            candidates.filter(

                c =>
                    c.status === "INTERVIEW" ||
                    c.status === "OFFER" ||
                    c.status === "HIRED"

            ).length;

        if (!interviews) return 0;

        return Number(

            (

                offers /

                interviews *

                100

            ).toFixed(1)

        );

    }

    /**
     * Recruiter success rate
     */
    private calculateRecruiterSuccess(
        candidates: AnalyticsCandidate[]
    ): number {

        const recruiters = this.generateRecruiterMetrics(candidates);

        if (!recruiters.length)
            return 0;

        const average = recruiters.reduce(

            (sum, recruiter) =>
                sum + recruiter.hireRate,

            0

        );

        return Number(

            (

                average /

                recruiters.length

            ).toFixed(1)

        );

    }

        /**
     * Analytics per recruiter
     */
    generateRecruiterMetrics(
        candidates: AnalyticsCandidate[]
    ): RecruiterMetrics[] {

        const recruiterMap =
            new Map<string, AnalyticsCandidate[]>();

        candidates.forEach(candidate => {

            if (!recruiterMap.has(candidate.recruiterId)) {

                recruiterMap.set(
                    candidate.recruiterId,
                    []
                );

            }

            recruiterMap
                .get(candidate.recruiterId)!
                .push(candidate);

        });

        const metrics: RecruiterMetrics[] = [];

        recruiterMap.forEach((list, recruiterId) => {

            const hires =
                list.filter(
                    c => c.status === "HIRED"
                ).length;

            const interviews =
                list.filter(

                    c =>
                        c.status === "INTERVIEW" ||
                        c.status === "OFFER" ||
                        c.status === "HIRED"

                ).length;

            const avgScore =

                list.reduce(

                    (sum, c) =>
                        sum + c.score.overall,

                    0

                ) /

                list.length;

            const avgHireDays = this.calculateTimeToHire(list);

            metrics.push({

                recruiterId,

                totalCandidates: list.length,

                interviews,

                hires,

                interviewRate:
                    Number(

                        (

                            interviews /

                            list.length *

                            100

                        ).toFixed(1)

                    ),

                hireRate:
                    Number(

                        (

                            hires /

                            list.length *

                            100

                        ).toFixed(1)

                    ),

                averageScore:
                    Math.round(avgScore),

                averageTimeToHire:
                    avgHireDays,

            });

        });

        return metrics.sort(

            (a, b) =>
                b.hireRate - a.hireRate

        );

    }

}