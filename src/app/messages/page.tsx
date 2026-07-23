"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { format, formatDistanceToNow } from "date-fns";
import Navbar from "../components/Navbar";
import { Send, MessageSquare } from "lucide-react";

export default function CandidateMessagesPage() {
  const { userId } = useAuth();
  const [selectedId, setSelectedId] = useState<Id<"conversations"> | null>(null);
  const [messageInput, setMessageInput] = useState("");

  const conversations = useQuery(api.messages.getCandidateConversations, userId ? { candidateUserId: userId } : "skip") || [];
  const messages = useQuery(api.messages.getConversationMessages, selectedId ? { conversationId: selectedId } : "skip") || [];
  const sendMessage = useMutation(api.messages.sendMessage);
  const markRead = useMutation(api.messages.markConversationRead);

  const current = conversations.find((c) => c._id === selectedId);

  const handleSelect = (id: Id<"conversations">) => {
    setSelectedId(id);
    markRead({ conversationId: id }).catch(() => {});
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedId) return;
    await sendMessage({ conversationId: selectedId, content: messageInput });
    setMessageInput("");
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <Navbar />
      <div className="max-w-5xl mx-auto mt-8 flex h-[calc(100vh-14rem)] rounded-xl border bg-white overflow-hidden">
        <div className="w-80 border-r flex flex-col">
          <h2 className="font-semibold p-4 border-b">Messages</h2>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center p-6">No conversations yet</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c._id}
                  onClick={() => handleSelect(c._id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${selectedId === c._id ? "bg-indigo-50" : ""}`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{c.company}</span>
                    <span className="text-xs text-gray-400">{formatDistanceToNow(c.lastMessageAt, { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{c.jobTitle}</p>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          {current ? (
            <>
              <div className="border-b p-4">
                <h3 className="font-medium">{current.company}</h3>
                <p className="text-xs text-gray-500">{current.jobTitle}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => {
                  const isMine = m.senderId === userId;
                  if (m.senderRole === "system") return <div key={m._id} className="text-center text-xs text-gray-500">{m.content}</div>;
                  return (
                    <div key={m._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${isMine ? "bg-indigo-600 text-white" : "bg-gray-100"}`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t p-4 flex gap-2">
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 border rounded-lg px-4 py-2 text-sm"
                />
                <button onClick={handleSend} className="bg-indigo-600 text-white px-4 rounded-lg"><Send className="w-4 h-4" /></button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center"><MessageSquare className="w-12 h-12 mx-auto mb-2" /><p>Select a conversation</p></div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}