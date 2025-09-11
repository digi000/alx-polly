
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PollDatabase } from '@/lib/utils/poll-database';
import { validateCreatePollData } from '@/lib/utils/validation';
import { requireAuth } from '@/lib/utils/auth';
import {
  createSuccessResult,
  createValidationError,
  createDatabaseError,
  withErrorHandling,
} from '@/lib/utils/errors';
import type { PollActionResult } from '@/lib/types/poll';

export const POST = async (request: Request): Promise<NextResponse<PollActionResult>> => {
  const supabase = createRouteHandlerClient({ cookies });
  const formData = await request.formData();

  const actionResult = await withErrorHandling(async () => {
    const user = await requireAuth(supabase);
    const validation = validateCreatePollData(formData);

    if (!validation.success) {
      return createValidationError(validation.errors!);
    }

    const pollData = validation.data!;
    const pollDb = new PollDatabase(supabase);

    try {
      const createdPoll = await pollDb.createPollWithOptions(pollData, user.id);
      return createSuccessResult('Poll created successfully!', createdPoll.id);
    } catch (error) {
      return createDatabaseError(
        'create poll',
        error instanceof Error ? error.message : undefined
      );
    }
  }, 'create poll');

  return NextResponse.json(actionResult);
};
