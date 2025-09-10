"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "./supabase/server";

const pollFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long"),
  description: z.string().optional(),
  options: z
    .array(z.object({ text: z.string().min(1, "Option cannot be empty") }))
    .min(2, "You must provide at least two options"),
});

export async function createPoll(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  const rawFormData = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    options: Array.from(formData.getAll("options")).map((o) => ({
      text: o.toString(),
    })),
  };

  const validatedFields = pollFormSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error("Validation failed:", validatedFields.error.flatten());
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Poll.",
    };
  }

  const { title, description, options } = validatedFields.data;

  const { data: poll, error } = await supabase
    .from("polls")
    .insert([
      {
        title,
        description,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating poll:", error);
    return {
      message: "Database Error: Failed to Create Poll.",
    };
  }

  const optionsToInsert = options.map((option) => ({
    text: option.text,
    poll_id: poll.id,
  }));

  const { error: optionsError } = await supabase
    .from("poll_options")
    .insert(optionsToInsert);

  if (optionsError) {
    console.error("Error creating poll options:", optionsError);
    // If options fail, we should probably delete the poll we just created
    await supabase.from("polls").delete().match({ id: poll.id });
    return {
      message: "Database Error: Failed to Create Poll Options.",
    };
  }

  revalidatePath("/polls");
  
  return {
    success: true,
    pollId: poll.id,
    message: "Poll created successfully!",
  };
}

export async function deletePoll(pollId: string) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  // Verify the poll belongs to the current user
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("created_by")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return {
      message: "Poll not found.",
    };
  }

  if (poll.created_by !== user.id) {
    return {
      message: "You don't have permission to delete this poll.",
    };
  }

  // Delete the poll (this will cascade delete options and votes due to foreign key constraints)
  const { error } = await supabase.from("polls").delete().eq("id", pollId);

  if (error) {
    console.error("Error deleting poll:", error);
    return {
      message: "Database Error: Failed to Delete Poll.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/polls");
  
  return {
    success: true,
    message: "Poll deleted successfully!",
  };
}

const updatePollSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long"),
  description: z.string().optional(),
  options: z
    .array(z.object({ 
      id: z.string().optional(),
      text: z.string().min(1, "Option cannot be empty") 
    }))
    .min(2, "You must provide at least two options"),
});

export async function updatePoll(pollId: string, formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  // Verify the poll belongs to the current user
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("created_by")
    .eq("id", pollId)
    .single();

  if (pollError || !poll) {
    return {
      message: "Poll not found.",
    };
  }

  if (poll.created_by !== user.id) {
    return {
      message: "You don't have permission to edit this poll.",
    };
  }

  const rawFormData = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    options: JSON.parse(formData.get("options") as string || "[]"),
  };

  console.log("Raw form data received:", rawFormData);

  const validatedFields = updatePollSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error("Validation failed:", validatedFields.error.flatten());
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Poll.",
    };
  }

  const { title, description, options } = validatedFields.data;

  console.log("Validated options:", options);

  // Filter out any empty options that might have slipped through
  const cleanOptions = options.filter(option => option.text && option.text.trim() !== "");
  
  console.log("Clean options to insert:", cleanOptions);

  if (cleanOptions.length < 2) {
    return {
      message: "You must provide at least two non-empty options.",
    };
  }

  // Update poll
  const { error: updateError } = await supabase
    .from("polls")
    .update({ title, description })
    .eq("id", pollId);

  if (updateError) {
    console.error("Error updating poll:", updateError);
    return {
      message: "Database Error: Failed to Update Poll.",
    };
  }

  // Handle options - delete old ones and insert new ones
  // This is a simple approach; in production you might want to be more sophisticated
  console.log("Deleting existing options for poll:", pollId);
  
  // First, let's see what options exist before deletion
  const { data: existingOptions, error: fetchError } = await supabase
    .from("poll_options")
    .select("id, text")
    .eq("poll_id", pollId);
    
  if (fetchError) {
    console.error("Error fetching existing options:", fetchError);
  } else {
    console.log("Existing options before deletion:", existingOptions);
  }
  
  // Skip ownership verification for now since polls table structure is unclear

  // Now delete the options - try a more direct approach
  // First get all the option IDs to delete
  const { data: optionsToDelete, error: getOptionsError } = await supabase
    .from("poll_options")
    .select("id")
    .eq("poll_id", pollId);

  if (getOptionsError) {
    console.error("Error getting options to delete:", getOptionsError);
    return {
      message: "Database Error: Failed to get poll options for deletion.",
    };
  }

  console.log("Found", optionsToDelete?.length || 0, "options to delete");

  // Delete each option individually to ensure they're actually deleted
  if (optionsToDelete && optionsToDelete.length > 0) {
    for (const option of optionsToDelete) {
      const { error: deleteError } = await supabase
        .from("poll_options")
        .delete()
        .eq("id", option.id);
      
      if (deleteError) {
        console.error("Error deleting option", option.id, ":", deleteError);
      } else {
        console.log("Successfully deleted option", option.id);
      }
    }
  }

  console.log("Delete operation completed");
  
  // Double-check that options were actually deleted
  const { data: remainingOptions, error: checkError } = await supabase
    .from("poll_options")
    .select("id, text")
    .eq("poll_id", pollId);
    
  if (!checkError) {
    console.log("Remaining options after deletion:", remainingOptions);
  }

  const optionsToInsert = cleanOptions.map((option) => ({
    text: option.text.trim(),
    poll_id: pollId,
  }));

  console.log("Options to insert into database:", optionsToInsert);

  const { data: insertedOptions, error: optionsError } = await supabase
    .from("poll_options")
    .insert(optionsToInsert)
    .select();

  if (optionsError) {
    console.error("Error creating new poll options:", optionsError);
    return {
      message: "Database Error: Failed to Update Poll Options.",
    };
  }

  console.log("Successfully inserted options:", insertedOptions);

  if (optionsError) {
    console.error("Error creating new poll options:", optionsError);
    return {
      message: "Database Error: Failed to Update Poll Options.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/polls");
  revalidatePath(`/polls/${pollId}`);
  
  return {
    success: true,
    message: "Poll updated successfully!",
  };
}

export async function cleanupPollDuplicates(pollId: string) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  // Get all options for this poll
  const { data: options, error: fetchError } = await supabase
    .from("poll_options")
    .select("id, text")
    .eq("poll_id", pollId);

  if (fetchError) {
    console.error("Error fetching options:", fetchError);
    return { message: "Failed to fetch options" };
  }

  // Find unique options (keep first occurrence of each unique text)
  const uniqueOptions = options?.filter((option, index, self) => 
    index === self.findIndex(o => o.text.trim().toLowerCase() === option.text.trim().toLowerCase())
  ) || [];

  // Get IDs of duplicate options to delete
  const duplicateIds = options?.filter(option => 
    !uniqueOptions.some(unique => unique.id === option.id)
  ).map(option => option.id) || [];

  console.log("Original options:", options);
  console.log("Unique options to keep:", uniqueOptions);
  console.log("Duplicate IDs to delete:", duplicateIds);

  if (duplicateIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("poll_options")
      .delete()
      .in("id", duplicateIds);

    if (deleteError) {
      console.error("Error deleting duplicates:", deleteError);
      return { message: "Failed to delete duplicates" };
    }

    console.log(`Deleted ${duplicateIds.length} duplicate options`);
  }

  revalidatePath(`/polls/${pollId}`);
  
  return {
    success: true,
    message: `Cleaned up ${duplicateIds.length} duplicate options`,
  };
}
