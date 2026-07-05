import { z } from "zod";

const NonEmptyString = z
  .string()
  .trim()
  .min(1);

const OptionalUrl = z
  .string()
  .url()
  .optional();

const SkillArray = z
  .array(NonEmptyString)
  .max(100);

const CertificationArray = z
  .array(NonEmptyString)
  .max(50);


export const RecruiterWeightsSchema = z.object({
  skills: z.number().min(0).max(1),
  experience: z.number().min(0).max(1),
  education: z.number().min(0).max(1),
  projects: z.number().min(0).max(1),
  certifications: z.number().min(0).max(1),
  achievements: z.number().min(0).max(1)
}).superRefine((weights, ctx) => {

  const total =
    weights.skills +
    weights.experience +
    weights.education +
    weights.projects +
    weights.certifications +
    weights.achievements;

  if (Math.abs(total - 1) > 0.001) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
       "Recruiter weights must total exactly 1.0"
    });
  }
});

export const JobRequirementsSchema = z.object({
  requiredSkills: SkillArray,
  preferredSkills:
    SkillArray.optional(),
  mandatorySkills:
    SkillArray.optional(),
  minExperience:
    z.number()
      .min(0)
      .max(50),
  educationLevel:
    z.enum([
      "high_school",
      "bachelors",
      "masters",
      "phd"
    ]),
  educationField:
    NonEmptyString,
  certifications:
    CertificationArray.default([]),
  jobRole:
    NonEmptyString
});

export const AnalyzeRequestSchema = z.object({
  candidateId:
    NonEmptyString,
  resumeText:
    z.string()
      .min(50)
      .max(100000),
  jobRequirements:
    JobRequirementsSchema,
  recruiterWeights:
    RecruiterWeightsSchema.optional()
});

export const ChatRequestSchema = z.object({
  message:
    z.string()
      .min(1)
      .max(10000),
  context:
    z.object({
      candidates:
        z.array(z.any())
          .optional(),
      analytics:
        z.any()
          .optional(),
      jobRequirements:
        JobRequirementsSchema
          .optional(),
      jobTitle:
        NonEmptyString
          .optional()
    })
});

export const RecruiterFeedbackSchema = z.object({
  candidateId:
    NonEmptyString,
  hired:
    z.boolean(),
  recruiterNotes:
    z.string()
      .max(5000)
      .optional(),
  recruiterScore:
    z.number()
      .min(0)
      .max(100)
      .optional()
});

export const AnalyticsRequestSchema = z.object({
  companyId:
    NonEmptyString,
  startDate:
    z.string()
      .datetime(),
  endDate:
    z.string()
      .datetime()
});

export const SearchRequestSchema = z.object({
  query:
    NonEmptyString,
  limit:
    z.number()
      .min(1)
      .max(100)
      .default(20)
});

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
     success: true;
      data: T;
    }
  | {
      success: false;
      error: z.ZodError;
    }
{
  const result = schema.safeParse(data);
  if (result.success) {

    return {
      success: true,
      data: result.data
    };
  }

  return {
    success: false,
    error: result.error
  };
}

export function formatValidationErrors(
  error: z.ZodError
): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key =
      issue.path.join(".") ||
      "root";
    if (!formatted[key]) {
      formatted[key] = [];
    }
    formatted[key].push(issue.message);
  }
  return formatted;
}

export type AnalyzeRequest =
  z.infer<typeof AnalyzeRequestSchema>;

export type JobRequirements =
  z.infer<typeof JobRequirementsSchema>;

export type RecruiterWeights =
  z.infer<typeof RecruiterWeightsSchema>;

export type RecruiterFeedback =
  z.infer<typeof RecruiterFeedbackSchema>;

export type AnalyticsRequest =
  z.infer<typeof AnalyticsRequestSchema>;

export type ChatRequest =
  z.infer<typeof ChatRequestSchema>;

export type SearchRequest =
  z.infer<typeof SearchRequestSchema>;