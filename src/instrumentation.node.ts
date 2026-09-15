// Loading the config at startup makes a misconfigured production server (e.g.
// no SESSION_SECRET) exit at once; Next.js would otherwise stay up and answer
// every request with a 500.
export async function checkConfig() {
  try {
    await import('@/server/config');
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
