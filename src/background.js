"use strict";

// DeviceDeck background service worker.
//
// Jobs:
//   1. Open the side panel when the toolbar icon is clicked.
//   2. While a DeviceDeck view is open, keep a session rule that strips the
//      response headers some sites use to forbid being shown in a frame
//      (X-Frame-Options and CSP), so protected pages do not render blank.
//   3. On request from a view, toggle per-device mobile User-Agent rules.
//
// Per-device User-Agent: the request User-Agent can only be set at the network
// layer, and declarativeNetRequest applies to every framed request identically
// (there is no per-frame condition). To vary it per device, each frame's URL
// carries a marker query param (for example __ddua=iphone) while the toggle is
// on, and one rule per platform matches that marker and sets the matching agent.
//
// Scoping: MV3 cannot target only this extension's own frames, so the rules are
// scoped by lifetime: they exist only while a DeviceDeck view is connected and
// are removed when the last one closes. Everything is session-only and local.

const FRAME_HEADER_RULE_ID = 1;
const PORT_NAME = "devicedeck";
const MOBILE_UA_MARKER = "__ddua";

// Rule ids 2+ belong to the per-platform User-Agent rules.
const USER_AGENTS = [
  {
    id: 2,
    token: "iphone",
    ua:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  },
  {
    id: 3,
    token: "android",
    ua:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
  },
  {
    id: 4,
    token: "ipad",
    ua:
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  }
];

const USER_AGENT_RULE_IDS = USER_AGENTS.map((entry) => entry.id);
const ALL_RULE_IDS = [FRAME_HEADER_RULE_ID, ...USER_AGENT_RULE_IDS];

const FRAME_HEADER_RULE = {
  id: FRAME_HEADER_RULE_ID,
  priority: 1,
  action: {
    type: "modifyHeaders",
    responseHeaders: [
      { header: "x-frame-options", operation: "remove" },
      { header: "content-security-policy", operation: "remove" },
      { header: "content-security-policy-report-only", operation: "remove" }
    ]
  },
  condition: { resourceTypes: ["sub_frame"] }
};

function userAgentRules() {
  return USER_AGENTS.map((entry) => ({
    id: entry.id,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "user-agent", operation: "set", value: entry.ua }
      ]
    },
    condition: {
      resourceTypes: ["sub_frame"],
      urlFilter: `${MOBILE_UA_MARKER}=${entry.token}`
    }
  }));
}

// Views (side panel and any open-in-tab decks) currently connected.
const openViews = new Set();

async function enableFrameHeaderRule() {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [FRAME_HEADER_RULE_ID],
      addRules: [FRAME_HEADER_RULE]
    });
  } catch (error) {
    console.error("DeviceDeck: could not enable the frame-header rule.", error);
  }
}

async function clearAllRules() {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: ALL_RULE_IDS,
      addRules: []
    });
  } catch (error) {
    console.error("DeviceDeck: could not clear the session rules.", error);
  }
}

async function setMobileUserAgent(enabled) {
  // Only meaningful while a view is open; if none is, there is nothing to set.
  if (openViews.size === 0) {
    return;
  }
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: USER_AGENT_RULE_IDS,
    addRules: enabled ? userAgentRules() : []
  });
}

async function openOnActionClick() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.error("DeviceDeck: could not set the side-panel behavior.", error);
  }
}

async function initialize() {
  await openOnActionClick();
  // No view is open yet, so start with a clean slate.
  await clearAllRules();
}

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAME) {
    return;
  }
  openViews.add(port);
  if (openViews.size === 1) {
    enableFrameHeaderRule();
  }
  port.onDisconnect.addListener(() => {
    openViews.delete(port);
    if (openViews.size === 0) {
      clearAllRules();
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "setMobileUserAgent") {
    setMobileUserAgent(Boolean(message.enabled))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        console.error("DeviceDeck: could not toggle the mobile user-agent.", error);
        sendResponse({ ok: false });
      });
    return true; // keep the channel open for the async response
  }
  return false;
});
