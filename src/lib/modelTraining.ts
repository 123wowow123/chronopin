// An AI model pin's training metrics (PinModelTraining, 0260), as the Epoch AI model page's "Training" block:
// parameters, training compute, hardware, time and dataset size. Unpublished figures are null and read "Unknown".
export type TrainingBasis = 'published' | 'estimated';
export const TRAINING_BASES: readonly TrainingBasis[] = ['published', 'estimated'];

export type PinModelTrainingJson = {
  parametersBillions: number | null;
  trainingComputeFlop: number | null;
  trainingHardware: string | null;
  trainingDays: number | null;
  datasetSize: number | null;
  datasetUnit: string | null;
  basis: TrainingBasis | null;
  sourceUrl: string | null;
  note: string | null;
  checkedAt: string;
};

export const TRAINING_BASIS_WORDS: Record<TrainingBasis, string> = { published: 'published by the maker', estimated: 'estimated (Epoch AI)' };

export function hasModelTraining(t: PinModelTrainingJson | null | undefined): t is PinModelTrainingJson {
  return !!t && (t.parametersBillions != null || t.trainingComputeFlop != null || !!t.trainingHardware || t.trainingDays != null || t.datasetSize != null);
}

const trim = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US');

// 70 -> "70B", 1800 -> "1.8T", 0.5 -> "500M".
export function formatParameters(billions: number): string {
  if (billions >= 1000) return `${trim(billions / 1000)}T`;
  if (billions >= 1) return `${trim(billions)}B`;
  return `${trim(billions * 1000)}M`;
}

// 9.4e26 -> "9.4e26 FLOP".
export function formatFlop(flop: number): string {
  const [mantissa, exp] = flop.toExponential(2).split('e');
  return `${Number(mantissa)}e${Number(exp)} FLOP`;
}

// 0.5 -> "12 hours", 90 -> "90 days", 400 -> "13.2 months".
export function formatTrainingDays(days: number): string {
  if (days < 1) return `${trim(days * 24)} hours`;
  if (days >= 365) return `${trim(days / 30.44)} months`;
  return `${trim(days)} days`;
}

// 15e12 tokens -> "15T tokens".
export function formatDatasetSize(size: number, unit: string | null): string {
  const num = size >= 1e12 ? `${trim(size / 1e12)}T` : size >= 1e9 ? `${trim(size / 1e9)}B` : size >= 1e6 ? `${trim(size / 1e6)}M` : size >= 1e3 ? `${trim(size / 1e3)}K` : trim(size);
  return unit ? `${num} ${unit}` : num;
}
