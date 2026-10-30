# Premium price and odds alerts (0236)

A Premium reader presses **Alert me** on a prediction market's odds box or on a stock ticker of a pin, picks a size (±2/5/10/20) and is told when the value has moved more than that.

- **Markets** move in *percentage points of chance* — any outcome of the market counts, the biggest mover is named. **Stocks** move in *percent of price*.
- **Baseline.** `MoveAlert.baseline` is what the move is measured from (`{ "<outcome>": points }` or `{ "price": dollars }`), read when the alert is set. Telling the reader replaces it with the value they were told, so one swing is one notification. `MoveAlert.claim` (compare-and-set on the old baseline) makes it once-only across servers.
- **Timer.** `src/server/services/moveAlerts.ts`, started from `instrumentation.node.ts`, every 60 s. Reads each distinct market (`oddsFor`, 20 s cache) and stock (`identify`, Nasdaq) once for all readers, skipping readers whose plan has lapsed (rows are kept, renewing turns them back on). Needs a dev-server restart to start.
- **Delivery.** `Notification` type `move` (`Notification.move` jsonb: kind, label, outcome, from, to, unit) in the bell, live feed `alert` event and Web Push (`tag move-<id>`), text localized from `moveAlerts.rose` / `moveAlerts.fell`.
- **Trust.** The API (`/api/move-alerts`) derives a market's link from the pin's own links and accepts only tickers the pin shows; Premium (or admin) is checked on every create. Max 50 alerts per reader.
- **Trade disclosures** for people a reader follows are the existing `PersonTradeWatch` / `PersonTradeWatchAll` `trade` notifications (docs/people.md), free for everyone; the alerts section on `/profile/notifications` points to them.
- UI: `MoveAlertButton` (odds box footer, stock details row), `MoveAlertsList` on `/profile/notifications`, `useMoveAlerts` store in `src/lib/client/moveAlerts.ts`.
