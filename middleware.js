// Server-side DataFast AI crawler tracking, for every request Vercel Routing
// Middleware sees. Static assets are already filtered out by the package
// itself; the matcher below just keeps the Edge Function from being invoked
// for the most obvious ones (perf/cost only, not correctness).
import { next } from "@vercel/functions";
import { trackAICrawlerRequest } from "@datafast/ai-crawl";

export default function middleware(request, context) {
  trackAICrawlerRequest(request, context, {
    websiteId: "dfid_xwg5aBISznGIAytqBDmrG",
  });

  return next();
}

export const config = {
  matcher: [
    "/((?!.*\\.(?:css|js|mjs|json|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|map|csv|webmanifest)$).*)",
  ],
};
