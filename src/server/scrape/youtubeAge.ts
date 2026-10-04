// Whether YouTube will play a video for a signed-out viewer. An age-restricted
// video never plays in an embed (the frame shows "Sorry, this content is
// age-restricted"), yet oEmbed answers 200 for it and the Data API's `player`
// part still hands back embed html - only the watch page's playabilityStatus
// says so, as LOGIN_REQUIRED ("Sign in to confirm your age"). No API key needed.

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

// True only when YouTube says the video is age-gated. A failed fetch or an
// unrecognised page is "no", so an outage never blocks a scrape or flags a pin.
export async function isAgeRestricted(videoId: string, signal: AbortSignal = AbortSignal.timeout(10000)): Promise<boolean> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'CONSENT=YES+1; SOCS=CAI' },
      signal,
    });
    if (!response.ok) return false;
    const status = (await response.text()).match(/"playabilityStatus":\{"status":"(\w+)","reason":"([^"]*)"/);
    return status?.[1] === 'LOGIN_REQUIRED' && /confirm your age/i.test(status[2]);
  } catch {
    return false;
  }
}
