"use server";

import { createClient } from "$/utils/supabase/server";
import { getUser } from "./auth";
import crypto from "crypto";
import { encodedRedirect } from "$/utils/utils";

/**
 * Creates a new club for an authenticated user
 */
export const createClub = async (formData: FormData) => {
  // Get authenticated user
  const user = await getUser();
  if (!user) {
    return encodedRedirect("error", "/signin", "You must be logged in to create a club");
  }

  // Extract club data from form
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString();
  const isPrivate = formData.get("isPrivate") === "true";
  const maxParticipants = Number(formData.get("maxParticipants") || 50);

  // Validate inputs
  if (!name) {
    return encodedRedirect("error", "/protected/clubs/new", "Club name is required");
  }

  // Initialize Supabase client
  const supabase = await createClient();

  // First, check if the user has a profile record
  let { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  // If profile doesn't exist, create one
  if (profileError || !profile) {
    const { data: newProfile, error: createProfileError } = await supabase
      .from("profile")
      .insert([
        {
          email: user.email,
          username: user.email?.split('@')[0] || `user-${crypto.randomUUID().slice(0, 8)}`,
        },
      ])
      .select()
      .single();

    if (createProfileError) {
      console.error("Error creating profile:", createProfileError);
      return encodedRedirect(
        "error",
        "/protected/clubs/new",
        "Failed to create user profile"
      );
    }

    profile = newProfile;
  }

  // Generate an invite link using crypto
  const inviteLink = crypto.randomUUID();

  // Insert the new club
  const { data: club, error } = await supabase
    .from("club")
    .insert([
      {
        name,
        description,
        is_private: isPrivate,
        max_participants: maxParticipants,
        owner_id: profile.id,
        invite_link: inviteLink,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating club:", error);
    return encodedRedirect(
      "error",
      "/protected/clubs/new",
      "Failed to create club: " + error.message
    );
  }

  // Create a club membership for the owner
  const { error: membershipError } = await supabase
    .from("club_membership")
    .insert([
      {
        user_id: profile.id,
        club_id: club.id,
      },
    ]);

  if (membershipError) {
    console.error("Error creating membership:", membershipError);
    // Even if membership creation fails, the club was created
  }

  return encodedRedirect(
    "success",
    `/protected/clubs/${club.id}`,
    "Club created successfully!"
  );
};

/**
 * Gets clubs where the current user is a member
 */
export const getUserClubs = async () => {
  const user = await getUser();
  if (!user) {
    return { clubs: [], error: "Not authenticated" };
  }

  const supabase = await createClient();

  // First get the user's profile
  let { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  if (profileError || !profile) {
    return { clubs: [], error: "User profile not found" };
  }

  // Get clubs where user is a member
  const { data: memberships, error: membershipError } = await supabase
    .from("club_membership")
    .select("club_id")
    .eq("user_id", profile.id);

  if (membershipError || !memberships || memberships.length === 0) {
    return { clubs: [], error: membershipError?.message };
  }

  const clubIds = memberships.map((m) => m.club_id);

  // Get club details
  const { data: clubs, error: clubsError } = await supabase
    .from("club")
    .select("*")
    .in("id", clubIds);

  if (clubsError) {
    return { clubs: [], error: clubsError.message };
  }

  return { clubs, error: null };
};

/**
 * Gets a specific club by ID
 */
export const getClubById = async (clubId: number) => {
  const supabase = await createClient();

  // Get the club details
  const { data: club, error: clubError } = await supabase
    .from("club")
    .select("*")
    .eq("id", clubId)
    .single();

  if (clubError) {
    return { club: null, members: [], error: clubError.message };
  }

  // Get club members with their profiles
  const { data: memberships, error: membershipError } = await supabase
    .from("club_membership")
    .select(`
      user_id,
      joined_at,
      profile:user_id (
        id,
        username,
        email
      )
    `)
    .eq("club_id", clubId);

  if (membershipError) {
    return { club, members: [], error: membershipError.message };
  }

  return { club, members: memberships, error: null };
};

/**
 * Joins a club using an invite link
 */
export const joinClubByInviteLink = async (inviteLink: string) => {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "You must be logged in to join a club" };
  }

  const supabase = await createClient();

  // Find the club with this invite link
  const { data: club, error: clubError } = await supabase
    .from("club")
    .select("*")
    .eq("invite_link", inviteLink)
    .single();

  if (clubError || !club) {
    return { 
      success: false, 
      error: "Invalid or expired invite link" 
    };
  }

  // Get user profile
  let { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("email", user.email)
    .single();

  if (profileError || !profile) {
    // Create profile if it doesn't exist
    const { data: newProfile, error: createProfileError } = await supabase
      .from("profile")
      .insert([
        {
          email: user.email,
          username: user.email?.split('@')[0] || `user-${crypto.randomUUID().slice(0, 8)}`,
        },
      ])
      .select()
      .single();

    if (createProfileError) {
      return { 
        success: false, 
        error: "Failed to create user profile" 
      };
    }

    profile = newProfile;
  }

  // Check if user is already a member
  const { data: existingMembership, error: membershipCheckError } = await supabase
    .from("club_membership")
    .select("*")
    .eq("user_id", profile.id)
    .eq("club_id", club.id)
    .single();

  if (existingMembership) {
    return { success: true, clubId: club.id, error: "You are already a member of this club" };
  }

  // Create membership
  const { error: membershipError } = await supabase
    .from("club_membership")
    .insert([
      {
        user_id: profile.id,
        club_id: club.id,
      },
    ]);

  if (membershipError) {
    return { 
      success: false, 
      error: "Failed to join club" 
    };
  }

  return { 
    success: true, 
    clubId: club.id, 
    error: null 
  };
};
