import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import { registerPushNote } from "./tools/push-note.js";

interface Env {
  GITHUB_PAT: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
}

function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: "github-learned",
    version: "1.0.0",
  });

  registerPushNote(server, env);

  return server;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle both /mcp and /mcp/ (Claude.ai strips trailing slashes)
    if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
      const server = createServer(env);
      const handler = createMcpHandler(server);
      return handler(request, env, ctx);
    }

    if (url.pathname === "/") {
      return new Response("github-mcp-worker is running. Connect to /mcp", {
        status: 200,
      });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
