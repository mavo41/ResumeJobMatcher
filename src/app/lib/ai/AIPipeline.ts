// lib/ai/AIPipeline.ts
import { ResumeParser } from './ResumeParser';
import { ScoringEngine } from './ScoringEngine';
import { BiasMitigator } from './BiasMitigator';
import { ConfidenceEngine } from './ConfidenceEngine';
import { ResumeQualityScore } from './ResumeQualityScore';
import { FeedbackLearning } from './FeedbackLearning';
import {
  ParsedResume,
  CandidateScore,
  ConfidenceReport,
  BiasReport,
  ResumeQualityMetrics,
  JobRequirements,
} from './types';

export type { 
  ParsedResume,
  CandidateScore,
  ConfidenceReport,
  BiasReport,
  ResumeQualityMetrics,
  JobRequirements,
};

export class AIPipeline {
  private parser = new ResumeParser();
  private scorer = new ScoringEngine();
  private biasMitigator = new BiasMitigator();
  private confidenceEngine = new ConfidenceEngine();
  private qualityScorer = new ResumeQualityScore();
  private feedbackLearner = new FeedbackLearning(process.env.NEXT_PUBLIC_CONVEX_URL);
  
  async processResume(
    resumeText: string, 
    job: JobRequirements,
    candidateId: string,
    authToken?: string
  ): Promise<{
    score: CandidateScore;
    confidence: ConfidenceReport;
    bias: BiasReport;
    quality: ResumeQualityMetrics;
    parsedResume: ParsedResume;
    recommendations: string[];
  }> {
    // Step 1: Anonymize
    const biasAnalysis = this.biasMitigator.anonymize(resumeText);
    
    // Step 2: Parse
    const parsedResume = this.parser.parse(biasAnalysis.anonymized);
    
    // Step 3: Score
    const score = await this.scorer.scoreCandidate(parsedResume, job);
    
    // Step 4: Confidence
    const confidence = this.confidenceEngine.analyze(parsedResume, score);
    
    // Step 5: Quality Score
    const quality = this.qualityScorer.analyze(resumeText);
    
    // Step 6: Generate Report
    const report = {
      score,
      confidence,
      bias: biasAnalysis,
      quality,
      parsedResume,
      recommendations: this.generateRecommendations(score, confidence, quality),
    };

    // Step 7: Store for feedback learning
    const simpleBreakdown = FeedbackLearning.convertBreakdown(score.breakdown);
    //this.feedbackLearner.recordOutcome({
    void this.feedbackLearner.recordOutcome({
      candidateId: candidateId,
      score: score.overall,
      breakdown: simpleBreakdown,
      interviewed: false,
      hired: false,
      rejected: false,
       }, authToken);


    return report;
  }

  private generateRecommendations(
    score: CandidateScore, 
    confidence: ConfidenceReport, 
    quality: ResumeQualityMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (score.overall > 80) {
      recommendations.push('Strong candidate - recommend for interview');
    } else if (score.overall > 60) {
      recommendations.push('Good candidate - consider for interview');
    } else {
      recommendations.push('Candidate needs further review');
    }

    if (confidence.score < 70) {
      recommendations.push('Low confidence - consider verifying experience claims');
    }

    if (quality.overall < 60) {
      recommendations.push('Resume quality could be improved');
    }

    return recommendations;
  }
}