// app/employer/candidates/components/AI/AIAssistantSidebar.tsx
"use client";

import { useState } from "react";
import { 
  Brain, 
  Sparkles, 
  Users, 
  Shield, 
  Target, 
  Lightbulb, 
  MessageSquare,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AIFeature {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface AIAssistantSidebarProps {
  activeFeature: string;
  onFeatureChange: (feature: string) => void;
  onAction: (action: string, data?: any) => void;
}

const features: AIFeature[] = [
  {
    id: "insights",
    label: "Proactive Insights",
    icon: <Lightbulb className="w-4 h-4" />,
    description: "AI-powered hiring recommendations",
  },
  {
    id: "copilot",
    label: "AI Copilot",
    icon: <MessageSquare className="w-4 h-4" />,
    description: "Chat with your AI assistant",
  },
  {
    id: "compare",
    label: "Candidate Comparison",
    icon: <Users className="w-4 h-4" />,
    description: "Compare multiple candidates",
  },
  {
    id: "bias",
    label: "Bias Detection",
    icon: <Shield className="w-4 h-4" />,
    description: "Automatic bias prevention",
  },
  {
    id: "funnel",
    label: "Hiring Funnel",
    icon: <BarChart3 className="w-4 h-4" />,
    description: "Recruitment analytics",
  },
  {
    id: "explain",
    label: "Explainable AI",
    icon: <Target className="w-4 h-4" />,
    description: "Understand AI decisions",
  },
];


export default function AIAssistantSidebar({ activeFeature, onFeatureChange, onAction }: AIAssistantSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 transition-all ${
      isExpanded ? "w-64" : "w-12"
    }`}>
      {/* Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-center w-full p-2 border-b border-zinc-200 dark:border-zinc-800"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded ? (
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Assistant</h3>
              <p className="text-xs text-zinc-500">Decision Support</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-1">
            {features.map((feature) => {
              const isActive = activeFeature === feature.id;
              return (
                <button
                  key={feature.id}
                  onClick={() => onFeatureChange(feature.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className={isActive ? "text-indigo-500" : "text-zinc-400"}>
                    {feature.icon}
                  </span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{feature.label}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {feature.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Quick Stats
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Candidates</span>
                <span className="font-medium">24</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Analyzed</span>
                <span className="font-medium">18</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Interview Ready</span>
                <span className="font-medium text-emerald-600">7</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-4 space-y-4">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => onFeatureChange(feature.id)}
              className={`p-2 rounded-lg transition ${
                activeFeature === feature.id
                  ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
              title={feature.label}
            >
              {feature.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}