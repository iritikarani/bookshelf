/** Username rules, shared by the sign-up form, the Google first-visit prompt and Settings. Mirrors the database check. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_.]{2,19}$/;

export const normalizeUsername = (raw: string) => raw.trim().replace(/^@/, "").toLowerCase();

/** Why a username isn't allowed, or null when it's fine. */
export function usernameProblem(raw: string): string | null {
  const name = normalizeUsername(raw);
  if (name.length < 3) return "At least 3 characters.";
  if (name.length > 20) return "20 characters at most.";
  if (!/^[a-z0-9]/.test(name)) return "Start with a letter or number.";
  if (!USERNAME_PATTERN.test(name)) return "Only letters, numbers, “_” and “.”.";
  return null;
}
