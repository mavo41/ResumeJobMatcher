// src/app/lib/convexUpload.ts
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";


// Hook for handling file uploads to Convex
export function useConvexFileUploader() {
  const generateUploadUrl = useMutation(api.resumes.generateUploadUrl);
  const getFileUrl = useAction(api.resumes.getFileUrl);
  
  // returns the storage id (Id<"_storage">) after POSTing to Convex
  const uploadFileToConvex = async (file: File): Promise<Id<"_storage">> => {
    // 1) get a signed upload URL from Convex
    const uploadUrl = await generateUploadUrl();
    console.log("🔗 Generated upload URL:", uploadUrl);

    // 2) upload file with fetch
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    console.log("📩 Raw response from Convex upload:", res);

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Upload failed. Status:", res.status, "Body:", text);
      throw new Error("Failed to upload file to Convex storage");
    }

    // 3) Convex responds with Location header (not JSON!)
    const json = await res.json();
    const storageId = json.storageId as Id<"_storage">;
    if (!storageId) {
      throw new Error("No storageId returned from Convex upload");
    }

    return storageId; // correct branded type
  };


  // Get a permanent file URL from storageId
  const resolveFileUrl = async (storageId: Id<"_storage">) => {
    const url = await getFileUrl({ storageId });
    return url;
  };

  return { uploadFileToConvex, resolveFileUrl };
}
