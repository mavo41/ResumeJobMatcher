// src/app/lib/useConvexFileUrl.ts
"use client";

import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Client hook to fetch a Convex-signed file URL for preview.
 * Returns { fetchFileUrl } where fetchFileUrl(storageId) => string | null
 */
export function useConvexFileUrl() {
  const getFileUrl = useAction(api.resumes.getFileUrl);

  const fetchFileUrl = async (storageId: string | null | undefined): Promise<string | null> => {
    if (!storageId) return null;
    try {
      
        const url = await getFileUrl({ storageId: storageId as Id<"_storage"> });
      if (!url) return null;
      
      // HEAD check — ensure it's not HTML
      const head = await fetch(url, { method: "HEAD" });
      const contentType = head.headers.get("content-type") || "";

      if (contentType.includes("text/html")) {
        console.warn("[useConvexFileUrl] Convex returned HTML — signed URL may be invalid/expired:", url);
        return null;
      }

      return url;
    } catch (err) {
      console.error("Error fetching Convex file URL:", err);
      return null;
    }
  };

  return { fetchFileUrl };
}