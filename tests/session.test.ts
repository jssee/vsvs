import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSession } from '$/actions/session';
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

describe('Session Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encodedRedirect).mockImplementation((type, path, message) => {
      return { type, path, message } as any;
    });
  });

  describe('createSession', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    
    it('should redirect to signin if user is not authenticated', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(null);
      
      const formData = new FormData();
      await createSession(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/signin',
        'You must be logged in to create a session'
      );
    });

    it('should require a gauntlet ID', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      await createSession(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs',
        'Gauntlet ID is required'
      );
    });
    
    it('should require a theme', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      formData.append('gauntletId', '1');
      formData.append('clubId', '1');
      
      await createSession(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs/1/gauntlets/1/sessions/new',
        'Theme is required'
      );
    });
    
    it('should require a submission deadline', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      formData.append('gauntletId', '1');
      formData.append('clubId', '1');
      formData.append('theme', 'Test Theme');
      
      await createSession(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs/1/gauntlets/1/sessions/new',
        'Submission deadline is required'
      );
    });
    
    it('should require a voting deadline', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      formData.append('gauntletId', '1');
      formData.append('clubId', '1');
      formData.append('theme', 'Test Theme');
      formData.append('submissionDeadline', '2023-01-01');
      
      await createSession(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs/1/gauntlets/1/sessions/new',
        'Voting deadline is required'
      );
    });
  });
});