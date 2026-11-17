import { NextResponse, type NextRequest } from "next/server";

/**
 * Defense-in-depth for admin routes.
 *
 * The authoritative gate is the Worker's /api/admin/* check (verified Firebase
 * token + D1 allowlist). This middleware only prevents the admin shell from
 * being served to browsers that have not completed the dedicated admin
 * sign-in, and never grants access on its own.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("genericpcs.admin.session")?.value;

  // The sign-in page is always reachable (but redirects in-client if valid).
  if (pathname === "/admin/login") return NextResponse.next();

  if (session !== "1") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
