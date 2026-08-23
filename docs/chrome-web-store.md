# Chrome Web Store submission guide

Everything needed to list DeviceDeck. Copy the fields straight into the
Developer Dashboard. The store package is the release ZIP:
`DeviceDeck-0.1.0.zip` (attached to the v0.1.0 GitHub release, manifest at root).

## One-time setup (developer only)

1. Go to https://chrome.google.com/webstore/devconsole and sign in.
2. Pay the one-time USD 5 developer registration fee.
3. Verify the publisher email.

## Listing fields

**Name:** DeviceDeck

**Summary (max 132 chars):**
Preview any website at real device sizes, side by side. Open source, no account, no tracking.

**Category:** Developer Tools

**Language:** English

**Single purpose (required):**
Preview the web page you are viewing at multiple device viewport sizes, side by
side, so you can check a responsive layout without resizing your browser.

**Detailed description:**
DeviceDeck shows the page you are on inside a row of real device viewports so a
site's own responsive CSS reacts exactly as it would on the device. Click the
toolbar icon, a side panel opens, pick your devices, and you are testing.

- No account, no sign-in. Click it and it works.
- No tracking, no analytics, no remote code. It makes zero network calls of its
  own, and every line is plain, dependency-free JavaScript you can read in
  minutes.
- Real device-width iframes, not scaled screenshots, so media queries fire.
- Works on protected pages: it removes frame-blocking response headers locally
  so real apps render in a frame.
- Devices, rotate, zoom, follow-tab, and open-in-tab.

Open source (MIT): https://github.com/IsraelIyonsi/DeviceDeck

## Privacy tab

- **Does this item collect user data?** No.
- **Privacy policy URL:** https://github.com/IsraelIyonsi/DeviceDeck/blob/main/PRIVACY.md
- Check the three certifications (no selling data, no unrelated use, no
  creditworthiness use).

## Permission justifications (required per item)

- **sidePanel:** Renders the device previews in the browser side panel, which is
  the extension's entire interface.
- **tabs:** Reads the URL of the active tab so the extension can preview the page
  the user is currently viewing. No other tab data is used.
- **declarativeNetRequest:** Removes the `X-Frame-Options` and
  `Content-Security-Policy` response headers from sub-frame requests so pages
  that would otherwise refuse to load in a frame can be previewed. The rule runs
  locally and is session-only.
- **Host permission `<all_urls>`:** The preview must work on whatever site the
  user chooses to test, and removing the frame-blocking headers on that site
  requires host access to it. No page content is read, stored, or transmitted.

## Assets to upload

Ready-made images are in `docs/store-assets/`:

- **Icon:** `icons/icon128.png` (already in the package).
- **Screenshot (required):** `docs/store-assets/screenshot-1280x800.png` (exactly
  1280x800, the panel showing one page across three devices).
- **Small promo tile (optional):** `docs/store-assets/promo-440x280.png` (exactly
  440x280).

To regenerate after a UI change: recapture the panel and rerun the asset
compositor (see the repo's asset tooling), or just re-crop a fresh capture to the
exact sizes above.

## Submit

Upload `DeviceDeck-0.1.0.zip`, fill the fields above, then Submit for review.
Reviews typically take a few days. Bumps: raise `version` in `manifest.json`,
re-zip, and upload a new package.

## Microsoft Edge Add-ons (optional, same package)

The same ZIP works at https://partner.microsoft.com/dashboard/microsoftedge
(free, no registration fee). Reuse the fields above.
