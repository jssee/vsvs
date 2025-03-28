import { getGauntletById } from "$/actions/gauntlet";
import { getGauntletSessions } from "$/actions/session";
import { Button } from "$/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import GauntletActions from "./gauntlet-actions";
import SessionsList from "./sessions-list";

export default async function GauntletDetailPage({
  params,
}: {
  params: Promise<{ id: string; gauntletId: string }>;
}) {
  // Await the params object before accessing its properties
  const { id, gauntletId } = await params;
  const clubId = parseInt(id);
  const gId = parseInt(gauntletId);
  
  if (isNaN(clubId) || isNaN(gId)) {
    notFound();
  }

  const { gauntlet, isOwner, error } = await getGauntletById(gId);
  const { sessions, error: sessionsError } = await getGauntletSessions(gId);

  if (error || !gauntlet) {
    notFound();
  }

  // Get club from the nested relation
  const club = gauntlet.club;

  // Format status for display
  const statusDisplay = gauntlet.status ? gauntlet.status.charAt(0).toUpperCase() + gauntlet.status.slice(1) : 'Active';
  
  // Get status class for badge
  const getStatusClass = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statusClass = getStatusClass(gauntlet.status);

  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{gauntlet.name}</h1>
            <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusClass}`}>
              {statusDisplay}
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            {club.name}
          </p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <GauntletActions gauntlet={gauntlet} clubId={clubId} />
          )}
          <Link href={`/protected/clubs/${clubId}`}>
            <Button variant="outline">Back to Club</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-3">About</h2>
            <p className="text-gray-700">
              {gauntlet.description || "No description available."}
            </p>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Sessions</h2>
              {isOwner && gauntlet.status === 'active' && (
                <Link href={`/protected/clubs/${clubId}/gauntlets/${gauntlet.id}/sessions/new`}>
                  <Button size="sm">Add Session</Button>
                </Link>
              )}
            </div>

            {sessions && sessions.length > 0 ? (
              <SessionsList sessions={sessions} clubId={clubId} gauntletId={gauntlet.id} />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No sessions have been created yet</p>
                {isOwner && gauntlet.status === 'active' && (
                  <Link href={`/protected/clubs/${clubId}/gauntlets/${gauntlet.id}/sessions/new`}>
                    <Button>Create First Session</Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 h-fit">
          <h2 className="text-lg font-semibold mb-4">Settings</h2>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Max votes per person:</span>
              <span className="font-medium">{gauntlet.max_votes || 3}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Min votes per person:</span>
              <span className="font-medium">{gauntlet.min_votes || 1}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Points per session:</span>
              <span className="font-medium">{gauntlet.points_per_session || 10}</span>
            </div>
            {isOwner && gauntlet.status === 'active' && (
              <div className="pt-4">
                <Link href={`/protected/clubs/${clubId}/gauntlets/${gauntlet.id}/edit`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Edit Settings
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}