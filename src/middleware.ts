import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/session-middleware";
import { applySecurityHeaders, applyRobotsHeader } from "@/lib/security-headers";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  applySecurityHeaders(response.headers);
  applyRobotsHeader(response.headers, request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next internals)
     * - favicon.ico, images
     * - robots.txt, sitemap.xml (generated static routes, no auth relevance — a redirect to
     *   /login here would tell crawlers the whole site requires a login, tanking indexing)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
