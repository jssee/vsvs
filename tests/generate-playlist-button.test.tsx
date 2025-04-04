import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import GeneratePlaylistButton from "../app/protected/clubs/[id]/gauntlets/[gauntletId]/sessions/[sessionId]/generate-playlist-button";
import * as spotifyActions from "../actions/spotify";

// Mock the spotify action
vi.mock("../actions/spotify", () => ({
  generateSessionPlaylist: vi.fn(),
}));

describe("GeneratePlaylistButton", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock implementation for the server action
    vi.mocked(spotifyActions.generateSessionPlaylist).mockImplementation(async () => {
      return { success: true };
    });
  });

  it("renders the button correctly", () => {
    render(
      <GeneratePlaylistButton 
        sessionId={1} 
        gauntletId={1} 
        clubId={1} 
        submissionCount={5} 
      />
    );
    
    expect(screen.getByRole("button")).toHaveTextContent("Generate Spotify Playlist");
  });

  it("disables the button when there are no submissions", () => {
    render(
      <GeneratePlaylistButton 
        sessionId={1} 
        gauntletId={1} 
        clubId={1} 
        submissionCount={0} 
      />
    );
    
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disables the button if disabled prop is true", () => {
    render(
      <GeneratePlaylistButton 
        sessionId={1} 
        gauntletId={1} 
        clubId={1} 
        submissionCount={5}
        disabled={true}
      />
    );
    
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows loading state when clicked", async () => {
    // Mock a delayed response to show loading state
    vi.mocked(spotifyActions.generateSessionPlaylist).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: true };
    });

    render(
      <GeneratePlaylistButton 
        sessionId={1} 
        gauntletId={1} 
        clubId={1} 
        submissionCount={5} 
      />
    );
    
    // Click the button
    fireEvent.click(screen.getByRole("button"));
    
    // Button should now show loading text
    expect(screen.getByRole("button")).toHaveTextContent("Creating...");
    expect(screen.getByRole("button")).toBeDisabled();
    
    // Wait for the action to complete
    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Generate Spotify Playlist");
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  it("calls generateSessionPlaylist with correct form data", async () => {
    // Mock a successful response
    vi.mocked(spotifyActions.generateSessionPlaylist).mockResolvedValue({
      success: true,
      message: "Playlist created successfully!",
      playlistUrl: "https://open.spotify.com/playlist/abc123",
      isDemo: false
    });
    
    render(
      <GeneratePlaylistButton 
        sessionId={42} 
        gauntletId={24} 
        clubId={123} 
        submissionCount={5} 
      />
    );
    
    // Click the button
    fireEvent.click(screen.getByRole("button"));
    
    // Wait for action to be called
    await waitFor(() => {
      expect(spotifyActions.generateSessionPlaylist).toHaveBeenCalledTimes(1);
    });
    
    // Check that FormData was created with correct values
    const formDataArg = vi.mocked(spotifyActions.generateSessionPlaylist).mock.calls[0][0];
    expect(formDataArg instanceof FormData).toBeTruthy();
    
    // Extract and check values from the FormData object
    const formDataEntries = Array.from(formDataArg.entries());
    const formDataObj = Object.fromEntries(formDataEntries);
    
    expect(formDataObj).toEqual({
      sessionId: "42",
      gauntletId: "24",
      clubId: "123"
    });
    
    // Check that success message appears
    await waitFor(() => {
      expect(screen.getByText("Playlist created successfully!")).toBeInTheDocument();
    });
    
    // Check for playlist link
    expect(screen.getByText("Open Playlist")).toBeInTheDocument();
    expect(screen.getByText("Open Playlist").closest('a')).toHaveAttribute('href', 'https://open.spotify.com/playlist/abc123');
  });
  
  it("displays error message when playlist creation fails", async () => {
    // Mock an error response
    vi.mocked(spotifyActions.generateSessionPlaylist).mockResolvedValue({
      success: false,
      message: "Failed to create playlist: No permissions"
    });
    
    render(
      <GeneratePlaylistButton 
        sessionId={42} 
        gauntletId={24} 
        clubId={123} 
        submissionCount={5} 
      />
    );
    
    // Click the button
    fireEvent.click(screen.getByRole("button"));
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText("Failed to create playlist: No permissions")).toBeInTheDocument();
    });
    
    // No playlist link should be shown
    expect(screen.queryByText("Open Playlist")).not.toBeInTheDocument();
  });
});