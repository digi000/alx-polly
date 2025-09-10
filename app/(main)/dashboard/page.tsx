import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/features/dashboard/dashboard-content";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user's polls with vote counts
  const { data: polls, error } = await supabase
    .from("polls")
    .select(`
      id,
      title,
      description,
      created_at,
      created_by,
      poll_options (
        id,
        text
      )
    `)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching polls:", error);
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>
        <p className="text-red-600">Error loading your polls. Please try again.</p>
      </div>
    );
  }

  // Fetch vote counts separately for each poll
  const pollsWithVotes = await Promise.all(
    (polls || []).map(async (poll) => {
      const { data: voteData } = await supabase
        .from("votes")
        .select("poll_option_id")
        .in("poll_option_id", poll.poll_options.map(opt => opt.id));

      const voteCounts = poll.poll_options.map(option => {
        const votes = voteData?.filter(vote => vote.poll_option_id === option.id).length || 0;
        return {
          ...option,
          vote_count: votes,
        };
      });

      const totalVotes = voteCounts.reduce((sum, option) => sum + option.vote_count, 0);

      return {
        ...poll,
        poll_options: voteCounts,
        total_votes: totalVotes,
      };
    })
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <div className="text-sm text-gray-600">
          Welcome back, {user.email}
        </div>
      </div>
      
      <DashboardContent polls={pollsWithVotes} userId={user.id} />
    </div>
  );
}
