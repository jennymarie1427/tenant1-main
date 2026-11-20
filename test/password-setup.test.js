import test from "node:test";
import assert from "node:assert/strict";
import { finishPasswordSetup } from "../src/lib/finishPasswordSetup.js";
const link = {
  type: "invite",
  user_id: "tenant",
  id: "invitation",
  token: "membership",
};
function fixture() {
  const calls = [];
  const auth = {
    getUser: async () => ({ data: { user: { id: "tenant" } } }),
    updateUser: async () => {
      calls.push("password");
      return {};
    },
    signOut: async ({ scope }) => {
      assert.equal(scope, "local");
      calls.push("signout");
      return {};
    },
  };
  return {
    calls,
    auth,
    link,
    password: "a-new-password",
    accountAccess: async () => {
      calls.push("accept");
    },
    progress: {},
  };
}
test("invitation sets password, accepts membership, then signs out", async () => {
  const f = fixture();
  await finishPasswordSetup(f);
  assert.deepEqual(f.calls, ["password", "accept", "signout"]);
});
test("recovery changes password without consuming an invitation", async () => {
  const f = fixture();
  f.link = { ...link, type: "recovery" };
  await finishPasswordSetup(f);
  assert.deepEqual(f.calls, ["password", "signout"]);
});
test("failed acceptance retains session and retries without saving password again", async () => {
  const f = fixture();
  f.accountAccess = async () => {
    throw Error("offline");
  };
  await assert.rejects(finishPasswordSetup(f), /offline/);
  assert.deepEqual(f.calls, ["password"]);
  f.accountAccess = async () => f.calls.push("accept");
  await finishPasswordSetup(f);
  assert.deepEqual(f.calls, ["password", "accept", "signout"]);
});
test("changed identity cannot update a password or accept membership", async () => {
  const f = fixture();
  f.auth.getUser = async () => ({ data: { user: { id: "someone-else" } } });
  await assert.rejects(finishPasswordSetup(f), /session changed/);
  assert.deepEqual(f.calls, []);
});
test("password failure cannot accept invitation or sign out", async () => {
  const f = fixture();
  f.auth.updateUser = async () => ({ error: Error("rejected password") });
  await assert.rejects(finishPasswordSetup(f), /rejected password/);
  assert.deepEqual(f.calls, []);
});
