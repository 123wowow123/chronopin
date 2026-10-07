import Anchor from '@/components/ui/Anchor';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { restaurantMenuFor, restaurantMenuState, type RestaurantMenu, type RestaurantSpecial } from '@/lib/restaurantMenus';
import { RestaurantMenuTabs } from './RestaurantMenuTabs';
import styles from './RestaurantMenu.module.css';

function SourceLink({ url, children }: { url: string; children: ReactNode }) {
  return <Anchor href={url} target="_blank" rel="noopener noreferrer" className={styles.source}>{children} <span aria-hidden="true">↗</span></Anchor>;
}

function MenuContent({ menu }: { menu: RestaurantMenu }) {
  const categories = [...new Set(menu.items.map((item) => item.category || 'Menu'))];
  const amount = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
  return (
    <div>
      <div className={styles.menuHeading}>
        <h3 className={styles.menuTitle}>{menu.label}</h3>
        <SourceLink url={menu.url}>Restaurant’s original menu</SourceLink>
      </div>
      {menu.note ? <p className={styles.note}>{menu.note}</p> : null}
      {menu.items.length ? <div className={styles.menuItems} tabIndex={0} aria-label={`${menu.label} items`}>
        <div className={styles.categories}>{categories.map((category) => {
          const items = menu.items.filter((item) => (item.category || 'Menu') === category);
          return <section key={category} className={styles.category}>
            <div className={styles.categoryHeading}><h4 className={styles.categoryTitle}>{category}</h4><span className={styles.categoryCount} aria-label={`${items.length} items`}>{items.length.toString().padStart(2, '0')}</span></div>
            <dl>{items.map((item, index) => (
              <div key={`${item.name}-${index}`} className={styles.item}>
                <dt className={styles.dish}>
                  <span className={styles.dishLine}><span className={styles.dishName}>{item.name}</span><span className={styles.leader} aria-hidden="true" /></span>
                  {item.note ? <span className={styles.dishNote}>{item.note}</span> : null}
                </dt>
                <dd className={styles.price}>{item.price != null ? amount(item.price) : item.priceLabel || 'Price not published'}</dd>
              </div>
            ))}</dl>
          </section>;
        })}</div>
      </div> : null}
      {menu.pages?.length ? <div className={styles.documentPages}>{menu.pages.map((page, index) => (
        <Image key={page.src} src={page.src} width={page.width} height={page.height} sizes="(max-width: 760px) 100vw, 80vw" alt={`${menu.label} — page ${index + 1} of ${menu.pages!.length}`} className={styles.documentPage} />
      ))}</div> : menu.documentUrl ? <div className={styles.documentLink}>
        <SourceLink url={menu.documentUrl}>View the full {menu.label.toLowerCase()} document</SourceLink>
        <p className={styles.note}>Open the restaurant’s published document to browse every page.</p>
      </div> : null}
    </div>
  );
}

function Special({ special }: { special: RestaurantSpecial }) {
  return (
    <article className={styles.offer}>
      <h4 className={styles.offerTitle}>{special.title}</h4>
      {special.schedule ? <p className={styles.schedule}>{special.schedule}</p> : null}
      <p className={styles.offerDescription}>{special.description}</p>
      {special.conditions?.length ? <ul className={styles.conditions}>{special.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul> : null}
      <div className={styles.offerSource}><SourceLink url={special.sourceUrl}>Offer details</SourceLink></div>
    </article>
  );
}

// Curated branch-specific information. Missing information is a verification
// gap, not a claim that a venue has no menu or offers.
export function PinRestaurantMenu({ sourceUrl, today }: { sourceUrl: string | null | undefined; today: string }) {
  const profile = restaurantMenuFor(sourceUrl);
  if (!profile) return null;
  const { rescrapeCandidate, specials } = restaurantMenuState(profile, today);
  const lunch = specials.filter((special) => special.kind === 'lunch');
  const other = specials.filter((special) => special.kind === 'other');
  const checked = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${profile.checkedAt}T00:00:00Z`));
  const tabs = profile.menus.filter((menu) => menu.items.length || menu.documentUrl).map((menu) => ({ label: menu.label, content: <MenuContent menu={menu} /> }));
  if (lunch.length) tabs.push({ label: 'Lunch specials', content: <div>
    <h3 className={styles.menuTitle}>Lunch specials</h3>
    <div className={styles.offers}>{lunch.map((special) => <Special key={special.title} special={special} />)}</div>
    {profile.lunchNote ? <p className={styles.note}>{profile.lunchNote.text} <SourceLink url={profile.lunchNote.sourceUrl}>Lunch locations</SourceLink></p> : null}
  </div> });
  if (other.length) tabs.push({ label: 'Other specials', content: <div>
    <h3 className={styles.menuTitle}>Happy hour & other specials</h3>
    <div className={styles.offers}>{other.map((special) => <Special key={special.title} special={special} />)}</div>
  </div> });
  return (
    <section id="restaurant-menu" aria-label="Menu and specials" lang="en" data-rescrape-candidate={rescrapeCandidate ? 'true' : undefined} className={styles.pane}>
      <div className={styles.header}>
        <div><p className={styles.eyebrow}>{profile.name}</p><h2 className={styles.title}>Menu & specials</h2></div>
        <span className={styles.checked}>Checked {checked}</span>
      </div>
      <div className={styles.body}>
        {rescrapeCandidate ? <p role="status" className={styles.update}>Update due. Showing the last verified menu and specials; check the restaurant’s links for the latest details.</p> : null}
        {tabs.length ? <RestaurantMenuTabs tabs={tabs} /> : <div className={styles.note}><p>A menu or special has not been verified for this location yet.</p><div className="mt-2"><SourceLink url={profile.pinSourceUrl}>Restaurant opening source</SourceLink></div></div>}
        <p className={styles.footer}>Prices in USD. Times are local to the restaurant. Confirm availability before visiting.</p>
      </div>
    </section>
  );
}
