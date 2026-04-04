import { supabase } from "@/lib/supabase";
import { isDueToday } from "@/lib/triage";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const destination = searchParams.get("destination");
    const status = searchParams.get("status");

    let query = supabase.from("tasks").select("*");

    if (destination) {
      query = query.eq("destination", destination);
    }
    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("sort_order", { ascending: true }).order("updated_at", { ascending: false });

    const { data: tasks, error } = await query;
    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return NextResponse.json([]);
    }

    // Batch-fetch all tags for returned tasks (avoids N+1 queries)
    const taskIds = tasks.map((t) => t.id);

    const { data: allTaskTags, error: tagError } = await supabase
      .from("task_categories")
      .select("task_id, categories(id, name, color)")
      .in("task_id", taskIds);
    if (tagError) throw tagError;

    const tagsByTask = new Map<number, { id: number; name: string; color: string }[]>();
    for (const row of allTaskTags || []) {
      if (!tagsByTask.has(row.task_id)) {
        tagsByTask.set(row.task_id, []);
      }
      const cat = row.categories as unknown as { id: number; name: string; color: string };
      if (cat) {
        tagsByTask.get(row.task_id)!.push(cat);
      }
    }

    const tasksWithTags = tasks.map((task) => ({
      ...task,
      tags: tagsByTask.get(task.id) ?? [],
    }));

    return NextResponse.json(tasksWithTags);
  } catch (e) {
    console.error("GET /api/tasks error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description = "",
      consequence = "none",
      size = "small",
      due_date = null,
      tag_ids = [],
      destination: reqDestination,
    } = body;

    // Auto-triage: due today or past → Today, otherwise → Someday
    let destination: string;
    if (due_date && isDueToday(due_date)) {
      destination = "on_deck";
    } else if (due_date && !isDueToday(due_date)) {
      destination = "someday";
    } else {
      // No due date — respect user's choice, default someday
      destination = reqDestination === "on_deck" ? "on_deck" : "someday";
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        description,
        destination,
        consequence,
        size,
        due_date,
      })
      .select()
      .single();
    if (error) throw error;

    // Insert tag associations
    if (tag_ids.length > 0) {
      const tagRows = tag_ids.map((tagId: number) => ({
        task_id: task.id,
        category_id: tagId,
      }));
      const { error: tagError } = await supabase.from("task_categories").insert(tagRows);
      if (tagError) throw tagError;
    }

    // Fetch tags for response
    const { data: tags } = await supabase
      .from("task_categories")
      .select("categories(id, name, color)")
      .eq("task_id", task.id);

    const formattedTags = (tags || []).map((t) => t.categories as unknown as { id: number; name: string; color: string });

    return NextResponse.json({ ...task, tags: formattedTags }, { status: 201 });
  } catch (e) {
    console.error("POST /api/tasks error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
