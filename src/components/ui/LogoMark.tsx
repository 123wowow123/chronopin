// The Chronopin mark: past, present and future as three overlapping pins
// growing toward the viewer, in a sunset ramp (yellow, orange, rose). Hovering
// the enclosing `group` (the header link) makes them jump one after another,
// front to back. The delays are inline because the `animate-hop` shorthand
// would reset a class-set animation-delay. The favicon is rendered from this
// component: rerun `npm run favicon:build` after changing it.
const PIN = 'M16 31c-1.1 0-11-9.3-11-19a11 11 0 0 1 22 0c0 9.7-9.9 19-11 19zM20.5 12a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0z';

const PINS = [
  { fill: '#fde047', tip: [5.5, 17.5], scale: 0.44, delay: 560 },
  { fill: '#fb923c', tip: [12.5, 24], scale: 0.62, delay: 280 },
  { fill: '#f43f5e', tip: [21.5, 31.5], scale: 0.82, delay: 0 },
];

export function LogoMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`inline-block shrink-0 overflow-visible ${className}`} aria-hidden>
      {PINS.map(({ fill, tip: [x, y], scale, delay }) => (
        <g key={fill} className="motion-safe:group-hover:animate-hop" style={{ animationDelay: `${delay}ms` }}>
          <path
            d={PIN}
            fill={fill}
            fillRule="evenodd"
            transform={`translate(${x} ${y}) scale(${scale}) translate(-16 -31)`}
          />
        </g>
      ))}
    </svg>
  );
}
