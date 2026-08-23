"use strict";

// DeviceDeck side panel. Renders the current page (or any address you type)
// inside a row of real device viewports. No network calls of its own, no
// storage beyond the selected-device list kept in this window.

(function () {
  const DEVICES = window.DEVICES || [];
  const IFRAME_SANDBOX =
    "allow-scripts allow-same-origin allow-forms allow-popups allow-modals";
  const MOBILE_UA_MARKER = "__ddua";

  const state = {
    url: "",
    selected: new Set(window.DEFAULT_DEVICE_IDS || []),
    zoom: 0.65,
    landscape: false,
    follow: true,
    mobileUa: false
  };

  const els = {};

  function cacheElements() {
    for (const id of [
      "url",
      "reload",
      "devices-btn",
      "device-menu",
      "rotate",
      "zoom",
      "zoom-label",
      "follow",
      "mobile-ua",
      "open-tab",
      "frames",
      "empty",
      "empty-text"
    ]) {
      els[id] = document.getElementById(id);
    }
  }

  const STORAGE_KEY = "selectedDevices";

  function hasChrome() {
    return typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query;
  }

  function hasStorage() {
    return (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local
    );
  }

  async function loadSelection() {
    if (!hasStorage()) {
      return;
    }
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      const ids = stored && stored[STORAGE_KEY];
      if (Array.isArray(ids)) {
        const valid = ids.filter((id) => DEVICES.some((device) => device.id === id));
        if (valid.length > 0) {
          state.selected = new Set(valid);
        }
      }
    } catch (error) {
      // Fall back to the defaults if storage is unavailable.
    }
  }

  function saveSelection() {
    if (!hasStorage()) {
      return;
    }
    try {
      chrome.storage.local.set({ [STORAGE_KEY]: [...state.selected] });
    } catch (error) {
      // Persistence is best-effort; ignore failures.
    }
  }

  function isFramableUrl(url) {
    return typeof url === "string" && /^https?:\/\//i.test(url);
  }

  function normalizeUrl(raw) {
    const value = (raw || "").trim();
    if (value === "") {
      return "";
    }
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
    return "https://" + value;
  }

  async function getActiveTab() {
    if (!hasChrome()) {
      return null;
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs[0] ? tabs[0] : null;
  }

  function setUrl(url) {
    state.url = url || "";
    els.url.value = state.url;
    render();
  }

  function selectedDevices() {
    return DEVICES.filter((device) => state.selected.has(device.id));
  }

  function frameUrl(device) {
    if (!state.mobileUa || !device.platform || device.platform === "desktop") {
      return state.url;
    }
    const separator = state.url.includes("?") ? "&" : "?";
    return state.url + separator + MOBILE_UA_MARKER + "=" + device.platform;
  }

  function render() {
    const devices = selectedDevices();
    const showEmpty =
      !isFramableUrl(state.url) || devices.length === 0;

    els.empty.hidden = !showEmpty;
    els.frames.hidden = showEmpty;

    if (showEmpty) {
      els.frames.replaceChildren();
      els["empty-text"].textContent =
        devices.length === 0
          ? "Pick at least one device."
          : "Open a normal web page, then click DeviceDeck.";
      return;
    }

    const cards = devices.map((device) => renderDevice(device));
    els.frames.replaceChildren(...cards);
  }

  function renderDevice(device) {
    const width = state.landscape ? device.height : device.width;
    const height = state.landscape ? device.width : device.height;
    const scaledWidth = Math.round(width * state.zoom);
    const scaledHeight = Math.round(height * state.zoom);

    const card = document.createElement("div");
    card.className = "device";
    card.style.width = scaledWidth + "px";

    const label = document.createElement("div");
    label.className = "device-label";
    label.textContent = `${device.name} · ${width}×${height}`;

    const holder = document.createElement("div");
    holder.className = "holder";
    holder.style.width = scaledWidth + "px";
    holder.style.height = scaledHeight + "px";

    const viewport = document.createElement("div");
    viewport.className = "viewport";
    viewport.style.width = width + "px";
    viewport.style.height = height + "px";
    viewport.style.transform = `scale(${state.zoom})`;

    const iframe = document.createElement("iframe");
    iframe.style.width = width + "px";
    iframe.style.height = height + "px";
    iframe.setAttribute("sandbox", IFRAME_SANDBOX);
    iframe.setAttribute("loading", "eager");
    iframe.src = frameUrl(device);

    viewport.appendChild(iframe);
    holder.appendChild(viewport);
    card.appendChild(label);
    card.appendChild(holder);
    return card;
  }

  function buildDeviceMenu() {
    const menu = els["device-menu"];
    menu.replaceChildren();

    const groups = [
      { type: "phone", title: "Phones" },
      { type: "tablet", title: "Tablets" },
      { type: "desktop", title: "Desktop" }
    ];

    for (const group of groups) {
      const heading = document.createElement("div");
      heading.className = "group";
      heading.textContent = group.title;
      menu.appendChild(heading);

      for (const device of DEVICES.filter((d) => d.type === group.type)) {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = state.selected.has(device.id);
        input.addEventListener("change", () => {
          if (input.checked) {
            state.selected.add(device.id);
          } else {
            state.selected.delete(device.id);
          }
          saveSelection();
          render();
        });
        const text = document.createElement("span");
        text.textContent = device.name;
        label.appendChild(input);
        label.appendChild(text);
        menu.appendChild(label);
      }
    }
  }

  function toggleDeviceMenu(force) {
    const menu = els["device-menu"];
    const open = typeof force === "boolean" ? force : menu.hidden;
    menu.hidden = !open;
    els["devices-btn"].setAttribute("aria-expanded", String(open));
  }

  function setZoom(percent) {
    state.zoom = percent / 100;
    els["zoom-label"].textContent = percent + "%";
    render();
  }

  function bindControls() {
    els.url.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        stopFollowing();
        setUrl(normalizeUrl(els.url.value));
      }
    });
    els.url.addEventListener("change", () => {
      stopFollowing();
      setUrl(normalizeUrl(els.url.value));
    });

    els.reload.addEventListener("click", () => render());

    els["devices-btn"].addEventListener("click", () => toggleDeviceMenu());

    els.rotate.addEventListener("click", () => {
      state.landscape = !state.landscape;
      render();
    });

    els.zoom.addEventListener("input", () => setZoom(Number(els.zoom.value)));

    els.follow.addEventListener("change", () => {
      state.follow = els.follow.checked;
      if (state.follow) {
        syncToActiveTab();
      }
    });

    els["mobile-ua"].addEventListener("change", async () => {
      state.mobileUa = els["mobile-ua"].checked;
      await sendMobileUserAgent(state.mobileUa);
      render(); // reload the frames so the request re-fires with the new agent
    });

    els["open-tab"].addEventListener("click", openInTab);
  }

  function stopFollowing() {
    if (state.follow) {
      state.follow = false;
      els.follow.checked = false;
    }
  }

  function openInTab() {
    if (!hasChrome() || !chrome.tabs.create) {
      return;
    }
    const base = chrome.runtime.getURL("src/sidepanel.html");
    const target = state.url
      ? `${base}?url=${encodeURIComponent(state.url)}`
      : base;
    chrome.tabs.create({ url: target });
  }

  let backgroundPort = null;

  function connectToBackground() {
    if (!hasChrome() || !chrome.runtime || !chrome.runtime.connect) {
      return;
    }
    try {
      backgroundPort = chrome.runtime.connect({ name: "devicedeck" });
      backgroundPort.onDisconnect.addListener(() => {
        // The worker cycled or the rules were cleared; reconnect so the frame
        // rules are reinstalled while this view stays open.
        backgroundPort = null;
        setTimeout(connectToBackground, 500);
      });
      // Re-apply the current mobile-UA choice, since rules are cleared whenever
      // no view is connected.
      sendMobileUserAgent(state.mobileUa);
    } catch (error) {
      backgroundPort = null;
    }
  }

  function sendMobileUserAgent(enabled) {
    if (!hasChrome() || !chrome.runtime || !chrome.runtime.sendMessage) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "setMobileUserAgent", enabled }, () => {
          void chrome.runtime.lastError;
          resolve();
        });
      } catch (error) {
        resolve();
      }
    });
  }

  async function syncToActiveTab() {
    const tab = await getActiveTab();
    if (tab && isFramableUrl(tab.url)) {
      setUrl(tab.url);
    }
  }

  function watchActiveTab() {
    if (!hasChrome() || !chrome.tabs.onActivated) {
      return;
    }
    chrome.tabs.onActivated.addListener(() => {
      if (state.follow) {
        syncToActiveTab();
      }
    });
    chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
      if (state.follow && tab.active && changeInfo.url) {
        syncToActiveTab();
      }
    });
  }

  async function loadInitialUrl() {
    const fromQuery = new URLSearchParams(location.search).get("url");
    if (fromQuery) {
      // Opened as a full tab: this is a fixed target, so do not follow.
      state.follow = false;
      els.follow.checked = false;
      setUrl(fromQuery);
      return;
    }
    await syncToActiveTab();
    if (!state.url) {
      render();
    }
  }

  async function init() {
    cacheElements();
    await loadSelection();
    buildDeviceMenu();
    bindControls();
    watchActiveTab();
    // Register this view so the background installs the frame rules while it is
    // open and removes them when it closes.
    connectToBackground();
    loadInitialUrl();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
