import { restaurantDishImages, restaurantMenuAmount, type RestaurantMenuItem } from '@/lib/restaurantMenus';
import { MenuItemReviews } from './MenuItemReviews';
import styles from './RestaurantMenu.module.css';

// Photos and menu rows open the same dish viewer, with reviews above its image.
export function FoodPhotoStrip({ items, pinId }: { items: { item: RestaurantMenuItem; currency?: string }[]; pinId: number }) {
  const gallery = items.map((entry) => entry.item);
  return <div className={styles.foodStrip}>
    <h3 className={styles.menuTitle}>Food photos</h3>
    <ul className={styles.foodStripList}>
      {items.map(({ item, currency }) => <li key={restaurantDishImages(item)[0].src} className={styles.foodStripItem}>
        <MenuItemReviews pinId={pinId} item={item} gallery={gallery} photoOnly />
        <span className={styles.foodStripCaption}>{item.name}{item.priceLabel || item.price != null ? ` · ${item.priceLabel ?? restaurantMenuAmount(item.price as number, currency)}` : ''}</span>
      </li>)}
    </ul>
  </div>;
}
