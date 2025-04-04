"use client";

import { Button } from "$/components/ui/button";
import { generateSessionPlaylist } from "$/actions/spotify";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface GeneratePlaylistButtonProps {
  sessionId: number;
  gauntletId: number;
  clubId: number;
  submissionCount: number;
  disabled?: boolean;
}

export default function GeneratePlaylistButton({
  sessionId,
  gauntletId,
  clubId,
  submissionCount,
  disabled
}: GeneratePlaylistButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleGeneratePlaylist = async () => {
    setIsLoading(true);
    setMessage(null);
    setPlaylistUrl(null);
    
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId.toString());
      formData.append("gauntletId", gauntletId.toString());
      formData.append("clubId", clubId.toString());
      
      const result = await generateSessionPlaylist(formData);
      
      if (result.success) {
        setMessage(result.message);
        if (result.playlistUrl) {
          setPlaylistUrl(result.playlistUrl);
        }
        
        // Refresh the page to show any updates
        router.refresh();
      } else {
        setMessage(result.message || "Failed to create playlist");
      }
    } catch (error) {
      console.error("Error generating playlist:", error);
      setMessage("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-4"
        onClick={handleGeneratePlaylist}
        disabled={disabled || isLoading || submissionCount === 0}
      >
        {isLoading ? "Creating..." : "Generate Spotify Playlist"}
      </Button>
      
      {message && (
        <div className={`text-sm p-2 rounded ${playlistUrl ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
          {message}
          {playlistUrl && (
            <div className="mt-1">
              <a 
                href={playlistUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Open Playlist
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}