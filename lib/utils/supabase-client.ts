import { cookies } from "next/headers";
import { createSupabaseServerClient } from "../supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Centralized Supabase client creation for server actions
 * @returns Promise<SupabaseClient> - Configured Supabase client instance
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createSupabaseServerClient(cookieStore);
}

/**
 * Higher-order function that provides a Supabase client to action functions
 * @param action - Function that takes a Supabase client and other parameters
 * @returns Wrapped function with Supabase client injected
 */
export function withSupabaseClient<T extends any[], R>(
  action: (supabase: SupabaseClient, ...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const supabase = await createServerSupabaseClient();
    return action(supabase, ...args);
  };
}
