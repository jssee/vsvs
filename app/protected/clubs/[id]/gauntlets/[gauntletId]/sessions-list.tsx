"use client";

import Link from "next/link";
import { format } from "date-fns";

type Submission = {
  count: number;
};

type Session = {
  id: number;
  theme: string;
  phase: string | null;
  submission_deadline: string;
  voting_deadlind: string;
  created_at: string;
  submissions: Submission[];
};

interface SessionsListProps {
  sessions: Session[];
  clubId: number;
  gauntletId: number;
}

export default function SessionsList({
  sessions,
  clubId,
  gauntletId,
}: SessionsListProps) {
  // Helper function to determine the status badge color
  const getStatusBadgeClass = (phase: string | null) => {
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

  // Helper to determine if deadline is in the past
  const isPastDeadline = (dateStr: string) => {
    const deadline = new Date(dateStr);
    const now = new Date();
    return deadline < now;
  };

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        // Format dates
        const submissionDeadline = new Date(session.submission_deadline);
        const votingDeadline = new Date(session.voting_deadlind);
        
        // Determine current phase based on dates and phase field
        let currentPhase = session.phase || "submission";
        if (currentPhase === "submission" && isPastDeadline(session.submission_deadline)) {
          currentPhase = "voting";
        }
        if (currentPhase === "voting" && isPastDeadline(session.voting_deadlind)) {
          currentPhase = "completed";
        }
        
        return (
          <Link
            key={session.id}
            href={`/protected/clubs/${clubId}/gauntlets/${gauntletId}/sessions/${session.id}`}
            className="block"
          >
            <div className="border rounded-md p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-base mb-1">{session.theme}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <span
                      className={`px-2 py-1 rounded-full capitalize ${getStatusBadgeClass(
                        currentPhase
                      )}`}
                    >
                      {currentPhase}
                    </span>
                    <span>
                      {session.submissions?.[0]?.count || 0} submissions
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-4 text-xs text-gray-500">
                    <span>
                      Submit by: {format(submissionDeadline, "MMM d, yyyy")}
                    </span>
                    <span>
                      Vote by: {format(votingDeadline, "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}