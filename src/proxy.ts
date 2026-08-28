import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every route. Order: CSRF Origin check, then security headers.
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts`, and with a `src/` directory the
 * file must sit beside `app/` — i.e. here. A misplaced file does not warn; it
 * simply never runs, which for a CSRF control means the check silently disappears.
 *
 * There is no auth step. This app has no accounts; adding one here would be a defect.
 */

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(req: NextRequest) {
  if (MUTATING.has(req.method)) {
    const origin = req.headers.get("origin");
    const expected = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

    // A missing Origin is rejected too — it is the cheapest CSRF bypass there is.
    if (!origin || !expected || origin !== expected) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
