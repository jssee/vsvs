"use client";

import { useState } from "react";
import { Input } from "$/components/ui/input";
import { Button } from "$/components/ui/button";
import { submitTrack, deleteSubmission } from "$/actions/submission";
import { ConfirmationDialog } from "$/app/protected/clubs/components/confirmation-dialog";

interface SubmissionFormProps {
  sessionId: number;
  gauntletId: number;
  clubId: number;
  existingSubmission: any | null;
}

export default function SubmissionForm({
  sessionId,
  gauntletId,
  clubId,
  existingSubmission,
}: SubmissionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [trackId, setTrackId] = useState(existingSubmission?.track_id || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      await submitTrack(formData);
    } catch (error) {
      console.error("Error submitting track:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    const formData = new FormData();
    formData.append("submissionId", existingSubmission.id.toString());
    formData.append("sessionId", sessionId.toString());
    formData.append("gauntletId", gauntletId.toString());
    formData.append("clubId", clubId.toString());
    
    setIsLoading(true);
    try {
      await deleteSubmission(formData);
    } catch (error) {
      console.error("Error deleting submission:", error);
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  // Helper to extract Spotify track id from URL
  const getSpotifyIdFromUrl = (url: string) => {
    if (!url) return "";
    
    // If it's already just an ID
    if (/^[a-zA-Z0-9]{22}$/.test(url)) return url;
    
    // Try to extract from URL
    const match = url.match(/track\/([a-zA-Z0-9]{22})/);
    return match ? match[1] : url;
  };

  // Determine if this is an update or new submission
  const isUpdate = !!existingSubmission;
  
  // Get embedded Spotify player URL
  const spotifyId = getSpotifyIdFromUrl(trackId);
  const embedUrl = spotifyId ? 
    `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator` : 
    "";

  return (
    <div>
      {existingSubmission && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Your Current Submission:</h3>
          <div className="bg-gray-50 p-2 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">
                Submitted on {new Date(existingSubmission.created_at).toLocaleDateString()}
              </span>
              <Button 
                type="button" 
                variant="destructive" 
                size="sm"
                disabled={isLoading}
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete
              </Button>
            </div>
            {embedUrl && (
              <iframe
                src={embedUrl}
                width="100%"
                height="80"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-md"
              ></iframe>
            )}
          </div>
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="gauntletId" value={gauntletId} />
        <input type="hidden" name="clubId" value={clubId} />
        {existingSubmission && (
          <input type="hidden" name="submissionId" value={existingSubmission.id} />
        )}

        <div className="space-y-2">
          <label htmlFor="trackId" className="block text-sm font-medium">
            Spotify Track Link *
          </label>
          <Input
            id="trackId"
            name="trackId"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            placeholder="https://open.spotify.com/track/..."
            required
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            Enter a valid Spotify track URL or track ID
          </p>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Processing..." : isUpdate ? "Update Submission" : "Submit Track"}
        </Button>
      </form>
      
      {showDeleteDialog && (
        <ConfirmationDialog
          title="Delete Submission"
          message="Are you sure you want to delete your submission? This action cannot be undone."
          confirmText="Delete"
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          isDestructive
        />
      )}
    </div>
  );
}