import { describe, it, expect } from "vitest";
import { decideSubmissionOrder } from "./submission-logic";

describe("decideSubmissionOrder", () => {
  it("allows first submission regardless of doubleSubmissions", () => {
    expect(decideSubmissionOrder(0, false)).toEqual({ ok: true, order: 1 });
    expect(decideSubmissionOrder(0, true)).toEqual({ ok: true, order: 1 });
  });

  it("allows second submission when doubleSubmissions is true", () => {
    expect(decideSubmissionOrder(1, true)).toEqual({ ok: true, order: 2 });
  });

  it("blocks second submission when doubleSubmissions is false", () => {
    expect(decideSubmissionOrder(1, false)).toEqual({
      ok: false,
      message: "You have already submitted a song for this stage",
    });
  });

  it("blocks when two or more submissions already exist", () => {
    expect(decideSubmissionOrder(2, true)).toEqual({
      ok: false,
      message: "You have already submitted the maximum number of songs",
    });
    expect(decideSubmissionOrder(3, false)).toEqual({
      ok: false,
      message: "You have already submitted the maximum number of songs",
    });
  });
});
