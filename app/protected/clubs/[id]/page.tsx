import { getClubById } from "$/actions/club";
import { getClubGauntlets } from "$/actions/gauntlet";
import { Button } from "$/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyInviteButton } from "../components/copy-invite-button";
import GauntletsList from "./gauntlets-list";

// Use any for now to get past build errors 
// We'll refine types in a future update
type ClubMembership = any;

export default async function ClubDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await the params object before accessing its properties
  const { id } = await params;
  const clubId = parseInt(id);
  if (isNaN(clubId)) {
    notFound();
  }

  const { club, members = [] as ClubMembership[], error } = await getClubById(clubId);
  const { gauntlets, error: gauntletsError } = await getClubGauntlets(clubId);

  if (error || !club) {
    notFound();
  }
  
  // Determine if current user is club owner
  // We'll use this to show/hide gauntlet creation button
  const isClubOwner = Array.isArray(members) && members.some(
    (member) => member.user_id === club.owner_id
  );

  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{club.name}</h1>
          <p className="text-gray-500 mt-1">
            {club.is_private ? "Private Club" : "Public Club"}
          </p>
        </div>
        <Link href="/protected/clubs">
          <Button variant="outline">Back to Clubs</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-3">About</h2>
            <p className="text-gray-700">
              {club.description || "No description available."}
            </p>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-3">Invite Link</h2>
            <div className="bg-gray-50 border rounded-md p-3 flex items-center justify-between mb-2">
              <code className="text-sm text-gray-800 truncate">
                {`${process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com'}/protected/clubs/join?code=${club.invite_link}`}
              </code>
              <CopyInviteButton inviteLink={club.invite_link} />
            </div>
            <p className="text-xs text-gray-500">
              Share this link with others to invite them to your club
            </p>
          </div>
          
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Gauntlets</h2>
              {isClubOwner && (
                <Link href={`/protected/clubs/${club.id}/gauntlets/new`}>
                  <Button size="sm">Create Gauntlet</Button>
                </Link>
              )}
            </div>
            
            <GauntletsList 
              gauntlets={gauntlets || []} 
              clubId={club.id} 
              isOwner={isClubOwner} 
            />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Members</h2>
            <span className="text-sm text-gray-500">
              {members.length}/{club.max_participants}
            </span>
          </div>
          <ul className="divide-y">
            {Array.isArray(members) && members.map((membership: ClubMembership) => {
              // Ensure profile exists and has the expected structure
              const profile = membership.profile || {};
              const username = profile && 'username' in profile ? profile.username : null;
              const email = profile && 'email' in profile ? profile.email : null;
              
              return (
                <li key={membership.user_id} className="py-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xs font-medium">
                        {username && typeof username === 'string' && username.length > 0 
                          ? username[0].toUpperCase() 
                          : "?"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {username || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {email || ""}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
            {(!Array.isArray(members) || members.length === 0) && (
              <li className="py-3 text-center text-gray-500 text-sm">
                No members yet
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}