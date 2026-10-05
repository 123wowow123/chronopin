import type { Metadata } from 'next';
import { connection } from 'next/server';
import { H2, LegalPage, legalMetadata, P, UL } from '@/components/legal/LegalPage';
import Link from '@/components/ui/Link';
import { CONTACT_EMAIL, OPERATOR, OPERATOR_REGION } from '@/lib/legal';

// Per request: the hreflang list follows the admin's language setting.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return legalMetadata('/terms', 'legal.termsTitle', 'legal.termsDescription');
}

export default function TermsPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage titleKey="legal.termsTitle">
      <P>
        These terms are an agreement between you and {OPERATOR}, based in {OPERATOR_REGION}, for using chronopin.com and its apps (the &ldquo;site&rdquo;). By using the site you accept them. If you do not agree, please do not use the site.
      </P>

      <H2>What the site is</H2>
      <P>
        {OPERATOR} collects upcoming and past dates (releases, events, launches, deadlines and more) on one timeline, each with the sources it comes from and how firm the date is. Dates change: a pin is our best reading of its sources at the time, not a promise that the event will happen then. Check with the organiser before you travel, buy or decide anything. Nothing on the site, including prices, market odds and company information, is financial, legal or other professional advice.
      </P>

      <H2>Your account</H2>
      <UL>
        <li>You must be at least 13 years old to create an account.</li>
        <li>Give accurate information and keep your password to yourself. You are responsible for what happens under your account.</li>
        <li>We may suspend or close an account that breaks these terms.</li>
      </UL>

      <H2>What you post</H2>
      <P>
        You keep ownership of the pins, comments, listings, messages and other content you post. You give {OPERATOR} a worldwide, non-exclusive, royalty-free licence to host, show, translate, adapt and share that content in order to run and promote the site. You confirm you have the right to post it.
      </P>
      <P>Do not post anything that:</P>
      <UL>
        <li>is unlawful, defamatory, harassing, hateful or sexually explicit, or that threatens anyone;</li>
        <li>infringes someone else&rsquo;s copyright, trademark, privacy or other rights;</li>
        <li>is spam, a scam, malware, or knowingly false or misleading;</li>
        <li>impersonates a person or organisation.</li>
      </UL>
      <P>We may remove content that breaks these rules. To report something, email {mail}; to fix a pin, use &ldquo;Suggest a correction&rdquo; on the pin.</P>

      <H2>Marketplace</H2>
      <P>
        Listings are offers between readers. {OPERATOR} is not a party to any sale, does not handle payment and does not guarantee any item, buyer or seller. Deal with each other carefully and lawfully.
      </P>

      <H2>Ads, shopping and other sites</H2>
      <P>
        The site shows ads and links to shops, ticket sellers, prediction markets and other sites. Some of these links earn {OPERATOR} a commission. We do not control those sites and are not responsible for their content, products or terms.
      </P>

      <H2>Our content</H2>
      <P>
        The site&rsquo;s design, software and the text we write are owned by {OPERATOR}. You may share links and short quotes with credit. Do not copy the site in bulk, scrape it in a way that burdens it, or use it to build a competing database. Quoted sources, images, videos and trademarks belong to their owners.
      </P>
      <P>
        <strong>Copyright complaints:</strong> if you believe something on the site infringes your copyright, email {mail} with the page address, the work you own, and your contact details, and we will review and remove it where appropriate.
      </P>

      <H2>Disclaimers</H2>
      <P>
        The site is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the fullest extent the law allows, {OPERATOR} makes no warranties about its accuracy, completeness or availability, and is not liable for indirect, incidental or consequential losses, or for any loss arising from relying on a date or other information on the site. Where the law does not allow these limits, they apply as far as it does.
      </P>

      <H2>Changes and ending</H2>
      <P>
        We may change the site or these terms. We will post changes here and update the date at the top; continuing to use the site afterwards means you accept them. You can stop using the site and ask us to delete your account at any time, as described in the <Link href="/privacy">Privacy policy</Link>.
      </P>

      <H2>Law</H2>
      <P>These terms are governed by the laws of the State of California, United States, without regard to its conflict-of-law rules. This does not take away any protection the law of your own country gives you.</P>

      <H2>Contact</H2>
      <P>
        {OPERATOR}, {OPERATOR_REGION}. Email: {mail}.
      </P>
    </LegalPage>
  );
}
