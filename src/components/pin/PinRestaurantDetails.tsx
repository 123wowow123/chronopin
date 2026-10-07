import Anchor from '@/components/ui/Anchor';
import { restaurantDetailsFor, restaurantPhoneHref } from '@/lib/restaurantDetails';
import styles from './RestaurantDetails.module.css';
import { RestaurantPriceRange } from './RestaurantPriceRange';

export function PinRestaurantDetails({ sourceUrl, name, isRestaurant, priceRange }: {
  sourceUrl: string | null | undefined;
  name: string;
  isRestaurant: boolean | undefined;
  priceRange?: string;
}) {
  const details = restaurantDetailsFor(sourceUrl);
  if (!isRestaurant && !details) return null;
  return (
    <section id="restaurant-details" aria-labelledby="restaurant-details-title" lang="en" className={styles.pane}>
      <div className={styles.header}>
        <div><p className={styles.eyebrow}>{details?.name || name}</p><h2 id="restaurant-details-title" className={styles.title}>Plan your visit</h2></div>
      </div>
      <dl className={styles.details}>
        {priceRange && /^\${1,4}$/.test(priceRange) ? <div className={styles.row}>
          <dt>Price range</dt>
          <dd><RestaurantPriceRange range={priceRange} /></dd>
        </div> : null}
        <div className={styles.row}>
          <dt>Website</dt>
          <dd>{details?.websiteUrl ? <Anchor href={details.websiteUrl} target="_blank" rel="noopener noreferrer">{new URL(details.websiteUrl).hostname.replace(/^www\./, '')} <span aria-hidden="true">↗</span></Anchor> : <span className={styles.missing}>Not verified yet</span>}</dd>
        </div>
        <div className={styles.row}>
          <dt>Phone</dt>
          <dd>{details?.phone ? <Anchor href={restaurantPhoneHref(details.phone)}>{details.phone}</Anchor> : <span className={styles.missing}>Phone not verified yet</span>}</dd>
        </div>
        <div className={styles.row}>
          <dt>Opening days & hours</dt>
          <dd>{details?.openingHours.length ? <>
            <ul className={styles.hours}>{details.openingHours.map((entry) => <li key={entry.days}><span>{entry.days}</span><span>{entry.hours}</span></li>)}</ul>
            <p className={styles.note}>Times are local to the restaurant.</p>
          </> : <span className={styles.missing}>Hours not verified yet</span>}
          {details?.hoursNote ? <p className={styles.note}>{details.hoursNote}</p> : null}</dd>
        </div>
      </dl>
      {details && (details.detailsSourceUrl || details.additionalSources?.length) ? <div className={styles.footer}>
        <div className={styles.sources}>
          {details.detailsSourceUrl ? <Anchor href={details.detailsSourceUrl} target="_blank" rel="noopener noreferrer">Restaurant’s contact & hours <span aria-hidden="true">↗</span></Anchor> : null}
          {details.additionalSources?.map((source) => <Anchor key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.label} <span aria-hidden="true">↗</span></Anchor>)}
        </div>
        <span>Checked {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${details.checkedAt}T00:00:00Z`))}</span>
      </div> : null}
    </section>
  );
}
