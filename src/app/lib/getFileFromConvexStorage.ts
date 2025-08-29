// src/app/lib/getFileFromConvexStorage.ts
// Server-side helper: fetch file from Convex storage signed URL.
import { fetchAction } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// Define the possible return types for the file content
export type FileContent =
  | { type: "text"; data: string }
  | { type: "arrayBuffer"; data: ArrayBuffer };

export async function getFileFromConvexStorage(
  storageId: Id<"_storage">
): Promise<FileContent> {
  try {
    // 1) Ask Convex for a signed URL (server-side)
    const url = await fetchAction(api.resumes.getFileUrl, { storageId });
    console.log("[getFileFromConvexStorage] Signed URL received:", url);

    if (!url) throw new Error("File not found in Convex storage (getFileUrl returned null)");

    // 2) Fetch the file from the signed URL
    const res = await fetch(url);
    if (!res.ok) {
      const bodySnippet = await res.text().catch(() => "");
      throw new Error(`Failed to fetch file from signed URL: ${res.status} ${res.statusText} ${bodySnippet.slice(0, 200)}`);
    }

    // 3) Check content-type
    const contentType = (res.headers.get("content-type") || "").toLowerCase();

    // 4) Read as text when it looks like a text file
    if (
      contentType.includes("text/plain") ||
      contentType.includes("application/json") ||
      contentType.includes("text/html") ||
      contentType.includes("xml")
    ) {
      const text = await res.text();
      const trimmed = text.trim().slice(0, 20).toLowerCase();
      // Detect HTML error pages
      if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
        throw new Error(`Convex returned HTML instead of file content. Snippet: ${text.substring(0, 200)}`);
      }
      return { type: "text", data: text };
    }

    // 5) Default: return binary ArrayBuffer for pdf/docx/unknown
    const buffer = await res.arrayBuffer();
    return { type: "arrayBuffer", data: buffer };
  } catch (err) {
    console.error("Error fetching file from Convex storage:", err);
    throw err;
  }
}
