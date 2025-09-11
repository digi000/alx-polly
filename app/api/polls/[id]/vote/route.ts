
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PollDatabase } from '@/lib/utils/poll-database';
import { requireAuth } from '@/lib/utils/auth';
import {
  createSuccessResult,
  createDatabaseError,
  withErrorHandling,
} from '@/lib/utils/errors';
import type { PollActionResult } from '@/lib/types/poll';

export const POST = async (request: Request, { params }: { params: { id: string } }): Promise<NextResponse<PollActionResult>> => {
  const supabase = createRouteHandlerClient({ cookies });
  const pollId = params.id;
  const { optionId } = await request.json();

  const actionResult = await withErrorHandling(async () => {
    const user = await requireAuth(supabase);
    const pollDb = new PollDatabase(supabase);

    try {
      await pollDb.castVote(pollId, optionId, user.id);
      return createSuccessResult('Vote cast successfully!');
    } catch (error) {
      return createDatabaseError(
        'cast vote',
        error instanceof Error ? error.message : undefined
      );
    }
  }, 'cast vote');

  return NextResponse.json(actionResult);
};
