"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function UpgradeToEmployerModal({ 
  isOpen, 
  onClose, 
  userId 
}: UpgradeModalProps) {
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const upgradeToEmployer = useMutation(api.users.upgradeToEmployer);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await upgradeToEmployer({ userId });
      toast.success("Account upgraded to employer! 🎉");
      onClose();
      // Redirect to profile setup
      router.push("/employer/profile");
    } catch (error) {
      console.error("Upgrade failed:", error);
      toast.error("Failed to upgrade account. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Become an Employer
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            Upgrade your account to start posting jobs and managing your company's hiring process.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">✨ Employer Benefits:</h3>
            <ul className="text-blue-700 space-y-1 text-sm">
              <li>• Post and manage job listings</li>
              <li>• Review and track applications</li>
              <li>• Company profile management</li>
              <li>• Access to analytics</li>
            </ul>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isUpgrading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Upgrading...
                </span>
              ) : (
                "Upgrade to Employer"
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}