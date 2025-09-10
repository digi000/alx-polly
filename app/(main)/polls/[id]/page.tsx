import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PollPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PollPage({ params }: PollPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  // Fetch the poll with its options
  const { data: poll, error } = await supabase
    .from("polls")
    .select(`
      *,
      poll_options (*)
    `)
    .eq("id", id)
    .single();

  if (error || !poll) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{poll.title}</CardTitle>
          {poll.description && (
            <p className="text-gray-600 dark:text-gray-400">
              {poll.description}
            </p>
          )}
          <div className="flex gap-2">
            <Badge variant="secondary">
              Created: {new Date(poll.created_at).toLocaleDateString()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Options:</h3>
            <div className="space-y-2">
              {poll.poll_options.map((option: any) => (
                <div
                  key={option.id}
                  className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <span className="text-sm font-medium">{option.text}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
