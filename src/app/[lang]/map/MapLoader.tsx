'use client';

import dynamic from 'next/dynamic';

const PinsMap = dynamic(() => import('@/components/map/PinsMap'), {
  ssr: false,
  loading: () => <div className="h-[calc(100dvh-52px)] animate-pulse bg-raised" />,
});

export function MapLoader({ sliderTyping, tagList }: { sliderTyping: boolean; tagList: boolean }) {
  return <PinsMap sliderTyping={sliderTyping} tagList={tagList} />;
}
