"use client";
import { useAuth } from "@clerk/nextjs";

export default function DebugAuth() {
  const { getToken, isSignedIn } = useAuth();

  async function showToken() {
    console.log("Signed in:", isSignedIn);
    const token = await getToken({ template: "convex" });
    console.log("Clerk JWT:", token);
  }

  return (
    <button onClick={showToken} className="p-2 bg-blue-500 text-white rounded">
      Debug Token
    </button>
  );
}
