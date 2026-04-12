"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CallTextInput } from "./call-text-input";
import { CallDirectInput } from "./call-direct-input";
import { DailyHistory } from "./daily-history";
import { AbsenceManager } from "./absence-manager";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/date-utils";
import type { UserRole } from "@/lib/types";

interface TabContainerProps {
  userRole: UserRole;
}

export function TabContainer({ userRole }: TabContainerProps) {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [inputMode, setInputMode] = useState<"text" | "direct">("text");
  const [refreshKey, setRefreshKey] = useState(0);

  const canAccessCalls = userRole === "call_reporter" || userRole === "admin";
  const canAccessSpend = userRole === "spend_reporter" || userRole === "admin";

  const defaultTab = canAccessCalls ? "calls" : "spend";

  function handleSaved() {
    setRefreshKey((k) => k + 1);
  }

  return (
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
          {/* 좌측: 입력 폼 */}
          <div className="w-full shrink-0 lg:w-[300px]">
            {/* 입력 모드 토글 */}
            <div className="mb-3 flex gap-2">
              <Button
                variant={inputMode === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("text")}
              >
                텍스트 작성
              </Button>
              <Button
                variant={inputMode === "direct" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("direct")}
              >
                직접 입력
              </Button>
            </div>

            {inputMode === "text" ? (
              <CallTextInput onSaved={handleSaved} />
            ) : (
              <CallDirectInput
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onSaved={handleSaved}
              />
            )}

            {/* 부재 관리 */}
            <div className="mt-4">
              <AbsenceManager
                selectedDate={selectedDate}
                refreshKey={refreshKey}
              />
            </div>
          </div>

          {/* 우측: 이력 테이블 */}
          <div className="min-w-0 flex-1">
            <DailyHistory
              type="calls"
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              refreshKey={refreshKey}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="spend">
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
          광고비 관리 탭 (Task 6에서 구현)
        </div>
      </TabsContent>
    </Tabs>
  );
}
