'use client';

// Direct messages on the client: the unread chat count pushed over the live
// stream ('messages'), and the chat windows docked at the bottom of a wide
// screen, which stay open as the reader moves between pages (and, through
// sessionStorage, across a reload).

import { useSyncExternalStore } from 'react';
import { onLive } from './liveFeed';

export type ChatUser = { id: number; userName: string; pictureUrl?: string | null };
export type ChatMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  // Empty once unsent.
  body: string;
  utcCreatedDateTime: string;
  unsent: boolean;
  // The earlier message this one answers, quoted above it.
  replyTo: { id: number; senderId: number; body: string; unsent: boolean } | null;
};
export type DirectMessageEvent =
  | { kind: 'message'; message: ChatMessage; with: ChatUser }
  | { kind: 'update'; message: ChatMessage; with: ChatUser }
  | { kind: 'read'; conversationId: number; userId: number; messageId: number };

// Windows open side by side at most; more and the oldest folds into a bubble.
const MAX_OPEN = 3;
const STORE_KEY = 'chronopin.chats';
// Where the dock takes over from the /messages page (Tailwind's lg).
const WIDE = '(min-width: 1024px)';

// unread: messages that came in while it was folded, counted on its bubble.
export type DockedChat = { user: ChatUser; minimized: boolean; unread?: number };

let unread = 0;
let stopUnread: (() => void) | null = null;
const unreadListeners = new Set<() => void>();

function subscribeUnread(listener: () => void) {
  unreadListeners.add(listener);
  stopUnread ??= onLive<{ unreadCount: number }>('messages', ({ unreadCount }) => {
    if (unreadCount === unread) return;
    unread = unreadCount;
    unreadListeners.forEach((l) => l());
  });
  return () => {
    unreadListeners.delete(listener);
    if (!unreadListeners.size && stopUnread) {
      stopUnread();
      stopUnread = null;
    }
  };
}

const noSubscribe = () => () => {};

export function useUnreadChats(signedIn: boolean) {
  const count = useSyncExternalStore(signedIn ? subscribeUnread : noSubscribe, () => unread, () => 0);
  return signedIn ? count : 0;
}

let docked: DockedChat[] = [];
let loaded = false;
const dockListeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]');
    if (Array.isArray(saved)) docked = saved.filter((c) => c?.user?.id && c.user.userName).slice(0, 8);
  } catch {
    // storage unavailable; start empty
  }
}

function setDocked(next: DockedChat[]) {
  docked = next;
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable; the dock just won't survive a reload
  }
  dockListeners.forEach((l) => l());
}

// Keeps at most MAX_OPEN windows unfolded, folding the ones opened longest ago.
function fold(list: DockedChat[]) {
  let open = 0;
  return list.map((chat) => (chat.minimized ? chat : ++open > MAX_OPEN ? { ...chat, minimized: true } : chat));
}

// Opens the chat with user: a window in the dock on a wide screen, the
// /messages page otherwise (the caller navigates there when this is false).
export function openChat(user: ChatUser): boolean {
  if (!isWide()) return false;
  load();
  const rest = docked.filter((c) => c.user.id !== user.id);
  setDocked(fold([{ user, minimized: false, unread: 0 }, ...rest]));
  return true;
}

export function closeChat(userId: number) {
  setDocked(docked.filter((c) => c.user.id !== userId));
}

// A message from someone whose chat is not open: it waits as a folded
// bubble with a count, unread, rather than opening (which would read it).
export function chatMessageArrived(user: ChatUser) {
  if (!isWide()) return;
  load();
  const chat = docked.find((c) => c.user.id === user.id);
  if (chat && !chat.minimized) return;
  const waiting = { user, minimized: true, unread: (chat?.unread ?? 0) + 1 };
  setDocked([waiting, ...docked.filter((c) => c.user.id !== user.id)]);
}

export function setChatMinimized(userId: number, minimized: boolean) {
  const chat = docked.find((c) => c.user.id === userId);
  if (!chat) return;
  if (minimized) {
    setDocked(docked.map((c) => (c.user.id === userId ? { ...c, minimized } : c)));
  } else {
    setDocked(fold([{ ...chat, minimized: false, unread: 0 }, ...docked.filter((c) => c.user.id !== userId)]));
  }
}

function subscribeDock(listener: () => void) {
  load();
  dockListeners.add(listener);
  return () => dockListeners.delete(listener);
}

const noChats: DockedChat[] = [];

export function useDockedChats() {
  return useSyncExternalStore(subscribeDock, () => docked, () => noChats);
}

export const messagesHref = (userId?: number) => (userId ? `/messages?with=${userId}` : '/messages');

// /messages was opened from a page of the site (the chats panel, or a Message
// button on a phone), so its back arrow can step back to that page, where it
// was scrolled to. Picking chats there replaces the URL rather than adding to
// history, which keeps that page one step back. sessionStorage, so a reload
// on the way still knows; refused storage means the arrow goes home.
const FROM_PAGE = 'messages:from';

export function leaveForMessages() {
  try {
    sessionStorage.setItem(FROM_PAGE, '1');
  } catch {
    // no way back but home
  }
}

// Whether a page of the site is one step back; the mark is taken off.
export function backFromMessages(): boolean {
  try {
    const from = sessionStorage.getItem(FROM_PAGE);
    sessionStorage.removeItem(FROM_PAGE);
    return from === '1';
  } catch {
    return false;
  }
}

export const isWide = () => window.matchMedia(WIDE).matches;
