import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Transport only. Corpus, evidence, AI, and experiment logic belong to FastAPI.
async function forward(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ code: "invalid_origin", message: "Use this archive to submit inquiries." }, { status: 403 });
    }
  }
  const base = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
  const url = new URL(`/api/${path.map(encodeURIComponent).join("/")}`, base);
  url.search = request.nextUrl.search;
  try {
    const response = await fetch(url, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        "Cookie": request.headers.get("cookie") ?? "",
        "X-Pensieve-Proxy-Key": process.env.PENSIEVE_PROXY_KEY ?? "",
        "X-Pensieve-Client-IP": process.env.VERCEL
          ? (request.headers.get("x-vercel-forwarded-for") ?? "unknown")
          : "local",
      },
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(path.includes("estimate") || request.method === "POST" ? 30000 : 10000),
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
        ...(response.headers.get("set-cookie")
          ? { "Set-Cookie": response.headers.get("set-cookie")! }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      {
        code: "archive_unavailable",
        message: "The archive could not be reached. Please try again.",
      },
      { status: 503 },
    );
  }
}

export const GET = forward;
export const POST = forward;
