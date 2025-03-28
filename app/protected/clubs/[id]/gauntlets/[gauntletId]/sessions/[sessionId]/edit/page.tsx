import { getSessionById } from "$/actions/session";
import { Button } from "$/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditSessionPage({
  params,
}: {
  params: { id: string; gauntletId: string; sessionId: string };
}) {
  // Await the params object before accessing its properties
  const { id, gauntletId, sessionId } = await params;
  const clubId = parseInt(id);
  const gId = parseInt(gauntletId);
  const sId = parseInt(sessionId);
  
  if (isNaN(clubId) || isNaN(gId) || isNaN(sId)) {
    notFound();
  }

  const { session, gauntlet, isOwner, error } = await getSessionById(sId);

  if (error || !session || !gauntlet || !isOwner) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Session</h1>
        <p className="text-gray-500 mt-1">
          Modify settings for {session.theme}
        </p>
      </div>

      <div className="max-w-2xl w-full bg-white border rounded-lg p-8">
        <div className="text-center py-8">
          <h2 className="text-xl font-medium mb-4">Session Editing Coming Soon</h2>
          <p className="text-gray-500 mb-6">
            This feature is still in development. You'll be able to edit session settings in the future.
          </p>
          <Link href={`/protected/clubs/${clubId}/gauntlets/${gauntlet.id}/sessions/${session.id}`}>
            <Button>Back to Session</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}