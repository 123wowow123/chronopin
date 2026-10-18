// A single <meta name="..." content="..."> tag on every page, for a site
// ownership check an ad or affiliate network asks for (Impact, the network
// behind the account's ad programs, issues one; another network's would use
// its own tag name). Both the tag's name and its code can change when the
// account is re-verified, moved, or a different network is added, so both
// are admin settings rather than baked into layout.tsx. An admin setting -
// this is only its default, what Ian supplied on 2026-10-02.
export type SiteVerificationSetting = { name: string | null; value: string | null };

export const DEFAULT_SITE_VERIFICATION: SiteVerificationSetting = {
  name: 'impact-site-verification',
  value: '3a0c6dad-91ba-4058-81b4-2edaa4e1283d',
};

const MAX_LENGTH = 200;

// A stored or submitted value as a setting, or the problem with it. Blank or
// null on either side drops the tag - a name with no code or a code with no
// name is not a real tag. Nothing about the strings is checked beyond a sane
// length; the admin pastes whatever the network's dashboard gives.
export function parseSiteVerification(value: unknown): { setting: SiteVerificationSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { name, value }' };
  }
  const { name, value: code } = value as Record<string, unknown>;
  if (name != null && typeof name !== 'string') {
    return { problem: 'name must be a string or null' };
  }
  if (code != null && typeof code !== 'string') {
    return { problem: 'value must be a string or null' };
  }
  const trimmedName = name?.trim() || null;
  const trimmedValue = code?.trim() || null;
  if ((trimmedName && trimmedName.length > MAX_LENGTH) || (trimmedValue && trimmedValue.length > MAX_LENGTH)) {
    return { problem: `name and value must each be ${MAX_LENGTH} characters or fewer` };
  }
  // A meta tag's name is an HTML attribute value, not markup, but keep it to
  // the characters a real tag name uses so a typo cannot smuggle in markup.
  if (trimmedName && !/^[\w-]+$/.test(trimmedName)) {
    return { problem: 'name must be letters, numbers, hyphens or underscores only' };
  }
  return { setting: { name: trimmedName, value: trimmedValue } };
}
