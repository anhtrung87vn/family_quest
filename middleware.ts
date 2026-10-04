import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { routing } from "./lib/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. Create a mutable response so Supabase can write refreshed auth cookies.
  //    We start with a plain pass-through; intl middleware will override the
  //    destination/locale below if needed.
  let response = NextResponse.next({ request });

  // 2. Refresh the Supabase session on every request so that:
  //    - The access token cookie stays fresh (prevents silent expiry)
  //    - Server Actions can read the session via getSession() / getUser()
  //    Note: we use the anon key here (safe for middleware edge runtime).
  //    We skip the TLS patch because middleware runs in the edge runtime where
  //    undici is not available — rely on the proxy/env instead.
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            // Write updated cookies back to both the request (for downstream
            // middleware) and the response (so the browser receives them).
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options ?? {}),
            );
          },
        },
      },
    );
    // This call is what actually refreshes the token. We intentionally ignore
    // the return value here — we only need the side-effect of cookie refresh.
    await supabase.auth.getUser();
  } catch {
    // Non-fatal: if Supabase is unreachable (e.g. TLS proxy in dev), the
    // existing cookie remains valid for its TTL; we still serve the request.
  }

  // 3. Run the next-intl middleware for locale detection & routing.
  //    It returns its own Response which we use so locale redirects work.
  const intlResponse = intlMiddleware(request);

  // 4. Forward any auth cookies that Supabase just set onto the intl response,
  //    so both session refresh and locale routing take effect in one response.
  response.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite as "lax" | "strict" | "none" | undefined,
      maxAge: cookie.maxAge,
      expires: cookie.expires,
    });
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
