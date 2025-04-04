import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSpotifyPlaylist } from "../utils/spotify/client";

// Mock environment variables
vi.mock("process", () => ({
  env: {
    NEXT_PRIVATE_SPOTIFY_CLIENT_ID: "test-client-id",
    NEXT_PRIVATE_SPOTIFY_CLIENT_SECRET: "test-client-secret",
    NEXT_PRIVATE_SPOTIFY_USER_ID: "test-user-id"
  }
}));

describe("Spotify Client", () => {
  let originalFetch;
  
  beforeEach(() => {
    // Store the original fetch
    originalFetch = global.fetch;
    
    // Mock global fetch for tests
    global.fetch = vi.fn();
  });
  
  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.resetAllMocks();
  });
  
  describe("createSpotifyPlaylist", () => {
    it("should authenticate and create a playlist with tracks", async () => {
      // Mock the token response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "mock-access-token",
          token_type: "Bearer",
          expires_in: 3600
        })
      } as unknown as Response);
      
      // Mock the create playlist response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: "playlist-123",
          name: "Test Playlist",
          description: "Test Description",
          external_urls: {
            spotify: "https://open.spotify.com/playlist/playlist-123"
          }
        })
      } as unknown as Response);
      
      // Mock the add tracks response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          snapshot_id: "snapshot-123"
        })
      } as unknown as Response);
      
      // Execute
      const result = await createSpotifyPlaylist(
        "Test Playlist", 
        "Test Description", 
        ["track-123", "https://open.spotify.com/track/track-456"]
      );
      
      // Verify
      expect(fetch).toHaveBeenCalledTimes(3);
      
      // First call should be for token
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        "https://accounts.spotify.com/api/token",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded"
          })
        })
      );
      
      // Second call should be to create playlist
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/users/test-user-id/playlists"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer mock-access-token"
          }),
          body: expect.stringContaining("Test Playlist")
        })
      );
      
      // Third call should be to add tracks
      expect(fetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("/playlists/playlist-123/tracks"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer mock-access-token"
          }),
          body: expect.stringMatching(/spotify:track:track-\d+/)
        })
      );
      
      // Check returned playlist data
      expect(result).toEqual(expect.objectContaining({
        id: "playlist-123",
        external_urls: {
          spotify: expect.stringContaining("playlist-123")
        }
      }));
    });
    
    it("should handle authentication error", async () => {
      // Mock the token response failure
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized"
      } as unknown as Response);
      
      // Ensure it throws with the expected error
      await expect(
        createSpotifyPlaylist("Test Playlist", "Test Description", ["track-123"])
      ).rejects.toThrow("Failed to get Spotify token: Unauthorized");
    });
    
    it("should handle playlist creation error", async () => {
      // Mock the token response success
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "mock-access-token",
          token_type: "Bearer",
          expires_in: 3600
        })
      } as unknown as Response);
      
      // Mock the create playlist failure
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request"
      } as unknown as Response);
      
      // Ensure it throws with the expected error
      await expect(
        createSpotifyPlaylist("Test Playlist", "Test Description", ["track-123"])
      ).rejects.toThrow("Failed to create playlist: Bad Request");
    });
  });
});