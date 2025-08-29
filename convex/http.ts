//convex\http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";
const http = httpRouter();

http.route({
  path: "/getFileUrl",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const urlObj = new URL(request.url);
    const storageIdStr = urlObj.searchParams.get("storageId");


    if (!storageIdStr) {
      return new Response("Missing storageId", { status: 400 });
    }
    
     // Convert string → Convex ID type
    const storageId = storageIdStr as Id<"_storage">;
        // Get the file's download URL from Convex storage
    const fileUrl = await ctx.storage.getUrl(storageId);

    if (fileUrl === null) {
      return new Response("File not found", { status: 404 });
    }

    // Redirect to the file's URL
    return new Response(fileUrl, {
      status: 200,
    });
  }),
});

export default http;