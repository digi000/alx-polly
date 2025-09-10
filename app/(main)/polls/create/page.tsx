"use client";

import { CreatePollForm } from "@/components/features/polls/create-poll-form";

export default function CreatePollPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Create a New Poll</h1>
      <CreatePollForm />
    </div>
  );
}
