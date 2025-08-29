"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

export default function SecureTestPage() {
  const { user } = useUser();
  const result = useQuery(api.secureHello.secureHello, { name: "Mavo" });

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">🔐 Secure Convex + Clerk Test</h1>

      {!user ? (
        <div>
          <p>You are not signed in.</p>
          <SignInButton mode="modal">
            <button className="px-4 py-2 bg-blue-500 text-white rounded">Sign In</button>
          </SignInButton>
        </div>
      ) : (
        <div>
          <UserButton afterSignOutUrl="/" />
          <p className="mt-4">{result ?? "Loading secure data..."}</p>
        </div>
      )}
    </div>
  );
}
