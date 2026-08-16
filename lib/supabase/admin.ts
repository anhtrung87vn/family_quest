import "@/lib/dev-tls-patch";
import { createClient } from "@supabase/supabase-js";
import { fetchWithRetry } from "@/lib/supabase/fetch-retry";

// Service-role client — server-only. Never import from a Client Component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetchWithRetry },
    },
  );
}
