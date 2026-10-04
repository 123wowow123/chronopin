import { describe, expect, it } from 'vitest';
import { parseExecutives, sameCompany, splitNameTitle, tidyCase } from './executives';

const row = (...cells: string[]) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
const TABLE = `<p>Summary Compensation Table</p><table>
${row('Name and Principal Position', 'Year', 'Salary ($)', 'Stock Awards ($)', 'All Other Compensation ($)', 'Total ($)')}
${row('Tim Cook<br>Chief Executive Officer', '2025', '$', '3,000,000', '57,535,293', '(3)(4)', '74,294,811')}
${row('', '2024', '$', '3,000,000', '58,088,946', '74,609,802')}
${row('Kevan Parekh Senior Vice President, Chief Financial Officer', '2025', '891,519', '18,433,135', '22,467,309')}
${row('Luca Maestri Former Senior Vice President, Chief Financial Officer', '2025', '819,231', '13,003,031', '15,482,928')}
${row('Deirdre O&#8217;Brien<br>Senior Vice President, Retail', '2025', '1,000,000', '22,009,766', '27,047,633')}
</table>`;

describe('parseExecutives', () => {
  it('takes the newest year of each current chief officer and drops former and non-chief seats', () => {
    const list = parseExecutives(TABLE, 'https://sec.gov/x');
    expect(list.map((e) => e.name)).toEqual(['Tim Cook', 'Kevan Parekh']);
    expect(list[0]).toMatchObject({ title: 'Chief Executive Officer', fiscalYear: 2025, salary: 3_000_000, totalCompensation: 74_294_811, origin: 'sec' });
    expect(list[1]).toMatchObject({ title: 'Senior Vice President, Chief Financial Officer', salary: 891_519, totalCompensation: 22_467_309 });
  });

  it('reads the title from the row below a name, and the SEC total beside a second total', () => {
    const table = `<table>
${row('Name and Principal Position', 'Year', 'Salary', 'Stock Awards', 'Change in Pension', 'All Other Compensation', 'SEC Total', 'Total Without Change in Pension')}
${row('Shantanu Narayen', '2025', '1,500,000', '45,376,110', '1,000', '10,000', '51,173,935', '51,000,000')}
${row('CHAIR OF THE BOARD AND CEO', '2024', '1,500,000', '46,349,135', '2,000', '10,000', '52,390,182', '52,000,000')}
</table>`;
    expect(parseExecutives(table, 'x')).toMatchObject([{ name: 'Shantanu Narayen', title: 'Chair of the Board and CEO', salary: 1_500_000, totalCompensation: 51_173_935, fiscalYear: 2025 }]);
  });

  it('splits the total into its columns when they add up to it', () => {
    const table = `<table>
${row('Name and Principal Position', 'Year', 'Salary', 'Bonus', 'Stock Awards', 'Non-Equity Incentive Plan Compensation', 'All Other Compensation', 'Total')}
${row('Jane Roe<br>Chief Executive Officer', '2025', '1,000,000', '—', '5,000,000', '2,000,000', '100,000', '8,100,000')}
${row('Joe Doe<br>Chief Financial Officer', '2025', '500,000', '100,000', '1,000,000', '300,000', '50,000', '9,999,999')}
</table>`;
    const [ceo, cfo] = parseExecutives(table, 'x');
    expect(ceo).toMatchObject({ salary: 1_000_000, bonus: 0, stockAwards: 5_000_000, incentivePay: 2_000_000, otherCompensation: 100_000, totalCompensation: 8_100_000 });
    // Parts that do not add up to the total: no split, but salary and total stay.
    expect(cfo.bonus).toBeNull();
    expect(cfo).toMatchObject({ salary: 500_000, totalCompensation: 9_999_999 });
  });

  it('reads a header spread over several rows from its words', () => {
    const table = `<table>
${row('', '', '', 'Stock', 'Non-Equity', 'All Other', '')}
${row('Name and', '', 'Salary', 'Awards', 'Incentive Plan', 'Compensation', 'Total')}
${row('Principal Position', 'Year', '($)', '($)', '($)', '($)', '($)')}
${row('Jane Roe<br>Chief Executive Officer', '2025', '1,000,000', '5,000,000', '2,000,000', '100,000', '8,100,000')}
</table>`;
    expect(parseExecutives(table, 'x')[0]).toMatchObject({ salary: 1_000_000, stockAwards: 5_000_000, incentivePay: 2_000_000, otherCompensation: 100_000, bonus: null, totalCompensation: 8_100_000 });
  });

  it('finds nothing without a compensation table', () => {
    expect(parseExecutives('<table><tr><td>Revenue</td></tr></table>', 'x')).toEqual([]);
  });
});

describe('splitNameTitle', () => {
  it('splits on a line break, else where the title starts', () => {
    expect(splitNameTitle('Jane Roe\nChair and CEO')).toEqual({ name: 'Jane Roe', title: 'Chair and CEO' });
    expect(splitNameTitle('Sundar Pichai Chief Executive Officer')).toEqual({ name: 'Sundar Pichai', title: 'Chief Executive Officer' });
    expect(splitNameTitle('Just A Name')).toBeNull();
  });
});

describe('tidyCase', () => {
  it('lowers capitals but keeps acronyms, and leaves mixed case alone', () => {
    expect(tidyCase('CFO AND EXECUTIVE VICE PRESIDENT, FINANCE')).toBe('CFO and Executive Vice President, Finance');
    expect(tidyCase('Chief Executive Officer')).toBe('Chief Executive Officer');
  });
});

describe('sameCompany', () => {
  it('accepts the registrant under another spelling and refuses a division or label of it', () => {
    for (const [ours, registrant] of [
      ['Boeing', 'BOEING CO'],
      ["McDonald's", 'MCDONALDS CORP'],
      ['VF Corporation', 'V F CORP'],
      ['AMD', 'ADVANCED MICRO DEVICES INC'],
      ['Deckers Brands', 'DECKERS OUTDOOR CORP'],
      ['The RealReal', 'TheRealReal, Inc.'],
      ['Eli Lilly', 'LILLY ELI & CO'],
    ]) expect(sameCompany(ours, registrant), ours).toBe(true);
    for (const [ours, registrant] of [
      ['Boeing Commercial Airplanes', 'BOEING CO'],
      ['Columbia Records', 'Sony Group Corp'],
      ['Alibaba Cloud', 'Alibaba Group Holding Ltd'],
      ['Waymo', 'Alphabet Inc.'],
      ['Consumers Energy', 'CMS ENERGY CORP'],
    ]) expect(sameCompany(ours, registrant), ours).toBe(false);
  });
});
