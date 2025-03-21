import { getUserClubs } from "$/actions/club";
import { Button } from "$/components/ui/button";
import Link from "next/link";

export default async function ClubsPage() {
  const { clubs, error } = await getUserClubs();

  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Clubs</h1>
        <Link href="/protected/clubs/new">
          <Button>Create New Club</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {clubs.length === 0 ? (
        <div className="text-center py-10">
          <h2 className="text-xl font-medium mb-2">You don&apos;t have any clubs yet</h2>
          <p className="text-gray-500 mb-6">Create a new club or join one with an invite link</p>
          <div className="flex justify-center gap-4">
            <Link href="/protected/clubs/new">
              <Button>Create Club</Button>
            </Link>
            <Link href="/protected/clubs/join">
              <Button variant="outline">Join Club</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <Link 
              key={club.id} 
              href={`/protected/clubs/${club.id}`}
              className="block"
            >
              <div className="bg-white border rounded-lg overflow-hidden h-full transition-all hover:shadow-md">
                <div className="p-5">
                  <h3 className="text-lg font-semibold mb-2">{club.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {club.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100">
                      {club.is_private ? "Private" : "Public"}
                    </span>
                    <span className="text-xs text-gray-500">
                      Max Members: {club.max_participants}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}