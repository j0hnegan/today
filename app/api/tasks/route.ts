import { db } from "@/lib/db";
import { isDueToday } from "@/lib/triage";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const destination = searchParams.get("destination");
    const status = searchParams.get("status");

    let query = "SELECT * FROM tasks WHERE 1=1";
    const params: string[] = [];

    if (destination) {
      query += " AND destination = ?";
      params.push(destination);
    }
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY sort_order ASC, updated_at DESC";

    const tasks = db.prepare(query).all(...params) as Record<string, unknown>[];

    // Batch-fetch all tags for returned tasks (avoids N+1 queries)
    const taskIds = tasks.map((t) => t.id as number);
    let tasksWithTags: Record<string, unknown>[];

    if (taskIds.length === 0) {
      tasksWithTags = [];
    } else {
      const placeholders = taskIds.map(() => "?").join(",");
      const allTaskTags = db
        .prepare(
          `SELECT tt.task_id, t.id, t.name, t.color
           FROM categories t
           JOIN task_categories tt ON tt.category_id = t.id
           WHERE tt.task_id IN (${placeholders})`
        )
        .all(...taskIds) as {
        task_id: number;
        id: number;
        name: string;
        color: string;
      }[];

      const tagsByTask = new Map<
        number,
        { id: number; name: string; color: string }[]
      >();
      for (const row of allTaskTags) {
        if (!tagsByTask.has(row.task_id)) {
          tagsByTask.set(row.task_id, []);
        }
        tagsByTask.get(row.task_id)!.push({
          id: row.id,
          name: row.name,
          color: row.color,
        });
      }

      tasksWithTags = tasks.map((task) => ({
        ...task,
        tags: tagsByTask.get(task.id as number) ?? [],
      }));
    }

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

    const insertTask = db.prepare(`
      INSERT INTO tasks (title, description, destination, consequence, size, due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertTaskTag = db.prepare(`
      INSERT INTO task_categories (task_id, category_id) VALUES (?, ?)
    `);

    const transaction = db.transaction(() => {
      const result = insertTask.run(
        title.trim(),
        description,
        destination,
        consequence,
        size,
        due_date
      );
      const taskId = result.lastInsertRowid;

      for (const tagId of tag_ids) {
        insertTaskTag.run(taskId, tagId);
      }

      return taskId;
    });

    const taskId = transaction();

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Record<string, unknown>;
    const tags = db
      .prepare(
        `SELECT t.id, t.name, t.color FROM categories t JOIN task_categories tt ON tt.category_id = t.id WHERE tt.task_id = ?`
      )
      .all(taskId);

    return NextResponse.json({ ...task, tags }, { status: 201 });
  } catch (e) {
    console.error("POST /api/tasks error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
