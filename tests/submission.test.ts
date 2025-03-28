import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitTrack, deleteSubmission } from '$/actions/submission';
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

describe('Submission Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encodedRedirect).mockImplementation((type, path, message) => {
      return { type, path, message } as any;
    });
  });

  describe('submitTrack', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    
    it('should redirect to signin if user is not authenticated', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(null);
      
      const formData = new FormData();
      await submitTrack(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/signin',
        'You must be logged in to submit a track'
      );
    });

    it('should require a session ID', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      await submitTrack(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs',
        'Session ID is required'
      );
    });
    
    it('should require a track ID', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      formData.append('sessionId', '1');
      formData.append('gauntletId', '1');
      formData.append('clubId', '1');
      
      await submitTrack(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs/1/gauntlets/1/sessions/1',
        'Track link is required'
      );
    });
    
    it('should validate Spotify track URL', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      formData.append('sessionId', '1');
      formData.append('gauntletId', '1');
      formData.append('clubId', '1');
      formData.append('trackId', 'invalid-url');
      
      await submitTrack(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs/1/gauntlets/1/sessions/1',
        'Please provide a valid Spotify track link'
      );
    });
  });

  describe('deleteSubmission', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    
    it('should redirect to signin if user is not authenticated', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(null);
      
      const formData = new FormData();
      await deleteSubmission(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/signin',
        'You must be logged in to delete a submission'
      );
    });

    it('should require submission ID and session ID', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      formData.append('clubId', '1');
      formData.append('gauntletId', '1');
      
      await deleteSubmission(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs/1/gauntlets/1',
        'Submission ID and Session ID are required'
      );
    });
  });
});