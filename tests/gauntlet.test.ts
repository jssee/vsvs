import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGauntlet, archiveGauntlet, deleteGauntlet } from '$/actions/gauntlet';
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

describe('Gauntlet Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encodedRedirect).mockImplementation((type, path, message) => {
      return { type, path, message } as any;
    });
  });

  describe('createGauntlet', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    
    it('should redirect to signin if user is not authenticated', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(null);
      
      const formData = new FormData();
      await createGauntlet(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/signin',
        'You must be logged in to create a gauntlet'
      );
    });

    it('should require a gauntlet name', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      formData.append('clubId', '1');
      
      await createGauntlet(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs/1/gauntlets/new',
        'Gauntlet name is required'
      );
    });

    it('should require a club ID', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      formData.append('name', 'Test Gauntlet');
      
      await createGauntlet(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs',
        'Club ID is required'
      );
    });
  });

  describe('archiveGauntlet', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    
    it('should redirect to signin if user is not authenticated', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(null);
      
      const formData = new FormData();
      await archiveGauntlet(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/signin',
        'You must be logged in to archive a gauntlet'
      );
    });

    it('should require a gauntlet ID', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      
      await archiveGauntlet(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs',
        'Gauntlet ID is required'
      );
    });
  });

  describe('deleteGauntlet', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    
    it('should redirect to signin if user is not authenticated', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(null);
      
      const formData = new FormData();
      await deleteGauntlet(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/signin',
        'You must be logged in to delete a gauntlet'
      );
    });

    it('should require a gauntlet ID', async () => {
      vi.mocked(getUser).mockResolvedValueOnce(mockUser as any);
      
      const formData = new FormData();
      
      await deleteGauntlet(formData);
      
      expect(encodedRedirect).toHaveBeenCalledWith(
        'error',
        '/protected/clubs',
        'Gauntlet ID is required'
      );
    });
  });
});