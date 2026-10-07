'use client';

import { useId, useState, type ReactNode, type KeyboardEvent } from 'react';
import styles from './RestaurantMenu.module.css';

export function RestaurantMenuTabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const active = Math.min(selected, tabs.length - 1);
  if (tabs.length === 1) return <div>{tabs[0].content}</div>;

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % tabs.length; break;
      case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setSelected(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }
  return (
    <div>
      <div role="tablist" aria-label="Restaurant menus and specials" className={styles.tabs}>
        {tabs.map((tab, index) => (
          <button key={tab.label} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={(event) => move(event, index)} className={styles.tab}>
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div key={tab.label} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={active !== index} tabIndex={0}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
