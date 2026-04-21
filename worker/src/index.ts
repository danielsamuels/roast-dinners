export interface Env {
  PLANS: KVNamespace;
}

const ALLOWED_ORIGINS = [
  "https://roastdinnerplanner.app",
  "https://www.roastdinnerplanner.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

const KV_TTL_SECONDS = 2592000; // 30 days
const PUBLIC_URL = "https://roastdinnerplanner.app";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(body: unknown, status: number, request: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    // POST /api/plans — create a shared plan
    if (request.method === "POST" && url.pathname === "/api/plans") {
      try {
        const body = await request.json() as { config: unknown };

        if (!body.config) {
          return jsonResponse({ error: "Missing config in request body" }, 400, request);
        }

        const id = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
        const plan = {
          id,
          createdAt: new Date().toISOString(),
          config: body.config,
        };

        await env.PLANS.put(id, JSON.stringify(plan), {
          expirationTtl: KV_TTL_SECONDS,
        });

        return jsonResponse(
          { id, url: `${PUBLIC_URL}/p/${id}` },
          201,
          request,
        );
      } catch {
        return jsonResponse({ error: "Invalid request body" }, 400, request);
      }
    }

    // GET /api/plans/:id — retrieve a shared plan
    const planMatch = url.pathname.match(/^\/api\/plans\/([a-zA-Z0-9]{1,16})$/);
    if (request.method === "GET" && planMatch) {
      const id = planMatch[1];
      const data = await env.PLANS.get(id);

      if (!data) {
        return jsonResponse({ error: "Plan not found" }, 404, request);
      }

      return jsonResponse(JSON.parse(data), 200, request);
    }

    return jsonResponse({ error: "Not found" }, 404, request);
  },
};
