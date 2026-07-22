"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "mm_founder_mode";
const EVENT = "mm:founder-mode-changed";

/**
 * Tiny cross-component toggle for the "Founder Mode" easter egg (Wow Factor #3). Backed by
 * localStorage plus a custom window event so every mounted instance (Command Palette, Sidebar)
 * stays in sync within the same tab — the native `storage` event only fires in *other* tabs.
 */
export function useFounderMode() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(localStorage.getItem(KEY) === "1");
    const onChange = () => setEnabled(localStorage.getItem(KEY) === "1");
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const toggle = useCallback(() => {
    const next = localStorage.getItem(KEY) !== "1";
    localStorage.setItem(KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { enabled, toggle };
}
