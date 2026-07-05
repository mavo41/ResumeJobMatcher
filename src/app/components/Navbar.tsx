// components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import NotificationBell from "./NotificationBell";
import {
  HomeIcon,
  ZapIcon,
  Upload,
  Blocks,
  LampDesk,
  ClipboardList,
  ThumbsUp,
  FileArchive,
  ShieldHalf,
  Briefcase,
  LayoutDashboard,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  Plus,
  Search,
  Bell,
  UserCircle,
  Crown,
} from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';
import { toast } from "react-hot-toast";

const Navbar = () => {
  const pathname = usePathname();
  const { userId } = useAuth();
  const { user: clerkUser } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEmployerDropdownOpen, setIsEmployerDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Fetch user role from Convex
  const user = useQuery(api.users.getUser, userId ? { userId } : "skip");
  const employerProfile = useQuery(
    api.employers.getEmployerByUserId,
    userId ? { userId } : "skip"
  );

  const isEmployer = user?.role === "employer" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const userRole = user?.role || "user";

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setIsEmployerDropdownOpen(false);
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Job Seeker Navigation Items
  const seekerNavItems = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/resume-builder", label: "Resume Builder", icon: Blocks },
    { href: "/upload", label: "Upload Resume", icon: Upload },
    { href: "/jobMatcher", label: "Job Matcher", icon: LampDesk },
    { href: "/jobboard", label: "Job Board", icon: ClipboardList },
    { href: "/results", label: "Feedback", icon: ThumbsUp },
    { href: "/secure-test", label: "Secure Test", icon: ShieldHalf },
  ];

  // Employer Navigation Items
  const employerNavItems = [
    { href: "/employer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/employer/jobs", label: "My Jobs", icon: Briefcase },
    { href: "/employer/candidates", label: "Candidates", icon: Users },
    { href: "/employer/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/employer/messages", label: "Messages", icon: MessageSquare },
    { href: "/employer/settings", label: "Settings", icon: Settings },
  ];

  // Quick action items for employer
  const quickActions = [
    { href: "/post-job", label: "Post a Job", icon: Plus },
    { href: "/employer/profile", label: "Company Profile", icon: Building2 },
  ];

  const isActiveRoute = (href: string) => {
    if (href === "/") return pathname === href;
    return pathname?.startsWith(href);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 rounded-lg">
              <ZapIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-mono tracking-tight">
              AI<span className="text-indigo-600 dark:text-indigo-400">Resume</span>Matcher
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {!isEmployer ? (
              // Job Seeker Navigation
              seekerNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })
            ) : (
              // Employer Navigation
              <>
                {/* Quick Actions Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setIsEmployerDropdownOpen(!isEmployerDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  >
                    <Plus size={16} />
                    <span>Quick Actions</span>
                    <ChevronDown size={14} className="ml-1" />
                  </button>

                  {isEmployerDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 overflow-hidden z-50">
                      {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <Link
                            key={action.href}
                            href={action.href}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            onClick={() => setIsEmployerDropdownOpen(false)}
                          >
                            <Icon size={16} />
                            {action.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Employer Nav Items */}
                {employerNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Search - Desktop */}
            <div className="hidden md:flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg px-3 py-1.5 border border-transparent focus-within:border-indigo-400 transition-all">
              <Search size={16} className="text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-sm outline-none placeholder:text-zinc-400 dark:text-white w-32 lg:w-48"
              />
              <kbd className="hidden lg:inline-block text-[10px] font-mono text-zinc-400 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                ⌘K
              </kbd>
            </div>

            {/* Notification Bell - Employer Only */}
            {isEmployer && (
                <NotificationBell />
            )}

            {/* Role Badge */}
            {isEmployer && (
              <div className="hidden sm:flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full">
                <Crown size={12} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {isAdmin ? "Admin" : "Employer"}
                </span>
              </div>
            )}

            {/* Auth Buttons */}
            <SignedOut>
              <div className="flex items-center gap-2">
                <SignInButton>
                  <button className="hidden sm:inline-block text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors px-3 py-2">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center gap-3">
                {/* User Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {clerkUser?.imageUrl ? (
                      <img
                        src={clerkUser.imageUrl}
                        alt={clerkUser.firstName || "User"}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {clerkUser?.firstName?.charAt(0) || "U"}
                      </div>
                    )}
                    <ChevronDown size={14} className="text-zinc-400 dark:text-zinc-500" />
                  </button>

                  {isUserDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 overflow-hidden z-50">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="font-medium text-sm text-zinc-900 dark:text-white">
                          {clerkUser?.firstName || "User"}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {clerkUser?.emailAddresses?.[0]?.emailAddress || ""}
                        </div>
                        <div className="mt-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full inline-block">
                          {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                        </div>
                      </div>

                      {/* Navigation for mobile */}
                      <div className="lg:hidden">
                        {!isEmployer ? (
                          seekerNavItems.map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                onClick={() => setIsUserDropdownOpen(false)}
                              >
                                <Icon size={16} />
                                {item.label}
                              </Link>
                            );
                          })
                        ) : (
                          <>
                            {quickActions.map((action) => {
                              const Icon = action.icon;
                              return (
                                <Link
                                  key={action.href}
                                  href={action.href}
                                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                  onClick={() => setIsUserDropdownOpen(false)}
                                >
                                  <Icon size={16} />
                                  {action.label}
                                </Link>
                              );
                            })}
                            <div className="border-t border-zinc-200 dark:border-zinc-800 my-1" />
                            {employerNavItems.map((item) => {
                              const Icon = item.icon;
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                  onClick={() => setIsUserDropdownOpen(false)}
                                >
                                  <Icon size={16} />
                                  {item.label}
                                </Link>
                              );
                            })}
                          </>
                        )}
                      </div>

                      {/* Logout */}
                      <div className="border-t border-zinc-200 dark:border-zinc-800 mt-1">
                        <UserButton />
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                  className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </SignedIn>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-zinc-200 dark:border-zinc-800">
            <nav className="flex flex-col space-y-1">
              {!isEmployer ? (
                seekerNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })
              ) : (
                <>
                  {/* Quick Actions */}
                  <div className="px-4 py-2">
                    <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Quick Actions
                    </div>
                  </div>
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-all"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon size={18} />
                        {action.label}
                      </Link>
                    );
                  })}

                  <div className="border-t border-zinc-200 dark:border-zinc-800 my-2" />

                  {/* Employer Navigation */}
                  <div className="px-4 py-2">
                    <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Management
                    </div>
                  </div>
                  {employerNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon size={18} />
                        {item.label}
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;