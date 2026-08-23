"use strict";

// DeviceDeck background service worker.
//
// Jobs:
//   1. Open the side panel when the toolbar icon is clicked.
//   2. While a DeviceDeck view is open, keep a session rule that strips the
//      response headers some sites use to forbid being shown in a frame
//      (X-Frame-Options and CSP), so protected pages do not render blank.
//   3. On request from a view, toggle a session rule that sets a mobile
//      User-Agent on framed requests.
//
// Scoping: MV3's declarativeNetRequest cannot target only the iframes this
// extension creates (there is no per-frame condition, and side-panel frames
// carry no tab id to match on). So the rules are scoped by lifetime instead:
// they exist only while at least one DeviceDeck view is connected, and are
// removed the moment the last one closes. Everything is session-only and local;
// nothing is stored or sent anywhere.

const FRAME_HEADER_RULE_ID = 1;
const MOBILE_UA_RULE_ID = 2;
const PORT_NAME = "devicedeck";

const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

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

function mobileUserAgentRule() {
  return {
    id: MOBILE_UA_RULE_ID,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "user-agent", operation: "set", value: MOBILE_USER_AGENT }
      ]
    },
    condition: { resourceTypes: ["sub_frame"] }
  };
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
      removeRuleIds: [FRAME_HEADER_RULE_ID, MOBILE_UA_RULE_ID],
      addRules: []
    });
  } catch (error) {
    console.error("DeviceDeck: could not clear the session rules.", error);
  }
}

async function setMobileUserAgent(enabled) {
  // Only meaningful while a view is open; if none is, there is nothing to strip.
  if (openViews.size === 0) {
    return;
  }
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [MOBILE_UA_RULE_ID],
    addRules: enabled ? [mobileUserAgentRule()] : []
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
