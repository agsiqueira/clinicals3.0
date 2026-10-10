const prisma = require("../db/prisma");
const { clerkClient } = require("@clerk/express");

async function getOrCreateUser(clerkUserId, meta = {}) {
  if (!clerkUserId) throw new Error("Missing verified Clerk identity");
  const existing = await prisma.user.findUnique({ where: { clerkUserId } });
  if (existing) return existing;
  return prisma.user.upsert({
    where: { clerkUserId },
    create: { clerkUserId, name: meta.name || null, email: meta.email || null, imageUrl: meta.imageUrl || null },
    update: {},
  });
}

async function resolveAuthenticatedUser(req) {
  const clerkUserId = req.studentIdentity?.clerkUserId;
  if (!clerkUserId) { const error = new Error("Authentication required"); error.status = 401; throw error; }
  if (req.studentUser) return req.studentUser;
  const existing = await prisma.user.findUnique({ where: { clerkUserId } });
  if (existing) { req.studentUser = existing; return existing; }
  // Only server-sourced profile metadata is used; existing learner IDs remain unchanged.
  const profile = await clerkClient.users.getUser(clerkUserId);
  const email = profile.emailAddresses.find((item) => item.id === profile.primaryEmailAddressId && item.verification?.status === "verified")?.emailAddress;
  req.studentUser = await getOrCreateUser(clerkUserId, {
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
    email, imageUrl: profile.imageUrl,
  });
  return req.studentUser;
}

async function getVerifiedContact(req) {
  const clerkUserId = req.studentIdentity?.clerkUserId;
  if (!clerkUserId) { const error = new Error("Authentication required"); error.status = 401; throw error; }
  const profile = await clerkClient.users.getUser(clerkUserId);
  return {
    email: profile.emailAddresses.find(item => item.id === profile.primaryEmailAddressId && item.verification?.status === "verified")?.emailAddress,
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
  };
}
module.exports = { getOrCreateUser, resolveAuthenticatedUser, getVerifiedContact };
