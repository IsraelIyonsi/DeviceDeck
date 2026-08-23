# DeviceDeck Privacy Policy

_Last updated: 2026-08-23_

DeviceDeck does not collect, store, sell, or transmit any personal data, and it
makes no network requests of its own.

Specifically:

- **No analytics, no tracking, no telemetry.** Nothing about your browsing is
  recorded or sent anywhere.
- **No remote code.** All code that runs is the code shipped in the extension
  package. Nothing is loaded from a server at runtime.
- **Active-tab URL.** The extension reads the address of your current tab for the
  sole purpose of displaying that page inside the device previews. This value
  stays in your browser and is never sent anywhere.
- **Response headers.** The extension removes the `X-Frame-Options` and
  `Content-Security-Policy` response headers from sub-frame requests, locally in
  your browser, so pages that would otherwise refuse to load in a frame can be
  previewed. This modification happens on your device and no request or response
  content is read, retained, or transmitted by the extension.
- **Device selection.** Your chosen device list is saved locally on your machine
  (via the browser's extension storage) so it is remembered next time. It stays
  on your device and is never transmitted.

Because DeviceDeck processes no personal data off your device, there is nothing
to request, export, or delete.

Questions: open an issue at https://github.com/IsraelIyonsi/DeviceDeck/issues
