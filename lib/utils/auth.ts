import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedUser, AuthResult } from "../types/auth";

/**
 * Get the current authenticated user from Supabase
 * @param supabase - Supabase client instance
 * @returns Promise<AuthResult> - User data or error
 */
export async function getCurrentUser(supabase: SupabaseClient): Promise<AuthResult> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return { user: null, error: error.message };
    }
    
    if (!user) {
      return { user: null, error: "No authenticated user found" };
    }
    
    return {
      user: {
        id: user.id,
        email: user.email,
      },
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Require authentication for an action - redirects if not authenticated
 * @param supabase - Supabase client instance
 * @param redirectPath - Path to redirect to if not authenticated (default: "/login")
 * @returns Promise<AuthenticatedUser> - Authenticated user data
 */
export async function requireAuth(
  supabase: SupabaseClient,
  redirectPath: string = "/login"
): Promise<AuthenticatedUser> {
  const authResult = await getCurrentUser(supabase);
  
  if (!authResult.user) {
    redirect(redirectPath);
  }
  
  return authResult.user;
}

/**
 * Check if a user owns a specific poll
 * @param supabase - Supabase client instance
 * @param pollId - ID of the poll to check
 * @param userId - ID of the user to check ownership for
 * @returns Promise<boolean> - True if user owns the poll
 */
export async function verifyPollOwnership(
  supabase: SupabaseClient,
  pollId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data: poll, error } = await supabase
      .from("polls")
      .select("created_by")
      .eq("id", pollId)
      .single();

    if (error || !poll) {
      return false;
    }

    return poll.created_by === userId;
  } catch {
    return false;
  }
}

/**
 * Require poll ownership for an action
 * @param supabase - Supabase client instance
 * @param pollId - ID of the poll to check
 * @param userId - ID of the user to check ownership for
 * @returns Promise<void> - Throws error if user doesn't own poll
 */
export async function requirePollOwnership(
  supabase: SupabaseClient,
  pollId: string,
  userId: string
): Promise<void> {
  const isOwner = await verifyPollOwnership(supabase, pollId, userId);
  
  if (!isOwner) {
    throw new Error("You don't have permission to perform this action on this poll.");
  }
}
