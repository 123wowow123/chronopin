// Who runs the site, for the About, Contact, Privacy and Terms pages. AdSense
// and the Amazon Associates agreement both want a named operator, a way to
// reach them and a privacy policy that says how ads use cookies.

export const OPERATOR = 'Chronopin';
// Forwarded to the team's inbox by ImprovMX (any address @chronopin.com).
export const CONTACT_EMAIL = 'contact@chronopin.com';
export const OPERATOR_REGION = 'California, United States';

// The day the Privacy and Terms text last changed. Bump it with every edit.
export const LEGAL_UPDATED = '2026-10-04';

// The site-wide links in the footer, in order.
export const LEGAL_PATHS = { about: '/about', privacy: '/privacy', terms: '/terms', contact: '/contact' } as const;
