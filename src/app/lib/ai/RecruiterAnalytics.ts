// lib/ai/RecruiterAnalytics.ts (Updated)

export interface AnalyticsSnapshot {
  averageScore: number;
  interviewRate: number;
  hireRate: number;
  timeToHire: number; // in days
  commonMissingSkills: Array<{ skill: string; count: number }>;
  commonStrengths: Array<{ skill: string; count: number }>;
  funnelMetrics: {
    sourced: number;
    applied: number;
    interviewed: number;
    offered: number;
    hired: number;
  };
  weeklyTrends: Array<{ week: string; applications: number; hires: number }>;
  interviewConversion: number;
  offerConversion: number;
  recruiterSuccessRate: number;
}

export class RecruiterAnalytics {
  generateSnapshot(
    candidates: any[], 
    applications: any[], 
    interviews: any[],
    offers: any[],
    hires: any[]
  ): AnalyticsSnapshot {
    const scores = candidates.map(c => c.matchScore || 0);
    const interviewedCandidates = interviews.map(i => i.candidateId);
    const hiredCandidates = hires.map(h => h.candidateId);
    const offeredCandidates = offers.map(o => o.candidateId);

    // Calculate rates
    const interviewRate = candidates.length > 0 
      ? (interviewedCandidates.length / candidates.length) * 100 
      : 0;
    const offerRate = interviewedCandidates.length > 0 
      ? (offeredCandidates.length / interviewedCandidates.length) * 100 
      : 0;
    const hireRate = offeredCandidates.length > 0 
      ? (hiredCandidates.length / offeredCandidates.length) * 100 
      : 0;

    // Calculate time to hire (real data)
    const timeToHire = this.calculateTimeToHire(hires);

    // Calculate skill gaps (real data)
    const skillCount: Record<string, number> = {};
    candidates.forEach(c => {
      (c.skills || []).forEach((s: string) => {
        skillCount[s] = (skillCount[s] || 0) + 1;
      });
    });

    const sortedSkills = Object.entries(skillCount)
      .sort((a, b) => a[1] - b[1]);

    return {
      averageScore: scores.reduce((a, b) => a + b, 0) / (scores.length || 1),
      interviewRate,
      hireRate,
      timeToHire,
      commonMissingSkills: sortedSkills.slice(0, 5).map(([skill, count]) => ({
        skill,
        count: candidates.length - count,
      })),
      commonStrengths: sortedSkills.slice(0, 5).map(([skill, count]) => ({
        skill,
        count,
      })),
      funnelMetrics: {
        sourced: candidates.length,
        applied: applications.length,
        interviewed: interviewedCandidates.length,
        offered: offeredCandidates.length,
        hired: hiredCandidates.length,
      },
      weeklyTrends: this.calculateWeeklyTrends(applications, hires),
      interviewConversion: interviewRate,
      offerConversion: offerRate,
      recruiterSuccessRate: hireRate,
    };
  }

  private calculateTimeToHire(hires: any[]): number {
    if (hires.length === 0) return 0;
    const avgTime = hires.reduce((sum, h) => {
      const hiredDate = new Date(h.hiredAt);
      const appliedDate = new Date(h.appliedAt);
      return sum + (hiredDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(avgTime / hires.length);
  }

  private calculateWeeklyTrends(applications: any[], hires: any[]): Array<{ week: string; applications: number; hires: number }> {
    const weeks: Record<string, { applications: number; hires: number }> = {};
    
    // Group applications by week
    applications.forEach(app => {
      const date = new Date(app.createdAt);
      const weekKey = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
      if (!weeks[weekKey]) {
        weeks[weekKey] = { applications: 0, hires: 0 };
      }
      weeks[weekKey].applications++;
    });

    // Group hires by week
    hires.forEach(h => {
      const date = new Date(h.hiredAt);
      const weekKey = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
      if (weeks[weekKey]) {
        weeks[weekKey].hires++;
      }
    });

    return Object.entries(weeks)
      .map(([week, data]) => ({
        week,
        applications: data.applications,
        hires: data.hires,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private getWeekNumber(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return String(1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)).padStart(2, '0');
  }
}