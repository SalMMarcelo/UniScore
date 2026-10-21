// Mantenha esta lista sincronizada com isModerator() em firestore.rules.
// Atenção: as regras também exigem e-mail verificado (email_verified == true);
// esta checagem no cliente serve apenas para a UI e não substitui as regras.
export const ADMIN_EMAILS = ["admin@uniscore.com", "moderador@uniscore.com"];

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email);
}
