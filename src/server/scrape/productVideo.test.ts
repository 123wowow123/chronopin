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
  it("takes a game's own gameplay trailer", () => {
    const picked = pickProductVideo(
      [
        c('a', "Diablo IV | Season of Hell's Legacy | Gameplay Trailer", 'Diablo'),
        c('b', 'Diablo 4 Season 15 Full Breakdown - Mythic Changes', 'P4wnyhof'),
      ],
      { title: "Diablo IV Season of Hell's Legacy Begins", company: 'Blizzard Entertainment' },
    );
    expect(picked?.videoId).toBe('a');
  });
  it('skips a channel covering the news, and a tutorial upload', () => {
    const subject = { title: 'Xbox One to launch in Japan', company: 'Microsoft' };
    expect(pickProductVideo([c('a', 'Xbox One Japan Release Date Finally Revealed', 'IGN')], subject)).toBeUndefined();
    expect(
      pickProductVideo(
        [c('a', 'Civilization Revolution 2 (by 2K) - iOS - Tutorial Gameplay', 'rrvirus')],
        { title: 'Civilization Revolution sequel coming directly to iOS', company: '2K Games' },
      ),
    ).toBeUndefined();
  });
  it("skips the base game's trailer on an expansion's pin", () => {
    expect(
      pickProductVideo([c('a', 'Diablo III: Gameplay Trailer', 'Blizzard Entertainment')], {
        title: 'Diablo III: Reaper of Souls Launches',
        company: 'Blizzard Entertainment',
      }),
    ).toBeUndefined();
  });
  it('skips an esports match and a video from another year', () => {
    const starcraft = { title: 'StarCraft Remastered', company: 'Blizzard Entertainment', year: 2017 };
    expect(
      pickProductVideo([c('a', 'BlizzCon 2026 | Classic Cup: StarCraft Remastered | Legacy Match', 'Blizzard Entertainment')], starcraft),
    ).toBeUndefined();
    expect(pickProductVideo([c('a', 'StarCraft Remastered Announce Trailer', 'Blizzard Entertainment')], starcraft)?.videoId).toBe('a');
  });
  it("skips the press playing it early, and a roundup", () => {
    expect(
      pickProductVideo([c('a', 'God of War Ragnarok: The Final Preview', 'IGN')], { title: 'God of War Ragnarok launches', company: 'Sony' }),
    ).toBeUndefined();
    expect(
      pickProductVideo([c('a', 'Final Fantasy 16 - Release Date, Latest Trailer, Characters, Story, and More', 'IGN')], {
        title: 'Final Fantasy 16 release date',
        company: 'Square Enix',
      }),
    ).toBeUndefined();
  });
  it("takes the official trailer even from a press channel's re-upload", () => {
    expect(
      pickProductVideo([c('a', "Teenage Mutant Ninja Turtles: Shredder's Revenge - Official Launch Trailer", 'IGN')], {
        title: "Teenage Mutant Ninja Turtles: Shredder's Revenge launches",
        company: 'Dotemu',
      })?.videoId,
    ).toBe('a');
  });
  it("needs the name the pin leads with", () => {
    expect(
      pickProductVideo([c('a', 'Xbox 25th Anniversary Console - Official Pre-Order Trailer', 'IGN')], {
        title: 'Razer x Xbox 25th Anniversary Collection',
        company: 'Razer',
      }),
    ).toBeUndefined();
  });
  it("reads past a headline's furniture to the thing's name", () => {
    // "review" and "ign" are not words the game's own trailer has to carry.
    expect(
      pickProductVideo([c('a', 'God of War Ragnarok - Story Trailer | State of Play 2022', 'IGN')], {
        title: 'God of War Ragnarok Review - IGN',
        company: 'Sony',
        year: 2022,
      })?.videoId,
    ).toBe('a');
  });
  it("skips a sibling product's trailer", () => {
    expect(
      pickProductVideo([c('a', 'Diablo IV | Vessel of Hatred | Spiritborn Class Trailer', 'Diablo')], {
        title: 'Diablo IV Amazon Class Pack Launches',
        company: 'Blizzard Entertainment',
      }),
    ).toBeUndefined();
  });
  it("skips a re-release's trailer, unless the pin is the re-release", () => {
    expect(
      pickProductVideo([c('a', 'Elden Ring: Tarnished Edition - Official Story Trailer', 'IGN')], {
        title: 'Elden Ring Review - IGN',
        company: 'Bandai Namco',
      }),
    ).toBeUndefined();
    expect(
      pickProductVideo([c('a', 'StarCraft Remastered Announcement', 'StarCraft')], {
        title: 'StarCraft Remastered',
        company: 'Blizzard Entertainment',
      })?.videoId,
    ).toBe('a');
  });
  it('counts the numeral that says which one it is', () => {
    const diabloV = { title: 'Diablo V Launches', company: 'Blizzard Entertainment' };
    expect(pickProductVideo([c('a', 'Diablo III: Gameplay Trailer', 'Blizzard Entertainment')], diabloV)).toBeUndefined();
    expect(pickProductVideo([c('a', 'Diablo V Teaser', 'Diablo')], diabloV)?.videoId).toBe('a');
  });
  it('needs most of the title words', () => {
    expect(pickProductVideo([c('a', 'Ford Mustang highlights', 'Ford Motor Company')], subject)).toBeUndefined();
  });
});
