'use client';

import { useMemo, useState } from 'react';
import Link from '@/components/ui/Link';
import { api, ApiError } from '@/lib/client/api';
import {
  DRIVERS,
  groupTasks,
  MAX_NEW_PINS,
  MAX_TIMES,
  MAX_UPDATES,
  TASK_GROUPS,
  TASK_IDS,
  TASKS,
  type DailyJobsSetting,
  type JobSetting,
  type TaskId,
} from '@/lib/dailyJobs';
import type { DailyJobsView, JobRunView } from '@/server/jobs/view';

const DRIVER_LABEL: Record<(typeof DRIVERS)[number], string> = {
  auto: 'Auto - API key, else Claude Code',
  api: 'API key (Claude credits)',
  session: 'Claude Code session (its login)',
};

const STATUS_TONE: Record<JobRunView['status'], string> = {
  running: 'bg-info-soft text-subtle',
  ok: 'bg-success-soft text-success',
  failed: 'bg-danger-soft text-danger',
  skipped: 'bg-warning-soft text-warning',
};

const utc = (iso: string) => `${iso.replace('T', ' ').slice(0, 16)} UTC`;
const zones = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'UTC'];
  }
})();

// Sets when the daily pin jobs run and what they do, starts one by hand, and
// shows what the recent runs did (src/server/jobs,
// docs/okf/scraping/daily-jobs.md). Changes are kept until Save, since a job
// has several fields worth setting together.
export function DailyJobsPanel({ initial }: { initial: DailyJobsView }) {
  const [view, setView] = useState(initial);
  const [draft, setDraft] = useState<DailyJobsSetting>(initial.setting);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(view.setting), [draft, view.setting]);

  const patchJob = (id: string, patch: Partial<JobSetting>) =>
    setDraft((d) => ({ jobs: d.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) }));

  const attempt = async (work: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await work();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    attempt(async () => {
      const next = await api.put<DailyJobsView>('/api/admin/daily-jobs', draft);
      setView(next);
      setDraft(next.setting);
      setMessage('Saved.');
    });

  const refresh = () =>
    attempt(async () => {
      const next = await api.get<DailyJobsView>('/api/admin/daily-jobs');
      setView(next);
      if (!dirty) setDraft(next.setting);
    });

  const runNow = (job: JobSetting) =>
    attempt(async () => {
      await api.post('/api/admin/daily-jobs/run', { jobId: job.id });
      setMessage(`Started "${job.label}". Refresh to follow it.`);
      setView(await api.get<DailyJobsView>('/api/admin/daily-jobs'));
    });

  const running = view.runs.some((r) => r.status === 'running');

  return (
    <>
      <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
        <h2 className="text-base font-semibold">Daily pin jobs</h2>
        <p className="mt-1 text-sm text-subtle">
          Each job is one Claude run at each of its times: it reads the app&apos;s signals, researches on the web, then adds pins and fixes existing ones
          through the API as the curator desks. It follows the scraping strategy in the OKF docs and records what it learns there for the next run.
        </p>
        <p className="mt-2 text-sm">
          <span className={view.drivers.api ? 'text-success' : 'text-subtle'}>API key: {view.drivers.api ? 'configured' : 'none'}</span>
          <span className="mx-2 text-subtle">·</span>
          <span className={view.drivers.session ? 'text-success' : 'text-subtle'}>
            Claude Code: {view.drivers.session ? 'found on this server' : 'not on this server'}
          </span>
          <span className="mx-2 text-subtle">·</span>
          <span className="text-subtle">{view.openRevisits} pin{view.openRevisits === 1 ? '' : 's'} marked for revisiting</span>
        </p>
      </section>

      {draft.jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          next={view.nextRuns[job.id]}
          busy={busy || running}
          dirty={dirty}
          onChange={(patch) => patchJob(job.id, patch)}
          onRun={() => void runNow(job)}
        />
      ))}

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={busy || !dirty} onClick={() => void save()}>
          Save
        </button>
        {dirty ? (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setDraft(view.setting)}>
            Discard changes
          </button>
        ) : null}
        {message ? <p className="text-sm text-success" role="status">{message}</p> : null}
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent runs</h2>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
        {view.runs.length === 0 ? (
          <p className="text-sm text-subtle">No job has run yet.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {view.runs.map((run) => (
              <RunRow key={run.id} run={run} label={view.setting.jobs.find((j) => j.id === run.jobId)?.label ?? run.jobId} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function JobCard({
  job,
  next,
  busy,
  dirty,
  onChange,
  onRun,
}: {
  job: JobSetting;
  next: string | undefined;
  busy: boolean;
  dirty: boolean;
  onChange: (patch: Partial<JobSetting>) => void;
  onRun: () => void;
}) {
  // A job keeps at least one task, so the last one cannot be turned off.
  const setTasks = (ids: TaskId[], on: boolean) => {
    const tasks = on ? TASK_IDS.filter((t) => ids.includes(t) || job.tasks.includes(t)) : job.tasks.filter((t) => !ids.includes(t));
    if (tasks.length) onChange({ tasks });
  };
  const setTime = (index: number, value: string) => onChange({ times: job.times.map((t, i) => (i === index ? value : t)) });

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{job.label}</h2>
          <p className="text-xs text-subtle">
            {job.enabled && next ? `Next run ${utc(next)}` : 'Off - runs only when started by hand'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={job.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="size-4 accent-accent" />
          On
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Runs at</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {job.times.map((time, index) => (
            <span key={index} className="flex items-center gap-1">
              <input type="time" value={time} onChange={(e) => setTime(index, e.target.value)} className="field w-auto" aria-label={`Time ${index + 1}`} />
              {job.times.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label={`Remove ${time}`}
                  onClick={() => onChange({ times: job.times.filter((_, i) => i !== index) })}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
          {job.times.length < MAX_TIMES ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange({ times: [...job.times, '12:00'] })}>
              Add a time
            </button>
          ) : null}
        </div>
        <label className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          Time zone
          <input list="job-time-zones" value={job.timeZone} onChange={(e) => onChange({ timeZone: e.target.value })} className="field w-full sm:w-64" />
        </label>
        <datalist id="job-time-zones">
          {zones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">
          Tasks <span className="font-normal text-subtle">- {job.tasks.length} of {TASK_IDS.length}, worked in this order</span>
        </legend>
        <div className="mt-2 grid gap-3 lg:grid-cols-2">
          {TASK_GROUPS.map((group) => {
            const ids = groupTasks(group.id);
            const picked = groupTasks(group.id, job.tasks).length;
            const all = picked === ids.length;
            return (
              <div key={group.id} className="rounded-lg border border-line p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">
                      {group.label}{' '}
                      <span className="font-normal text-subtle tabular-nums">
                        {picked}/{ids.length}
                      </span>
                    </h3>
                    <p className="text-xs text-subtle">{group.summary}</p>
                  </div>
                  {ids.length > 1 ? (
                    <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => setTasks(ids, !all)} aria-label={`${all ? 'Clear' : 'Pick all of'} ${group.label}`}>
                      {all ? 'None' : 'All'}
                    </button>
                  ) : null}
                </div>
                <ul className="mt-2 space-y-2">
                  {ids.map((id) => (
                    <li key={id}>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={job.tasks.includes(id)}
                          onChange={(e) => setTasks([id], e.target.checked)}
                          className="mt-0.5 size-4 shrink-0 accent-accent"
                        />
                        <span>
                          <span className="font-medium">{TASKS[id].label}</span> <span className="text-subtle">{TASKS[id].summary}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Reasoning
          <select value={job.driver} onChange={(e) => onChange({ driver: e.target.value as JobSetting['driver'] })} className="field">
            {DRIVERS.map((d) => (
              <option key={d} value={d}>
                {DRIVER_LABEL[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          New pins per run, at most
          <input
            type="number"
            min={0}
            max={MAX_NEW_PINS}
            value={job.maxNewPins}
            onChange={(e) => onChange({ maxNewPins: Math.max(0, Math.min(MAX_NEW_PINS, Math.round(Number(e.target.value) || 0))) })}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Pin updates per run, at most
          <input
            type="number"
            min={0}
            max={MAX_UPDATES}
            value={job.maxUpdates}
            onChange={(e) => onChange({ maxUpdates: Math.max(0, Math.min(MAX_UPDATES, Math.round(Number(e.target.value) || 0))) })}
            className="field"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy || dirty} onClick={onRun}>
          Run now
        </button>
        {dirty ? <span className="text-xs text-subtle">Save first: a run uses the saved settings.</span> : null}
      </div>
    </section>
  );
}

function RunRow({ run, label }: { run: JobRunView; label: string }) {
  const created = run.actions.filter((a) => a.tool === 'create_pin').length;
  const updated = run.actions.filter((a) => a.tool === 'update_pin').length;
  const minutes = run.finished ? Math.max(1, Math.round((Date.parse(run.finished) - Date.parse(run.started)) / 60000)) : null;
  const cost = typeof run.usage?.estimatedUsd === 'number' ? `$${run.usage.estimatedUsd}` : null;
  return (
    <li className="py-3">
      <details>
        <summary className="cursor-pointer list-none">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded px-1.5 py-0.5 font-medium ${STATUS_TONE[run.status]}`}>{run.status}</span>
            <span className="font-medium text-ink">{label}</span>
            <span className="text-subtle">{utc(run.started)}</span>
            <span className="text-subtle">{run.trigger === 'manual' ? 'by hand' : 'scheduled'}</span>
            {run.driver ? <span className="text-subtle">{run.driver === 'api' ? 'API key' : 'Claude Code'}</span> : null}
            {minutes ? <span className="text-subtle">{minutes} min</span> : null}
            {cost ? <span className="text-subtle">{cost}</span> : null}
          </div>
          <p className="mt-1 text-sm text-ink">
            {created} new pin{created === 1 ? '' : 's'}, {updated} update{updated === 1 ? '' : 's'}
            {run.learnings.length ? `, ${run.learnings.length} learning${run.learnings.length === 1 ? '' : 's'}` : ''}
            {run.error ? <span className="text-danger"> - {run.error.slice(0, 160)}</span> : null}
          </p>
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          {run.actions.length ? (
            <div>
              <h3 className="font-medium">What it did</h3>
              <ul className="mt-1 space-y-1">
                {run.actions.map((a, i) => (
                  <li key={i}>
                    <span className="text-subtle">{a.tool.replace('_', ' ')}</span>{' '}
                    {a.pinId ? (
                      <Link href={`/pin/${a.pinId}`}>
                        #{a.pinId}
                        {a.title ? ` ${a.title}` : ''}
                      </Link>
                    ) : a.title ? (
                      <span>{a.title}</span>
                    ) : null}{' '}
                    <span className="text-subtle">{a.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {run.learnings.length ? (
            <div>
              <h3 className="font-medium">What it learned</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {run.learnings.map((l, i) => (
                  <li key={i}>
                    <span className="font-medium">{l.topic}:</span> {l.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {run.report ? (
            <div>
              <h3 className="font-medium">Report</h3>
              <p className="mt-1 whitespace-pre-wrap break-words text-ink">{run.report}</p>
            </div>
          ) : null}
          {run.error ? <p className="whitespace-pre-wrap break-words text-danger">{run.error}</p> : null}
          <p className="text-xs text-subtle">
            Run {run.id} · tasks {run.tasks.join(', ')}
            {run.finished ? ` · finished ${utc(run.finished)}` : ''}
          </p>
        </div>
      </details>
    </li>
  );
}
