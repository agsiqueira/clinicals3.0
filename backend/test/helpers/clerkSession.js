const { generateKeyPairSync, sign } = require("node:crypto");
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const issuer = "https://synthetic.clerk.accounts.dev";
const options = {
  publishableKey: `pk_test_${Buffer.from("synthetic.clerk.accounts.dev$").toString("base64")}`,
  secretKey: "sk_test_synthetic",
  jwtKey: publicKey.export({ type: "spki", format: "pem" }),
  authorizedParties: ["http://localhost:8081"],
};
function token(userId = "user_A", overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "synthetic" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: issuer, sub: userId, sid: `sess_${userId}`, azp: "http://localhost:8081", iat: now, nbf: now - 10, exp: now + 300, ...overrides })).toString("base64url");
  const data = `${header}.${payload}`;
  return `${data}.${sign("RSA-SHA256", Buffer.from(data), privateKey).toString("base64url")}`;
}
module.exports = { options, token };
