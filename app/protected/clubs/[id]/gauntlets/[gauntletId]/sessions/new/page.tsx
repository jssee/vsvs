import { getGauntletById } from "$/actions/gauntlet";
import { createSession } from "$/actions/session";
import { Button } from "$/components/ui/button";
import { Input } from "$/components/ui/input";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays, format } from "date-fns";

export default async function NewSessionPage({
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

  if (error || !gauntlet || !isOwner) {
    notFound();
  }

  // Default dates for submission and voting deadlines
  const defaultSubmissionDeadline = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const defaultVotingDeadline = format(addDays(new Date(), 14), "yyyy-MM-dd");

  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Session</h1>
        <p className="text-gray-500 mt-1">
          Add a new session to {gauntlet.name}
        </p>
      </div>

      <div className="max-w-2xl w-full">
        <form action={createSession} className="space-y-6">
          <input type="hidden" name="gauntletId" value={gauntlet.id} />
          <input type="hidden" name="clubId" value={clubId} />

          <div className="space-y-2">
            <label htmlFor="theme" className="block text-sm font-medium">
              Theme *
            </label>
            <Input
              id="theme"
              name="theme"
              placeholder="Enter a theme for this session"
              required
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              The theme sets the criteria for the music submissions
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="phase" className="block text-sm font-medium">
              Current Phase
            </label>
            <select
              id="phase"
              name="phase"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              defaultValue="submission"
            >
              <option value="submission">Submission</option>
              <option value="voting">Voting</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="submissionDeadline" className="block text-sm font-medium">
                Submission Deadline *
              </label>
              <Input
                id="submissionDeadline"
                name="submissionDeadline"
                type="date"
                defaultValue={defaultSubmissionDeadline}
                min={format(new Date(), "yyyy-MM-dd")}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="votingDeadline" className="block text-sm font-medium">
                Voting Deadline *
              </label>
              <Input
                id="votingDeadline"
                name="votingDeadline"
                type="date"
                defaultValue={defaultVotingDeadline}
                min={defaultSubmissionDeadline}
                required
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <Button type="submit">Create Session</Button>
            <Link href={`/protected/clubs/${clubId}/gauntlets/${gauntlet.id}`}>
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}