import { TRAINING_BASIS_WORDS, formatDatasetSize, formatFlop, formatParameters, formatTrainingDays, hasModelTraining, type PinModelTrainingJson } from '@/lib/modelTraining';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { pinPath } from '@/lib/seo';

// An AI model's training metrics as telemetry tiles, laid out like the datacenter water tile. A figure the
// sources do not publish reads "Unknown" rather than disappearing, as on the Epoch AI model page.
export function PinModelTraining({ training, className = '' }: { training: PinModelTrainingJson; className?: string }) {
  if (!hasModelTraining(training)) return null;
  const tiles: { label: string; dot: string; value: string | null; sub: string; href?: string; hrefTitle?: string }[] = [
    { label: 'Parameters', dot: 'bg-violet-400', value: training.parametersBillions != null ? formatParameters(training.parametersBillions) : null, sub: 'model weights' },
    { label: 'Training compute', dot: 'bg-amber-400', value: training.trainingComputeFlop != null ? formatFlop(training.trainingComputeFlop) : null, sub: training.basis ? TRAINING_BASIS_WORDS[training.basis] : 'total floating-point operations' },
    { label: 'Training hardware', dot: 'bg-sky-400', value: training.trainingHardware, sub: training.hardwarePin ? 'see the chip' : 'accelerators used', href: training.hardwarePin ? pinPath(training.hardwarePin) : undefined, hrefTitle: training.hardwarePin?.title },
    { label: 'Training time', dot: 'bg-emerald-400', value: training.trainingDays != null ? formatTrainingDays(training.trainingDays) : null, sub: 'wall-clock' },
    { label: 'Training dataset size', dot: 'bg-rose-400', value: training.datasetSize != null ? formatDatasetSize(training.datasetSize, training.datasetUnit) : null, sub: 'data seen in training' },
  ];
  return (
    <section data-model-training-panel aria-label="Model training" className={`surface rounded-2xl border border-line bg-raised/40 p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wider text-subtle uppercase">Training</h2>
        {training.sourceUrl ? (
          <a href={training.sourceUrl} rel="noopener nofollow" target="_blank" className="inline-flex items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-link ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:no-underline">
            Source
            <Icon name="external" className="size-3 opacity-70" />
          </a>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col rounded-xl border border-line/70 bg-panel/70 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">
              <span className={`size-2 rounded-full ${tile.dot}`} aria-hidden />
              {tile.label}
            </div>
            <div className={`mt-1.5 text-lg leading-tight font-bold tracking-tight tabular-nums ${tile.value ? 'text-link' : 'text-muted'}`}>{tile.value && tile.href ? <Link href={tile.href} title={tile.hrefTitle} className="underline-offset-2 hover:underline">{tile.value}</Link> : (tile.value ?? 'Unknown')}</div>
            <div className="mt-1 line-clamp-2 text-xs text-muted">{tile.value ? tile.sub : 'not published'}</div>
          </div>
        ))}
      </div>
      {training.note ? <p className="mt-2 text-xs text-muted">{training.note}</p> : null}
    </section>
  );
}
