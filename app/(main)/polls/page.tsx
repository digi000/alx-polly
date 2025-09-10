import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/features/dashboard/dashboard-content";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, LogIn } from "lucide-react";

// Types for improved type safety
interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

interface PollWithVotes {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  created_by?: string;
  poll_options: PollOption[];
  total_votes: number;
}

// Raw poll data from database
interface RawPoll {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  created_by?: string;
  poll_options: { id: string; text: string }[];
}

interface VoteCount {
  poll_option_id: string;
  count: number;
}

// Utility function to format dates (memoized for performance)
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short", 
    day: "numeric",
  });
};

// Optimized function to fetch polls with vote counts using a single efficient query
async function fetchPollsWithVoteCounts(
  supabase: any, 
  userId?: string
): Promise<PollWithVotes[]> {
  // Build query based on user authentication
  const pollQuery = supabase
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
    .order("created_at", { ascending: false });

  // Filter by user if authenticated
  if (userId) {
    pollQuery.eq("created_by", userId);
  }

  const { data: polls, error: pollsError } = await pollQuery;

  if (pollsError) {
    throw new Error(`Failed to fetch polls: ${pollsError.message}`);
  }

  if (!polls || polls.length === 0) {
    return [];
  }

  // Extract all option IDs for batch vote counting
  const allOptionIds = polls.flatMap((poll: RawPoll) => 
    poll.poll_options.map((option: { id: string; text: string }) => option.id)
  );

  // Single optimized query to get all vote counts at once
  const { data: voteCounts, error: voteError } = await supabase
    .from("votes")
    .select("poll_option_id")
    .in("poll_option_id", allOptionIds);

  if (voteError) {
    console.warn("Error fetching vote counts:", voteError);
    // Continue with zero votes rather than failing
  }

  // Create efficient vote count lookup map
  const voteCountMap = new Map<string, number>();
  
  if (voteCounts) {
    for (const vote of voteCounts) {
      const currentCount = voteCountMap.get(vote.poll_option_id) || 0;
      voteCountMap.set(vote.poll_option_id, currentCount + 1);
    }
  }

  // Process polls with optimized vote counting
  return polls.map((poll: RawPoll) => {
    const optionsWithVotes: PollOption[] = poll.poll_options.map((option: { id: string; text: string }) => ({
      ...option,
      vote_count: voteCountMap.get(option.id) || 0,
    }));

    const totalVotes = optionsWithVotes.reduce(
      (sum, option) => sum + option.vote_count, 
      0
    );

    return {
      ...poll,
      poll_options: optionsWithVotes,
      total_votes: totalVotes,
    };
  });
}

// Component for rendering poll cards (extracted for clarity)
function PollCard({ poll }: { poll: PollWithVotes }) {
  return (
    <Card key={poll.id} className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{poll.title}</CardTitle>
            {poll.description && (
              <CardDescription className="line-clamp-2">
                {poll.description}
              </CardDescription>
            )}
          </div>
          <Badge variant="secondary" className="ml-2">
            {poll.total_votes} vote{poll.total_votes !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Options ({poll.poll_options.length}):
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            {poll.poll_options.slice(0, 3).map((option) => (
              <li key={option.id} className="flex justify-between">
                <span className="truncate">{option.text}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {option.vote_count}
                </span>
              </li>
            ))}
            {poll.poll_options.length > 3 && (
              <li className="text-xs text-gray-500">
                +{poll.poll_options.length - 3} more options
              </li>
            )}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="pt-4 border-t">
        <div className="w-full space-y-3">
          <div className="text-xs text-gray-500">
            Created {formatDate(poll.created_at)}
          </div>
          <div className="flex gap-2">
            <Link href={`/polls/${poll.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                View & Vote
              </Button>
            </Link>
            <Link href="/login" className="flex-1">
              <Button size="sm" className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>
            </Link>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

// Component for empty state (extracted for clarity)
function EmptyPollsState() {
  return (
    <div className="text-center py-12">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-600 mb-2">
          No polls available
        </h2>
        <p className="text-gray-500 mb-6">
          Be the first to create a poll!
        </p>
      </div>
      <div className="space-y-3">
        <Link href="/login">
          <Button className="inline-flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Login to Create Polls
          </Button>
        </Link>
        <div className="text-sm text-gray-500">
          Already have an account? Sign in to create and manage your polls.
        </div>
      </div>
    </div>
  );
}

// Component for public polls listing (extracted for clarity)
function PublicPollsGrid({ polls }: { polls: PollWithVotes[] }) {
  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Browse All Polls</h2>
          <p className="text-gray-600">
            {polls.length} poll{polls.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <Link href="/login">
          <Button variant="outline" className="inline-flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Login to Create Polls
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {polls.map((poll) => (
          <PollCard key={poll.id} poll={poll} />
        ))}
      </div>
      
      <div className="text-center py-8 border-t">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Want to create your own polls?</h3>
          <p className="text-gray-600">
            Sign in to create polls, manage your content, and track votes.
          </p>
          <Link href="/login">
            <Button className="inline-flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}

export default async function PollsPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Authenticated user - fetch their polls with optimized query
      const pollsWithVotes = await fetchPollsWithVoteCounts(supabase, user.id);

      return (
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Polls</h1>
            <div className="text-sm text-gray-600">
              Welcome back, {user.email}
            </div>
          </div>
          
          <DashboardContent polls={pollsWithVotes as any} userId={user.id} />
        </div>
      );
    } else {
      // Public user - fetch all polls with optimized query
      const pollsWithVotes = await fetchPollsWithVoteCounts(supabase);

      return (
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">All Polls</h1>
            <div className="text-sm text-gray-600">
              Browse and participate in polls
            </div>
          </div>
          
          <div className="space-y-6">
            {pollsWithVotes.length === 0 ? (
              <EmptyPollsState />
            ) : (
              <PublicPollsGrid polls={pollsWithVotes} />
            )}
          </div>
        </div>
      );
    }
  } catch (error) {
    console.error("Error in PollsPage:", error);
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Polls</h1>
        <p className="text-red-600">
          Error loading polls. Please try again later.
        </p>
      </div>
    );
  }
}
