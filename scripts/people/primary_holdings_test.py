import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

import primaryHoldings as primary


HEADER = f'{"Asset":<44}{"Owner":<6}{"Value of Asset":<24}Income Type(s) Income'


def asset(name, owner='', value='', income=''):
    return f'{name:<44}{owner:<6}{value:<24}{income}'


def annual(body):
    return 'Annual Report\nFiling Year: 2025\n' + HEADER + '\n\n' + body


def security(cusip, shares, value, put='', unit='SH'):
    return ET.fromstring(f'<infoTable><nameOfIssuer>Issuer {cusip}</nameOfIssuer><titleOfClass>COM</titleOfClass><cusip>{cusip}</cusip><value>{value}</value><putCall>{put}</putCall><shrsOrPrnAmt><sshPrnamt>{shares}</sshPrnamt><sshPrnamtType>{unit}</sshPrnamtType></shrsOrPrnAmt></infoTable>')


class HouseEvidenceTests(unittest.TestCase):
    def test_ranges_ownership_and_income_are_not_conflated(self):
        raw = annual('\n\n'.join([
            asset('Alpha Corp. (AAA) [ST]', 'SP', '$1,001 - $15,000', '$50,001 - $100,000'),
            asset('Alpha Corp. (AAA) [ST]', 'SP', '$1,001 - $15,000', 'None'),
            asset('Alpha Corp. (AAA) [ST]', 'DC', '$1,250.50', '$1 - $200'),
            asset('Beta Corp. (BBB) [ST]', '', 'None', '$1,000,001'),
            asset('Alpha options (AAA) [OP]', 'SP', '$100,001 - $250,000'),
        ]))
        rows = primary.parse_house_stocks(raw)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['owner'], 'spouse')
        self.assertEqual((rows[0]['marketValueLow'], rows[0]['marketValueHigh']), (2002, 30000))
        self.assertIsNone(rows[0]['marketValue'])
        self.assertEqual(rows[1]['owner'], 'dependent')
        self.assertEqual(rows[1]['marketValue'], 1250.50)

    def test_page_breaks_carry_values_to_the_issuer_continuation(self):
        raw = annual(asset('Trust ⇒ Broker ⇒', 'SP', '$1,001 - $15,000') + '\n\f' + HEADER + '\n\n' + asset('Alpha Corp. (AAA) [ST]'))
        rows = primary.parse_house_stocks(raw)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['name'], 'Alpha Corp. (AAA)')
        self.assertEqual(rows[0]['owner'], 'spouse')
        self.assertEqual(rows[0]['marketValueHigh'], 15000)

    def test_transaction_section_cannot_be_mistaken_for_remaining_holdings(self):
        raw = annual(asset('Alpha Corp. (AAA) [ST]', '', '$500.00') + '\n\nS                 B: Transactions\n' + HEADER + '\n\n' + asset('Beta Corp. (BBB) [ST]', '', '$50,000'))
        self.assertEqual([r['symbol'] for r in primary.parse_house_stocks(raw)], ['AAA'])

    def test_bad_rows_need_explicit_partial_coverage_not_a_guessed_value(self):
        raw = annual(asset('Alpha Corp. (AAA) [ST]', '', '$1,001 -'))
        with self.assertRaises(ValueError):
            primary.parse_house_stocks(raw)
        gaps = []
        self.assertEqual(primary.parse_house_stocks(raw, gaps), [])
        self.assertEqual(len(gaps), 1)


class SecEvidenceTests(unittest.TestCase):
    def test_restatement_replaces_original_and_options_principal_amounts_are_excluded(self):
        manager = {'cik': 1, 'secName': 'Test Manager', 'label': 'Test Manager', 'associationNote': 'Fund holdings.', 'people': ['Test']}
        originals = [
            {'form': '13F-HR', 'reportDate': '2026-06-30', 'filingDate': '2026-08-14', 'accessionNumber': 'original', 'primaryDocument': 'primary.xml'},
            {'form': '13F-HR/A', 'reportDate': '2026-06-30', 'filingDate': '2026-09-02', 'accessionNumber': 'amendment', 'primaryDocument': 'primary.xml'},
            {'form': '13F-HR/A', 'reportDate': '2026-06-30', 'filingDate': '2026-09-03', 'accessionNumber': 'addition', 'primaryDocument': 'primary.xml'},
        ]
        recent = {key: [r[key] for r in originals] for key in originals[0]}
        data = __import__('json').dumps({'name': 'Test Manager', 'filings': {'recent': recent}}).encode()

        def filing(_cik, row):
            kind = row['accessionNumber']
            entries = {
                'original': [security('111111111', 10, 100)],
                'amendment': [security('222222222', 10, 100), security('222222222', 20, 200), security('333333333', 1000, 9999999, 'Put'), security('444444444', 2000, 8888888, unit='PRN')],
                'addition': [security('555555555', 30, 300)],
            }[kind]
            return {'row': row, 'entries': entries, 'tableUrl': 'https://www.sec.gov/table', 'indexUrl': 'https://www.sec.gov/' + kind, 'amendment': {'original': '', 'amendment': 'RESTATEMENT', 'addition': 'NEW HOLDINGS'}[kind]}

        with patch.object(primary, 'opened', return_value=data), patch.object(primary, 'filing', side_effect=filing):
            snapshot, audit = primary.manager_snapshot(manager)
        self.assertEqual(audit['filingsUsed'], ['amendment', 'addition'])
        self.assertEqual(audit['excludedRows'], 2)
        self.assertEqual([h['symbol'] for h in snapshot['holdings']], ['222222222', '555555555'])
        self.assertEqual(snapshot['holdings'][0]['shares'], 30)
        self.assertEqual(snapshot['holdings'][0]['marketValue'], 300)
        self.assertIsNone(snapshot['holdings'][0]['costBasis'])
        self.assertEqual(snapshot['holdings'][0]['weightPercent'], 50)
        self.assertFalse(snapshot['complete'])

    def test_cover_values_and_entry_counts_are_cross_checked_without_thousand_multiplier(self):
        row = {'accessionNumber': '0000000001-26-000001', 'filingDate': '2026-08-14', 'reportDate': '2026-06-30', 'primaryDocument': 'primary_doc.xml'}
        index = b'{"directory":{"item":[{"name":"primary_doc.xml"},{"name":"info.xml"}]}}'
        cover = b'<edgarSubmission><reportCalendarOrQuarter>06-30-2026</reportCalendarOrQuarter><tableEntryTotal>1</tableEntryTotal><tableValueTotal>100</tableValueTotal></edgarSubmission>'
        table = b'<informationTable><infoTable><value>100</value></infoTable></informationTable>'
        with patch.object(primary, 'opened', side_effect=[index, cover, table]):
            self.assertEqual(len(primary.filing(1, row)['entries']), 1)
        with patch.object(primary, 'opened', side_effect=[index, cover.replace(b'>100<', b'>100000<'), table]):
            with self.assertRaisesRegex(ValueError, 'units'):
                primary.filing(1, row)


if __name__ == '__main__':
    unittest.main()
