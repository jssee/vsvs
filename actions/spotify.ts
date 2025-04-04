"use server";

import { getUser } from "./auth";
import { createClient } from "$/utils/supabase/server";
import { encodedRedirect } from "$/utils/utils";
import { createSpotifyPlaylist, extractSpotifyTrackId } from "$/utils/spotify/client";

/**
 * Generate a Spotify playlist from session submissions
 * Returns a result object instead of redirecting
 */
export async function generateSessionPlaylist(formData: FormData) {
  // Get authenticated user
  const user = await getUser();
  if (!user) {
    return { 
      success: false, 
      message: "You must be logged in to generate a playlist"
    };
  }

  // Extract data from form
  const sessionId = parseInt(formData.get("sessionId")?.toString() || "0");
  const gauntletId = parseInt(formData.get("gauntletId")?.toString() || "0");
  const clubId = parseInt(formData.get("clubId")?.toString() || "0");

  // Validate inputs
  if (!sessionId) {
    return { 
      success: false, 
      message: "Session ID is required"
    };
  }

  // Initialize Supabase client
  const supabase = await createClient();

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  if (profileError || !profile) {
    return { 
      success: false, 
      message: "User profile not found"
    };
  }

  // Get the session to verify access and get details
  const { data: session, error: sessionError } = await supabase
    .from("session")
    .select(`
      *,
      gauntlet:gauntlet_id(*, club:club_id(*))
    `)
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { 
      success: false, 
      message: "Session not found"
    };
  }

  // Check if user is a member of the club
  const { data: membership, error: membershipError } = await supabase
    .from("club_membership")
    .select("*")
    .eq("club_id", session.gauntlet.club_id)
    .eq("user_id", profile.id)
    .single();

  if (membershipError || !membership) {
    return { 
      success: false, 
      message: "You must be a member of this club to generate a playlist"
    };
  }

  // Get all submissions for the session
  const { data: submissions, error: submissionsError } = await supabase
    .from("submission")
    .select("*")
    .eq("session_id", sessionId);

  if (submissionsError) {
    return { 
      success: false, 
      message: "Failed to fetch submissions"
    };
  }

  if (!submissions || submissions.length === 0) {
    return { 
      success: false, 
      message: "No submissions found for this session"
    };
  }

  // Extract track IDs from submissions
  const trackIds = await Promise.all(
    submissions.map((submission) => extractSpotifyTrackId(submission.track_id))
  );

  try {
    // Create the playlist with a descriptive name
    const clubName = session.gauntlet.club.name;
    const gauntletName = session.gauntlet.name;
    const sessionTheme = session.theme;
    
    const playlistName = `${clubName} - ${gauntletName} - ${sessionTheme}`;
    const description = `Playlist generated from submissions to the "${sessionTheme}" session of "${gauntletName}" gauntlet in ${clubName}.`;
    
    const playlist = await createSpotifyPlaylist(playlistName, description, trackIds);
    
    // Check if it's a demo playlist (URL contains "demo-playlist")
    const isDemo = playlist.external_urls.spotify.includes("demo-playlist");
    
    // Return success with the playlist URL and appropriate message
    if (isDemo) {
      return {
        success: true,
        message: `Demo playlist created with ${trackIds.length} tracks. In a full implementation, a real Spotify playlist would be created through user authorization (OAuth).`,
        playlistUrl: playlist.external_urls.spotify,
        isDemo: true
      };
    } else {
      return {
        success: true,
        message: "Playlist created successfully!",
        playlistUrl: playlist.external_urls.spotify,
        isDemo: false
      };
    }
  } catch (error) {
    console.error("Error creating playlist:", error);
    return { 
      success: false, 
      message: `Failed to create playlist: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}