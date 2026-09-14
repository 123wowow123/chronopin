import { json, route } from '@/server/http';
import Company from '@/server/model/company';

// Every company, by name, with its logo - the pin form's suggestions.
export const GET = route(async () => json(await Company.list()));
