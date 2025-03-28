"use client";

import { Button } from "$/components/ui/button";
import { deleteSubmission } from "$/actions/submission";
import { useState } from "react";
import { ConfirmationDialog } from "$/app/protected/clubs/components/confirmation-dialog";

type Profile = {
  id: number;
  username: string;
  email: string;
};

type Submission = {
  id: number;
  track_id: string;
  user_id: number;
  created_at: string;
  profile: Profile;
};

interface SubmissionsListProps {
  submissions: Submission[];
  userProfileId?: number;
  currentPhase: string;
  clubId: number;
  gauntletId: number;
  sessionId: number;
}

export default function SubmissionsList({
  submissions,
  userProfileId,
  currentPhase,
  clubId,
  gauntletId,
  sessionId,
}: SubmissionsListProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to extract Spotify track id from URL
  const getSpotifyIdFromUrl = (url: string) => {
    if (!url) return "";
    
    // If it's already just an ID
    if (/^[a-zA-Z0-9]{22}$/.test(url)) return url;
    
    // Try to extract from URL
    const match = url.match(/track\/([a-zA-Z0-9]{22})/);
    return match ? match[1] : url;
  };

  const handleDelete = async () => {
    if (!submissionToDelete) return;
    
    const formData = new FormData();
    formData.append("submissionId", submissionToDelete.toString());
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
      setSubmissionToDelete(null);
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No submissions yet</p>
      </div>
    );
  }

  // For submission phase, only show user's own submission
  // For voting phase or completed, show all submissions
  const visibleSubmissions = currentPhase === "submission" 
    ? submissions.filter(sub => sub.profile.id === userProfileId)
    : submissions;
  
  if (visibleSubmissions.length === 0 && currentPhase === "submission") {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">Your submission will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {currentPhase === "submission" && (
        <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-md text-sm">
          During the submission phase, you can only see your own submissions. 
          All submissions will be visible when voting begins.
        </div>
      )}

      {visibleSubmissions.map((submission) => {
        const spotifyId = getSpotifyIdFromUrl(submission.track_id);
        const embedUrl = spotifyId ? 
          `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator` : 
          "";
        
        // Determine if this is the user's submission
        const isUserSubmission = submission.profile.id === userProfileId;
        
        // User can only delete their own submission during submission phase
        const canDelete = isUserSubmission && currentPhase === "submission";
        
        return (
          <div key={submission.id} className="border rounded-md p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-medium text-sm">
                  {submission.profile.username}
                  {isUserSubmission && " (You)"}
                </h3>
                <p className="text-xs text-gray-500">
                  Submitted on {new Date(submission.created_at).toLocaleDateString()}
                </p>
              </div>
              {canDelete && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    setSubmissionToDelete(submission.id);
                    setShowDeleteDialog(true);
                  }}
                >
                  Delete
                </Button>
              )}
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
        );
      })}
      
      {showDeleteDialog && (
        <ConfirmationDialog
          title="Delete Submission"
          message="Are you sure you want to delete your submission? This action cannot be undone."
          confirmText="Delete"
          onCancel={() => {
            setShowDeleteDialog(false);
            setSubmissionToDelete(null);
          }}
          onConfirm={handleDelete}
          isDestructive
        />
      )}
    </div>
  );
}