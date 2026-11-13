// Offline licence keys signed with Ed25519.
// Key format:  SM1-<base64url(JSON payload)>.<base64url(signature)>
// Only the holder of the private key (licensing/keys/private.pem, never shipped)
// can create valid keys; the app embeds just the public key.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PUBLIC_KEY_PEM } from './license-public-key.js';

export const PRODUCT_ID = 'system-monitor';
const PREFIX = 'SM1-';

export function verifyLicenseKey(key, publicKeyPem = PUBLIC_KEY_PEM) {
  try {
    const clean = String(key || '').replace(/\s+/g, '');
    if (!clean.startsWith(PREFIX)) return { valid: false, reason: 'Not a System Monitor licence key' };
    const [payloadB64, sigB64] = clean.slice(PREFIX.length).split('.');
    if (!payloadB64 || !sigB64) return { valid: false, reason: 'Malformed licence key' };
    const payloadBuf = Buffer.from(payloadB64, 'base64url');
    const ok = crypto.verify(null, payloadBuf, crypto.createPublicKey(publicKeyPem), Buffer.from(sigB64, 'base64url'));
    if (!ok) return { valid: false, reason: 'Invalid licence key' };
    const payload = JSON.parse(payloadBuf.toString('utf8'));
    if (payload.product !== PRODUCT_ID) return { valid: false, reason: 'Key is for a different product' };
    return { valid: true, license: payload };
  } catch {
    return { valid: false, reason: 'Invalid licence key' };
  }
}

export function signLicense(payload, privateKeyPem) {
  const body = Buffer.from(JSON.stringify({ product: PRODUCT_ID, ...payload }), 'utf8');
  const sig = crypto.sign(null, body, crypto.createPrivateKey(privateKeyPem));
  return `${PREFIX}${body.toString('base64url')}.${sig.toString('base64url')}`;
}

export class LicenseStore {
  constructor(dataDir, publicKeyPem = PUBLIC_KEY_PEM) {
    this.file = path.join(dataDir, 'license.json');
    this.publicKeyPem = publicKeyPem;
    this.state = this.#load();
  }

  #load() {
    try {
      const { key } = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      const r = verifyLicenseKey(key, this.publicKeyPem);
      if (r.valid) return { licensed: true, license: r.license };
    } catch {}
    return { licensed: false, license: null };
  }

  status() {
    const l = this.state.license;
    return { licensed: this.state.licensed, license: l ? { id: l.id, name: l.name, email: l.email, issued: l.issued, edition: l.edition } : null };
  }

  activate(key) {
    const r = verifyLicenseKey(key, this.publicKeyPem);
    if (!r.valid) return { ok: false, error: r.reason };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify({ key: String(key).replace(/\s+/g, ''), activatedAt: Date.now() }, null, 2));
    this.state = { licensed: true, license: r.license };
    return { ok: true, ...this.status() };
  }

  deactivate() {
    fs.rmSync(this.file, { force: true });
    this.state = { licensed: false, license: null };
    return this.status();
  }
}
