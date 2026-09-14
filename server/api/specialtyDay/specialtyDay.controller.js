'use strict';

// Keyed 'MM-DD', each day's names in display order. Rebuilt by
// `npm run specialty-days:build` (scripts/specialtyDays/build.js).
const specialtyDays = require('./specialtyDays.json');

const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Every date's specialty days at once, for a timeline that tags each of its
 * dates: one ~25KB gzipped response instead of a request per date.
 * GET /api/specialty-days -> { '01-01': [...], ..., '12-31': [...] }
 */
export function index(req, res) {
  res.set('Cache-Control', 'public, max-age=3600');
  return res.json(specialtyDays);
}

/**
 * The specialty days ("National Peanut Day") that fall on a calendar date.
 * The date is the caller's own, since "today" depends on their time zone.
 * GET /api/specialty-days/09-13 -> { monthDay: '09-13', names: [...] }
 */
export function show(req, res) {
  const monthDay = req.params.monthDay;
  if (!MONTH_DAY.test(monthDay)) {
    return res.status(400).send('monthDay must be MM-DD');
  }

  // The list only changes when the file is rebuilt and redeployed.
  res.set('Cache-Control', 'public, max-age=3600');
  return res.json({
    monthDay,
    names: specialtyDays[monthDay] || []
  });
}
