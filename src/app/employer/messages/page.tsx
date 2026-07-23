"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Search, Send, ChevronLeft, MessageSquare, Calendar, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { toast } from "react-hot-toast";

export default function MessagesPage() {
  const { userId: employerId } = useAuth();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<Id<"conversations"> | null>(
    (searchParams.get("conversationId") as Id<"conversations">) || null
  );
  const [messageInput, setMessageInput] = useState("");
  const [showSchedule, setShowSchedule] = useState(searchParams.get("openSchedule") === "1");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [mode, setMode] = useState<"ONSITE" | "ONLINE">("ONLINE");
  const [locationOrLink, setLocationOrLink] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversations = useQuery(api.messages.getEmployerConversations, employerId ? { employerId } : "skip") || [];
  const messages = useQuery(api.messages.getConversationMessages, selectedId ? { conversationId: selectedId } : "skip") || [];
  const interview = useQuery(api.interviews.getInterviewForConversation, selectedId ? { conversationId: selectedId } : "skip");

  const sendMessage = useMutation(api.messages.sendMessage);
  const markRead = useMutation(api.messages.markConversationRead);
  const scheduleInterview = useMutation(api.interviews.scheduleInterview);

  const current = conversations.find((c) => c._id === selectedId);
  const filtered = conversations.filter(
    (c) => c.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) || c.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (selectedId) markRead({ conversationId: selectedId }).catch(() => {}); }, [selectedId]);

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedId) return;
    await sendMessage({ conversationId: selectedId, content: messageInput });
    setMessageInput("");
  };

  const handleSchedule = async () => {
    if (!selectedId || !current || !employerId || !date || !time || !locationOrLink) {
      toast.error("Fill in date, time, and location/link.");
      return;
    }
    const scheduledAt = new Date(`${date}T${time}`).getTime();
    if (isNaN(scheduledAt)) { toast.error("Invalid date/time"); return; }

    await scheduleInterview({
      applicationId: current.applicationId,
      conversationId: selectedId,
      employerId,
      candidateUserId: current.candidateUserId,
      jobId: current.jobId,
      scheduledAt,
      mode,
      locationOrLink,
    });
    toast.success("Interview scheduled!");
    setShowSchedule(false);
    setDate(""); setTime(""); setLocationOrLink("");
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
      <div className="w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center p-6">No conversations yet</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelectedId(c._id)}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${selectedId === c._id ? "bg-indigo-50 dark:bg-indigo-950/20" : ""}`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
                  {c.candidateName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-900 dark:text-white truncate">{c.candidateName}</span>
                    <span className="text-xs text-zinc-500">{formatDistanceToNow(c.lastMessageAt, { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm text-zinc-500 truncate">{c.lastMessagePreview || c.jobTitle}</p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs text-white">{c.unreadCount}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {current ? (
          <>
            <div className="border-b border-zinc-200 p-4 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-white">{current.candidateName}</h3>
                <p className="text-xs text-zinc-500">{current.jobTitle}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowSchedule((s) => !s)}>
                <Calendar className="w-4 h-4 mr-1.5" /> Schedule Interview
              </Button>
            </div>

            {showSchedule && (
              <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 bg-indigo-50/50 dark:bg-indigo-950/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Schedule Interview</h4>
                  <button onClick={() => setShowSchedule(false)}><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={mode === "ONLINE"} onChange={() => setMode("ONLINE")} /> Online
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={mode === "ONSITE"} onChange={() => setMode("ONSITE")} /> Onsite
                  </label>
                </div>
                <input
                  placeholder={mode === "ONLINE" ? "Meeting link (Zoom/Meet URL)" : "Office address"}
                  value={locationOrLink}
                  onChange={(e) => setLocationOrLink(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <Button onClick={handleSchedule} className="w-full">Confirm Interview</Button>
              </div>
            )}

            {interview && (
              <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-xs text-emerald-700 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-800">
                📅 Interview scheduled: {format(interview.scheduledAt, "PPp")} ({interview.mode}) — {interview.locationOrLink}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => {
                const isMine = m.senderId === employerId;
                const isSystem = m.senderRole === "system";
                if (isSystem) {
                  return <div key={m._id} className="text-center text-xs text-zinc-500 py-1">{m.content}</div>;
                }
                return (
                  <div key={m._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[70%]">
                      <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMine ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"}`}>
                        {m.content}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{format(m.createdAt, "h:mm a")}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-zinc-200 p-4 dark:border-zinc-800 flex items-center gap-2">
              <input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white outline-none focus:border-indigo-500"
              />
              <Button onClick={handleSend} disabled={!messageInput.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="font-medium">No conversation selected</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}