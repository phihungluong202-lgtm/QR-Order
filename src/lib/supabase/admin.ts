import { createApiClient } from "@/lib/supabase/api";

/** @deprecated Use createApiClient — kept for imports */
export function createAdminClient() {
  return createApiClient();
}
