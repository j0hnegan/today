import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp/server";
import { checkMcpToken } from "@/lib/mcp/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request, params: { token: string }): Promise<Response> {
  if (!checkMcpToken(params.token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = createMcpServer();
  await server.connect(transport);

  return transport.handleRequest(request);
}

export async function POST(request: Request, ctx: { params: { token: string } }) {
  return handle(request, ctx.params);
}

export async function GET(request: Request, ctx: { params: { token: string } }) {
  return handle(request, ctx.params);
}

export async function DELETE(request: Request, ctx: { params: { token: string } }) {
  return handle(request, ctx.params);
}
