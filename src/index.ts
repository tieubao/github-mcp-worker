import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import { registerPushNote } from "./tools/push-note.js";
import { registerListNotes } from "./tools/list-notes.js";
import { registerUpdateIndex } from "./tools/update-index.js";
import { registerPushImage } from "./tools/push-image.js";

const VERSION = "1.1.0";

interface Env {
  GITHUB_PAT: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  AUTH_TOKEN?: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(response: Response): Response {
  const patched = new Response(response.body, response);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    patched.headers.set(key, value);
  }
  return patched;
}

function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: "github-learned",
    version: VERSION,
  });

  registerPushNote(server, env);
  registerListNotes(server, env);
  registerUpdateIndex(server, env);
  registerPushImage(server, env);

  return server;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Bearer token auth (optional — only enforced when AUTH_TOKEN secret is set)
    if (env.AUTH_TOKEN) {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (token !== env.AUTH_TOKEN) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // Handle both /mcp and /mcp/ (Claude.ai strips trailing slashes)
    if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
      const server = createServer(env);
      const handler = createMcpHandler(server);
      const response = await handler(request, env, ctx);
      return withCors(response);
    }

    if (url.pathname === "/version") {
      return withCors(
        new Response(JSON.stringify({ version: VERSION }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    if (url.pathname === "/") {
      return withCors(
        new Response(`github-mcp-worker v${VERSION}. Connect to /mcp`, { status: 200 })
      );
    }

    return withCors(new Response("Not found", { status: 404 }));
  },
} satisfies ExportedHandler<Env>;
