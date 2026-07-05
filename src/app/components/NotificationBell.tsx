// components/NotificationBell.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel"; // <-- ADD THIS IMPORT
import { Bell, Check, X, Mail, Calendar, Users, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface Notification {
  _id: Id<"notifications">; // <-- FIXED: Use Id type
  userId: string;
  type: "new_application" | "interview_reminder" | "candidate_message" | "job_expiration" | "marketing_update";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: number;
  metadata?: any;
}

const NOTIFICATION_ICONS = {
  new_application: Users,
  interview_reminder: Calendar,
  candidate_message: Mail,
  job_expiration: Clock,
  marketing_update: AlertCircle,
};

const NOTIFICATION_COLORS = {
  new_application: "bg-blue-500",
  interview_reminder: "bg-amber-500",
  candidate_message: "bg-violet-500",
  job_expiration: "bg-rose-500",
  marketing_update: "bg-emerald-500",
};

export default function NotificationBell() {
  const { userId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  const unreadCountData = useQuery(
    api.notifications.getUnreadCount,
    userId ? { userId } : "skip"
  );

  // Fetch notifications
  const notifications = useQuery(
    api.notifications.getNotifications,
    userId ? { userId, limit: 20 } : "skip"
  );

  // Mutations
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  // Update unread count
  useEffect(() => {
    if (unreadCountData !== undefined) {
      setUnreadCount(unreadCountData);
    }
  }, [unreadCountData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // FIXED: Cast string to Id<"notifications">
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead({ notificationId: notificationId as Id<"notifications"> });
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    try {
      await markAllAsRead({ userId });
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const getNotificationIcon = (type: string) => {
    const Icon = NOTIFICATION_ICONS[type as keyof typeof NOTIFICATION_ICONS] || Bell;
    return Icon;
  };

  const getNotificationColor = (type: string) => {
    return NOTIFICATION_COLORS[type as keyof typeof NOTIFICATION_COLORS] || "bg-zinc-500";
  };

  if (!userId) return null;

  return (
    <div className="relative dropdown-container" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Bell size={18} className="text-zinc-600 dark:text-zinc-400" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-medium text-white ring-2 ring-white dark:ring-zinc-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[80vh] bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-96">
            {notifications && notifications.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {notifications.map((notification: Notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const color = getNotificationColor(notification.type);
                  const isUnread = !notification.read;

                  return (
                    <div
                      key={notification._id}
                      className={`px-4 py-3 transition-colors ${
                        isUnread ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${color} flex items-center justify-center text-white`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                              {notification.title}
                            </p>
                            {isUnread && (
                              <button
                                onClick={() => handleMarkAsRead(notification._id)}
                                className="flex-shrink-0 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              >
                                <Check size={14} />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                              {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                            </span>
                            {notification.link && (
                              <Link
                                href={notification.link}
                                onClick={() => {
                                  if (isUnread) handleMarkAsRead(notification._id);
                                  setIsOpen(false);
                                }}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                              >
                                View
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Bell size={32} className="text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No notifications</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">You're all caught up!</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800">
           <Link
    href="/employer/settings?tab=notifications"  // Added query parameter
    onClick={() => setIsOpen(false)}
    className="block text-center text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
  >
    Notification Settings
  </Link>

          </div>
        </div>
      )}
    </div>
  );
}