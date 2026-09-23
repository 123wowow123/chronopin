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

// Timed jobs that live in the server process. Each checks its own admin
// setting, so one that is off costs a query now and then.
export function startSchedules() {
  void import('@/server/services/dailyJobSchedule').then(({ startDailyJobSchedule }) => startDailyJobSchedule());
}
