// astro dev loads .env into import.meta.env; netlify dev puts the same values
// in process.env. The handlers read process.env, so bridge the gap here rather
// than teaching every handler about two env systems.
const BRIDGED = [
  "FAMILY_EDIT_PASSWORD",
  "FAMILY_EDIT_LOCAL",
  "FAMILY_EDIT_ROOT",
  "GITHUB_TOKEN",
  "ANTHROPIC_API_KEY",
] as const;

export function bridgeEnv(): void {
  for (const key of BRIDGED) {
    const value = (import.meta.env as Record<string, string | undefined>)[key];
    if (value !== undefined && value !== "" && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
