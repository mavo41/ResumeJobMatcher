// convex/fetchRemotive.ts
"use node";

import { action } from "./_generated/server";
import RSSParser from "rss-parser";

export const fetchRemotive = action(async (ctx) => {
  try {
    const parser = new RSSParser();
    const feed = await parser.parseURL("https://remotive.com/api/remote-jobs.rss"); // Updated URL
    const jobs = feed.items.map(item => ({
      title: item.title,
      company: item.creator || "Unknown",
      location: "Remote",
      description: item.content,
      url: item.link,
      source: "Remotive",
    }));

    console.log("Fetched Remotive jobs:", jobs);
    return { count: jobs.length, sample: jobs.slice(0, 2) };
  } catch (error) {
    console.error("Error fetching Remotive jobs:", error);
    throw new Error("Failed to fetch Remotive jobs");
  }
});