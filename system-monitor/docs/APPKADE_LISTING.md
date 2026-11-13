# AppKade listing kit: System Monitor

AppKade lists apps; it doesn't take payments or host downloads. Buyers click through to **your
website**, so the listing only goes live once that page exists. Listing policy:
https://www.appkade.lk/listing-policy

## Before you submit (reviewers check these)

- [ ] **Website page** on https that you own, e.g. `https://sithum-raigamage.vercel.app/system-monitor`,
      showing: what it does, screenshots, the **price and terms** (link the EULA), refund policy,
      system requirements, download links (after purchase) and a support email.
- [ ] **Payment** that works today, e.g. PayHere (LKR, cards + local banks). After each sale, run
      `node licensing/issue-license.mjs` and email the key + download links.
- [ ] **Installers** built by the Release workflow and uploaded somewhere buyers can download.
      (A private GitHub repo's releases are not downloadable by customers.)
- [ ] **Logo**: `desktop/build/icon.png` (PNG, under 3 MB).
- [ ] **1–5 real screenshots** (PNG/JPEG/WebP, max 3 MB each) of the app as it is now:
      Dashboard, History, Alerts, Machines, and the macOS menu-bar / Windows tray.
- [ ] Update `PRODUCT.buyUrl` and `PRODUCT.supportEmail` in `frontend/src/lib/desktop.ts`,
      and the support email in `desktop/package.json`, to your real ones.
- [ ] Code signing (strongly recommended, see `desktop/README.md`).

## Listing fields

**Name:** System Monitor

**Tagline:** Live CPU, memory, disk and temperature monitoring with alerts, for Windows, macOS and Linux.

**Category:** Developer tools (or Utilities, if offered)

**Pricing model:** Paid (one-time). Example: LKR X,XXX, one licence for up to 3 computers.

**Description:**

> System Monitor shows what your computer is doing, live: CPU (total and per core), memory,
> every drive, network speed, the busiest processes, and where available CPU temperature,
> GPU load and battery health.
>
> It keeps working in the background from the menu bar or system tray:
> - **Alerts:** get a desktop notification when CPU, memory, disk or temperature stays above a limit you set.
> - **History:** look back up to 90 days with charts, and export any range to CSV for reports.
> - **Multiple machines:** watch other PCs or Linux servers on your network from one window.
>
> Your data stays on your computers. There's no account, no cloud and no tracking.
>
> **Who it's for:** developers, gamers, IT staff and small offices who want to spot an
> overheating laptop, a full disk or a runaway process before it becomes a problem.
>
> **Limitations:** CPU temperature isn't available on Apple Silicon Macs and may need
> administrator rights on Windows. Live GPU load is shown for NVIDIA GPUs. Monitoring other
> machines works over your local network or a VPN, not over the public internet.
>
> **Requirements:** Windows 10/11 (64-bit), macOS 11+ (Intel or Apple Silicon), or a 64-bit
> Linux desktop (AppImage or .deb). Linux server agent: Node.js 18+.
>
> One-time payment, no subscription. One licence covers up to 3 of your computers.

**Links:** website, purchase (PayHere checkout), support (mailto:), demo (optional: a short screen recording).

**First "What changed" note (≥ 20 characters):**
> First release: live dashboard, alerts, history with CSV export, and multi-machine monitoring.

## Avoid (rejection reasons in the policy)
- Claims like "best", "#1", "100% accurate" or "100% secure".
- Screenshots of mock data or a design that differs from the shipped app.
- A price on AppKade that doesn't match your website.
