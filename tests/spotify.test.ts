import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractSpotifyTrackId } from "../utils/spotify/client";
import { generateSessionPlaylist } from "../actions/spotify";
import * as spotifyClient from "../utils/spotify/client";
import * as auth from "../actions/auth";

// Mock dependencies
vi.mock("../utils/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: {}, error: null })),
          maybeSingle: vi.fn(() => ({ data: {}, error: null })),
        })),
      })),
    })),
  })),
}));

vi.mock("../actions/auth", () => ({
  getUser: vi.fn(),
}));

vi.mock("../utils/utils", () => ({
  encodedRedirect: vi.fn((status, path, message) => ({ status, path, message })),
}));

describe("Spotify Utilities", () => {
  describe("extractSpotifyTrackId", () => {
    it("should extract track ID from full Spotify URL", async () => {
      const url = "https://open.spotify.com/track/1234567890abcdefghijk?si=some_string";
      expect(await extractSpotifyTrackId(url)).toBe("1234567890abcdefghijk");
    });

    it("should return track ID as-is if it's already just an ID", async () => {
      const id = "1234567890abcdefghijk";
      expect(await extractSpotifyTrackId(id)).toBe(id);
    });

    it("should handle empty or invalid inputs", async () => {
      expect(await extractSpotifyTrackId("")).toBe("");
      expect(await extractSpotifyTrackId("not-a-spotify-url")).toBe("not-a-spotify-url");
    });
  });
});

describe("Spotify Actions", () => {
  let mockCreateSpotifyPlaylist;
  
  beforeEach(() => {
    // Mock auth user
    vi.mocked(auth.getUser).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });
    
    // Mock createSpotifyPlaylist function
    mockCreateSpotifyPlaylist = vi.spyOn(spotifyClient, "createSpotifyPlaylist")
      .mockResolvedValue({
        id: "playlist-123",
        name: "Test Playlist",
        description: "Test Description",
        external_urls: {
          spotify: "https://open.spotify.com/playlist/playlist-123"
        }
      });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("generateSessionPlaylist", () => {
    it("should return error if not authenticated", async () => {
      // Setup: User not logged in
      vi.mocked(auth.getUser).mockResolvedValue(null);
      
      // Execute
      const formData = new FormData();
      const result = await generateSessionPlaylist(formData);
      
      // Verify
      expect(result).toEqual({
        success: false,
        message: "You must be logged in to generate a playlist"
      });
      expect(mockCreateSpotifyPlaylist).not.toHaveBeenCalled();
    });

    it("should validate the session ID", async () => {
      // Execute: missing sessionId
      const formData = new FormData();
      const result = await generateSessionPlaylist(formData);
      
      // Verify
      expect(result).toEqual({
        success: false,
        message: "Session ID is required"
      });
      expect(mockCreateSpotifyPlaylist).not.toHaveBeenCalled();
    });

    it("should create a playlist and return success", async () => {
      // Setup: Mock Supabase responses
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            email: "test@example.com",
          },
          error: null,
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null,
        }),
      };
      
      // Mock Supabase session and submissions data
      mockSupabase.select.mockImplementation((query) => {
        if (query?.includes("gauntlet")) {
          return {
            eq: () => ({
              single: () => ({
                data: {
                  id: 1,
                  theme: "Test Theme",
                  gauntlet: {
                    id: 1,
                    name: "Test Gauntlet",
                    club: {
                      id: 1,
                      name: "Test Club",
                    },
                    club_id: 1,
                  },
                },
                error: null,
              }),
            }),
          };
        }
        
        if (query === "*") {
          return {
            eq: () => ({
              eq: () => ({
                single: () => ({
                  data: { id: 1 },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        return mockSupabase;
      });
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === "submission") {
          return {
            select: () => ({
              eq: () => ([
                { track_id: "track-123" },
                { track_id: "https://open.spotify.com/track/track-456" },
              ]),
            }),
          };
        }
        return mockSupabase;
      });
      
      const createClientMock = require("../utils/supabase/server").createClient;
      createClientMock.mockResolvedValue(mockSupabase);
      
      // Execute
      const formData = new FormData();
      formData.append("sessionId", "1");
      formData.append("gauntletId", "1");
      formData.append("clubId", "1");
      
      const result = await generateSessionPlaylist(formData);
      
      // Verify
      expect(mockCreateSpotifyPlaylist).toHaveBeenCalledWith(
        expect.stringContaining("Test"),
        expect.stringContaining("Playlist"),
        expect.arrayContaining(["track-123", "track-456"])
      );
      
      expect(result).toEqual({
        success: true,
        message: expect.any(String),
        playlistUrl: expect.stringContaining("spotify"),
        isDemo: expect.any(Boolean)
      });
    });
  });
});

// Test the client-side Generate Playlist button component
describe("GeneratePlaylistButton", () => {
  it("should render correctly", async () => {
    // We'll test this with React Testing Library in generate-playlist-button.test.tsx
  });
});