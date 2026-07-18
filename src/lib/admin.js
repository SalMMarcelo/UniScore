// Mantenha esta lista sincronizada com isModerator() em firestore.rules
export const ADMIN_EMAILS = ["admin@uniscore.com", "moderador@uniscore.com"];

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email);
}
