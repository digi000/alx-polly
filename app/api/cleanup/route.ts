import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { pollId } = await request.json();
  
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all options for this poll
    const { data: options, error: fetchError } = await supabase
      .from("poll_options")
      .select("id, text")
      .eq("poll_id", pollId);

    if (fetchError) {
      console.error("Error fetching options:", fetchError);
      return NextResponse.json({ error: "Failed to fetch options" }, { status: 500 });
    }

    console.log("All options for poll:", options);

    // Find unique options (keep first occurrence of each unique text)
    const uniqueTexts = new Set();
    const uniqueOptions = [];
    const duplicateIds = [];

    for (const option of options || []) {
      const normalizedText = option.text.trim().toLowerCase();
      if (!uniqueTexts.has(normalizedText)) {
        uniqueTexts.add(normalizedText);
        uniqueOptions.push(option);
      } else {
        duplicateIds.push(option.id);
      }
    }

    console.log("Unique options to keep:", uniqueOptions);
    console.log("Duplicate IDs to delete:", duplicateIds);

    if (duplicateIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("poll_options")
        .delete()
        .in("id", duplicateIds);

      if (deleteError) {
        console.error("Error deleting duplicates:", deleteError);
        return NextResponse.json({ error: "Failed to delete duplicates" }, { status: 500 });
      }

      console.log(`Deleted ${duplicateIds.length} duplicate options`);
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${duplicateIds.length} duplicate options`,
      deletedCount: duplicateIds.length,
      remainingOptions: uniqueOptions
    });

  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
