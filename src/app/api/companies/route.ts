import { connection } from 'next/server';
import { json, route } from '@/server/http';
import Company from '@/server/model/company';

// Every company, by name, with its logo - the pin form's suggestions. Read at
// request time: with no request to read, the build would otherwise try to
// prerender it, and the build has no database.
export const GET = route(async () => {
  await connection();
  return json(await Company.list());
});
