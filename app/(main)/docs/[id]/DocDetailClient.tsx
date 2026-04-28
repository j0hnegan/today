"use client";

import { useRouter } from "next/navigation";
import { DocEditor } from "@/components/docs/DocEditor";
import { useDoc, useCategories, useGoals } from "@/lib/hooks";

export function DocDetailClient({ docId }: { docId: number }) {
  const router = useRouter();
  const { data: doc } = useDoc(docId);
  const { data: categories } = useCategories();
  const { data: goals } = useGoals();

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-[80px] pb-8">
        <div className="skeleton h-5 w-16 mb-6" />
        <div className="skeleton h-8 w-2/3 mb-4" />
        <div className="skeleton h-7 w-48 mb-6" />
        <div className="skeleton h-64 w-full rounded-[10px]" />
      </div>
    );
  }

  return (
    <DocEditor
      doc={doc}
      onBack={() => router.push("/docs")}
      allCategories={categories ?? []}
      allGoals={goals ?? []}
    />
  );
}
