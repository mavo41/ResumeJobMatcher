// src/app/lib/getFileFromConvexStorage.ts
import { fetchAction } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export type FileContent =
  | { type: "text"; data: string }
  | { type: "arrayBuffer"; data: ArrayBuffer };

export async function getFileFromConvexStorage(
  storageId: Id<"_storage">
): Promise<FileContent> {
  try {
    console.log("[getFileFromConvexStorage] Fetching file for:", storageId);
    
    // Use the API route to get the file
    const response = await fetch(`/api/storage/${storageId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    
    const contentType = response.headers.get("content-type") || "";
    const buffer = await response.arrayBuffer();
    
    if (contentType.includes("text") || contentType.includes("json") || contentType.includes("xml")) {
      const text = new TextDecoder().decode(buffer);
      return { type: "text", data: text };
    }
    
    return { type: "arrayBuffer", data: buffer };
  } catch (err) {
    console.error("Error fetching file from Convex storage:", err);
    throw err;
  }
}