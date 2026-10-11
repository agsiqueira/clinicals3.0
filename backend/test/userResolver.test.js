const test = require("node:test");
const assert = require("node:assert/strict");
const existing = { id: "preserved-neon-id", clerkUserId: "user_A", email: "historical@example.test", name: "Existing synthetic learner" };
let created;
require.cache[require.resolve("../src/db/prisma")] = { exports: { user: {
  findUnique: async ({ where }) => where.clerkUserId === "user_A" ? existing : null,
  upsert: async args => { created = args; return { id: "synthetic-new-id", ...args.create }; },
} } };
require.cache[require.resolve("@clerk/express")] = { exports: { clerkClient: { users: { getUser: async subject => ({ id: subject, firstName: "Trusted", lastName: "Profile", imageUrl: "https://example.test/avatar", primaryEmailAddressId: "email_verified", emailAddresses: [{ id: "email_verified", emailAddress: "verified@example.test", verification: { status: "verified" } }, { id: "email_unverified", emailAddress: "unverified@example.test", verification: { status: "unverified" } }] }) } } } };
const { resolveAuthenticatedUser, getVerifiedContact } = require("../src/utils/userResolver");
function request(subject) { return { studentIdentity: { clerkUserId: subject }, header() { throw new Error("Client identity headers must never be read"); } }; }
test("existing Clerk-to-Neon mapping and progress identity are preserved without updating client profile metadata", async () => {
  assert.equal(await resolveAuthenticatedUser(request("user_A")), existing);
  assert.equal(created, undefined);
});
test("new learners use verified subject and server-sourced profile metadata", async () => {
  const learner = await resolveAuthenticatedUser(request("user_new"));
  assert.equal(learner.clerkUserId, "user_new");
  assert.equal(learner.email, "verified@example.test");
  assert.deepEqual(created.update, {});
});
test("transcript email uses verified Clerk contact rather than historical client-writable Neon email", async () => {
  assert.deepEqual(await getVerifiedContact(request("user_A")), { email: "verified@example.test", name: "Trusted Profile" });
  await assert.rejects(resolveAuthenticatedUser({}), { status: 401 });
});
