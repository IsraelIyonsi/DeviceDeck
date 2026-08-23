# DeviceDeck

See any website at real device sizes, side by side, without leaving your browser.

Click the toolbar icon and a side panel opens with the page you are on rendered
in a row of real device viewports (iPhone, Pixel, iPad, and more). Pick the
devices you care about, zoom, rotate, or type a different address. That is the
whole thing.

- **No account, no sign-in.** Click it and it works.
- **No tracking, no analytics, no remote code.** It makes zero network calls of
  its own. Every line is plain, readable JavaScript with no build step and no
  dependencies, so you can audit it in a couple of minutes.
- **Chrome and Edge** (Manifest V3 side panel).

## Why it exists

Most responsive-testing tools are either a separate app (so you lose the tab you
were on) or a browser extension stuffed with broad tracking permissions. This is
the small, honest one: one job, done fast, and you can read the source.

## How it works

Each device is a real `<iframe>` sized to that device's CSS width, so the site's
own responsive CSS (media queries) actually reacts, exactly as it would on the
device. Frames are scaled down to fit the panel with the zoom control.

Some sites send an `X-Frame-Options` or `Content-Security-Policy` header that
forbids being shown in a frame, which would make those pages render blank. A
Manifest V3 `declarativeNetRequest` session rule removes those response headers
from sub-frame requests so the preview works on real apps. The rule is installed
only while a DeviceDeck view is open and removed the moment you close it, so it
is never in effect when you are not using the tool. Nothing is stored or sent
anywhere.

Frames use a `sandbox` that keeps the page's own origin (so logged-in pages you
are already signed into render normally) but withholds top-level navigation, so
"frame-busting" scripts cannot hijack the panel.

## Install (unpacked, for now)

1. Clone or download this folder.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `DeviceDeck` folder.
5. Open any web page and click the **DeviceDeck** toolbar icon.

## Permissions, and why

- `sidePanel` — to show the preview in the side panel.
- `tabs` — to read the URL of the tab you are viewing so it can preview it.
- `declarativeNetRequest` + `<all_urls>` host access — to strip the
  frame-blocking headers described above, on whatever site you choose to
  preview. This is what lets it work on any page. It is used for nothing else,
  and no page data ever leaves your browser.
- `storage` — to remember which devices you last selected, saved locally on your
  machine. Nothing else is stored, and it is never transmitted.

## Known limits (MVP)

- Layout first. Width-based responsive sites, which is most of them, render
  correctly from the viewport width alone. For sites that pick their markup by
  sniffing the user-agent, flip on **Mobile UA** to send each device its own
  User-Agent (iPhone frames identify as iPhone, Android as Android, iPad as iPad;
  desktop presets keep the real agent). To vary the agent per frame, while the
  toggle is on each frame's document request carries a small `__ddua` marker
  query param so the matching agent can be applied; it is absent when the toggle
  is off. Only the request the server sees is changed; a page's own
  `navigator.userAgent` (client-side) is not, and touch and device-pixel-ratio
  are not emulated.
- A page whose JavaScript aggressively breaks out of frames may still misbehave.
- `chrome://`, `edge://`, and extension pages cannot be framed.
- The frame-header and mobile-UA rules are removed the moment you close every
  DeviceDeck view, so they are never active when you are not using the tool.
  While a view is open they do apply to sub-frame responses in the browser, not
  only to DeviceDeck's own frames: MV3's header API exposes no per-frame
  condition, and side-panel frames carry no tab id to scope by, so lifetime is
  the tightest reliable boundary. Top-level pages are never affected.

## Development

No build step. The source is the shipped code.

Regenerate the icons after editing `tools/make-icons.js`:

```
node tools/make-icons.js
```

## License

MIT. Copyright Israel Iyonsi.
