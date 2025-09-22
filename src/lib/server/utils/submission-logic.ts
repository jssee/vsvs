export type DecideOrderResult =
  | { ok: true; order: 1 | 2 }
  | { ok: false; message: string };

export function decideSubmissionOrder(
  existingCount: number,
  doubleSubmissions: boolean,
): DecideOrderResult {
  if (existingCount <= 0) return { ok: true, order: 1 };
  if (existingCount === 1 && doubleSubmissions) return { ok: true, order: 2 };
  if (existingCount === 1 && !doubleSubmissions)
    return {
      ok: false,
      message: "You have already submitted a song for this session",
    };
  return {
    ok: false,
    message: "You have already submitted the maximum number of songs",
  };
}
