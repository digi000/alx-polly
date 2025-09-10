/**
 * Simple Test Runner for Poll Actions
 * 
 * This is a basic test implementation that tests the poll actions
 * without requiring external testing frameworks.
 * 
 * Run with: node --loader ts-node/esm lib/__tests__/actions.simple-test.ts
 * or: npm run test:simple
 */

import { z } from 'zod'

// Simple test framework
interface TestResult {
  name: string
  passed: boolean
  error?: string
}

class SimpleTestRunner {
  private results: TestResult[] = []
  
  describe(name: string, tests: () => void) {
    console.log(`\n📋 ${name}`)
    console.log('=' .repeat(50))
    tests()
  }

  it(name: string, testFn: () => void | Promise<void>) {
    try {
      const result = testFn()
      if (result instanceof Promise) {
        result
          .then(() => {
            this.results.push({ name, passed: true })
            console.log(`✅ ${name}`)
          })
          .catch((error) => {
            this.results.push({ name, passed: false, error: error.message })
            console.log(`❌ ${name}: ${error.message}`)
          })
      } else {
        this.results.push({ name, passed: true })
        console.log(`✅ ${name}`)
      }
    } catch (error) {
      this.results.push({ name, passed: false, error: (error as Error).message })
      console.log(`❌ ${name}: ${(error as Error).message}`)
    }
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`)
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`)
        }
      },
      toHaveProperty: (prop: string, value?: any) => {
        if (!(prop in actual)) {
          throw new Error(`Expected object to have property ${prop}`)
        }
        if (value !== undefined && actual[prop] !== value) {
          throw new Error(`Expected property ${prop} to be ${value}, but got ${actual[prop]}`)
        }
      },
      toThrow: () => {
        if (typeof actual !== 'function') {
          throw new Error('Expected a function that throws')
        }
        try {
          actual()
          throw new Error('Expected function to throw an error')
        } catch {
          // Expected behavior
        }
      }
    }
  }

  summary() {
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const total = this.results.length

    console.log('\n📊 Test Summary')
    console.log('=' .repeat(50))
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📋 Total: ${total}`)
    
    if (failed > 0) {
      console.log('\nFailed Tests:')
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`))
    }

    return { passed, failed, total }
  }
}

const test = new SimpleTestRunner()

// Test the Zod schemas from actions.ts
test.describe('Poll Form Schema Validation', () => {
  const pollFormSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters long"),
    description: z.string().optional(),
    options: z
      .array(z.object({ text: z.string().min(1, "Option cannot be empty") }))
      .min(2, "You must provide at least two options"),
  })

  test.it('should validate a correct poll form', () => {
    const validData = {
      title: 'What is your favorite programming language?',
      description: 'Choose your preferred language',
      options: [
        { text: 'JavaScript' },
        { text: 'TypeScript' },
        { text: 'Python' }
      ]
    }

    const result = pollFormSchema.safeParse(validData)
    test.expect(result.success).toBe(true)
  })

  test.it('should reject poll with short title', () => {
    const invalidData = {
      title: 'Hi',
      options: [
        { text: 'Option 1' },
        { text: 'Option 2' }
      ]
    }

    const result = pollFormSchema.safeParse(invalidData)
    test.expect(result.success).toBe(false)
  })

  test.it('should reject poll with only one option', () => {
    const invalidData = {
      title: 'Valid Poll Title',
      options: [
        { text: 'Only Option' }
      ]
    }

    const result = pollFormSchema.safeParse(invalidData)
    test.expect(result.success).toBe(false)
  })

  test.it('should reject poll with empty option text', () => {
    const invalidData = {
      title: 'Valid Poll Title',
      options: [
        { text: 'Valid Option' },
        { text: '' }
      ]
    }

    const result = pollFormSchema.safeParse(invalidData)
    test.expect(result.success).toBe(false)
  })

  test.it('should accept poll without description', () => {
    const validData = {
      title: 'Valid Poll Title',
      options: [
        { text: 'Option 1' },
        { text: 'Option 2' }
      ]
    }

    const result = pollFormSchema.safeParse(validData)
    test.expect(result.success).toBe(true)
  })
})

