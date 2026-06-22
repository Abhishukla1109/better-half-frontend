#!/usr/bin/env node
/**
 * One-time Shopify OAuth script.
 * Run: node scripts/shopify-auth.mjs
 * Then open the printed URL in your browser and approve.
 * The Admin API token will be saved to .env.local automatically.
 */

import { createServer } from "http";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHmac, randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, "../.env.local");

const SHOP        = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL?.replace("https://", "").replace(/\/$/, "") ?? "betterhalf-4.myshopify.com";
const CLIENT_ID   = process.env.SHOPIFY_ADMIN_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
const PORT        = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES      = "read_products,write_products,read_metafields,write_metafields";
const STATE       = randomBytes(16).toString("hex");

const G = "\x1b[32m", R = "\x1b[31m", Y = "\x1b[33m", B = "\x1b[1m", X = "\x1b[0m";

const authUrl =
  `https://${SHOP}/admin/oauth/authorize` +
  `?client_id=${CLIENT_ID}` +
  `&scope=${SCOPES}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&state=${STATE}`;

console.log(`\n${B}Shopify OAuth — one-time token setup${X}\n`);
console.log(`${Y}Open this URL in your browser:${X}\n`);
console.log(`  ${authUrl}\n`);
console.log(`${G}Waiting for Shopify to redirect back...${X}\n`);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/callback") { res.end(); return; }

  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (state !== STATE) {
    res.writeHead(400); res.end("State mismatch — possible CSRF.");
    console.error(`${R}State mismatch. Try again.${X}`);
    server.close(); return;
  }

  // Exchange code for access token
  const tokenRes = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
  });

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  if (!token) {
    res.writeHead(500); res.end("Failed to get token.");
    console.error(`${R}Token exchange failed:${X}`, tokenData);
    server.close(); return;
  }

  // Save to .env.local
  let env = readFileSync(ENV_PATH, "utf8");
  if (env.includes("SHOPIFY_ADMIN_TOKEN=")) {
    env = env.replace(/^SHOPIFY_ADMIN_TOKEN=.*/m, `SHOPIFY_ADMIN_TOKEN=${token}`);
  } else {
    env += `\n# Shopify Admin API token (write_products + write_metafields)\nSHOPIFY_ADMIN_TOKEN=${token}\n`;
  }
  writeFileSync(ENV_PATH, env);

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h2 style='font-family:sans-serif;color:green'>✅ Token saved! You can close this tab.</h2>");

  console.log(`${G}${B}✅ Admin token saved to .env.local${X}`);
  console.log(`${G}   Token: ${token.slice(0, 12)}...${X}\n`);
  server.close();
});

server.listen(PORT, () => {});
