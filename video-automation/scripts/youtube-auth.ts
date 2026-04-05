/**
 * youtube-auth.ts
 * One-time OAuth flow to get YouTube refresh token.
 *
 * Run ONCE:
 *   npx ts-node --esm scripts/youtube-auth.ts
 *
 * Copy the printed YOUTUBE_REFRESH_TOKEN into .env
 */

import { google } from "googleapis";
import * as readline from "readline";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const oauth2 = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
);

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("\n1. Open this URL in your browser:");
console.log(authUrl);
console.log("\n2. Authorize the app and copy the code.");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("\n3. Paste the code here: ", async (code) => {
  rl.close();
  const { tokens } = await oauth2.getToken(code.trim());
  console.log("\n✓ Add this to your .env file:");
  console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
});
