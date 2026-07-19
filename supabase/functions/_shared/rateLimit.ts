import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  windowMinutes: number,
  maxRequests: number,
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_window: `${windowMinutes} minutes`,
    p_max: maxRequests,
  });

  if (error) {
    // Fail open: don't block legitimate users if the DB check itself errors
    console.error("Rate limit check failed:", error.message);
    return { allowed: true };
  }

  if (!data) {
    const minutesUntilReset = windowMinutes - (new Date().getMinutes() % windowMinutes);
    return { allowed: false, retryAfterSeconds: minutesUntilReset * 60 };
  }

  return { allowed: true };
}

export function rateLimitResponse(
  retryAfterSeconds: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Too many requests. Please try again later.",
      errorCode: "RATE_LIMITED",
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}
