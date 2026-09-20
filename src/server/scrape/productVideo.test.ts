import { describe, expect, it } from 'vitest';
import { pickProductVideo } from './screen';

const c = (videoId: string, title: string, channel: string, verified = true) => ({ videoId, title, channel, verified });

describe('pickProductVideo', () => {
  const subject = { title: 'Ford Fathom Electric Pickup on Sale', company: 'Ford' };
  it('takes the maker\'s own verified video', () => {
    const picked = pickProductVideo(
      [c('a', 'Ford Fathom FIRST LOOK electric pickup', 'EvoCarz', false), c('b', 'All-New Ford Fathom: The Midsize Electric Pickup', 'Ford Motor Company')],
      subject,
    );
    expect(picked?.videoId).toBe('b');
  });
  it('skips reactions, leaks and unverified channels', () => {
    expect(pickProductVideo([c('a', 'Ford Fathom electric pickup reaction', 'Ford Motor Company'), c('b', 'Ford Fathom electric pickup leaked', 'Ford Motor Company')], subject)).toBeUndefined();
  });
  it('needs most of the title words', () => {
    expect(pickProductVideo([c('a', 'Ford Mustang highlights', 'Ford Motor Company')], subject)).toBeUndefined();
  });
});
