'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import Anchor from '@/components/ui/Anchor';
import { RestaurantMenuTabs } from '@/components/pin/RestaurantMenuTabs';
import { MenuItemReviews } from '@/components/pin/MenuItemReviews';
import { isDrinkCategory } from '@/lib/menuCategories';
import { restaurantMenuAmount, restaurantMenuCategories, type RestaurantMenu } from '@/lib/restaurantMenus';
import styles from './RestaurantGuide.module.css';

export function RestaurantOfferMenu({ menu, restaurant, pinId, specials = true, preferDrinks = false }: { menu?: RestaurantMenu; pinId?: number | null; restaurant: string; specials?: boolean; preferDrinks?: boolean }) {
  const id = useId();
  // A pick made under the other preference no longer applies, so a drink-price sort reopens on drinks.
  const [pick, setPick] = useState<{ name: string; drinks: boolean } | null>(null);
  const selected = pick && pick.drinks === preferDrinks ? pick.name : null;
  const [expanded, setExpanded] = useState(false);
  if (!menu) return null;
  const categories = restaurantMenuCategories(menu.items);
  const category = categories.find((category) => category === selected) ?? (preferDrinks ? categories.find(isDrinkCategory) : undefined) ?? categories[0];
  // The iconic dish leads its section so the collapsed list always shows it.
  const items = menu.items.filter((item) => (item.category || 'Menu') === category).sort((a, b) => Number(Boolean(b.iconic)) - Number(Boolean(a.iconic)));
  const shown = expanded ? items : items.slice(0, 6);
  const gallery = menu.items;
  const amount = (price: number) => restaurantMenuAmount(price, menu.currency);
  const source = menu.documentUrl || menu.url;

  return <div className={styles.offerMenuBlock}>
    <div className={styles.offerMenuHeading}>
      <h5>{specials ? 'Specials menu' : menu.label}{menu.coverage === 'sample' && ' · selected items'}</h5>
      <Anchor href={source} target="_blank" rel="noopener noreferrer">Published menu ↗</Anchor>
    </div>
    {categories.length > 1 && <div className={styles.offerMenuCategories} role="group" aria-label={`${restaurant} ${specials ? 'specials' : 'menu'} sections`}>
      {categories.map((categoryName) => <button key={categoryName} type="button" aria-pressed={category === categoryName} onClick={() => { setPick({ name: categoryName, drinks: preferDrinks }); setExpanded(false); }}>{categoryName}</button>)}
    </div>}
    {shown.length > 0 ? <>
      <ul id={id} className={styles.offerMenu} aria-label={`${restaurant} ${category} ${specials ? 'specials' : 'items'}`}>
        {shown.map((item, index) => <li key={`${item.name}-${index}`}><div className={styles.offerMenuDish}><MenuItemReviews hideEmpty pinId={pinId} item={item} gallery={gallery}><span>{item.name}{item.note && <small>{item.note}</small>}</span></MenuItemReviews></div><div className={styles.offerMenuPrice}><strong>{item.priceLabel ?? (item.price != null ? amount(item.price) : 'Price not published')}</strong>{item.iconic ? <em className={styles.iconicLabel}>Iconic</em> : null}</div></li>)}
      </ul>
      {items.length > 6 && <button type="button" className={styles.offerMenuExpand} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((expanded) => !expanded)}>{expanded ? 'Show fewer items' : `Show all ${items.length} items`}</button>}
    </> : menu.pages?.length ? <div className={styles.offerMenuPages}>
      {menu.pages.map((page, index) => <Anchor key={page.src} href={page.src} target="_blank" rel="noopener noreferrer"><Image src={page.src} width={page.width} height={page.height} unoptimized alt={`${restaurant} ${menu.label} — ${page.label || `page ${index + 1}`}`} /></Anchor>)}
    </div> : <p className={styles.offerMenuMissing}>Item details haven’t been added yet. <Anchor href={source} target="_blank" rel="noopener noreferrer">Open the published menu ↗</Anchor></p>}
  </div>;
}

// Keep the card compact while making every saved menu and dish reachable.
export function RestaurantCardMenus({ menus = [], restaurant, pinId, preferDrinks = false }: { menus?: RestaurantMenu[]; restaurant: string; pinId: number; preferDrinks?: boolean }) {
  if (!menus.length) return null;
  // A drink-price sort opens the drinks menu when the restaurant lists one separately.
  const isDrinkMenu = (menu: RestaurantMenu) => isDrinkCategory(menu.label) || (menu.items.length > 0 && menu.items.every((item) => isDrinkCategory(item.category || 'Menu')));
  const first = preferDrinks ? Math.max(0, menus.findIndex(isDrinkMenu)) : 0;
  return <div className={styles.cardMenus}><RestaurantMenuTabs key={preferDrinks ? 'drinks' : 'food'} initial={first} label={`${restaurant} menus`} tabs={menus.map((menu) => ({
    label: menu.label,
    content: <><RestaurantOfferMenu menu={menu} pinId={pinId} restaurant={restaurant} specials={false} preferDrinks={preferDrinks} />{menu.note && <p className={styles.offerSchedule}>{menu.note}</p>}</>,
  }))} /></div>;
}
