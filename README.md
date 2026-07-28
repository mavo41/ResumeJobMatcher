Resume Matcher

An AI-assisted hiring platform connecting jobseekers and employers, built around one core principle: **every candidate receives the same automated, explainable evaluation — no silent auto-rejection, ever.** Employers always see every application; scoring is advisory, not gatekeeping.

Tech Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS
- Backend: Convex (reactive database + serverless functions)
- Auth: Clerk
- AI: Groq (chat/completion), deterministic in-house scoring engine (no LLM-based scoring — see Architecture)

 Core Principles

1. No black-box auto-reject. Every submitted application is visible to the employer regardless of score.
2. Deterministic, reproducible scoring. The same resume against the same job always produces the same Job Match score — no LLM randomness in the number itself, only in the prose explanation layered on top.
3. Universal auto-scoring.** Every candidate who applies with a resume is automatically analyzed — evaluation isn't contingent on an employer happening to click on them.
4. Bias mitigation beyond resumes. PII/name/institution redaction for blind review, plus job-posting language bias detection (gendered/age-coded/ableist/exclusionary phrasing) before publishing.
5. Transparency to candidates. Two distinct, always-shown scores — Resume Quality (how well-written) and Job Match (how well it fits this specific role) — with a specific, itemized explanation when they diverge.

 Architecture

- convex/schema.ts — all data models
- convex/resumeAnalysis.ts — background resume analysis pipeline (Groq prose feedback + deterministic ScoringEngine job-match)
- convex/candidateScoring.ts — automatic scoring triggered on every job application
- lib/ai/ScoringEngine.ts — deterministic, weighted, per-category candidate scoring (skills/experience/education/projects/certifications/achievements)
- lib/ai/JobDescriptionBiasChecker.ts — pattern-based job posting bias detection
- lib/ai/BiasMitigator.ts — candidate resume PII/name/institution redaction
- convex/messages.ts / convex/interviews.ts — in-platform messaging and interview scheduling
- convex/feedback.ts — adaptive scoring-weight learning from real hire outcomes

 Environment Variables

NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
GROQ_API_KEY=
INTERNAL_API_KEY=


GROQ_API_KEY must be set on both .env.local (Next.js routes) and via npx convex env set GROQ_API_KEY ... (Convex actions) — these are separate environments.

 Setup

bash
npm install
npx convex dev
npm run dev


 Known Limitations

- Semantic (embedding-based) skill matching is disabled by default in favor of deterministic literal matching, for scoring reproducibility.
- Time-to-hire and hire-outcome correlation metrics require real hire volume to be meaningful.
- Resume templates: two available (Classic, Modern); architecture supports adding more.


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.



## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
