'use client';

import { useEffect } from 'react';

const STYLE_ID = 'chronopin-hide-dev-issues';

// Development only: hides the dev overlay's "N Issues" pill, which
// devIndicators: false leaves in place. The pill lives in the overlay's shadow
// root, out of reach of globals.css, so the rule goes in there. Compile errors
// still open the full error dialog; runtime errors show in the console.
export function HideDevIssues() {
  useEffect(() => {
    const hide = () => {
      const root = document.querySelector('nextjs-portal')?.shadowRoot;
      if (!root || root.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = '[data-nextjs-toast] { display: none !important; }';
      root.appendChild(style);
    };
    hide();
    // The portal can mount (or remount after a full refresh of the overlay) later.
    const observer = new MutationObserver(hide);
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
