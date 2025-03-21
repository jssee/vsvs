"use client";

import { Button } from "$/components/ui/button";
import { useState } from "react";

export function CopyInviteButton({ inviteLink }: { inviteLink: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const baseUrl = window.location.origin;
    const fullLink = `${baseUrl}/protected/clubs/join?code=${inviteLink}`;
    navigator.clipboard.writeText(fullLink);
    
    setCopied(true);
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}