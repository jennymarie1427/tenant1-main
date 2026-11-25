import { verifyInvitationLink } from "./invitationLink.js";
// Set password for invited user
export async function finishPasswordSetup({
  auth,
  link,
  password,
  accountAccess,
  progress,
}) {
  const clean = await verifyInvitationLink(auth, link);
  if (!progress.passwordSaved) {
    const { error } = await auth.updateUser({ password });
    if (error) throw error;
    progress.passwordSaved = true;
  }
  if (clean.type !== "recovery" && !progress.accepted) {
    await accountAccess("accept", { id: clean.id, token: clean.token });
    progress.accepted = true;
  }
  const { error } = await auth.signOut({ scope: "local" });
  if (error) throw error;
}
