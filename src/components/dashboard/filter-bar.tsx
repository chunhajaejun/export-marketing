"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

const MEDIA_OPTIONS = [
  { value: "all", label: "전체", color: "" },
  { value: "naver", label: "네이버", color: "#03C75A" },
  { value: "danggeun", label: "당근", color: "#f97316" },
  { value: "meta", label: "메타", color: "#0668E1" },
  { value: "google", label: "구글", color: "#EA4335" },
] as const;

type Preset = "today" | "week" | "month" | "last_month";

function getPresetRange(preset: Preset): { start: string; end: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");

  switch (preset) {
    case "today":
      return { start: fmt(today), end: fmt(today) };
    case "week":
      return { start: fmt(subDays(today, 6)), end: fmt(today) };
    case "month":
      return { start: fmt(startOfMonth(today)), end: fmt(today) };
    case "last_month": {
      const last = subMonths(today, 1);
      return { start: fmt(startOfMonth(last)), end: fmt(endOfMonth(last)) };
    }
  }
}

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultStart = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const startDate = searchParams.get("start") || defaultStart;
  const endDate = searchParams.get("end") || today;
  const media = searchParams.get("media") || "all";

  const activePreset = useMemo((): Preset | null => {
    const presets: Preset[] = ["today", "week", "month", "last_month"];
    for (const p of presets) {
      const range = getPresetRange(p);
      if (range.start === startDate && range.end === endDate) return p;
    }
    return null;
  }, [startDate, endDate]);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        params.set(key, value);
      }
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handlePreset = (preset: Preset) => {
    const range = getPresetRange(preset);
    updateParams({ start: range.start, end: range.end });
  };

  const presets: [Preset, string][] = [
    ["today", "오늘"],
    ["week", "일주일"],
    ["month", "이번달"],
    ["last_month", "지난달"],
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#334155] bg-[#1e293b] p-4 lg:flex-row lg:items-center lg:gap-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map(([key, label]) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activePreset === key
                ? "bg-[#3b82f6] text-white"
                : "bg-[#334155] text-[#94a3b8] hover:bg-[#334155]/80 hover:text-[#e2e8f0]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={startDate}
          onChange={(e) => updateParams({ start: e.target.value })}
          className="h-8 rounded-lg border border-[#334155] bg-[#0f172a] px-2 text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
        />
        <span className="text-[#94a3b8]">~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => updateParams({ end: e.target.value })}
          className="h-8 rounded-lg border border-[#334155] bg-[#0f172a] px-2 text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
        />
      </div>

      {/* Media filter */}
      <div className="flex flex-wrap gap-1.5">
        {MEDIA_OPTIONS.map((opt) => {
          const isActive = media === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => updateParams({ media: opt.value })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-white"
                  : "bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]"
              }`}
              style={
                isActive
                  ? { backgroundColor: opt.color || "#3b82f6" }
                  : undefined
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
