import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Stub for future Spotify integration; currently no-op.
export const generateSessionPlaylist = internalMutation({
  args: { sessionId: v.id("vsSessions") },
  returns: v.null(),
  handler: async () => {
    return null;
  },
});

