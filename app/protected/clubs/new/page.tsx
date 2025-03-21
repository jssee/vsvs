import { createClub } from "$/actions/club";
import { Button } from "$/components/ui/button";
import { Input } from "$/components/ui/input";
import Link from "next/link";
import { Separator } from "$/components/ui/separator";

export default function NewClubPage() {
  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Club</h1>
        <p className="text-gray-500 mt-1">Start a new club and invite others to join</p>
      </div>

      <div className="max-w-2xl w-full">
        <form action={createClub} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium">
              Club Name *
            </label>
            <Input
              id="name"
              name="name"
              placeholder="Enter club name"
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
              placeholder="Describe your club"
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <label htmlFor="privacy" className="block text-sm font-medium">
              Privacy Settings
            </label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="public"
                  name="isPrivate"
                  value="false"
                  defaultChecked
                  className="h-4 w-4"
                />
                <label htmlFor="public" className="text-sm">
                  Public - Anyone with the link can join
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="private"
                  name="isPrivate"
                  value="true"
                  className="h-4 w-4"
                />
                <label htmlFor="private" className="text-sm">
                  Private - Only people you invite can join
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="maxParticipants" className="block text-sm font-medium">
              Maximum Participants
            </label>
            <Input
              id="maxParticipants"
              name="maxParticipants"
              type="number"
              defaultValue="50"
              min="2"
              max="1000"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Set a limit for how many people can join your club
            </p>
          </div>

          <div className="flex gap-4 pt-2">
            <Button type="submit">Create Club</Button>
            <Link href="/protected/clubs">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}