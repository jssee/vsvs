import { vi, expect } from 'vitest';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import '@testing-library/jest-dom/vitest';
import React from 'react';

// Mock Next.js dependencies
vi.mock('next/headers', () => ({
  headers: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue('http://localhost:3000'),
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useSearchParams: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockReturnValue(null),
  })),
  Link: ({ children, ...props }) => {
    return React.createElement('a', props, children);
  },
}));

// Mock Supabase client
vi.mock('$/utils/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    auth: {
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  })),
}));

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});