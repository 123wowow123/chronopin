import { dueSlot } from '@/lib/dailyJobs';
import { runJob } from '../jobs';
import { getDailyJobs } from '../model/appSetting';
import JobRun from '../model/jobRun';
import log from '../util/log';

// The clock for the daily pin jobs (src/server/jobs): every CHECK_MS each
// server looks for an enabled job whose local time has just passed and tries
// to claim that slot; the one that wins runs it, so it happens once however
// many servers there are. A slot missed while the servers were down still
// runs if they are back within two hours of it (a day for a monthly job,
// catchUpMs). One run at a
// time: a job due while another runs waits for the next check.

const CHECK_MS = 60 * 1000;

const g = globalThis as unknown as { __chronopinDailyJobTimer?: ReturnType<typeof setInterval>; __chronopinDailyJobBusy?: boolean };

export async function checkDailyJobs(now = new Date()): Promise<void> {
  if (g.__chronopinDailyJobBusy) return;
  const { jobs } = await getDailyJobs();
  const due = jobs.flatMap((job) => {
    const slot = job.enabled ? dueSlot(job, now) : null;
    return slot ? [{ job, slot }] : [];
  });
  if (!due.length) return;
  await JobRun.closeAbandoned();
  if (await JobRun.anyRunning()) return;
  g.__chronopinDailyJobBusy = true;
  try {
    // A slot stays due for its whole catch-up window after it has run (a
    // monthly one for a day), so one already claimed must not hide the next.
    for (const { job, slot } of due) {
      if ((await runJob(job.id, { trigger: 'schedule', slot: slot.key })) !== null) break;
    }
  } finally {
    g.__chronopinDailyJobBusy = false;
  }
}

export function startDailyJobSchedule() {
  if (g.__chronopinDailyJobTimer) return;
  const tick = () => void checkDailyJobs().catch((err) => log.warn('daily job check failed:', (err as Error).message));
  g.__chronopinDailyJobTimer = setInterval(tick, CHECK_MS);
  g.__chronopinDailyJobTimer.unref();
  tick();
}
