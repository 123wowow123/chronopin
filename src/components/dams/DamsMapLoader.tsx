'use client';

import dynamic from 'next/dynamic';
import type { DamRow, StateAgg } from '@/lib/damSpecs';

const DamsMap = dynamic(() => import('./DamsMap'), { ssr: false, loading: () => <div className="h-[26rem] animate-pulse rounded-xl bg-panel" /> });

export function DamsMapLoader(props: { byState: StateAgg[]; dams: DamRow[] }) {
  return <DamsMap {...props} />;
}
