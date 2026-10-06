// A specialty day ("National Peanut Day") as a tag shows it: its English
// name, which the tag searches for, and its name in the page's language, with
// the customs of the day ("Baking pies") when it has any.
export type SpecialtyTradition = { name: string; label: string };
export type SpecialtyDay = { name: string; label: string; traditions?: SpecialtyTradition[] };
