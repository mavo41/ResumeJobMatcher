// app/employer/candidates/components/AI/HiringFunnelAnalytics.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, PieLabelRenderProps } from "recharts";
import { Users, TrendingUp, ArrowRight } from "lucide-react";
import { Skeleton } from "../../../../components/ui/Skeleton";

interface HiringFunnelAnalyticsProps {
  userId: string;
  jobId?: string;
}

export default function HiringFunnelAnalytics({ userId, jobId }: HiringFunnelAnalyticsProps) {
  const funnelData = useQuery(api.ai.getHiringFunnel, { userId, jobId: jobId as any });

  if (!funnelData) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const stages = [
    { name: "Sourced", value: funnelData.sourced || 0, color: "#818cf8" },
    { name: "Applied", value: funnelData.applied || 0, color: "#6366f1" },
    { name: "Reviewed", value: funnelData.reviewed || 0, color: "#4f46e5" },
    { name: "Interview", value: funnelData.interviewing || 0, color: "#4338ca" },
    { name: "Offer", value: funnelData.offer || 0, color: "#3730a3" },
    { name: "Hired", value: funnelData.hired || 0, color: "#1e1b4b" },
  ];

  // Calculate total
  const total = stages.reduce((sum, stage) => sum + stage.value, 0);

  // FIXED: Proper label render function with Recharts types
  const renderCustomizedLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
    
    // Guard against undefined values
    if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || percent === undefined) {
      return null;
    }

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if there's enough space
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
        style={{ fontSize: '10px' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Hiring Funnel</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {total} total candidates • {funnelData.hired || 0} hired
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-emerald-600 dark:text-emerald-400">
            Conversion: {total > 0 ? Math.round(((funnelData.hired || 0) / (funnelData.sourced || 1)) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Funnel Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stages} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {stages.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stages}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                label={renderCustomizedLabel}
                labelLine={false}
              >
                {stages.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: any) => [`${value} candidates`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <span className="text-sm text-zinc-500">Sourced</span>
          </div>
          <span className="text-xl font-bold">{funnelData.sourced || 0}</span>
        </div>
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-zinc-500">Applied</span>
          </div>
          <span className="text-xl font-bold">{funnelData.applied || 0}</span>
        </div>
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-zinc-500">Interviewed</span>
          </div>
          <span className="text-xl font-bold">{funnelData.interviewing || 0}</span>
        </div>
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <span className="text-sm text-zinc-500">Hired</span>
          </div>
          <span className="text-xl font-bold">{funnelData.hired || 0}</span>
        </div>
      </div>
    </div>
  );
}