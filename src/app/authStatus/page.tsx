"use client";
//src\app\authStatus\page.tsx
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AuthStatus() {
  const result = useQuery(api.authTest.whoami);

  if (result === undefined)
   return  
         <div className="flex flex-col items-center gap-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-lg text-muted-foreground">Loading ...</p>
        </div>;

  return (
    <div>
      {result.status === "authenticated" ? (
        <p>✅ Logged in as {result.email}</p>
      ) : (
        <p>❌ Not logged in</p>
      )}
    </div>
  );
}
