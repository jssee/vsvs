import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '$/app/auth/callback/route';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Mock dependencies
vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn().mockImplementation((url) => ({ url })),
    next: vi.fn(),
  },
  NextRequest: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Auth Callback Route', () => {
  const mockRequest = {
    url: 'http://localhost:3000/auth/callback?code=123&redirectTo=/dashboard',
    cookies: {
      getAll: vi.fn(),
      set: vi.fn(),
    },
    nextUrl: {
      searchParams: new URLSearchParams('code=123&redirectTo=/dashboard'),
    },
  };

  const mockSupabase = {
    auth: {
      exchangeCodeForSession: vi.fn(),
    },
  };

  const mockCookieStore = {
    getAll: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
  });

  it('should exchange code for session if code is present', async () => {
    await GET(mockRequest as unknown as NextRequest);

    expect(createServerClient).toHaveBeenCalled();

    expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('123');
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'http://localhost:3000/dashboard',
      })
    );
  });

  it('should redirect to /protected if no redirectTo is specified', async () => {
    const requestWithoutRedirect = {
      ...mockRequest,
      url: 'http://localhost:3000/auth/callback?code=123',
      nextUrl: {
        searchParams: new URLSearchParams('code=123'),
      },
    };

    await GET(requestWithoutRedirect as unknown as NextRequest);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'http://localhost:3000/protected',
      })
    );
  });

  it('should not exchange code if no code is present', async () => {
    const requestWithoutCode = {
      ...mockRequest,
      url: 'http://localhost:3000/auth/callback?redirectTo=/dashboard',
      nextUrl: {
        searchParams: new URLSearchParams('redirectTo=/dashboard'),
      },
    };

    await GET(requestWithoutCode as unknown as NextRequest);

    expect(mockSupabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'http://localhost:3000/dashboard',
      })
    );
  });
});