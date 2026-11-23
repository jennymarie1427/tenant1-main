import test from "node:test";
import assert from "node:assert/strict";
import {
  readInvitationLink,
  verifyInvitationLink,
} from "../src/lib/invitationLink.js";
const storage = { getItem: () => null };
const user = { id: "recipient" };
test("reads membership query separately from Supabase session fragment", async () => {
  const link = readInvitationLink(
    {
      search: "?flow=supabase&id=i&token=membership",
      hash: "#access_token=access&refresh_token=refresh&type=invite",
    },
    storage,
  );
  let imported = false;
  const clean = await verifyInvitationLink(
    {
      async setSession(tokens) {
        assert.deepEqual(tokens, {
          access_token: "access",
          refresh_token: "refresh",
        });
        imported = true;
        return {};
      },
      async getUser() {
        assert.equal(imported, true);
        return { data: { user } };
      },
    },
    link,
  );
  assert.equal(clean.user_id, "recipient");
  assert.equal(clean.token, "membership");
  assert.equal("access_token" in clean, false);
  assert.equal("refresh_token" in clean, false);
});
test("incomplete callback cannot reuse an old administrator session", async () => {
  const link = readInvitationLink(
    { search: "?flow=supabase&id=i&token=t", hash: "" },
    storage,
  );
  await assert.rejects(
    () =>
      verifyInvitationLink(
        {
          getUser() {
            throw Error("must not use stale session");
          },
        },
        link,
      ),
    /did not return a valid session/,
  );
});
test("expired callback refuses even when a previous session exists", async () => {
  const link = readInvitationLink(
    { search: "?flow=supabase&id=i&token=t", hash: "#error=access_denied" },
    storage,
  );
  await assert.rejects(() => verifyInvitationLink({}, link), /expired/);
});
test("resume is bound to the verified recipient", async () => {
  const link = { type: "invite", id: "i", token: "t", user_id: "recipient" };
  const auth = {
    async getUser() {
      return { data: { user: { id: "someone-else" } } };
    },
  };
  await assert.rejects(
    () => verifyInvitationLink(auth, link),
    /session changed/,
  );
});
test("recovery callback preserves tenant destination without granting any role", async () => {
  const link = readInvitationLink(
    {
      search: "?flow=supabase&mode=recovery&role=tenant",
      hash: "#access_token=a&refresh_token=r",
    },
    storage,
  );
  const clean = await verifyInvitationLink(
    {
      async setSession() {
        return {};
      },
      async getUser() {
        return { data: { user } };
      },
    },
    link,
  );
  assert.equal(clean.type, "recovery");
  assert.equal(clean.role, "tenant");
  assert.equal(clean.id, null);
});
test("earlier token-hash links remain usable", async () => {
  const link = readInvitationLink(
    { search: "", hash: "#id=i&token=t&token_hash=h&type=invite" },
    storage,
  );
  let verified = false;
  await verifyInvitationLink(
    {
      async verifyOtp(args) {
        assert.equal(args.token_hash, "h");
        verified = true;
        return {};
      },
      async getUser() {
        return { data: { user } };
      },
    },
    link,
  );
  assert.equal(verified, true);
});
test("restores only membership state from session storage", () => {
  const link = readInvitationLink(
    { search: "", hash: "" },
    {
      getItem: () =>
        JSON.stringify({
          user_id: "recipient",
          id: "i",
          token: "t",
          type: "invite",
        }),
    },
  );
  assert.equal(link.user_id, "recipient");
});
