import type { Metadata } from 'next';
import { connection } from 'next/server';
import { H2, LegalPage, legalMetadata, Out, P, UL } from '@/components/legal/LegalPage';
import Link from '@/components/ui/Link';
import { CONTACT_EMAIL, OPERATOR, OPERATOR_REGION } from '@/lib/legal';

// Per request: the hreflang list follows the admin's language setting.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return legalMetadata('/privacy', 'legal.privacyTitle', 'legal.privacyDescription');
}

// What AdSense requires (third-party vendors, Google's advertising cookies,
// the opt-out links) is under "Advertising"; what the Amazon Associates
// agreement requires is under "Shopping links".
export default function PrivacyPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage titleKey="legal.privacyTitle">
      <P>
        This policy explains what information {OPERATOR} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects when you use chronopin.com and its apps, how we use it, who we share it with, and the choices you have. {OPERATOR} is based in {OPERATOR_REGION}. Questions go to {mail}.
      </P>

      <H2>Information you give us</H2>
      <UL>
        <li>
          <strong>Account details:</strong> your email address, user name and password (stored only as a secure hash). If you sign in with Google, Apple or Facebook, that service shares your name, email address and profile picture with us.
        </li>
        <li>
          <strong>Profile details you choose to add:</strong> a picture, your birthday (used to keep age-restricted offers and ads away from younger readers) and a default location for the map and weather.
        </li>
        <li>
          <strong>What you post:</strong> pins, comments, reactions, correction suggestions, marketplace listings and ratings, and direct messages. Pins, comments, listings and your profile are public; direct messages are seen only by you and the people in the conversation.
        </li>
        <li>
          <strong>Messages to us</strong>, such as email to {CONTACT_EMAIL}.
        </li>
      </UL>

      <H2>Information collected automatically</H2>
      <UL>
        <li>
          <strong>Usage and device data:</strong> pages you view, searches, the pins, people and companies you follow or watch, your browser and device type, and your IP address.
        </li>
        <li>
          <strong>Approximate location:</strong> the country, region and city your IP address points to, used to choose the right shop for shopping links and to count where ad and shopping clicks come from. We use your device&rsquo;s precise location only if you allow it in your browser.
        </li>
        <li>
          <strong>Clicks on ads and shopping links:</strong> which link, on which page, with your IP address and, if you are signed in, your account.
        </li>
        <li>
          <strong>Notifications:</strong> if you turn on browser notifications, a push subscription your browser creates for us.
        </li>
      </UL>

      <H2>Cookies and similar technologies</H2>
      <P>We and our partners use cookies and local storage for three purposes:</P>
      <UL>
        <li>
          <strong>Essential:</strong> keeping you signed in and remembering your language and theme. The site does not work properly without these.
        </li>
        <li>
          <strong>Analytics:</strong> Google Analytics counts visits and how pages are used, so we can see what readers find useful. See <Out href="https://policies.google.com/technologies/partner-sites">how Google uses information from sites that use its services</Out>; you can opt out with the <Out href="https://tools.google.com/dlpage/gaoptout">Google Analytics opt-out add-on</Out>.
        </li>
        <li>
          <strong>Advertising:</strong> described below.
        </li>
      </UL>
      <P>
        Embedded videos from YouTube, Vimeo and Dailymotion may set their own cookies when you play them. You can block or delete cookies in your browser settings; blocking essential cookies will sign you out.
      </P>

      <H2>Advertising</H2>
      <P>
        We show ads through Google AdSense. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites. Google&rsquo;s use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet.
      </P>
      <P>
        You may opt out of personalised advertising by visiting <Out href="https://adssettings.google.com">Google Ads Settings</Out>. You can also opt out of some third-party vendors&rsquo; use of cookies for personalised advertising at <Out href="https://www.aboutads.info/choices">www.aboutads.info</Out> or, in Europe, <Out href="https://www.youronlinechoices.eu">www.youronlinechoices.eu</Out>. Where the law requires consent for advertising cookies, such as in the European Economic Area, the United Kingdom and Switzerland, you are asked before personalised ads are shown.
      </P>
      <P>Readers under 13 who are signed in are not shown ads, and readers under 18 are not shown sign-up offers.</P>

      <H2>Shopping links</H2>
      <P>
        As an Amazon Associate, {OPERATOR} earns from qualifying purchases. Some links to other shops (such as eBay or Steam) and ticket sellers may also earn us a commission. These links carry a tag that tells the shop the visit came from us; the shop&rsquo;s own privacy policy covers what happens there. What you pay is the same either way.
      </P>

      <H2>How we use information</H2>
      <UL>
        <li>To run the site: show pins, keep your account working, deliver messages and notifications.</li>
        <li>To personalise it: suggest pins, people and companies based on what you read and follow.</li>
        <li>To send account email, such as confirming your address.</li>
        <li>To check suggested corrections and translate pins, which may pass the text you submit through AI services.</li>
        <li>To keep the site safe: prevent spam, abuse and fraud, and enforce our <Link href="/terms">Terms of use</Link>.</li>
        <li>To measure the site and its ads, and to earn the advertising and affiliate income that pays for it.</li>
        <li>To meet legal obligations.</li>
      </UL>

      <H2>Who we share information with</H2>
      <UL>
        <li>
          <strong>Service providers</strong> who run parts of the site for us, under contracts that limit their use of it: hosting (Microsoft Azure), email delivery (Resend), analytics and advertising (Google), sign-in (Google, Apple, Facebook) and AI processing (such as Anthropic).
        </li>
        <li>
          <strong>Everyone</strong>, for what you post publicly.
        </li>
        <li>
          <strong>Authorities or others</strong> when the law requires it, or to protect the rights and safety of our readers and of {OPERATOR}.
        </li>
        <li>
          <strong>A buyer or successor</strong>, if {OPERATOR} is ever sold or merged, under this policy.
        </li>
      </UL>
      <P>We do not sell your personal information for money.</P>

      <H2>How long we keep it</H2>
      <P>
        We keep account information and what you post for as long as your account is open. When you ask us to delete your account, we delete or anonymise your personal information within 30 days, except where we must keep it for legal reasons. Server logs and click records are kept for up to 24 months.
      </P>

      <H2>Your choices and rights</H2>
      <P>
        You can see and edit most of your information in your profile and settings. To get a copy of your information, correct it, or delete your account, email {mail} from the address on your account. We reply within 30 days.
      </P>
      <P>
        <strong>California residents</strong> have the right to know what personal information we collect, use and disclose; to delete and correct it; to opt out of its &ldquo;sale&rdquo; or &ldquo;sharing&rdquo;; and not to be treated differently for using these rights. We do not sell personal information. The advertising cookies described above may count as &ldquo;sharing&rdquo; for cross-context behavioural advertising; you can opt out through Google Ads Settings or by emailing us. You may use an authorised agent to make a request.
      </P>
      <P>
        <strong>Readers in the European Economic Area, the United Kingdom and Switzerland</strong> also have the right to object to or restrict our use of their information, to data portability, and to complain to their data protection authority. We rely on our contract with you to run your account, on your consent for advertising cookies where it is required, and on our legitimate interest in running, securing and improving the site for the rest.
      </P>

      <H2>Children</H2>
      <P>
        {OPERATOR} is not directed at children under 13, and we do not knowingly collect personal information from them. If you believe a child under 13 has given us personal information, email {mail} and we will delete it.
      </P>

      <H2>Security and where data is stored</H2>
      <P>
        We protect information with encryption in transit, hashed passwords and restricted access to our servers. No system is perfectly secure. Our servers are in the United States, so information from other countries is transferred there.
      </P>

      <H2>Changes</H2>
      <P>We will post any change to this policy on this page and update the date at the top. If a change is significant, we will tell signed-in readers on the site or by email.</P>

      <H2>Contact</H2>
      <P>
        {OPERATOR}, {OPERATOR_REGION}. Email: {mail}. See also the <Link href="/contact">contact page</Link>.
      </P>
    </LegalPage>
  );
}
