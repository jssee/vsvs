"use client";

import Link from "next/link";
import { Button } from "$/components/ui/button";

type Gauntlet = {
  id: number;
  name: string;
  description: string | null;
  status: string | null;
  session_count: number | null;
  current_session: number | null;
};

interface GauntletsListProps {
  gauntlets: Gauntlet[];
  clubId: number;
  isOwner: boolean;
}

export default function GauntletsList({
  gauntlets,
  clubId,
  isOwner,
}: GauntletsListProps) {
  // Helper function to determine the status badge color
  const getStatusBadgeClass = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (gauntlets.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No gauntlets found</p>
        {isOwner && (
          <Link href={`/protected/clubs/${clubId}/gauntlets/new`}>
            <Button>Create First Gauntlet</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {gauntlets.map((gauntlet) => (
        <Link
          key={gauntlet.id}
          href={`/protected/clubs/${clubId}/gauntlets/${gauntlet.id}`}
          className="block"
        >
          <div className="border rounded-md p-4 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-base mb-1">{gauntlet.name}</h3>
                {gauntlet.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {gauntlet.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span
                    className={`px-2 py-1 rounded-full capitalize ${getStatusBadgeClass(
                      gauntlet.status
                    )}`}
                  >
                    {gauntlet.status || "Draft"}
                  </span>
                  {gauntlet.session_count !== null && (
                    <span>
                      {gauntlet.current_session} / {gauntlet.session_count} Sessions
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}