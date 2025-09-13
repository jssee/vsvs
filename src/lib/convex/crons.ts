import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for phase transitions every minute
crons.interval(
  "check phase transitions",
  { minutes: 1 },
  internal.phase_transitions.checkPhaseTransitions,
  {},
);

export default crons;
