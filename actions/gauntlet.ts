"use server";

import { createClient } from "$/utils/supabase/server";
import { getUser } from "./auth";
import { encodedRedirect } from "$/utils/utils";

/**
 * Create a new gauntlet for a club
 */
export const createGauntlet = async (formData: FormData) => {
  // Get authenticated user
  const user = await getUser();
  if (!user) {
    return encodedRedirect("error", "/signin", "You must be logged in to create a gauntlet");
  }

  // Extract gauntlet data from form
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString();
  const clubId = parseInt(formData.get("clubId")?.toString() || "0");
  const sessionCount = parseInt(formData.get("sessionCount")?.toString() || "0");
  const maxVotes = parseInt(formData.get("maxVotes")?.toString() || "3");
  const minVotes = parseInt(formData.get("minVotes")?.toString() || "1");
  const pointsPerSession = parseInt(formData.get("pointsPerSession")?.toString() || "10");

  // Validate inputs
  if (!name) {
    return encodedRedirect("error", `/protected/clubs/${clubId}/gauntlets/new`, "Gauntlet name is required");
  }

  if (!clubId) {
    return encodedRedirect("error", `/protected/clubs`, "Club ID is required");
  }

  // Initialize Supabase client
  const supabase = await createClient();

  // Check if user is a member/owner of the club
  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  if (profileError || !profile) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}`,
      "User profile not found"
    );
  }

  // Check if club exists and user has access
  const { data: club, error: clubError } = await supabase
    .from("club")
    .select("*")
    .eq("id", clubId)
    .single();

  if (clubError || !club) {
    return encodedRedirect(
      "error",
      "/protected/clubs",
      "Club not found"
    );
  }

  // Check if user is club owner
  if (club.owner_id !== profile.id) {
    // Check if user is at least a member
    const { data: membership, error: membershipError } = await supabase
      .from("club_membership")
      .select("*")
      .eq("club_id", clubId)
      .eq("user_id", profile.id)
      .single();

    if (membershipError || !membership) {
      return encodedRedirect(
        "error",
        `/protected/clubs/${clubId}`,
        "You must be a member of this club to create a gauntlet"
      );
    }
  }

  // Insert the new gauntlet
  const { data: gauntlet, error } = await supabase
    .from("gauntlet")
    .insert([
      {
        name,
        description,
        club_id: clubId,
        status: "active",
        session_count: sessionCount || null,
        current_session: 0,
        max_votes: maxVotes,
        min_votes: minVotes,
        points_per_session: pointsPerSession,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating gauntlet:", error);
    return encodedRedirect(
      "error",
      `/protected/clubs/${clubId}/gauntlets/new`,
      "Failed to create gauntlet: " + error.message
    );
  }

  return encodedRedirect(
    "success",
    `/protected/clubs/${clubId}/gauntlets/${gauntlet.id}`,
    "Gauntlet created successfully!"
  );
};

/**
 * Get all gauntlets for a club
 */
export const getClubGauntlets = async (clubId: number) => {
  const user = await getUser();
  if (!user) {
    return { gauntlets: [], error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Check if user is a member of the club
  let { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  if (profileError || !profile) {
    return { gauntlets: [], error: "User profile not found" };
  }

  // Check membership
  const { data: membership, error: membershipError } = await supabase
    .from("club_membership")
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", profile.id)
    .single();

  if (membershipError || !membership) {
    // If not a member, check if the club is public
    const { data: club, error: clubError } = await supabase
      .from("club")
      .select("*")
      .eq("id", clubId)
      .single();

    if (clubError || !club || club.is_private) {
      return { gauntlets: [], error: "You don't have access to this club" };
    }
  }

  // Get all gauntlets for the club
  const { data: gauntlets, error: gauntletsError } = await supabase
    .from("gauntlet")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (gauntletsError) {
    return { gauntlets: [], error: gauntletsError.message };
  }

  return { gauntlets, error: null };
};

/**
 * Get a specific gauntlet by ID
 */
export const getGauntletById = async (gauntletId: number) => {
  const user = await getUser();
  if (!user) {
    return { gauntlet: null, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get the gauntlet
  const { data: gauntlet, error: gauntletError } = await supabase
    .from("gauntlet")
    .select("*, club:club_id(*)")
    .eq("id", gauntletId)
    .single();

  if (gauntletError || !gauntlet) {
    return { gauntlet: null, error: gauntletError?.message || "Gauntlet not found" };
  }

  // Check if user has access (is member of the club)
  let { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  if (profileError || !profile) {
    return { gauntlet: null, error: "User profile not found" };
  }

  // Check club membership
  const { data: membership, error: membershipError } = await supabase
    .from("club_membership")
    .select("*")
    .eq("club_id", gauntlet.club_id)
    .eq("user_id", profile.id)
    .single();

  // If not a member, check if club is public
  if (membershipError || !membership) {
    if (gauntlet.club.is_private) {
      return { gauntlet: null, error: "You don't have access to this gauntlet" };
    }
  }

  // Check if user is the club owner (for UI permissions)
  const isOwner = gauntlet.club.owner_id === profile.id;

  return { gauntlet, isOwner, error: null };
};

/**
 * Archive a gauntlet
 */
export const archiveGauntlet = async (formData: FormData) => {
  const user = await getUser();
  if (!user) {
    return encodedRedirect("error", "/signin", "You must be logged in to archive a gauntlet");
  }

  const gauntletId = parseInt(formData.get("gauntletId")?.toString() || "0");
  if (!gauntletId) {
    return encodedRedirect("error", "/protected/clubs", "Gauntlet ID is required");
  }

  const supabase = await createClient();

  // Get the gauntlet and associated club
  const { data: gauntlet, error: gauntletError } = await supabase
    .from("gauntlet")
    .select("*, club:club_id(*)")
    .eq("id", gauntletId)
    .single();

  if (gauntletError || !gauntlet) {
    return encodedRedirect(
      "error",
      "/protected/clubs",
      "Gauntlet not found"
    );
  }

  // Get user profile
  let { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  if (profileError || !profile) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${gauntlet.club_id}`,
      "User profile not found"
    );
  }

  // Check if user is club owner
  if (gauntlet.club.owner_id !== profile.id) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${gauntlet.club_id}/gauntlets/${gauntletId}`,
      "Only the club owner can archive gauntlets"
    );
  }

  // Update gauntlet status to archived
  const { error: updateError } = await supabase
    .from("gauntlet")
    .update({ status: "archived" })
    .eq("id", gauntletId);

  if (updateError) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${gauntlet.club_id}/gauntlets/${gauntletId}`,
      "Failed to archive gauntlet: " + updateError.message
    );
  }

  return encodedRedirect(
    "success",
    `/protected/clubs/${gauntlet.club_id}/gauntlets/${gauntletId}`,
    "Gauntlet archived successfully"
  );
};

