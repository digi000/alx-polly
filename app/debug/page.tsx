import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DebugPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  // Check authentication first
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth error:", authError);
  }

  // Get the specific poll's options
  const { data: options, error } = await supabase
    .from("poll_options")
    .select("id, text")
    .eq("poll_id", "6fc94e30-05b2-4a44-bfdd-e0a7e375ea64")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching options:", error);
  }

  // Also try to get the poll info
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id, title, created_by")
    .eq("id", "6fc94e30-05b2-4a44-bfdd-e0a7e375ea64")
    .single();

  if (pollError) {
    console.error("Error fetching poll:", pollError);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Debug Poll Options</h1>
      <p className="mb-4">Poll ID: 6fc94e30-05b2-4a44-bfdd-e0a7e375ea64</p>
      
      <div className="space-y-6">
        {/* Authentication Status */}
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Authentication Status:</h3>
          {user ? (
            <p className="text-green-600">✅ Authenticated as: {user.email}</p>
          ) : (
            <p className="text-red-600">❌ Not authenticated</p>
          )}
          {authError && (
            <p className="text-red-600">Auth Error: {JSON.stringify(authError)}</p>
          )}
        </div>

        {/* Poll Info */}
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Poll Info:</h3>
          {poll ? (
            <div>
              <p>Title: {poll.title}</p>
              <p>Created by: {poll.created_by}</p>
              <p>Owner: {user?.id === poll.created_by ? "✅ You own this poll" : "❌ Not your poll"}</p>
            </div>
          ) : (
            <p className="text-red-600">❌ Poll not found or error: {JSON.stringify(pollError)}</p>
          )}
        </div>

        {/* Options */}
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold">Current Options:</h2>
          {error && (
            <div className="text-red-600 mb-4">
              ❌ Error fetching options: {JSON.stringify(error)}
            </div>
          )}
          {options && options.length > 0 ? (
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={option.id} className="p-2 border rounded">
                  <div className="font-medium">#{index + 1} - {option.text}</div>
                  <div className="text-sm text-gray-500">
                    ID: {option.id}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No options found</p>
          )}
          
          <div className="mt-6 text-sm text-gray-600">
            <p>Total options: {options?.length || 0}</p>
            <p>Unique texts: {options ? new Set(options.map(o => o.text.trim().toLowerCase())).size : 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
