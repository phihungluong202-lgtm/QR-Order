import type { PostgrestError } from "@supabase/supabase-js";

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: string,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export function assertNoError(
  error: PostgrestError | null,
  fallback = "Database operation failed",
): void {
  if (error) {
    throw new DatabaseError(error.message || fallback, error.code, error.details);
  }
}

export function isNotFoundError(error: PostgrestError | null): boolean {
  return error?.code === "PGRST116";
}
