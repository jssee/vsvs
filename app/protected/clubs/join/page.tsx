"use client";

import { joinClubByInviteLink } from "$/actions/club";
import { Button } from "$/components/ui/button";
import { Input } from "$/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function JoinClubForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("code");
  const [inviteLink, setInviteLink] = useState(inviteCode || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If an invite code is provided in the URL, automatically try to join
  useEffect(() => {
    if (inviteCode) {
      handleJoin();
    }
  }, [inviteCode]);

  const handleJoin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await joinClubByInviteLink(inviteLink);
      
      if (result.success) {
        router.push(`/protected/clubs/${result.clubId}`);
      } else {
        setError(result.error || "Failed to join club");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Join a Club</h1>
        <p className="text-gray-500 mt-1">
          Enter an invite link to join an existing club
        </p>
      </div>

      <div className="max-w-md w-full mx-auto mt-8">
        <div className="bg-white rounded-lg border p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="inviteLink" className="block text-sm font-medium">
                Invite Code
              </label>
              <Input
                id="inviteLink"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="Paste invite code here"
                className="w-full"
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleJoin}
                disabled={isLoading || !inviteLink.trim()}
              >
                {isLoading ? "Joining..." : "Join Club"}
              </Button>
              <Link href="/protected/clubs">
                <Button variant="outline">Cancel</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JoinClubPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinClubForm />
    </Suspense>
  );
}