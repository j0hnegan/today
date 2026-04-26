"use client";

import { useRouter } from "next/navigation";
import { DocEditor } from "@/components/docs/DocEditor";
import { useDoc, useCategories, useGoals } from "@/lib/hooks";

export default function DocDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const docId = Number(params.id);
  const router = useRouter();
  const { data: doc, isLoading } = useDoc(Number.isFinite(docId) ? docId : null);
  const { data: categories } = useCategories();
  const { data: goals } = useGoals();

  if (isLoading || !doc) {
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
