
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PollDatabase } from '@/lib/utils/poll-database';
import { requireAuth, requirePollOwnership } from '@/lib/utils/auth';
import {
  createSuccessResult,
  createDatabaseError,
  createNotFoundError,
  createPermissionError,
  withErrorHandling,
} from '@/lib/utils/errors';
import type { PollActionResult } from '@/lib/types/poll';

export const POST = async (request: Request, { params }: { params: { id: string } }): Promise<NextResponse<PollActionResult>> => {
  const supabase = createRouteHandlerClient({ cookies });
  const pollId = params.id;

  const actionResult = await withErrorHandling(async () => {
    const user = await requireAuth(supabase);
    const pollDb = new PollDatabase(supabase);

    const poll = await pollDb.getPollById(pollId);
    if (!poll) {
      return createNotFoundError('Poll');
    }

    try {
      await requirePollOwnership(supabase, pollId, user.id);
    } catch {
      return createPermissionError();
    }

    try {
      const duplicatesRemoved = await pollDb.removeDuplicateOptions(pollId);
      return createSuccessResult(
        `Cleaned up ${duplicatesRemoved} duplicate option${duplicatesRemoved !== 1 ? 's' : ''}`
      );
    } catch (error) {
      return createDatabaseError(
        'cleanup poll duplicates',
        error instanceof Error ? error.message : undefined
      );
    }
  }, 'cleanup poll duplicates');

  return NextResponse.json(actionResult);
};
