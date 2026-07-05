// components/BecomeEmployerButton.tsx
"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { useUpgradeModal } from "../hooks/useUpgradeModal";
import UpgradeToEmployerModal from "./UpgradeToEmployerModal";

export function BecomeEmployerButton() {
  const { userId } = useAuth();
  const user = useQuery(api.users.getUser, userId ? { userId } : "skip");
  const { isOpen, openModal, closeModal } = useUpgradeModal();

  if (!userId) {
    return (
      <Link href="/sign-in?redirect=/">
        <button className="border-2 border-blue-500 text-blue-500 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors">
          Sign in to Become an Employer
        </button>
      </Link>
    );
  }

  // Don't show if already employer
  if (user && user.role === "employer") {
    return (
      <Link href="/employer/dashboard">
        <button className="border-2 border-green-500 text-green-500 px-6 py-3 rounded-lg hover:bg-green-50 transition-colors">
          Go to Dashboard
        </button>
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={openModal}
        className="border-2 border-blue-500 text-blue-500 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
      >
        Become an Employer
      </button>
      
      <UpgradeToEmployerModal
        isOpen={isOpen}
        onClose={closeModal}
        userId={userId!}
      />
    </>
  );
}