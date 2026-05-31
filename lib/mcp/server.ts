import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClient } from "@supabase/supabase-js";
import { registerTaskTools } from "./tools-tasks";
import { registerReadTools } from "./tools-read";

export function createMcpServer(): McpServer {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("MCP server misconfigured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const server = new McpServer({
    name: "hush",
    version: "1.0.0",
  });

  registerTaskTools(server, supabase);
  registerReadTools(server, supabase);

  return server;
}
