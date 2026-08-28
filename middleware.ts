import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers, then a CSRF Origin check on state-changing methods.
 *
 * There is no auth step. This app has no accounts; adding one here would be a defect.
 */

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(req: NextRequest) {
  if (MUTATING.has(req.method)) {
    const origin = req.headers.get("origin");
    const expected = process.env.NEXT_PUBLIC_APP_URL;

    // Reject missing Origin as well as mismatched — a missing header is the
    // cheapest CSRF bypass there is.
    if (!origin || !expected || origin !== expected.replace(/\/$/, "")) {
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
