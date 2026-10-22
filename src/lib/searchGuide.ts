// Every search term the search box reads (src/server/util/searchQuery.ts), with
// what it matches and examples, for the /search-guide page. Keep in step with
// the parser's header when a term is added.
export type SearchGuideEntry = {
  term: string;
  what: string;
  examples: string[];
};

export type SearchGuideGroup = {
  heading: string;
  intro?: string;
  entries: SearchGuideEntry[];
};

export const SEARCH_GUIDE: SearchGuideGroup[] = [
  {
    heading: 'Who and what',
    entries: [
      { term: 'user:', what: 'Pins posted by a curator or user, with or without the @. A bare @name works too.', examples: ['user:@ThePinGang', '@ThePinGang'] },
      { term: 'company:', what: 'Pins tied to a company. Quote a name with spaces.', examples: ['company:Apple', 'company:"Electronic Arts"'] },
      { term: '$ticker', what: 'Pins whose company trades under a stock symbol, or carries it as a related stock. Only a letter may follow the $, so "$5 million" stays free text.', examples: ['$NKE', '$brk.b'] },
      { term: 'tag:', what: 'Pins carrying a tag. Categories are tags too (the old category: still works). Award names and the year of an awards body also work.', examples: ['tag:Anime', 'tag:"Tokyo Anime Award Festival 2024"', 'category:Gaming'] },
      { term: '-tag:', what: 'Leaves out pins carrying a tag. Only tags can be negated.', examples: ['tag:Anime -tag:Predicted'] },
      { term: 'person:', what: 'Pins linked to a person, as the People pages write the name.', examples: ['person:"Joe Biden"'] },
      { term: 'pin:', what: 'Exactly these pin ids, comma-separated. Used by notifications and thread maps; an id may carry a short =label for the map marker.', examples: ['pin:1992,1991,1987'] },
    ],
  },
  {
    heading: 'When',
    intro: 'Days are written YYYY-MM-DD (a BC year keeps its leading minus). Comparisons use >, >=, <, <=, = and a range with two dots. today and yesterday stand for the viewer’s own days.',
    entries: [
      { term: 'date:', what: 'Pins starting on a day, as the timeline places them (all-day pins by UTC date, timed pins by your time zone).', examples: ['date:2026-09-08', 'date:>=2026-09-01', 'date:2026-09-01..2026-09-30'] },
      { term: 'posted:', what: 'Pins posted on a day or in a span.', examples: ['posted:today', 'posted:>=2026-10-01'] },
      { term: 'updated:', what: 'Pins with an update (an edit, a newer reference, a rewrite) on a day or in a span.', examples: ['updated:yesterday', 'updated:>=2026-10-17'] },
      { term: 'holiday:', what: 'Pins starting on any day of a holiday or special day, in every year the site works out, including solstices and equinoxes.', examples: ['holiday:Halloween', 'holiday:"Mid-Autumn Festival"', 'holiday:"Winter Solstice"'] },
      { term: 'delay:', what: 'How far a pin’s start has slipped from the day first promised, as its LATE badge shows. Units: days, weeks, months, years. A bare value means “that late or more”.', examples: ['delay:>=2months', 'delay:2-6months', 'delay:>6weeks'] },
    ],
  },
  {
    heading: 'Where',
    entries: [
      { term: 'place:', what: 'Anything a pin’s address names: a city, state, postal code or country. US states match by name or two-letter code.', examples: ['place:Chicago', 'place:Texas', 'place:60601', 'place:"New York"'] },
    ],
  },
  {
    heading: 'Confidence and ratings',
    entries: [
      { term: 'confidence:', what: 'A date confidence level (confirmed, scheduled, estimated, delayed, unverified), or how well the pin is evidenced overall: low (under 50%), medium or high.', examples: ['confidence:estimated', 'confidence:high'] },
      { term: 'rating:', what: 'The pin’s headline rating as a percentage. A bare number means “that or more”. Several rating: terms narrow each other.', examples: ['rating:>80', 'rating:80-90', 'rating:>=70 rating:<90'] },
    ],
  },
  {
    heading: 'Games',
    entries: [
      { term: 'platform:', what: 'Games shipping on a platform.', examples: ['platform:"PlayStation 5"', 'platform:xbox-series'] },
      { term: 'rated:', what: 'Games with a maturity rating.', examples: ['rated:"ESRB Mature 17+"'] },
    ],
  },
  {
    heading: 'Rubrics and radars',
    intro: 'A rubric term finds pins scoring that axis strongly (every axis given must). An axis with no published figure never matches. The word any means every pin that has the rubric.',
    entries: [
      { term: 'taste:', what: 'Food and drink pins by taste axis: aroma, bitterness, sweetness, astringency, umami, pungent, coolness.', examples: ['taste:umami', 'taste:bitterness taste:aroma', 'taste:any'] },
      { term: 'carperf:', what: 'Cars by performance axis: range, charging, acceleration, assistance, space, value, kidsFriendly.', examples: ['carperf:range', 'carperf:acceleration carperf:value'] },
      { term: 'dining:', what: 'Restaurants by dining axis: food, service, ambience, value, acclaim.', examples: ['dining:food', 'dining:service dining:ambience'] },
      { term: 'hotel:', what: 'Hotels by axis: rooms, service, location, cleanliness, value, acclaim.', examples: ['hotel:rooms', 'hotel:any'] },
      { term: 'rubric:', what: 'The year of the criteria a rubric was scored against (2020 to 2100).', examples: ['rubric:2026', 'carperf:range rubric:2026'] },
      { term: 'education: wealth: position: standing: health: misconduct: social: economic:', what: 'Pins linked to a person whose best score (0 to 5) on that radar axis meets a bound. A bare number means “that or more”. public-standing, social-good and economic-good are the chart’s labels for the last three.', examples: ['misconduct:>3', 'wealth:>=4', 'social:2-4'] },
    ],
  },
  {
    heading: 'Power, cost and datacenters',
    intro: 'Sized values take a unit. Comparisons and ranges work as for rating: (>=500mw, 100-1000, 1.5gw).',
    entries: [
      { term: 'mw:', what: 'Capacity in megawatts (units mw, gw, tw).', examples: ['mw:>=500', 'mw:100-1000mw', 'mw:1gw'] },
      { term: 'power:', what: 'Whether the megawatts are power made, drawn or stored.', examples: ['power:generation', 'power:usage', 'power:storage'] },
      { term: 'cost:', what: 'Cost in US dollars (units k, m, b, t).', examples: ['cost:>=1b', 'cost:$500m-$2b'] },
      { term: 'energy:', what: 'Annual electricity use in gigawatt-hours (units mwh, gwh, twh, pwh).', examples: ['energy:>=1twh', 'energy:775-825gwh'] },
      { term: 'water:', what: 'A datacenter’s water use in gallons per day (units k, m, b, mgd).', examples: ['water:>=1mgd', 'water:175-225k'] },
      { term: 'chips:', what: 'AI chip count, in H100-equivalents where known (units k, m).', examples: ['chips:>=100k', 'chips:125-175k'] },
      { term: 'acres:', what: 'Site area in acres.', examples: ['acres:>=500', 'acres:25-75'] },
      { term: 'sqft:', what: 'Building floor area in square feet (units k, m).', examples: ['sqft:>=1m', 'sqft:475-525k'] },
      { term: 'generators:', what: 'Permitted backup generator count.', examples: ['generators:>=50', 'generators:325-375'] },
      { term: 'cooling:', what: 'Datacenters whose cooling architecture contains a word. Several words widen the search.', examples: ['cooling:direct-to-chip', 'cooling:"closed-loop"', 'cooling:adiabatic cooling:evaporative'] },
      { term: 'powersource:', what: 'Datacenters whose power source or grid contains a word.', examples: ['powersource:PJM', 'powersource:"natural gas"', 'powersource:solar'] },
    ],
  },
];

export const SEARCH_GUIDE_RULES: { title: string; body: string; examples: string[] }[] = [
  { title: 'Different fields narrow', body: 'Each extra field in a query must also match, so this company and this tag.', examples: ['company:Nintendo tag:Gaming'] },
  { title: 'The same field widens', body: 'Several values of one field match either.', examples: ['company:Nintendo company:Sony'] },
  { title: 'OR joins groups', body: 'A standalone OR between two groups of terms returns what either group matches.', examples: ['tag:Predicted posted:today OR tag:Predicted updated:>=2026-10-17'] },
  { title: 'Free text', body: 'Anything that is not a term searches the pin text.', examples: ['iphone', 'company:Apple iphone'] },
  { title: 'Quoting', body: 'Quote values with spaces. Single quotes, whole-term quotes and smart quotes work too, and an unclosed quote runs to the end of the query.', examples: ['company:"Electronic Arts"', "company:'Electronic Arts'", '"company:Electronic Arts"'] },
];
