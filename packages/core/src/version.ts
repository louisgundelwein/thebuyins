/**
 * Force-update rule shared by server and app. Only major.minor counts: patch releases never
 * force anyone, so with `minimum` "1.1" every 1.0.x must update while 1.1.0 and up keep working.
 * A missing or malformed version never blocks, so a bad config can't lock everyone out.
 */
export function isOutdated(
  installed: string | undefined,
  minimum: string | null | undefined,
) {
  const a = installed?.split(".").map(Number);
  const b = minimum?.split(".").map(Number);
  if (!a || !b || [...a, ...b].some(Number.isNaN)) return false;
  const [aMajor = 0, aMinor = 0] = a;
  const [bMajor = 0, bMinor = 0] = b;
  return aMajor !== bMajor ? aMajor < bMajor : aMinor < bMinor;
}
