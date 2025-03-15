import { describe, it, expect, vi } from "vitest";
import { signInWithMagicLink, signUpAction } from "$/actions/auth";

// Mock auth actions
vi.mock("../app/actions/auth", () => ({
  signInWithMagicLink: vi.fn().mockResolvedValue(undefined),
  signUpAction: vi.fn().mockResolvedValue(undefined),
}));

describe("Auth Actions", () => {
  it("signInWithMagicLink should be defined", () => {
    expect(signInWithMagicLink).toBeDefined();
  });

  it("signUpAction should be defined", () => {
    expect(signUpAction).toBeDefined();
  });
});
