import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signInWithMagicLink, getSession, getUser, signOut } from '$/actions/auth';
import { createClient } from '$/utils/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { encodedRedirect } from '$/utils/utils';

// Mock the encodedRedirect utility
vi.mock('$/utils/utils', () => ({
  encodedRedirect: vi.fn(),
}));

describe('Auth Actions', () => {
  const mockSupabase = {
    auth: {
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(encodedRedirect).mockImplementation((type, path, message) => {
      return { type, path, message } as any;
    });
  });

  describe('signInWithMagicLink', () => {
    it('should return error if email is not provided', async () => {
      const formData = new FormData();
      
      await signInWithMagicLink(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/signin',
        'Email is required'
      );
      expect(mockSupabase.auth.signInWithOtp).not.toHaveBeenCalled();
    });

    it('should call signInWithOtp with correct parameters', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      
      mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });
      
      await signInWithMagicLink(formData);
      
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback?redirectTo=/protected',
        },
      });
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'success',
        '/signin',
        'Check your email for the magic link.'
      );
    });

    it('should handle custom redirectTo parameter', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('redirectTo', '/dashboard');
      
      mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });
      
      await signInWithMagicLink(formData);
      
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback?redirectTo=/dashboard',
        },
      });
    });

    it('should handle error from Supabase', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      
      const mockError = { message: 'Invalid email', code: 'invalid_email' };
      mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: mockError });
      
      await signInWithMagicLink(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/signin',
        'Invalid email'
      );
    });
  });

  describe('getSession', () => {
    it('should call auth.getSession', async () => {
      const mockSession = { session: { user: { id: '123' } } };
      mockSupabase.auth.getSession.mockResolvedValue(mockSession as any);
      
      const result = await getSession();
      
      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });
  });

  describe('getUser', () => {
    it('should return user data', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } } as any);
      
      const result = await getUser();
      
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('signOut', () => {
    it('should call auth.signOut and redirect', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      
      await signOut();
      
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith('/signin');
    });
  });
});
