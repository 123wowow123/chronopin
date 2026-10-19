'use client';

// Whether the big tag cloud is open. The search box holds its searches while it
// is, and runs the latest one when the cloud closes.
export const TAG_CLOUD_EVENT = 'chronopin:tag-cloud';

let open = false;

export const isTagCloudOpen = () => open;

export function setTagCloudOpen(next: boolean) {
  if (open === next) return;
  open = next;
  window.dispatchEvent(new CustomEvent(TAG_CLOUD_EVENT, { detail: next }));
}

// The cloud asks the search box to take a query without searching ({ q }).
export const CLOUD_QUERY_EVENT = 'chronopin:cloud-query';
// The search box says what it now holds, unsearched, while the cloud is open ({ q }).
export const HELD_QUERY_EVENT = 'chronopin:held-query';
