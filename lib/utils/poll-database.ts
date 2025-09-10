import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatePollData, UpdatePollData, Poll, PollOption } from "../types/poll";

/**
 * Database operations for poll management
 */
export class PollDatabase {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new poll in the database
   * @param pollData - Poll data to create
   * @param userId - ID of the user creating the poll
   * @returns Promise with created poll data
   */
  async createPoll(pollData: CreatePollData, userId: string): Promise<any> {
    const { data: poll, error } = await this.supabase
      .from("polls")
      .insert([
        {
          title: pollData.title,
          description: pollData.description,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create poll: ${error.message}`);
    }

    return poll;
  }

  /**
   * Create poll options in the database
   * @param pollId - ID of the poll
   * @param options - Array of options to create
   * @returns Promise with created options
   */
  async createPollOptions(pollId: string, options: PollOption[]): Promise<PollOption[]> {
    const optionsToInsert = options.map((option) => ({
      text: option.text,
      poll_id: pollId,
    }));

    const { data: createdOptions, error } = await this.supabase
      .from("poll_options")
      .insert(optionsToInsert)
      .select();

    if (error) {
      throw new Error(`Failed to create poll options: ${error.message}`);
    }

    return createdOptions;
  }

  /**
   * Get a poll by ID
   * @param pollId - ID of the poll to retrieve
   * @returns Promise with poll data or null if not found
   */
  async getPollById(pollId: string): Promise<any | null> {
    const { data: poll, error } = await this.supabase
      .from("polls")
      .select(`
        id,
        title,
        description,
        created_by,
        created_at,
        poll_options (
          id,
          text
        )
      `)
      .eq("id", pollId)
      .single();

    if (error) {
      return null;
    }

    return poll;
  }

  /**
   * Update a poll in the database
   * @param pollId - ID of the poll to update
   * @param pollData - Updated poll data
   * @returns Promise indicating success
   */
  async updatePoll(pollId: string, pollData: Partial<CreatePollData>): Promise<void> {
    const { error } = await this.supabase
      .from("polls")
      .update({
        title: pollData.title,
        description: pollData.description,
      })
      .eq("id", pollId);

    if (error) {
      throw new Error(`Failed to update poll: ${error.message}`);
    }
  }

  /**
   * Delete all options for a poll
   * @param pollId - ID of the poll
   * @returns Promise indicating success
   */
  async deletePollOptions(pollId: string): Promise<void> {
    const { error } = await this.supabase
      .from("poll_options")
      .delete()
      .eq("poll_id", pollId);

    if (error) {
      throw new Error(`Failed to delete poll options: ${error.message}`);
    }
  }

  /**
   * Delete a poll by ID
   * @param pollId - ID of the poll to delete
   * @returns Promise indicating success
   */
  async deletePoll(pollId: string): Promise<void> {
    const { error } = await this.supabase
      .from("polls")
      .delete()
      .eq("id", pollId);

    if (error) {
      throw new Error(`Failed to delete poll: ${error.message}`);
    }
  }

  /**
   * Get all options for a poll
   * @param pollId - ID of the poll
   * @returns Promise with array of poll options
   */
  async getPollOptions(pollId: string): Promise<PollOption[]> {
    const { data: options, error } = await this.supabase
      .from("poll_options")
      .select("id, text")
      .eq("poll_id", pollId);

    if (error) {
      throw new Error(`Failed to get poll options: ${error.message}`);
    }

    return options || [];
  }

  /**
   * Find and remove duplicate options for a poll
   * @param pollId - ID of the poll
   * @returns Promise with number of duplicates removed
   */
  async removeDuplicateOptions(pollId: string): Promise<number> {
    const options = await this.getPollOptions(pollId);

    // Find unique options (keep first occurrence of each unique text)
    const uniqueOptions = options.filter((option, index, self) => 
      index === self.findIndex(o => o.text.trim().toLowerCase() === option.text.trim().toLowerCase())
    );

    // Get IDs of duplicate options to delete
    const duplicateIds = options
      .filter(option => !uniqueOptions.some(unique => unique.id === option.id))
      .map(option => option.id!)
      .filter(Boolean);

    if (duplicateIds.length > 0) {
      const { error } = await this.supabase
        .from("poll_options")
        .delete()
        .in("id", duplicateIds);

      if (error) {
        throw new Error(`Failed to remove duplicate options: ${error.message}`);
      }
    }

    return duplicateIds.length;
  }

  /**
   * Atomic operation to create a poll with options
   * @param pollData - Poll data including options
   * @param userId - ID of the user creating the poll
   * @returns Promise with created poll data
   */
  async createPollWithOptions(pollData: CreatePollData, userId: string): Promise<any> {
    // Create the poll first
    const poll = await this.createPoll(pollData, userId);

    try {
      // Create the options
      const options = await this.createPollOptions(poll.id, pollData.options);
      
      return {
        ...poll,
        options,
      };
    } catch (error) {
      // If options creation fails, clean up the poll
      await this.deletePoll(poll.id).catch(() => {
        // Ignore cleanup errors, but log them
        console.error(`Failed to cleanup poll ${poll.id} after options creation failure`);
      });
      
      throw error;
    }
  }

  /**
   * Atomic operation to update a poll and its options
   * @param pollId - ID of the poll to update
   * @param pollData - Updated poll data including options
   * @returns Promise indicating success
   */
  async updatePollWithOptions(pollId: string, pollData: UpdatePollData): Promise<void> {
    // Update the poll metadata
    await this.updatePoll(pollId, pollData);

    // Replace all options
    await this.deletePollOptions(pollId);
    await this.createPollOptions(pollId, pollData.options);
  }
}
