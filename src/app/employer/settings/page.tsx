// app/employer/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User, Building2, Bell, Shield, Save, Upload,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Skeleton } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

type SettingsTab = "profile" | "company" | "notifications" | "security";

export default function SettingsPage() {
  const { userId } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get tab from URL or default to "profile"
  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const initialTab = tabParam && ["profile", "company", "notifications", "security"].includes(tabParam) 
    ? tabParam 
    : "profile";
  
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const user = useQuery(api.users.getUser, userId ? { userId } : "skip");
  const employerProfile = useQuery(
    api.employers.getEmployerByUserId,
    userId ? { userId } : "skip"
  );

  const updateUser = useMutation(api.users.updateUser);
  const createOrUpdateEmployer = useMutation(api.employers.createOrUpdateEmployerProfile);

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    website: "",
    industry: "",
    size: "",
    description: "",
    location: "",
  });
  
  const updateNotificationPreferences = useMutation(api.settings.updateNotificationPreferences);
  
  const [notifications, setNotifications] = useState({
    newApplications: true,
    interviewReminders: true,
    candidateMessages: true,
    jobExpirations: true,
    marketingUpdates: false,
  });

  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    sessionTimeout: "1h",
  });

  // Update URL when tab changes
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    // Update URL without page reload
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.push(`/employer/settings?${params.toString()}`, { scroll: false });
  };

  // Load data when available
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
    if (employerProfile) {
      setCompanyForm({
        companyName: employerProfile.companyName || "",
        website: employerProfile.website || "",
        industry: employerProfile.industry || "",
        size: employerProfile.size || "",
        description: employerProfile.description || "",
        location: employerProfile.location || "",
      });
    }
  }, [user, employerProfile]);

  const handleProfileSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      await updateUser({
        userId,
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        clerkId: userId,
      });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompanySave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      await createOrUpdateEmployer({
        userId,
        companyName: companyForm.companyName,
        website: companyForm.website,
        industry: companyForm.industry,
        size: companyForm.size,
        description: companyForm.description,
        location: companyForm.location,
      });
      toast.success("Company settings updated!");
    } catch (error) {
      toast.error("Failed to update company settings");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotificationPreferences = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      await updateNotificationPreferences({
        userId,
        preferences: notifications,
      });
      toast.success("Notification preferences saved!");
    } catch (error) {
      toast.error("Failed to save preferences");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (user === undefined || employerProfile === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-32" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "company", label: "Company", icon: Building2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Manage your account and company preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as SettingsTab)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap
                ${
                  isActive
                    ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Profile Settings
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Update your personal information
              </p>
            </div>

            <div className="flex items-center gap-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-semibold text-white">
                  {profileForm.name.charAt(0) || "U"}
                </div>
                <button className="absolute bottom-0 right-0 rounded-full bg-indigo-600 p-1.5 text-white hover:bg-indigo-700">
                  <Upload className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {profileForm.name || "Your Name"}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Upload a new photo or change your profile details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name
                </label>
                <Input
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Phone Number
                </label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <Button onClick={handleProfileSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {activeTab === "company" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Company Settings
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Manage your company profile and branding
              </p>
            </div>

            <div className="flex items-center gap-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-semibold text-white">
                  {companyForm.companyName.charAt(0) || "C"}
                </div>
                <button className="absolute bottom-0 right-0 rounded-full bg-indigo-600 p-1.5 text-white hover:bg-indigo-700">
                  <Upload className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {companyForm.companyName || "Company Logo"}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Upload a company logo (recommended: 400x400px)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Company Name
                </label>
                <Input
                  value={companyForm.companyName}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, companyName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Website
                </label>
                <Input
                  value={companyForm.website}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, website: e.target.value })
                  }
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Industry
                </label>
                <select
                  value={companyForm.industry}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, industry: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="">Select industry</option>
                  <option value="technology">Technology</option>
                  <option value="finance">Finance</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Company Size
                </label>
                <select
                  value={companyForm.size}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, size: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Company Description
                </label>
                <textarea
                  value={companyForm.description}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, description: e.target.value })
                  }
                  rows={4}
                  placeholder="Tell candidates about your company culture, mission, and values..."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Location
                </label>
                <Input
                  value={companyForm.location}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, location: e.target.value })
                  }
                  placeholder="San Francisco, CA"
                />
              </div>
            </div>

            <Button onClick={handleCompanySave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Notification Preferences
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Choose what updates you want to receive
              </p>
            </div>

            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Receive notifications about {key.toLowerCase().replace(/([A-Z])/g, " $1")}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() =>
                        setNotifications({ ...notifications, [key]: !value })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-zinc-700" />
                  </label>
                </div>
              ))}
            </div>

            <Button onClick={handleSaveNotificationPreferences} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Security Settings
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Manage your account security preferences
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    Two-Factor Authentication
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSecurity({
                      ...security,
                      twoFactorAuth: !security.twoFactorAuth,
                    })
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    security.twoFactorAuth
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {security.twoFactorAuth ? "Enabled" : "Enable"}
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    Session Timeout
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Automatically log out after period of inactivity
                  </p>
                </div>
                <select
                  value={security.sessionTimeout}
                  onChange={(e) =>
                    setSecurity({ ...security, sessionTimeout: e.target.value })
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="15m">15 minutes</option>
                  <option value="30m">30 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="2h">2 hours</option>
                  <option value="4h">4 hours</option>
                  <option value="8h">8 hours</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-rose-600 dark:text-rose-400">
                    Danger Zone
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Permanently delete your account and all data
                  </p>
                </div>
                <button className="rounded-lg bg-rose-100 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50">
                  Delete Account
                </button>
              </div>
            </div>

            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save Security Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}