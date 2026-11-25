export const invitationStorageKey = "navar-pending-invitation";

// Parse invitation link
export function readInvitationLink(location, storage) {
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.slice(1));
  if (query.get("flow") === "supabase") {
    return {
      flow: "supabase",
      id: query.get("id"),
      token: query.get("token"),
      type: query.get("mode") === "recovery" ? "recovery" : "invite",
      role: query.get("role"),
      access_token: fragment.get("access_token"),
      refresh_token: fragment.get("refresh_token"),
      callback_error: fragment.get("error") || query.get("error"),
    };
  }
  if (fragment.get("token_hash")) return Object.fromEntries(fragment);
  try {
    return JSON.parse(storage.getItem(invitationStorageKey) || "null") || {};
  } catch {
    return {};
  }
}

// Verify invitation link
export async function verifyInvitationLink(auth, link) {
  if (link.callback_error)
    throw new Error(
      "This email link has expired or was already used. Request another email.",
    );
  if (!["invite", "magiclink", "recovery"].includes(link.type))
    throw new Error("This invitation link is incomplete.");

  if (link.flow === "supabase" && link.access_token && link.refresh_token) {
    const { error } = await auth.setSession({
      access_token: link.access_token,
      refresh_token: link.refresh_token,
    });
    if (error)
      throw new Error("This email session has expired. Request another email.");
  } else if (link.token_hash) {
    const { error } = await auth.verifyOtp({
      token_hash: link.token_hash,
      type: link.type,
    });
    if (error)
      throw new Error(
        "This link has expired or was already used. Request another email.",
      );
  } else if (!link.user_id) {
    // Do not reuse an existing session
    throw new Error(
      "The email did not return a valid session. Request a new email and check its confirmation link and redirect URL.",
    );
  }

  const { data, error } = await auth.getUser();
  if (error || !data?.user || (link.user_id && data.user.id !== link.user_id))
    throw new Error("Your session changed. Open a new invitation email.");
  return {
    id: link.id,
    token: link.token,
    type: link.type,
    role: link.role,
    user_id: data.user.id,
  };
}
