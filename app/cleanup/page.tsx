import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cleanupPollDuplicates } from "@/lib/actions";
import { Button } from "@/components/ui/button";

async function handleCleanup() {
  "use server";
  
  const result = await cleanupPollDuplicates("6fc94e30-05b2-4a44-bfdd-e0a7e375ea64");
  console.log("Cleanup result:", result);
}

export default async function CleanupPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  // Get current options count
  const { data: options, error } = await supabase
    .from("poll_options")
    .select("id, text")
    .eq("poll_id", "6fc94e30-05b2-4a44-bfdd-e0a7e375ea64");

  const uniqueTexts = options ? new Set(options.map(o => o.text.trim().toLowerCase())).size : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Cleanup Poll Duplicates</h1>
      <p className="mb-4">Poll ID: 6fc94e30-05b2-4a44-bfdd-e0a7e375ea64</p>
      
      <div className="space-y-4 mb-6">
        <p>Current status:</p>
        <ul className="list-disc list-inside">
          <li>Total options: {options?.length || 0}</li>
          <li>Unique texts: {uniqueTexts}</li>
          <li>Duplicates to clean: {(options?.length || 0) - uniqueTexts}</li>
        </ul>
      </div>

      <form action={handleCleanup}>
        <Button type="submit" className="bg-red-600 hover:bg-red-700">
          Clean Up Duplicates
        </Button>
      </form>

      <div className="mt-6">
        <a href="/debug" className="text-blue-600 hover:underline">
          View Debug Page
        </a>
      </div>
    </div>
  );
}
