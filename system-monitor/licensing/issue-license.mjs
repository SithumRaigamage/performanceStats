#!/usr/bin/env node
// Issue a licence key for a customer after they pay.
//   node licensing/issue-license.mjs --name "Kamal Perera" --email kamal@example.com [--order PH-12345]
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { signLicense, verifyLicenseKey } from '../backend/src/license.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const privFile = path.join(here, 'keys', 'private.pem');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const name = arg('name');
const email = arg('email');
if (!name || !email) {
  console.error('Usage: node licensing/issue-license.mjs --name "Customer Name" --email customer@example.com [--order ORDER_ID]');
  process.exit(1);
}
if (!fs.existsSync(privFile)) {
  console.error('No private key found. Run: node licensing/generate-keypair.mjs');
  process.exit(1);
}

const payload = {
  id: crypto.randomUUID(),
  name,
  email,
  order: arg('order') || null,
  edition: 'pro',
  issued: new Date().toISOString().slice(0, 10)
};
const key = signLicense(payload, fs.readFileSync(privFile, 'utf8'));
if (!verifyLicenseKey(key).valid) {
  console.error('Self-check failed: the embedded public key does not match keys/private.pem.');
  process.exit(1);
}

// Keep a local record of every key issued (gitignored).
fs.appendFileSync(path.join(here, 'keys', 'issued.csv'), `${payload.issued},${payload.id},"${name}",${email},${payload.order ?? ''}\n`);
console.log(key);
