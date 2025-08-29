// src/app/lib/convexServer.ts
//Frontend Convex client (for metadata)
import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Make sure NEXT_PUBLIC_CONVEX_URL is set in .env.local
export const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

// Create a new resume record
export async function createResume({
  companyName,
  jobTitle,
  jobDescription,
  fileStorageId,
}: {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  fileStorageId: string; // string on frontend
}) {
  return await convex.mutation(api.resumes.createResume, {
    companyName,
    jobTitle,
    jobDescription,
    fileStorageId: fileStorageId as any, // cast to Convex Id<_storage>
  });
}

// Get resumes for the logged-in user
export async function getMyResumes() {
  return await convex.query(api.resumes.getMyResumes, {});
}
