// src/app/lib/anonymousId.ts

const STORAGE_KEY = "rm_anon_id";

export function getAnonymousId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = `anon_${crypto.randomUUID()}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}