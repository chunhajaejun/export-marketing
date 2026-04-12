"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CallTextInput } from "./call-text-input";
import { CallDirectInput } from "./call-direct-input";
import { SpendTextInput } from "./spend-text-input";
import { SpendDirectInput } from "./spend-direct-input";
import { DailyHistory } from "./daily-history";
import { AbsenceManager } from "./absence-manager";
import { RecentSummary } from "./recent-summary";
import { formatDate } from "@/lib/utils/date-utils";
import type { UserRole } from "@/lib/types";

interface TabContainerProps {
  userRole: UserRole;
}

export function TabContainer({ userRole }: TabContainerProps) {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [inputMode, setInputMode] = useState<"text" | "direct">("text");
  const [spendInputMode, setSpendInputMode] = useState<"text" | "direct">("text");
  const [refreshKey, setRefreshKey] = useState(0);

  const canAccessCalls = userRole === "call_reporter" || userRole === "admin";
  const canAccessSpend = userRole === "spend_reporter" || userRole === "admin";

  const defaultTab = canAccessCalls ? "calls" : "spend";

  function handleSaved() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <RecentSummary key={`recent-${refreshKey}`} />
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="calls" disabled={!canAccessCalls}>
          문의 관리
        </TabsTrigger>
        <TabsTrigger value="spend" disabled={!canAccessSpend}>
          광고비 관리
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calls">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Left: input form */}
          <div className="w-full shrink-0 lg:w-[300px]">
            {/* Input mode toggle */}
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setInputMode("text")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  inputMode === "text"
                    ? "bg-[#3b82f6] text-white"
                    : "bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]"
                }`}
              >
                텍스트 작성
              </button>
              <button
                onClick={() => setInputMode("direct")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  inputMode === "direct"
                    ? "bg-[#3b82f6] text-white"
                    : "bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]"
                }`}
              >
                직접 입력
              </button>
            </div>

            <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
              {inputMode === "text" ? (
                <CallTextInput onSaved={handleSaved} />
              ) : (
                <CallDirectInput
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onSaved={handleSaved}
                />
              )}
            </div>

            {/* Absence manager */}
            <div className="mt-4 rounded-xl border border-[#334155] bg-[#1e293b] p-4">
              <AbsenceManager
                selectedDate={selectedDate}
                refreshKey={refreshKey}
              />
            </div>
          </div>

          {/* Right: history table */}
          <div className="min-w-0 flex-1">
            <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
              <DailyHistory
                type="calls"
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                refreshKey={refreshKey}
              />
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="spend">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Left: input form */}
          <div className="w-full shrink-0 lg:w-[300px]">
            {/* Input mode toggle */}
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setSpendInputMode("text")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  spendInputMode === "text"
                    ? "bg-[#3b82f6] text-white"
                    : "bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]"
                }`}
              >
                텍스트 작성
              </button>
              <button
                onClick={() => setSpendInputMode("direct")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  spendInputMode === "direct"
                    ? "bg-[#3b82f6] text-white"
                    : "bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]"
                }`}
              >
                직접 입력
              </button>
            </div>

            <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
              {spendInputMode === "text" ? (
                <SpendTextInput onSaved={handleSaved} />
              ) : (
                <SpendDirectInput
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onSaved={handleSaved}
                />
              )}
            </div>
          </div>

          {/* Right: history table */}
          <div className="min-w-0 flex-1">
            <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
              <DailyHistory
                type="spend"
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                refreshKey={refreshKey}
              />
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
    </div>
  );
}
