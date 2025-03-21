import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClub, getUserClubs, getClubById, joinClubByInviteLink } from '$/actions/club';
import { getUser } from '$/actions/auth';
import { createClient } from '$/utils/supabase/server';
import { encodedRedirect } from '$/utils/utils';

// Mock dependencies
vi.mock('$/utils/utils', () => ({
  encodedRedirect: vi.fn(),
}));

vi.mock('$/actions/auth', () => ({
  getUser: vi.fn(),
}));

// Mock crypto
vi.mock('crypto', () => {
  return {
    randomUUID: () => 'mocked-uuid'
  };
});

describe('Club Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encodedRedirect).mockImplementation((type, path, message) => {
      return { type, path, message } as any;
    });
  });

  describe('createClub', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    
    it('should redirect to signin if user is not authenticated', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(null);
      
      const formData = new FormData();
      await createClub(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/signin',
        'You must be logged in to create a club'
      );
    });

    it('should require a club name', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      await createClub(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs/new',
        'Club name is required'
      );
    });
  });

  describe('getUserClubs', () => {
    it('should return empty array with error if user is not authenticated', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(null);
      
      const mockSupabase = {};
      vi.mocked(createClient).mockResolvedValueOnce(mockSupabase as any);
      
      const result = await getUserClubs();
      
      expect(result).toEqual({ clubs: [], error: 'Not authenticated' });
    });
  });

  describe('joinClubByInviteLink', () => {
    it('should return error if user is not authenticated', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(null);
      
      const result = await joinClubByInviteLink('some-invite-link');
      
      expect(result).toEqual({ 
        success: false, 
        error: 'You must be logged in to join a club' 
      });
    });
  });
});