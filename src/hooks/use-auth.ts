"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { AdminUser, AdminRole } from "@/types/database";

export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
  profile: (userId: string) => [...authKeys.all, "profile", userId] as const,
};

async function fetchStaffProfile(userId: string): Promise<AdminUser | null> {
  const supabase = createClientIfConfigured();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: authKeys.session(),
    enabled: isSupabaseConfigured(),
    queryFn: async () => {
      const supabase = createClientIfConfigured();
      if (!supabase) return null;
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });

  const userId = sessionQuery.data?.user.id;

  const profileQuery = useQuery({
    queryKey: authKeys.profile(userId ?? ""),
    enabled: Boolean(userId),
    queryFn: () => fetchStaffProfile(userId!),
  });

  const signInMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const supabase = createClientIfConfigured();
      if (!supabase) throw new Error("Supabase not configured");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClientIfConfigured();
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });

  const profile = profileQuery.data ?? null;
  const role = profile?.role ?? null;

  return {
    isConfigured: isSupabaseConfigured(),
    isLoading: sessionQuery.isLoading || profileQuery.isLoading,
    session: sessionQuery.data ?? null,
    user: sessionQuery.data?.user ?? null,
    profile,
    role,
    isAdmin: role === "admin",
    hasRole: (r: AdminRole) => role === r || role === "admin",
    signIn: signInMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    isSigningIn: signInMutation.isPending,
  };
}
