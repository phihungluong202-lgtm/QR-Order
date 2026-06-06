import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { AdminUser, AdminRole } from "@/types/database";
import { assertNoError } from "@/lib/database/errors";

export interface StaffAuthResult {
  user: User;
  session: Session;
  profile: AdminUser;
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getStaffProfile(
  userId: string,
): Promise<AdminUser | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  assertNoError(error);
  return data;
}

export async function requireStaff(
  allowedRoles?: AdminRole[],
): Promise<StaffAuthResult | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const user = userData.user;

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return null;

  const profile = await getStaffProfile(user.id);
  if (!profile) return null;

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return { user, session, profile };
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function isAdminRole(role: AdminRole): boolean {
  return role === "admin";
}

export function canAccessKitchen(role: AdminRole): boolean {
  return role === "admin" || role === "kitchen";
}

export function canAccessWaiter(role: AdminRole): boolean {
  return role === "admin" || role === "waiter";
}
