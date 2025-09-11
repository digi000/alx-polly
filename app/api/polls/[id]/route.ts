
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PollDatabase } from '@/lib/utils/poll-database';
import { validateUpdatePollData } from '@/lib/utils/validation';
import { requireAuth, requirePollOwnership } from '@/lib/utils/auth';
import {
  createSuccessResult,
  createValidationError,
  createDatabaseError,
  createNotFoundError,
  createPermissionError,
  withErrorHandling,
} from '@/lib/utils/errors';
import type { PollActionResult } from '@/lib/types/poll';

export const GET = async (request: Request, { params }: { params: { id: string } }): Promise<NextResponse> => {
  const supabase = createRouteHandlerClient({ cookies });
  const pollId = params.id;
  const { data: { user } } = await supabase.auth.getUser();

  const pollDb = new PollDatabase(supabase);
  const poll = await pollDb.getPollWithResults(pollId, user?.id);

  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }

  return NextResponse.json(poll);
};

export const PUT = async (request: Request, { params }: { params: { id: string } }): Promise<NextResponse<PollActionResult>> => {
  const supabase = createRouteHandlerClient({ cookies });
  const pollId = params.id;
  const formData = await request.formData();

  const actionResult = await withErrorHandling(async () => {
    const user = await requireAuth(supabase);
    const validation = validateUpdatePollData(formData);

    if (!validation.success) {
      return createValidationError(validation.errors!);
    }

    const pollData = validation.data!;
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

    const cleanOptions = pollData.options.filter(option =>
      option.text && option.text.trim() !== ''
    );

    if (cleanOptions.length < 2) {
      return createValidationError({
        options: ['You must provide at least two non-empty options.'],
      });
    }

    try {
      await pollDb.updatePollWithOptions(pollId, {
        ...pollData,
        options: cleanOptions,
        id: pollId,
      });
      return createSuccessResult('Poll updated successfully!');
    } catch (error) {
      return createDatabaseError(
        'update poll',
        error instanceof Error ? error.message : undefined
      );
    }
  }, 'update poll');

  return NextResponse.json(actionResult);
};

export const DELETE = async (request: Request, { params }: { params: { id: string } }): Promise<NextResponse<PollActionResult>> => {
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
      await pollDb.deletePoll(pollId);
      return createSuccessResult('Poll deleted successfully!');
    } catch (error) {
      return createDatabaseError(
        'delete poll',
        error instanceof Error ? error.message : undefined
      );
    }
  }, 'delete poll');

  return NextResponse.json(actionResult);
};
