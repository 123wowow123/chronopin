import type { SVGProps } from "react";

// A store's own mark on its buy button (src/lib/shopping.ts), drawn in the
// button's text colour, as StreamingLogo does for the Watch on buttons.
//
// From Simple Icons (simpleicons.org, CC0, v16.32.0), one path on a 24x24
// box. It has no Amazon (Amazon asked for its removal, and the Associates
// agreement limits how its marks are used), Mercari, GOAT, Back Market or
// Swappa: those buttons show the name on the store's colour alone.
//
// WORDMARKS spell the name, so the button shows the mark alone, cropped to
// the letters (the icon box leaves most of its height empty).
const MARKS: Record<string, string> = {
  // OpenTable's symbol, from its logo SVG (OpenTable, via Wikimedia Commons).
  OpenTable:
    "M229.0112 327.0475c0-.635.51117-1.14988 1.14141-1.14988.6305 0 1.14168.51488 1.14168 1.14988 0 .63526-.51118 1.15014-1.14168 1.15014-.63024 0-1.14141-.51461-1.14141-1.15014zm8.0182 1.15014c-.6305 0-1.14141-.51488-1.14141-1.15014 0-.635.51091-1.14988 1.14141-1.14988.63024 0 1.14167.51488 1.14167 1.14988 0 .63526-.51143 1.15014-1.14167 1.15014zm0-5.74992c-2.52148 0-4.56592 2.05952-4.56592 4.59978 0 2.54079 2.04417 4.60005 4.56592 4.60005 2.52201 0 4.56618-2.05926 4.56618-4.60005 0-2.54-2.04417-4.59978-4.56618-4.59978z",
  Facebook:
    "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  StockX:
    "M13.74 16.5 22.5 24v-6l-7-6 7-6V0L10.26 10.5v-3L1.5 0v6l7 6-7 6v6l12.24-10.5Z",
};

const WORDMARKS: Record<string, { viewBox: string; d: string }> = {
  eBay: {
    viewBox: "0 7 24 10.5",
    d: "M6.056 12.132v-4.92h1.2v3.026c.59-.703 1.402-.906 2.202-.906 1.34 0 2.828.904 2.828 2.855 0 .233-.015.457-.06.668.24-.953 1.274-1.305 2.896-1.344.51-.018 1.095-.018 1.56-.018v-.135c0-.885-.556-1.244-1.53-1.244-.72 0-1.245.3-1.305.81h-1.275c.136-1.29 1.5-1.62 2.686-1.62 1.064 0 1.995.27 2.415 1.02l-.436-.84h1.41l2.055 4.125 2.055-4.126H24l-3.72 7.305h-1.346l1.07-2.04-2.33-4.38c.13.255.2.555.2.93v2.46c0 .346.01.69.04 1.005H16.8a6.543 6.543 0 01-.046-.765c-.603.734-1.32.96-2.32.96-1.48 0-2.272-.78-2.272-1.695 0-.15.015-.284.037-.405-.3 1.246-1.36 2.086-2.767 2.086-.87 0-1.694-.315-2.2-.93 0 .24-.015.494-.04.734h-1.18c.02-.39.04-.855.04-1.245v-1.05h-4.83c.065 1.095.818 1.74 1.853 1.74.718 0 1.355-.3 1.568-.93h1.24c-.24 1.29-1.61 1.725-2.79 1.725C.95 15.009 0 13.822 0 12.232c0-1.754.982-2.91 3.116-2.91 1.688 0 2.93.886 2.94 2.806v.005zm9.137.183c-1.095.034-1.77.233-1.77.95 0 .465.36.97 1.305.97 1.26 0 1.935-.69 1.935-1.814v-.13c-.45 0-.99.006-1.484.022h.012zm-6.06 1.875c1.11 0 1.876-.806 1.876-2.02s-.768-2.02-1.893-2.02c-1.11 0-1.89.806-1.89 2.02s.765 2.02 1.875 2.02h.03zm-4.35-2.514c-.044-1.125-.854-1.546-1.725-1.546-.944 0-1.694.474-1.815 1.546z",
  },
};

export const isStoreWordmark = (store: string) => store in WORDMARKS;

export function StoreLogo({
  store,
  ...props
}: { store: string } & SVGProps<SVGSVGElement>) {
  const mark =
    WORDMARKS[store] ??
    (MARKS[store] && { viewBox: store === 'OpenTable' ? '228.87891 322.31543 12.849 9.464' : "0 0 24 24", d: MARKS[store] });
  if (!mark) return null;
  return (
    <svg
      viewBox={mark.viewBox}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={mark.d} fillRule={store === 'OpenTable' ? 'evenodd' : undefined} />
    </svg>
  );
}
