import { createGauntlet } from "$/actions/gauntlet";
import { getClubById } from "$/actions/club";
import { Button } from "$/components/ui/button";
import { Input } from "$/components/ui/input";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Separator } from "$/components/ui/separator";

export default async function NewGauntletPage({
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

  // Get the club to verify it exists and user has access
  const { club, error } = await getClubById(clubId);
  
  if (error || !club) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Gauntlet</h1>
        <p className="text-gray-500 mt-1">
          Create a new gauntlet for {club.name}
        </p>
      </div>

      <div className="max-w-2xl w-full">
        <form action={createGauntlet} className="space-y-6">
          <input type="hidden" name="clubId" value={clubId} />

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium">
              Gauntlet Name *
            </label>
            <Input
              id="name"
              name="name"
              placeholder="Enter gauntlet name"
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe your gauntlet"
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <label htmlFor="sessionCount" className="block text-sm font-medium">
              Number of Sessions
            </label>
            <Input
              id="sessionCount"
              name="sessionCount"
              type="number"
              min="0"
              placeholder="Leave empty to decide later"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              You can leave this empty and add sessions later
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="maxVotes" className="block text-sm font-medium">
                Max Votes Per Person
              </label>
              <Input
                id="maxVotes"
                name="maxVotes"
                type="number"
                defaultValue="3"
                min="1"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="minVotes" className="block text-sm font-medium">
                Min Votes Per Person
              </label>
              <Input
                id="minVotes"
                name="minVotes"
                type="number"
                defaultValue="1"
                min="0"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="pointsPerSession"
                className="block text-sm font-medium"
              >
                Points Per Session
              </label>
              <Input
                id="pointsPerSession"
                name="pointsPerSession"
                type="number"
                defaultValue="10"
                min="1"
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <Button type="submit">Create Gauntlet</Button>
            <Link href={`/protected/clubs/${clubId}`}>
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}