// app/employer/messages/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  User,
  Clock,
  Check,
  CheckCheck,
  ChevronLeft,
  MessageSquare,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  read: boolean;
}

interface Conversation {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateAvatar: string;
  jobTitle: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  messages: Message[];
  online?: boolean;
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    candidateId: "c1",
    candidateName: "Sarah Chen",
    candidateAvatar: "SC",
    jobTitle: "Senior Product Designer",
    lastMessage: "Thank you for the opportunity! I'm very excited about this role.",
    lastMessageTime: Date.now() - 1000 * 60 * 5,
    unreadCount: 2,
    online: true,
    messages: [
      {
        id: "m1",
        senderId: "c1",
        content: "Hi! I saw your job posting for Senior Product Designer and I'm very interested.",
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
        read: true,
      },
      {
        id: "m2",
        senderId: "me",
        content: "Thanks for reaching out Sarah! Your portfolio looks impressive. Can you tell me more about your experience with design systems?",
        timestamp: Date.now() - 1000 * 60 * 60 * 1.5,
        read: true,
      },
      {
        id: "m3",
        senderId: "c1",
        content: "I've been working with design systems for the past 4 years. I helped build and maintain a component library for a fintech company that served 50+ product teams.",
        timestamp: Date.now() - 1000 * 60 * 30,
        read: true,
      },
      {
        id: "m4",
        senderId: "me",
        content: "That's exactly what we're looking for! Would you be available for a quick call this week?",
        timestamp: Date.now() - 1000 * 60 * 10,
        read: false,
      },
      {
        id: "m5",
        senderId: "c1",
        content: "Thank you for the opportunity! I'm very excited about this role.",
        timestamp: Date.now() - 1000 * 60 * 5,
        read: false,
      },
    ],
  },
  {
    id: "2",
    candidateId: "c2",
    candidateName: "Michael Rodriguez",
    candidateAvatar: "MR",
    jobTitle: "Backend Engineer",
    lastMessage: "I've attached my updated resume for your review.",
    lastMessageTime: Date.now() - 1000 * 60 * 60 * 3,
    unreadCount: 1,
    online: false,
    messages: [
      {
        id: "m6",
        senderId: "c2",
        content: "Hi there! I applied for the Backend Engineer position last week.",
        timestamp: Date.now() - 1000 * 60 * 60 * 5,
        read: true,
      },
      {
        id: "m7",
        senderId: "me",
        content: "Hi Michael! Yes, I saw your application. Your experience with Node.js looks great.",
        timestamp: Date.now() - 1000 * 60 * 60 * 4,
        read: true,
      },
      {
        id: "m8",
        senderId: "c2",
        content: "I've attached my updated resume for your review.",
        timestamp: Date.now() - 1000 * 60 * 60 * 3,
        read: false,
      },
    ],
  },
  {
    id: "3",
    candidateId: "c3",
    candidateName: "Priya Patel",
    candidateAvatar: "PP",
    jobTitle: "Growth Marketing Lead",
    lastMessage: "I've shared the campaign results with the team.",
    lastMessageTime: Date.now() - 1000 * 60 * 60 * 24,
    unreadCount: 0,
    online: true,
    messages: [
      {
        id: "m9",
        senderId: "me",
        content: "Hi Priya! How's the onboarding going?",
        timestamp: Date.now() - 1000 * 60 * 60 * 26,
        read: true,
      },
      {
        id: "m10",
        senderId: "c3",
        content: "It's going great! I've already started working on the Q4 marketing strategy.",
        timestamp: Date.now() - 1000 * 60 * 60 * 25,
        read: true,
      },
      {
        id: "m11",
        senderId: "c3",
        content: "I've shared the campaign results with the team.",
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
        read: true,
      },
    ],
  },
];

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<string>("1");
  const [messageInput, setMessageInput] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentConversation = conversations.find((c) => c.id === selectedConversation);
  const filteredConversations = conversations.filter((c) =>
    c.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation?.messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentConversation) return;
    // In production, this would call a mutation
    console.log("Sending message:", messageInput);
    setMessageInput("");
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
      {/* Conversation List */}
      <div
        className={`
          w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col
          ${isMobileView && !isMobileListOpen ? "hidden" : "flex"}
          ${isMobileView && isMobileListOpen ? "flex" : ""}
        `}
      >
        {/* List Header */}
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-zinc-900 dark:text-white">Messages</h2>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {conversations.filter((c) => c.unreadCount > 0).length} unread
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => {
                setSelectedConversation(conversation.id);
                if (isMobileView) setIsMobileListOpen(false);
              }}
              className={`
                w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors
                ${selectedConversation === conversation.id ? "bg-indigo-50 dark:bg-indigo-950/20" : ""}
              `}
            >
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
                  {conversation.candidateAvatar}
                </div>
                {conversation.online && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900 dark:text-white truncate">
                    {conversation.candidateName}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {formatDistanceToNow(conversation.lastMessageTime, { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                    {conversation.lastMessage}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-medium text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div
        className={`
          flex-1 flex flex-col
          ${isMobileView && isMobileListOpen ? "hidden" : "flex"}
        `}
      >
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-zinc-200 p-4 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isMobileView && (
                  <button
                    onClick={() => setIsMobileListOpen(true)}
                    className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <ChevronLeft className="h-5 w-5 text-zinc-500" />
                  </button>
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
                  {currentConversation.candidateAvatar}
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-white">
                    {currentConversation.candidateName}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {currentConversation.jobTitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <Phone className="h-4 w-4 text-zinc-500" />
                </button>
                <button className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <Video className="h-4 w-4 text-zinc-500" />
                </button>
                <button className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <MoreVertical className="h-4 w-4 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentConversation.messages.map((message) => {
                const isMine = message.senderId === "me";
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[70%]">
                      <div
                        className={`
                          rounded-2xl px-4 py-2.5 text-sm
                          ${isMine
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                          }
                        `}
                      >
                        {message.content}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{format(message.timestamp, "h:mm a")}</span>
                        {isMine && (
                          message.read ? (
                            <CheckCheck className="h-3 w-3 text-indigo-400" />
                          ) : (
                            <Check className="h-3 w-3 text-zinc-400" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <button className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <Paperclip className="h-5 w-5 text-zinc-500" />
                </button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white outline-none focus:border-indigo-500"
                />
                <button className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <Smile className="h-5 w-5 text-zinc-500" />
                </button>
                <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <h3 className="font-medium text-zinc-900 dark:text-white">No conversation selected</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Choose a conversation from the list
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}