import { requireAuth } from "@/lib/api-auth";
import { validateBody } from "@/lib/validation/helpers";
import { upsertCashFlowSchema } from "@/lib/validation/cashflow";
import { SWR_HEADERS } from "@/lib/api-cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function parseCashFlowId(raw: string): string | NextResponse {
  if (!/^[A-Za-z0-9-]{1,100}$/.test(raw)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  return raw;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const id = parseCashFlowId(params.id);
  if (id instanceof NextResponse) return id;

  try {
    const { data } = await supabase.from("cash_flows").select("*").eq("id", id).single();
    if (!data) {
      return NextResponse.json({ error: "Cash flow not found" }, { status: 404 });
    }
    return NextResponse.json(data, { headers: SWR_HEADERS });
  } catch (e) {
    console.error("GET /api/cashflow/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const id = parseCashFlowId(params.id);
  if (id instanceof NextResponse) return id;

  const parsed = await validateBody(request, upsertCashFlowSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const { data, error } = await supabase
      .from("cash_flows")
      .upsert({ id, ...parsed, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT /api/cashflow/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const id = parseCashFlowId(params.id);
  if (id instanceof NextResponse) return id;

  try {
    const { error } = await supabase.from("cash_flows").delete().eq("id", id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/cashflow/[id] error:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
