// Emails allowed to sign in. Everyone else is redirected back to /login?error=unauthorized.
export const ALLOWED_EMAILS: readonly string[] = [
  "john@johnegan.io",
];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}
