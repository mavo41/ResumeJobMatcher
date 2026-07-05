"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useState, useEffect } from "react";

export default function UpgradeToEmployer() {
  const { userId } = useAuth();
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  const user = useQuery(api.users.getUser, userId ? { userId } : "skip");
  const upgradeToEmployer = useMutation(api.users.upgradeToEmployer);

  useEffect(() => {
    if (!userId) {
      router.push("/sign-in?redirect=/employer/upgrade");
    }
  }, [userId, router]);

  // If already employer, redirect to profile
  useEffect(() => {
    if (user && user.role === "employer") {
      router.push("/employer/profile");
    }
  }, [user, router]);

  const handleUpgrade = async () => {
    if (!userId) return;
    
    setIsUpgrading(true);
    try {
      await upgradeToEmployer({ userId });
      toast.success("Account upgraded to employer!");
      router.push("/employer/profile");
    } catch (error) {
      console.error("Upgrade failed:", error);
      toast.error("Failed to upgrade account. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!userId || user === undefined) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Become an Employer</h1>
        <p className="text-gray-600 mb-6">
          Upgrade your account to start posting jobs and managing your company's hiring process.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">Employer Benefits:</h2>
          <ul className="text-blue-700 space-y-1">
            <li>✓ Post and manage job listings</li>
            <li>✓ Review job applications</li>
            <li>✓ Track applicant progress</li>
            <li>✓ Company profile management</li>
          </ul>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={isUpgrading}
          className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isUpgrading ? "Upgrading..." : "Upgrade to Employer Account"}
        </button>
      </div>
    </div>
  );
}