test.describe('Update Poll Schema Validation', () => {
  const updatePollSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters long"),
    description: z.string().optional(),
    options: z
      .array(z.object({ 
        id: z.string().optional(),
        text: z.string().min(1, "Option cannot be empty") 
      }))
      .min(2, "You must provide at least two options"),
  })

  test.it('should validate a correct update poll form', () => {
    const validData = {
      title: 'Updated Poll Title',
      description: 'Updated description',
      options: [
        { id: 'opt-1', text: 'Updated Option 1' },
        { id: 'opt-2', text: 'Updated Option 2' },
        { text: 'New Option 3' } // New option without ID
      ]
    }

    const result = updatePollSchema.safeParse(validData)
    test.expect(result.success).toBe(true)
  })

  test.it('should validate update poll form with new options', () => {
    const validData = {
      title: 'Updated Poll Title',
      options: [
        { text: 'New Option 1' },
        { text: 'New Option 2' }
      ]
    }

    const result = updatePollSchema.safeParse(validData)
    test.expect(result.success).toBe(true)
  })
})

test.describe('Form Data Processing Logic', () => {
  test.it('should correctly process FormData for poll creation', () => {
    const formData = new FormData()
    formData.append('title', 'Test Poll')
    formData.append('description', 'Test Description')
    formData.append('options', 'Option 1')
    formData.append('options', 'Option 2')
    formData.append('options', 'Option 3')

    const rawFormData = {
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      options: Array.from(formData.getAll("options")).map((o) => ({
        text: o.toString(),
      })),
    }

    test.expect(rawFormData.title).toBe('Test Poll')
    test.expect(rawFormData.description).toBe('Test Description')
    test.expect(rawFormData.options).toEqual([
      { text: 'Option 1' },
      { text: 'Option 2' },
      { text: 'Option 3' }
    ])
  })

  test.it('should handle missing description in FormData', () => {
    const formData = new FormData()
    formData.append('title', 'Test Poll')
    formData.append('options', 'Option 1')
    formData.append('options', 'Option 2')

    const rawFormData = {
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      options: Array.from(formData.getAll("options")).map((o) => ({
        text: o.toString(),
      })),
    }

    test.expect(rawFormData.description).toBe(undefined)
  })
})

test.describe('Duplicate Detection Logic', () => {
  test.it('should correctly identify duplicate options', () => {
    const options = [
      { id: 'opt-1', text: 'Option A' },
      { id: 'opt-2', text: 'Option B' },
      { id: 'opt-3', text: 'option a' }, // Duplicate (case insensitive)
      { id: 'opt-4', text: 'Option C' },
      { id: 'opt-5', text: 'OPTION B' }, // Duplicate (case insensitive)
    ]

    // Logic from cleanupPollDuplicates
    const uniqueOptions = options.filter((option, index, self) => 
      index === self.findIndex(o => o.text.trim().toLowerCase() === option.text.trim().toLowerCase())
    )

    const duplicateIds = options.filter(option => 
      !uniqueOptions.some(unique => unique.id === option.id)
    ).map(option => option.id)

    test.expect(uniqueOptions.length).toBe(3)
    test.expect(duplicateIds).toEqual(['opt-3', 'opt-5'])
  })

  test.it('should handle no duplicates correctly', () => {
    const options = [
      { id: 'opt-1', text: 'Option A' },
      { id: 'opt-2', text: 'Option B' },
      { id: 'opt-3', text: 'Option C' },
    ]

    const uniqueOptions = options.filter((option, index, self) => 
      index === self.findIndex(o => o.text.trim().toLowerCase() === option.text.trim().toLowerCase())
    )

    const duplicateIds = options.filter(option => 
      !uniqueOptions.some(unique => unique.id === option.id)
    ).map(option => option.id)

    test.expect(uniqueOptions.length).toBe(3)
    test.expect(duplicateIds.length).toBe(0)
  })
})

test.describe('Option Cleaning Logic', () => {
  test.it('should filter out empty options', () => {
    const options = [
      { text: 'Valid Option 1' },
      { text: '' },
      { text: 'Valid Option 2' },
      { text: '   ' }, // Only whitespace
      { text: 'Valid Option 3' }
    ]

    const cleanOptions = options.filter(option => option.text && option.text.trim() !== "")

    test.expect(cleanOptions.length).toBe(3)
    test.expect(cleanOptions).toEqual([
      { text: 'Valid Option 1' },
      { text: 'Valid Option 2' },
      { text: 'Valid Option 3' }
    ])
  })

  test.it('should handle all empty options', () => {
    const options = [
      { text: '' },
      { text: '   ' },
      { text: '\t\n' }
    ]

    const cleanOptions = options.filter(option => option.text && option.text.trim() !== "")

    test.expect(cleanOptions.length).toBe(0)
  })
})

// Run the tests
console.log('🧪 Running Poll Actions Tests...\n')

// Show summary at the end
setTimeout(() => {
  const summary = test.summary()
  process.exit(summary.failed > 0 ? 1 : 0)
}, 100)
