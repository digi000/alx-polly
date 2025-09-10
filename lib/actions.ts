"use server";

import { revalidatePath } from "next/cache";
import { withSupabaseClient } from "./utils/supabase-client";
import { requireAuth, requirePollOwnership } from "./utils/auth";
import { validateCreatePollData, validateUpdatePollData } from "./utils/validation";
import { PollDatabase } from "./utils/poll-database";
import {
  createSuccessResult,
  createValidationError,
  createDatabaseError,
  createNotFoundError,
  createPermissionError,
  withErrorHandling,
} from "./utils/errors";
import type { PollActionResult } from "./types/poll";

/**
 * Create a new poll with options
 * @param formData - Form data containing poll information
 * @returns Promise<PollActionResult> - Result of the poll creation
 */
export const createPoll = withSupabaseClient(async (supabase, formData: FormData): Promise<PollActionResult> => {
  return withErrorHandling(async () => {
    // Validate authentication
    const user = await requireAuth(supabase);
    
    // Validate input data
    const validation = validateCreatePollData(formData);
    if (!validation.success) {
      return createValidationError(validation.errors!);
    }
    
    const pollData = validation.data!;
    
    // Create poll with options using database operations
    const pollDb = new PollDatabase(supabase);
    
    try {
      const createdPoll = await pollDb.createPollWithOptions(pollData, user.id);
      
      // Revalidate relevant paths
      revalidatePath("/polls");
      revalidatePath("/dashboard");
      
      return createSuccessResult(
        "Poll created successfully!",
        createdPoll.id
      );
    } catch (error) {
      return createDatabaseError(
        "create poll",
        error instanceof Error ? error.message : undefined
      );
    }
  }, "create poll") as Promise<PollActionResult>;
});

/**
 * Delete a poll and all associated data
 * @param pollId - ID of the poll to delete
 * @returns Promise<PollActionResult> - Result of the poll deletion
 */
export const deletePoll = withSupabaseClient(async (supabase, pollId: string): Promise<PollActionResult> => {
  return withErrorHandling(async () => {
    // Validate authentication
    const user = await requireAuth(supabase);
    
    // Initialize database operations
    const pollDb = new PollDatabase(supabase);
    
    // Check if poll exists
    const poll = await pollDb.getPollById(pollId);
    if (!poll) {
      return createNotFoundError("Poll");
    }
    
    // Verify ownership
    try {
      await requirePollOwnership(supabase, pollId, user.id);
    } catch {
      return createPermissionError();
    }
    
    // Delete the poll (cascade deletes options and votes)
    try {
      await pollDb.deletePoll(pollId);
      
      // Revalidate relevant paths
      revalidatePath("/dashboard");
      revalidatePath("/polls");
      
      return createSuccessResult("Poll deleted successfully!");
    } catch (error) {
      return createDatabaseError(
        "delete poll",
        error instanceof Error ? error.message : undefined
      );
    }
  }, "delete poll") as Promise<PollActionResult>;
});

/**
 * Update an existing poll
 * @param pollId - ID of the poll to update
 * @param formData - Form data containing updated poll information
 * @returns Promise<PollActionResult> - Result of the poll update
 */
export const updatePoll = withSupabaseClient(async (supabase, pollId: string, formData: FormData): Promise<PollActionResult> => {
  return withErrorHandling(async () => {
    // Validate authentication
    const user = await requireAuth(supabase);
    
    // Validate input data
    const validation = validateUpdatePollData(formData);
    if (!validation.success) {
      return createValidationError(validation.errors!);
    }
    
    const pollData = validation.data!;
    
    // Initialize database operations
    const pollDb = new PollDatabase(supabase);
    
    // Check if poll exists
    const poll = await pollDb.getPollById(pollId);
    if (!poll) {
      return createNotFoundError("Poll");
    }
    
    // Verify ownership
    try {
      await requirePollOwnership(supabase, pollId, user.id);
    } catch {
      return createPermissionError();
    }
    
    // Filter out empty options
    const cleanOptions = pollData.options.filter(option => 
      option.text && option.text.trim() !== ""
    );
    
    if (cleanOptions.length < 2) {
      return createValidationError({
        options: ["You must provide at least two non-empty options."]
      });
    }
    
    // Update poll with options
    try {
      await pollDb.updatePollWithOptions(pollId, {
        ...pollData,
        options: cleanOptions,
        id: pollId,
      });
      
      // Revalidate relevant paths
      revalidatePath("/dashboard");
      revalidatePath("/polls");
      revalidatePath(`/polls/${pollId}`);
      
      return createSuccessResult("Poll updated successfully!");
    } catch (error) {
      return createDatabaseError(
        "update poll",
        error instanceof Error ? error.message : undefined
      );
    }
  }, "update poll") as Promise<PollActionResult>;
});

/**
 * Clean up duplicate options in a poll
 * @param pollId - ID of the poll to clean up
 * @returns Promise<PollActionResult> - Result of the cleanup operation
 */
export const cleanupPollDuplicates = withSupabaseClient(async (supabase, pollId: string): Promise<PollActionResult> => {
  return withErrorHandling(async () => {
    // Validate authentication
    const user = await requireAuth(supabase);
    
    // Initialize database operations
    const pollDb = new PollDatabase(supabase);
    
    // Check if poll exists
    const poll = await pollDb.getPollById(pollId);
    if (!poll) {
      return createNotFoundError("Poll");
    }
    
    // Verify ownership
    try {
      await requirePollOwnership(supabase, pollId, user.id);
    } catch {
      return createPermissionError();
    }
    
    // Remove duplicate options
    try {
      const duplicatesRemoved = await pollDb.removeDuplicateOptions(pollId);
      
      // Revalidate the poll page
      revalidatePath(`/polls/${pollId}`);
      
      return createSuccessResult(
        `Cleaned up ${duplicatesRemoved} duplicate option${duplicatesRemoved !== 1 ? 's' : ''}`
      );
    } catch (error) {
      return createDatabaseError(
        "cleanup poll duplicates",
        error instanceof Error ? error.message : undefined
      );
    }
  }, "cleanup poll duplicates") as Promise<PollActionResult>;
});
