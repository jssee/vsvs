import { getSessionById, getSessionSubmissions } from "$/actions/session";
import { Button } from "$/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import SubmissionForm from "./submission-form";
import SubmissionsList from "./submissions-list";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; gauntletId: string; sessionId: string }>;
}) {
  // Await the params object before accessing its properties
  const { id, gauntletId, sessionId } = await params;
  const clubId = parseInt(id);
  const gId = parseInt(gauntletId);
  const sId = parseInt(sessionId);
  
  if (isNaN(clubId) || isNaN(gId) || isNaN(sId)) {
    notFound();
  }

  const { session, gauntlet, userSubmission, profile, isOwner, error } = await getSessionById(sId);
  const { submissions, error: submissionsError } = await getSessionSubmissions(sId);

  if (error || !session || !gauntlet) {
    notFound();
  }

  // Helper to determine if deadline is in the past
  const isPastDeadline = (dateStr: string) => {
    const deadline = new Date(dateStr);
    const now = new Date();
    return deadline < now;
  };

  // Determine current phase based on dates and phase field
  let currentPhase = session.phase || "submission";
  const submissionDeadlinePassed = isPastDeadline(session.submission_deadline);
  const votingDeadlinePassed = isPastDeadline(session.voting_deadlind);
  
  if (currentPhase === "submission" && submissionDeadlinePassed) {
    currentPhase = "voting";
  }
  if (currentPhase === "voting" && votingDeadlinePassed) {
    currentPhase = "completed";
  }

  // Format dates for display
  const formattedSubmissionDeadline = format(new Date(session.submission_deadline), "MMMM d, yyyy");
  const formattedVotingDeadline = format(new Date(session.voting_deadlind), "MMMM d, yyyy");

  // Get badge color based on phase
  const getStatusBadgeClass = (phase: string) => {
    switch (phase) {
      case "submission":
        return "bg-green-100 text-green-800";
      case "voting":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusClass = getStatusBadgeClass(currentPhase);

  // Check if user can submit (during submission phase and deadline not passed)
  const canSubmit = currentPhase === "submission" && !submissionDeadlinePassed;

  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{session.theme}</h1>
            <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusClass}`}>
              {currentPhase}
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            <Link href={`/protected/clubs/${clubId}/gauntlets/${gauntlet.id}`} className="hover:underline">
              {gauntlet.name}
            </Link>
          </p>
        </div>
        <Link href={`/protected/clubs/${clubId}/gauntlets/${gauntlet.id}`}>
          <Button variant="outline">Back to Gauntlet</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {canSubmit && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-3">Submit Your Track</h2>
              <SubmissionForm 
                clubId={clubId}
                gauntletId={gauntlet.id}
                sessionId={session.id} 
                existingSubmission={userSubmission}
              />
            </div>
          )}

          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Submissions</h2>
            <SubmissionsList 
              submissions={submissions || []} 
              userProfileId={profile?.id}
              currentPhase={currentPhase}
              clubId={clubId}
              gauntletId={gauntlet.id}
              sessionId={session.id}
            />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 h-fit">
          <h2 className="text-lg font-semibold mb-4">Session Details</h2>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Phase:</span>
              <span className={`px-2 py-0.5 rounded-full capitalize ${statusClass}`}>
                {currentPhase}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Submission Deadline:</span>
              <span className="font-medium">{formattedSubmissionDeadline}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Voting Deadline:</span>
              <span className="font-medium">{formattedVotingDeadline}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Submissions:</span>
              <span className="font-medium">{submissions?.length || 0}</span>
            </div>
            {isOwner && (
              <div className="pt-4">
                <Link href={`/protected/clubs/${clubId}/gauntlets/${gauntlet.id}/sessions/${session.id}/edit`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Edit Session
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