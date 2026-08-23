"use strict";

// Device presets, in CSS (logical) pixels, portrait orientation.
// Landscape is derived by swapping width and height at render time.
// `platform` selects the User-Agent used when the Mobile UA toggle is on
// ("iphone" | "android" | "ipad" | "desktop"); "desktop" keeps the real agent.
window.DEVICES = [
  { id: "iphone-se", name: "iPhone SE", type: "phone", platform: "iphone", width: 375, height: 667 },
  { id: "iphone-15", name: "iPhone 15", type: "phone", platform: "iphone", width: 390, height: 844 },
  { id: "iphone-15-pro-max", name: "iPhone 15 Pro Max", type: "phone", platform: "iphone", width: 430, height: 932 },
  { id: "pixel-8", name: "Pixel 8", type: "phone", platform: "android", width: 412, height: 915 },
  { id: "galaxy-s22", name: "Galaxy S22", type: "phone", platform: "android", width: 360, height: 780 },
  { id: "ipad-mini", name: "iPad mini", type: "tablet", platform: "ipad", width: 768, height: 1024 },
  { id: "ipad-pro-11", name: "iPad Pro 11", type: "tablet", platform: "ipad", width: 834, height: 1194 },
  { id: "ipad-pro-12", name: "iPad Pro 12.9", type: "tablet", platform: "ipad", width: 1024, height: 1366 },
  { id: "laptop-1280", name: "Laptop 1280", type: "desktop", platform: "desktop", width: 1280, height: 800 }
];

window.DEFAULT_DEVICE_IDS = ["iphone-15", "pixel-8", "ipad-mini"];