/**
 * Delete a gauntlet
 */
export const deleteGauntlet = async (formData: FormData) => {
  const user = await getUser();
  if (!user) {
    return encodedRedirect("error", "/signin", "You must be logged in to delete a gauntlet");
  }

  const gauntletId = parseInt(formData.get("gauntletId")?.toString() || "0");
  if (!gauntletId) {
    return encodedRedirect("error", "/protected/clubs", "Gauntlet ID is required");
  }

  const supabase = await createClient();

  // Get the gauntlet and associated club
  const { data: gauntlet, error: gauntletError } = await supabase
    .from("gauntlet")
    .select("*, club:club_id(*)")
    .eq("id", gauntletId)
    .single();

  if (gauntletError || !gauntlet) {
    return encodedRedirect(
      "error",
      "/protected/clubs",
      "Gauntlet not found"
    );
  }

  // Get user profile
  let { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  if (profileError || !profile) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${gauntlet.club_id}`,
      "User profile not found"
    );
  }

  // Check if user is club owner
  if (gauntlet.club.owner_id !== profile.id) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${gauntlet.club_id}/gauntlets/${gauntletId}`,
      "Only the club owner can delete gauntlets"
    );
  }

  // Delete the gauntlet
  const { error: deleteError } = await supabase
    .from("gauntlet")
    .delete()
    .eq("id", gauntletId);

  if (deleteError) {
    return encodedRedirect(
      "error",
      `/protected/clubs/${gauntlet.club_id}/gauntlets/${gauntletId}`,
      "Failed to delete gauntlet: " + deleteError.message
    );
  }

  return encodedRedirect(
    "success",
    `/protected/clubs/${gauntlet.club_id}`,
    "Gauntlet deleted successfully"
  );
};