"use client";

import { TaskSidebar } from "@/components/focus/TaskSidebar";

export function RightRail() {
  return (
    <aside className="md:h-full flex flex-col px-4 md:px-0 md:pr-6 pt-2 md:pt-[80px] pb-8">
      <TaskSidebar />
    </aside>
  );
}
