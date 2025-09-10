import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EditPollForm } from "@/components/features/polls/edit-poll-form";

interface EditPollPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPollPage({ params }: EditPollPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the poll with its options
  const { data: poll, error } = await supabase
    .from("polls")
    .select(`
      id,
      title,
      description,
      created_by,
      poll_options (
        id,
        text
      )
    `)
    .eq("id", id)
    .single();

  if (error || !poll) {
    notFound();
  }

  // Check if the user owns this poll
  if (poll.created_by !== user.id) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Edit Poll</h1>
        <p className="text-gray-600">
          Make changes to your poll. Note that editing will reset all existing votes.
        </p>
      </div>

      <EditPollForm poll={poll} />
    </div>
  );
}
