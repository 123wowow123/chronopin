import { describe, expect, it } from 'vitest';
import { formatDatasetSize, formatFlop, formatParameters, formatTrainingDays, hasModelTraining } from './modelTraining';

describe('model training formats', () => {
  it('formats the Epoch figures', () => {
    expect(formatFlop(9.4e26)).toBe('9.4e26 FLOP');
    expect(formatParameters(1800)).toBe('1.8T');
    expect(formatParameters(70)).toBe('70B');
    expect(formatParameters(0.5)).toBe('500M');
    expect(formatTrainingDays(90)).toBe('90 days');
    expect(formatTrainingDays(0.5)).toBe('12 hours');
    expect(formatDatasetSize(15e12, 'tokens')).toBe('15T tokens');
  });
  it('is empty when nothing is published', () => {
    const base = { parametersBillions: null, trainingComputeFlop: null, trainingHardware: null, hardwarePin: null, trainingDays: null, datasetSize: null, datasetUnit: null, basis: null, sourceUrl: null, note: null, checkedAt: '' };
    expect(hasModelTraining(base)).toBe(false);
    expect(hasModelTraining({ ...base, trainingComputeFlop: 9.4e26 })).toBe(true);
  });
});
