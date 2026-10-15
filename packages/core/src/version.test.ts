import { describe, expect, it } from "vitest";
import { isOutdated } from "./version";

describe("isOutdated", () => {
  it("forces only when major.minor is behind", () => {
    expect(isOutdated("1.0.4", "1.1")).toBe(true);
    expect(isOutdated("1.9.0", "2.0")).toBe(true);
    expect(isOutdated("1.1.0", "1.1")).toBe(false);
    expect(isOutdated("2.0.0", "1.1")).toBe(false);
  });

  it("ignores patch releases", () => {
    expect(isOutdated("1.0.0", "1.0.1")).toBe(false);
  });

  it("never blocks on missing or malformed input", () => {
    expect(isOutdated("1.0.0", null)).toBe(false);
    expect(isOutdated(undefined, "1.1")).toBe(false);
    expect(isOutdated("1.0.0", "")).toBe(false);
    expect(isOutdated("1.0.0", "next")).toBe(false);
  });
});
