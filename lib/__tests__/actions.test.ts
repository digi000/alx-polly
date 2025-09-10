import { createPoll, deletePoll, updatePoll, cleanupPollDuplicates } from '../actions'
import { createSupabaseServerClient } from '../supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Mock dependencies
jest.mock('../supabase/server')
jest.mock('next/headers')
jest.mock('next/cache')
jest.mock('next/navigation')

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}

const mockCookies = jest.fn()
const mockRevalidatePath = jest.fn()
const mockRedirect = jest.fn()

// Mock implementations
;(createSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase)
;(cookies as jest.Mock).mockReturnValue(mockCookies)
;(revalidatePath as jest.Mock).mockImplementation(mockRevalidatePath)
;(redirect as jest.Mock).mockImplementation(mockRedirect)

describe('Poll Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createPoll', () => {
    const mockUser = { id: 'user-123' }
    const mockPoll = { id: 'poll-123', title: 'Test Poll' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      })
    })

    it('should create a poll successfully', async () => {
      // Mock successful poll creation
      const mockPollQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockPoll,
          error: null,
        }),
      }

      // Mock successful options creation
      const mockOptionsQuery = {
        insert: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockPollQuery)
        .mockReturnValueOnce(mockOptionsQuery)

      const formData = new FormData()
      formData.append('title', 'What is your favorite programming language?')
      formData.append('description', 'Choose your preferred programming language')
      formData.append('options', 'JavaScript')
      formData.append('options', 'TypeScript')
      formData.append('options', 'Python')

      const result = await createPoll(formData)

      expect(result).toEqual({
        success: true,
        pollId: 'poll-123',
        message: 'Poll created successfully!',
      })

      expect(mockPollQuery.insert).toHaveBeenCalledWith([
        {
          title: 'What is your favorite programming language?',
          description: 'Choose your preferred programming language',
          created_by: 'user-123',
        },
      ])

      expect(mockOptionsQuery.insert).toHaveBeenCalledWith([
        { text: 'JavaScript', poll_id: 'poll-123' },
        { text: 'TypeScript', poll_id: 'poll-123' },
        { text: 'Python', poll_id: 'poll-123' },
      ])

      expect(mockRevalidatePath).toHaveBeenCalledWith('/polls')
    })

    it('should redirect to login if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      const formData = new FormData()
      formData.append('title', 'Test Poll')

      await createPoll(formData)

      expect(mockRedirect).toHaveBeenCalledWith('/login')
    })

    it('should return validation errors for invalid input', async () => {
      const formData = new FormData()
      formData.append('title', 'Hi') // Too short
      formData.append('options', 'Option 1') // Only one option

      const result = await createPoll(formData)

      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('message', 'Missing Fields. Failed to Create Poll.')
      expect(result.errors).toHaveProperty('title')
      expect(result.errors).toHaveProperty('options')
    })

    it('should handle database errors during poll creation', async () => {
      const mockPollQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }

      mockSupabase.from.mockReturnValue(mockPollQuery)

      const formData = new FormData()
      formData.append('title', 'Valid Poll Title')
      formData.append('options', 'Option 1')
      formData.append('options', 'Option 2')

      const result = await createPoll(formData)

      expect(result).toEqual({
        message: 'Database Error: Failed to Create Poll.',
      })
    })

    it('should rollback poll creation if options fail to create', async () => {
      const mockPollQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockPoll,
          error: null,
        }),
      }

      const mockOptionsQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Options creation failed' },
        }),
      }

      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        match: jest.fn().mockResolvedValue({ data: null, error: null }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockPollQuery)
        .mockReturnValueOnce(mockOptionsQuery)
        .mockReturnValueOnce(mockDeleteQuery)

      const formData = new FormData()
      formData.append('title', 'Valid Poll Title')
      formData.append('options', 'Option 1')
      formData.append('options', 'Option 2')

      const result = await createPoll(formData)

      expect(result).toEqual({
        message: 'Database Error: Failed to Create Poll Options.',
      })

      expect(mockDeleteQuery.delete).toHaveBeenCalled()
      expect(mockDeleteQuery.match).toHaveBeenCalledWith({ id: 'poll-123' })
    })
  })

  describe('deletePoll', () => {
    const mockUser = { id: 'user-123' }
    const pollId = 'poll-123'

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      })
    })

    it('should delete a poll successfully', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user-123' },
          error: null,
        }),
      }

      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockDeleteQuery)

      const result = await deletePoll(pollId)

      expect(result).toEqual({
        success: true,
        message: 'Poll deleted successfully!',
      })

      expect(mockDeleteQuery.delete).toHaveBeenCalled()
      expect(mockDeleteQuery.eq).toHaveBeenCalledWith('id', pollId)
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/polls')
    })

    it('should redirect to login if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      await deletePoll(pollId)

      expect(mockRedirect).toHaveBeenCalledWith('/login')
    })

    it('should return error if poll is not found', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Poll not found' },
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)

      const result = await deletePoll(pollId)

      expect(result).toEqual({
        message: 'Poll not found.',
      })
    })

    it('should return error if user does not own the poll', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'other-user-456' },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)

      const result = await deletePoll(pollId)

      expect(result).toEqual({
        message: "You don't have permission to delete this poll.",
      })
    })

    it('should handle database errors during deletion', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user-123' },
          error: null,
        }),
      }

      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockDeleteQuery)

      const result = await deletePoll(pollId)

      expect(result).toEqual({
        message: 'Database Error: Failed to Delete Poll.',
      })
    })
  })

  describe('updatePoll', () => {
    const mockUser = { id: 'user-123' }
    const pollId = 'poll-123'

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      })
    })

    it('should update a poll successfully', async () => {
      // Mock poll ownership verification
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user-123' },
          error: null,
        }),
      }

      // Mock poll update
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      // Mock getting existing options
      const mockGetOptionsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            { id: 'opt-1', text: 'Old Option 1' },
            { id: 'opt-2', text: 'Old Option 2' },
          ],
          error: null,
        }),
      }

      // Mock deleting options
      const mockDeleteOptionsQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      // Mock inserting new options
      const mockInsertOptionsQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [
            { id: 'new-opt-1', text: 'New Option 1', poll_id: pollId },
            { id: 'new-opt-2', text: 'New Option 2', poll_id: pollId },
          ],
          error: null,
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery) // Poll ownership check
        .mockReturnValueOnce(mockUpdateQuery) // Poll update
        .mockReturnValueOnce(mockGetOptionsQuery) // Get existing options
        .mockReturnValueOnce(mockGetOptionsQuery) // Get options to delete
        .mockReturnValueOnce(mockDeleteOptionsQuery) // Delete option 1
        .mockReturnValueOnce(mockDeleteOptionsQuery) // Delete option 2
        .mockReturnValueOnce(mockGetOptionsQuery) // Check remaining options
        .mockReturnValueOnce(mockInsertOptionsQuery) // Insert new options

      const formData = new FormData()
      formData.append('title', 'Updated Poll Title')
      formData.append('description', 'Updated description')
      formData.append('options', JSON.stringify([
        { text: 'New Option 1' },
        { text: 'New Option 2' },
      ]))

      const result = await updatePoll(pollId, formData)

      expect(result).toEqual({
        success: true,
        message: 'Poll updated successfully!',
      })

      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        title: 'Updated Poll Title',
        description: 'Updated description',
      })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/polls')
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/polls/${pollId}`)
    })

    it('should redirect to login if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      const formData = new FormData()
      formData.append('title', 'Test Poll')

      await updatePoll(pollId, formData)

      expect(mockRedirect).toHaveBeenCalledWith('/login')
    })

    it('should return error if poll is not found', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Poll not found' },
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)

      const formData = new FormData()
      formData.append('title', 'Updated Poll Title')

      const result = await updatePoll(pollId, formData)

      expect(result).toEqual({
        message: 'Poll not found.',
      })
    })

    it('should return error if user does not own the poll', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'other-user-456' },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)

      const formData = new FormData()
      formData.append('title', 'Updated Poll Title')

      const result = await updatePoll(pollId, formData)

      expect(result).toEqual({
        message: "You don't have permission to edit this poll.",
      })
    })

    it('should return validation errors for invalid input', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user-123' },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)

      const formData = new FormData()
      formData.append('title', 'Hi') // Too short
      formData.append('options', JSON.stringify([{ text: 'Only one option' }]))

      const result = await updatePoll(pollId, formData)

      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('message', 'Missing Fields. Failed to Update Poll.')
    })

    it('should handle insufficient clean options', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user-123' },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)

      const formData = new FormData()
      formData.append('title', 'Valid Poll Title')
      formData.append('options', JSON.stringify([
        { text: 'Valid Option' },
        { text: '' }, // Empty option will be filtered out
      ]))

      const result = await updatePoll(pollId, formData)

      expect(result).toEqual({
        message: 'You must provide at least two non-empty options.',
      })
    })
  })

  describe('cleanupPollDuplicates', () => {
    const mockUser = { id: 'user-123' }
    const pollId = 'poll-123'

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      })
    })

    it('should cleanup duplicate options successfully', async () => {
      const mockOptions = [
        { id: 'opt-1', text: 'Option A' },
        { id: 'opt-2', text: 'Option B' },
        { id: 'opt-3', text: 'option a' }, // Duplicate (case insensitive)
        { id: 'opt-4', text: 'Option C' },
        { id: 'opt-5', text: 'OPTION B' }, // Duplicate (case insensitive)
      ]

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockOptions,
          error: null,
        }),
      }

      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockDeleteQuery)

      const result = await cleanupPollDuplicates(pollId)

      expect(result).toEqual({
        success: true,
        message: 'Cleaned up 2 duplicate options',
      })

      expect(mockDeleteQuery.delete).toHaveBeenCalled()
      expect(mockDeleteQuery.in).toHaveBeenCalledWith('id', ['opt-3', 'opt-5'])
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/polls/${pollId}`)
    })

    it('should redirect to login if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      await cleanupPollDuplicates(pollId)

      expect(mockRedirect).toHaveBeenCalledWith('/login')
    })

    it('should handle database errors when fetching options', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)

      const result = await cleanupPollDuplicates(pollId)

      expect(result).toEqual({
        message: 'Failed to fetch options',
      })
    })

    it('should handle database errors when deleting duplicates', async () => {
      const mockOptions = [
        { id: 'opt-1', text: 'Option A' },
        { id: 'opt-2', text: 'option a' }, // Duplicate
      ]

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockOptions,
          error: null,
        }),
      }

      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Delete error' },
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockDeleteQuery)

      const result = await cleanupPollDuplicates(pollId)

      expect(result).toEqual({
        message: 'Failed to delete duplicates',
      })
    })

    it('should handle case with no duplicates', async () => {
      const mockOptions = [
        { id: 'opt-1', text: 'Option A' },
        { id: 'opt-2', text: 'Option B' },
        { id: 'opt-3', text: 'Option C' },
      ]

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockOptions,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockSelectQuery)

      const result = await cleanupPollDuplicates(pollId)

      expect(result).toEqual({
        success: true,
        message: 'Cleaned up 0 duplicate options',
      })

      expect(mockRevalidatePath).toHaveBeenCalledWith(`/polls/${pollId}`)
    })
  })
})
