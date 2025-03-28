"use server";

import { createClient } from "$/utils/supabase/server";
import { getUser } from "./auth";
import { encodedRedirect } from "$/utils/utils";

/**
 * Create a new session for a gauntlet
 */
export const createSession = async (formData: FormData) => {
  // Get authenticated user
  const user = await getUser();
  if (!user) {
    return encodedRedirect("error", "/signin", "You must be logged in to create a session");
  }

  // Extract session data from form
  const gauntletId = parseInt(formData.get("gauntletId")?.toString() || "0");
  const theme = formData.get("theme")?.toString();
  const phase = formData.get("phase")?.toString() || "submission";
  
  // Parse dates
  const submissionDeadline = formData.get("submissionDeadline")?.toString();
  const votingDeadline = formData.get("votingDeadline")?.toString();
  
  // Extract club ID for redirects
  const clubId = parseInt(formData.get("clubId")?.toString() || "0");

  // Validate inputs
  if (!gauntletId) {
    return encodedRedirect("error", "/protected/clubs", "Gauntlet ID is required");
  }

  if (!theme) {
    return encodedRedirect(
      "error", 
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/new`, 
      "Theme is required"
    );
  }

  if (!submissionDeadline) {
    return encodedRedirect(
      "error", 
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/new`, 
      "Submission deadline is required"
    );
  }

  if (!votingDeadline) {
    return encodedRedirect(
      "error", 
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/new`, 
      "Voting deadline is required"
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
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}`,
      "User profile not found"
    );
  }

  // Verify gauntlet exists and is active
  const { data: gauntlet, error: gauntletError } = await supabase
    .from("gauntlet")
    .select("*, club:club_id(*)")
    .eq("id", gauntletId)
    .single();

  if (gauntletError || !gauntlet) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}`,
      "Gauntlet not found"
    );
  }

  // Check if user is club owner or member
  if (gauntlet.club.owner_id !== profile.id) {
    // Check if user is at least a member
    const { data: membership, error: membershipError } = await supabase
      .from("club_membership")
      .select("*")
      .eq("club_id", gauntlet.club_id)
      .eq("user_id", profile.id)
      .single();

    if (membershipError || !membership) {
      return encodedRedirect(
        "error",
        `/protected/clubs/${clubId}`,
        "You must be a member of this club to create a session"
      );
    }
  }

  // Check if gauntlet is active
  if (gauntlet.status !== "active") {
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}`,
      "Cannot create sessions for archived or completed gauntlets"
    );
  }

  // Insert the new session
  const { data: session, error: sessionError } = await supabase
    .from("session")
    .insert([
      {
        gauntlet_id: gauntletId,
        theme,
        phase,
        submission_deadline: submissionDeadline,
        voting_deadlind: votingDeadline, // Note: There's a typo in the schema column name
      },
    ])
    .select()
    .single();

  if (sessionError) {
    console.error("Error creating session:", sessionError);
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/new`,
      "Failed to create session: " + sessionError.message
    );
  }

  // Update the gauntlet's current session count
  const { error: updateError } = await supabase
    .from("gauntlet")
    .update({
      current_session: gauntlet.current_session ? gauntlet.current_session + 1 : 1,
    })
    .eq("id", gauntletId);

  if (updateError) {
    console.error("Error updating gauntlet session count:", updateError);
    // We'll continue even if this fails since the session was created
  }

  return encodedRedirect(
    "success",
    `/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${session.id}`,
    "Session created successfully!"
  );
};

/**
 * Get sessions for a gauntlet
 */
export const getGauntletSessions = async (gauntletId: number) => {
  const user = await getUser();
  if (!user) {
    return { sessions: [], error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get user profile
  let { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  if (profileError || !profile) {
    return { sessions: [], error: "User profile not found" };
  }

  // Get the gauntlet to check access permissions
  const { data: gauntlet, error: gauntletError } = await supabase
    .from("gauntlet")
    .select("*, club:club_id(*)")
    .eq("id", gauntletId)
    .single();

  if (gauntletError || !gauntlet) {
    return { sessions: [], error: "Gauntlet not found" };
  }

  // Check if user has access (is member of the club)
  const { data: membership, error: membershipError } = await supabase
    .from("club_membership")
    .select("*")
    .eq("club_id", gauntlet.club_id)
    .eq("user_id", profile.id)
    .single();

  // If not a member, check if club is public
  if (membershipError || !membership) {
    if (gauntlet.club.is_private) {
      return { sessions: [], error: "You don't have access to this gauntlet" };
    }
  }

  // Get all sessions for the gauntlet
  const { data: sessions, error: sessionsError } = await supabase
    .from("session")
    .select(`
      *,
      submissions:submission(
        count
      )
    `)
    .eq("gauntlet_id", gauntletId)
    .order("created_at", { ascending: false });

  if (sessionsError) {
    return { sessions: [], error: sessionsError.message };
  }

  return { sessions, error: null };
};

/**
 * Get a specific session by ID
 */
export const getSessionById = async (sessionId: number) => {
  const user = await getUser();
  if (!user) {
    return { session: null, gauntlet: null, userSubmission: null, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get the session with gauntlet, club, and submissions info
  const { data: session, error: sessionError } = await supabase
    .from("session")
    .select(`
      *,
      gauntlet:gauntlet_id(*, club:club_id(*)),
      submissions:submission(*)
    `)
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { 
      session: null, 
      gauntlet: null, 
      userSubmission: null, 
      error: sessionError?.message || "Session not found" 
    };
  }

  // Get user profile
  let { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  if (profileError || !profile) {
    return { 
      session: null, 
      gauntlet: null, 
      userSubmission: null, 
      error: "User profile not found"
    };
  }

  // Check club membership for access
  const { data: membership, error: membershipError } = await supabase
    .from("club_membership")
    .select("*")
    .eq("club_id", session.gauntlet.club_id)
    .eq("user_id", profile.id)
    .single();

  // If not a member, check if club is public
  if (membershipError || !membership) {
    // Get club info to check if it's private
    const { data: club, error: clubError } = await supabase
      .from("club")
      .select("*")
      .eq("id", session.gauntlet.club_id)
      .single();

    if (clubError || !club || club.is_private) {
      return { 
        session: null, 
        gauntlet: null, 
        userSubmission: null, 
        error: "You don't have access to this session" 
      };
    }
  }

  // Check if user has already submitted to this session
  const { data: userSubmission, error: submissionError } = await supabase
    .from("submission")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", profile.id)
    .maybeSingle();

  // Check if user is the club owner (for UI permissions)
  const isOwner = session.gauntlet.club.owner_id === profile.id;

  return { 
    session, 
    gauntlet: session.gauntlet, 
    userSubmission, 
    isOwner, 
    profile,
    error: null 
  };
};

/**
 * Get submissions for a session
 */
export const getSessionSubmissions = async (sessionId: number) => {
  const user = await getUser();
  if (!user) {
    return { submissions: [], error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get the session
  const { data: session, error: sessionError } = await supabase
    .from("session")
    .select("*, gauntlet:gauntlet_id(*)")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { submissions: [], error: "Session not found" };
  }

  // Get user profile
  let { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  if (profileError || !profile) {
    return { submissions: [], error: "User profile not found" };
  }

  // Check club membership for access
  const { data: membership, error: membershipError } = await supabase
    .from("club_membership")
    .select("*")
    .eq("club_id", session.gauntlet.club_id)
    .eq("user_id", profile.id)
    .single();

  // If not a member, check if club is public
  if (membershipError || !membership) {
    // Get club info to check if it's private
    const { data: club, error: clubError } = await supabase
      .from("club")
      .select("*")
      .eq("id", session.gauntlet.club_id)
      .single();

    if (clubError || !club || club.is_private) {
      return { submissions: [], error: "You don't have access to this session" };
    }
  }

  // Get all submissions for the session with user profiles
  const { data: submissions, error: submissionsError } = await supabase
    .from("submission")
    .select(`
      *,
      profile:user_id(id, username, email)
    `)
    .eq("session_id", sessionId);

  if (submissionsError) {
    return { submissions: [], error: submissionsError.message };
  }

  return { submissions, error: null };
};