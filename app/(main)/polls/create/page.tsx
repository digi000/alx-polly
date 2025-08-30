"use client";

import { CreatePollForm } from "@/components/features/polls/create-poll-form";
import { useSupabase } from "@/lib/supabase/SupabaseProvider";
import { CreatePollData } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function CreatePollPage() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const handleCreatePoll = async (data: CreatePollData) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      alert("You must be logged in to create a poll.");
      router.push("/login");
      return;
    }

    const { data: poll, error } = await supabase
      .from("polls")
      .insert([
        {
          title: data.title,
          description: data.description,
          created_by: session.user.id,
          allow_multiple_votes: data.allowMultipleVotes,
        },
      ])
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    const optionsToInsert = data.options.map((option) => ({
      text: option,
      poll_id: poll.id,
    }));

    const { error: optionsError } = await supabase
      .from("poll_options")
      .insert(optionsToInsert);

    if (optionsError) {
      alert(optionsError.message);
    } else {
      router.push(`/polls/${poll.id}`);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Create a New Poll</h1>
      <CreatePollForm onSubmit={handleCreatePoll} />
    </div>
  );
}
