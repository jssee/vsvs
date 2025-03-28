"use server";

import { createClient } from "$/utils/supabase/server";
import { getUser } from "./auth";
import { encodedRedirect } from "$/utils/utils";

/**
 * Create or update a submission for a session
 */
export const submitTrack = async (formData: FormData) => {
  // Get authenticated user
  const user = await getUser();
  if (!user) {
    return encodedRedirect("error", "/signin", "You must be logged in to submit a track");
  }

  // Extract submission data from form
  const sessionId = parseInt(formData.get("sessionId")?.toString() || "0");
  const trackId = formData.get("trackId")?.toString();
  const submissionId = formData.get("submissionId")?.toString(); // For updates
  
  // Extract gauntlet ID and club ID for redirects
  const gauntletId = parseInt(formData.get("gauntletId")?.toString() || "0");
  const clubId = parseInt(formData.get("clubId")?.toString() || "0");

  // Validate inputs
  if (!sessionId) {
    return encodedRedirect("error", "/protected/clubs", "Session ID is required");
  }

  if (!trackId) {
    return encodedRedirect(
      "error", 
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`, 
      "Track link is required"
    );
  }

  // Validate Spotify link
  if (!isValidSpotifyTrackURL(trackId)) {
    return encodedRedirect(
      "error", 
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`, 
      "Please provide a valid Spotify track link"
    );
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
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "User profile not found"
    );
  }

  // Verify session exists and is in submission phase
  const { data: session, error: sessionError } = await supabase
    .from("session")
    .select("*, gauntlet:gauntlet_id(*)")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}`,
      "Session not found"
    );
  }

  // Check if user is a member of the club
  const { data: membership, error: membershipError } = await supabase
    .from("club_membership")
    .select("*")
    .eq("club_id", session.gauntlet.club_id)
    .eq("user_id", profile.id)
    .single();

  if (membershipError || !membership) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "You must be a member of this club to submit tracks"
    );
  }

  // Check if the session is in the submission phase
  if (session.phase && session.phase !== "submission") {
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "Submission phase has ended for this session"
    );
  }

  // Check if submission deadline has passed
  const deadline = new Date(session.submission_deadline);
  const now = new Date();
  if (deadline < now) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "Submission deadline has passed"
    );
  }

  if (submissionId) {
    // Update existing submission
    const { error: updateError } = await supabase
      .from("submission")
      .update({
        track_id: trackId,
      })
      .eq("id", submissionId)
      .eq("user_id", profile.id); // Ensure user owns this submission

    if (updateError) {
      console.error("Error updating submission:", updateError);
      return encodedRedirect(
        "error",
        `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
        "Failed to update submission: " + updateError.message
      );
    }

    return encodedRedirect(
      "success",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "Submission updated successfully!"
    );
  } else {
    // Check if user already submitted to this session
    const { data: existingSubmission, error: checkError } = await supabase
      .from("submission")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existingSubmission) {
      // User already submitted, update instead
      const { error: updateError } = await supabase
        .from("submission")
        .update({
          track_id: trackId,
        })
        .eq("id", existingSubmission.id)
        .eq("user_id", profile.id);

      if (updateError) {
        console.error("Error updating submission:", updateError);
        return encodedRedirect(
          "error",
          `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
          "Failed to update submission: " + updateError.message
        );
      }

      return encodedRedirect(
        "success",
        `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
        "Submission updated successfully!"
      );
    }

    // Create new submission
    const { error: insertError } = await supabase
      .from("submission")
      .insert([
        {
          session_id: sessionId,
          user_id: profile.id,
          track_id: trackId,
        },
      ]);

    if (insertError) {
      console.error("Error creating submission:", insertError);
      return encodedRedirect(
        "error",
        `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
        "Failed to create submission: " + insertError.message
      );
    }

    return encodedRedirect(
      "success",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "Track submitted successfully!"
    );
  }
};

/**
 * Delete a submission
 */
export const deleteSubmission = async (formData: FormData) => {
  // Get authenticated user
  const user = await getUser();
  if (!user) {
    return encodedRedirect("error", "/signin", "You must be logged in to delete a submission");
  }

  // Extract submission data from form
  const submissionId = parseInt(formData.get("submissionId")?.toString() || "0");
  
  // Extract session and gauntlet IDs for redirects
  const sessionId = parseInt(formData.get("sessionId")?.toString() || "0");
  const gauntletId = parseInt(formData.get("gauntletId")?.toString() || "0");
  const clubId = parseInt(formData.get("clubId")?.toString() || "0");

  // Validate inputs
  if (!submissionId || !sessionId) {
    return encodedRedirect(
      "error", 
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}`, 
      "Submission ID and Session ID are required"
    );
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
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "User profile not found"
    );
  }

  // Get the submission to verify ownership
  const { data: submission, error: submissionError } = await supabase
    .from("submission")
    .select("*, session:session_id(*)")
    .eq("id", submissionId)
    .single();

  if (submissionError || !submission) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "Submission not found"
    );
  }

  // Verify ownership
  if (submission.user_id !== profile.id) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "You can only delete your own submissions"
    );
  }

  // Check if the session is in the submission phase
  if (submission.session.phase && submission.session.phase !== "submission") {
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "Submission phase has ended for this session"
    );
  }

  // Check if submission deadline has passed
  const deadline = new Date(submission.session.submission_deadline);
  const now = new Date();
  if (deadline < now) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "Submission deadline has passed"
    );
  }

  // Delete the submission
  const { error: deleteError } = await supabase
    .from("submission")
    .delete()
    .eq("id", submissionId)
    .eq("user_id", profile.id); // Extra safety check

  if (deleteError) {
    console.error("Error deleting submission:", deleteError);
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
      "Failed to delete submission: " + deleteError.message
    );
  }

  return encodedRedirect(
    "success",
    `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${sessionId}`,
    "Submission deleted successfully!"
  );
};

// Helper function to validate Spotify track URLs
function isValidSpotifyTrackURL(url: string): boolean {
  // Accept both full URLs and just track IDs
  const fullUrlPattern = /^https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]{22}(\?si=[a-zA-Z0-9]+)?$/;
  const trackIdPattern = /^[a-zA-Z0-9]{22}$/;
  
  return fullUrlPattern.test(url) || trackIdPattern.test(url);
}