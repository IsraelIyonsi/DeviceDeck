"use strict";

// DeviceDeck background service worker.
//
// Jobs:
//   1. Open the side panel when the toolbar icon is clicked.
//   2. Keep a session rule that strips the response headers some sites use to
//      forbid being shown in a frame (X-Frame-Options and CSP), so protected
//      pages do not render blank inside the device frames.
//   3. On request from the panel, toggle a session rule that sets a mobile
//      User-Agent on framed requests, so sites that pick their markup by
//      sniffing the user-agent serve their mobile page.
//
// All rules are session-only and local. Nothing is stored or sent anywhere.

const FRAME_HEADER_RULE_ID = 1;
const MOBILE_UA_RULE_ID = 2;

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

async function installFrameHeaderRule() {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [FRAME_HEADER_RULE_ID],
      addRules: [FRAME_HEADER_RULE]
    });
  } catch (error) {
    console.error("DeviceDeck: could not install the frame-header rule.", error);
  }
}

async function setMobileUserAgent(enabled) {
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
  await installFrameHeaderRule();
  // Start with the mobile user-agent override off so the session begins clean.
  await setMobileUserAgent(false);
}

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);

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
