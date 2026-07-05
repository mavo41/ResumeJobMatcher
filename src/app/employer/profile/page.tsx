"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useAuth, useUser } from "@clerk/nextjs";
import { Id } from "../../../../convex/_generated/dataModel";

type FormData = {
  companyName: string;
  website?: string;
  logo?: FileList;
};

export default function EmployerProfile() {
  const { userId } = useAuth();
  const { user: clerkUser } = useUser(); // Get Clerk user data
  const router = useRouter();

  // Fetch user and employer profile
  const convexUser = useQuery(api.users.getUser, { userId: userId || "" });
  const employerProfile = useQuery(api.employers.getEmployerByUserId, { userId: userId || "" });

  const createOrUpdateEmployerProfile = useMutation(api.users.createOrUpdateEmployerProfile);
  const generateUploadUrl = useMutation(api.jobs.generateUploadUrl);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Redirect to sign-in if not logged in
  useEffect(() => {
    if (!userId) router.push("/sign-in?redirect=/employer/profile");
  }, [userId, router]);

  // Upgrade user role if needed
   
 
  // Prefill form and show existing logo
  useEffect(() => {
    if (employerProfile) {
      setValue("companyName", employerProfile.companyName || "");
      setValue("website", employerProfile.website || "");
      if (employerProfile.logoFileId) {
        setPreviewUrl(`/api/storage/${employerProfile.logoFileId}`);
      }
    }
  }, [employerProfile, setValue]);

  // Loading state
  if (!userId) return null;
  
 // Show loading while creating user or fetching data
  if (convexUser === undefined || employerProfile === undefined) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <p className="text-lg">Setting up your employer account...</p>
          <div className="mt-2 text-sm text-gray-500">Please wait</div>
        </div>
      </div>
    );
  }

  // If user exists but role is not employer, show error
  useEffect(() => { 
  if (convexUser && convexUser.role !== "employer") {
    toast.error("You need an employer account to access this page.");
    router.push("/employer/upgrade"); // Redirect to upgrade page
  }
}, [convexUser, router]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      let logoFileId: Id<"_storage"> | undefined = employerProfile?.logoFileId;

      // Upload new logo if selected
      if (data.logo?.[0]) {

        //1. getting a one time upload url from convex
              const postUrl = await generateUploadUrl();
      // 2. Upload the file directly to that URL
              const response = await fetch(postUrl, {
        method: "POST",
        headers: {
          // Important: Convex expects the correct MIME type
          "Content-Type": data.logo[0].type,
        },
        body: data.logo[0],
      });
      
              if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
              const { storageId } = await response.json();
              logoFileId = storageId as Id<"_storage">;
      
              // Immediate local preview
              setPreviewUrl(URL.createObjectURL(data.logo[0]));
            }

      await createOrUpdateEmployerProfile({
        userId: userId!,
        companyName: data.companyName,
        website: data.website || undefined,
        logoFileId,
      });

      toast.success("Profile saved successfully!");
      router.push("/post-job");
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Set Up Employer Profile</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Company Name</label>
          <input
            {...register("companyName", { required: "Company name is required" })}
            className="w-full p-2 border rounded"
          />
          {errors.companyName && <p className="text-red-500">{errors.companyName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Website (optional)</label>
          <input
            {...register("website")}
            className="w-full p-2 border rounded"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Company Logo (optional)</label>
          <input
            type="file"
            accept="image/*"
            {...register("logo")}
            className="w-full p-2 border rounded"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setPreviewUrl(URL.createObjectURL(e.target.files[0]));
              }
            }}
          />
          {previewUrl && (
            <div className="mt-2">
              <p className="text-sm text-gray-500">Logo Preview:</p>
              <img src={previewUrl} alt="Logo preview" className="h-20 w-auto mt-1 border rounded" />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isSubmitting ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
