"use strict";

// DeviceDeck background service worker.
//
// Two jobs only:
//   1. Open the side panel when the toolbar icon is clicked.
//   2. Keep a session rule that strips the response headers some sites use to
//      forbid being shown in a frame (X-Frame-Options and the CSP
//      frame-ancestors directive). Without this, protected pages render blank
//      inside the device frames. The rule only touches sub-frame responses and
//      only exists while the browser session is open; nothing is stored or sent
//      anywhere.

const FRAME_HEADER_RULE_ID = 1;

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
  condition: {
    resourceTypes: ["sub_frame"]
  }
};

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

async function openOnActionClick() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.error("DeviceDeck: could not set the side-panel behavior.", error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  openOnActionClick();
  installFrameHeaderRule();
});

chrome.runtime.onStartup.addListener(() => {
  openOnActionClick();
  installFrameHeaderRule();
});
