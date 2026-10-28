import { LikeButton } from './LikeButton';

// The like button every landing-page tile carries: the top-right corner of its
// photo. Place it as a direct child of the tile (`position: relative`), beside
// the photo link rather than inside it.
export function CardLike({ pin }: { pin: React.ComponentProps<typeof LikeButton>['pin'] }) {
  return (
    <span className="absolute end-3 top-3 z-10 rounded-md bg-[var(--paper)]/90 shadow-md backdrop-blur-xs">
      <LikeButton pin={pin} />
    </span>
  );
}
