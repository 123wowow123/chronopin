import { RefineLink } from './RefineLink';

// A pin's address with each part of it a search for the pins standing there.
//
// The address is one line, written by whoever placed the pin, running from
// the most particular part to the least ("Brooklyn Bridge, New York, NY,
// USA"), so its own commas are what there is to split on: the venue, the
// city, the state, the country. Each part keeps its place in the line, so it
// still reads as it was written.
export function PlaceLinks({ address, className }: { address: string; className?: string }) {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  // An address with no comma is one place, and a link on the whole of it is
  // the same search as a link on its only part.
  return (
    <span className={className}>
      {parts.map((part, at) => (
        <span key={`${part}-${at}`}>
          {at ? ', ' : null}
          <RefineLink field="place" value={part} className="text-inherit hover:text-ink hover:no-underline">
            {part}
          </RefineLink>
        </span>
      ))}
    </span>
  );
}
