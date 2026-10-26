import unittest
import xml.etree.ElementTree as ET
import personalInsiders as source


def doc(owners, note=''):
    return ET.fromstring('<ownershipDocument>' + ''.join(f'<reportingOwner><reportingOwnerId><rptOwnerCik>{cik}</rptOwnerCik></reportingOwnerId></reportingOwner>' for cik in owners) + '<footnotes><footnote id="F1">' + note + '</footnote></footnotes></ownershipDocument>')


def row(kind, footnote='F1'):
    return ET.fromstring(f'<nonDerivativeTransaction><ownershipNature><directOrIndirectOwnership><value>{kind}</value><footnoteId id="{footnote}"/></directOrIndirectOwnership></ownershipNature></nonDerivativeTransaction>')


class PersonalOwnershipTests(unittest.TestCase):
    def test_direct_requires_matching_sole_reporter(self):
        person = {'cik': 123, 'policy': 'direct'}
        self.assertTrue(source.eligible(row('D'), doc([123]), person))
        self.assertFalse(source.eligible(row('D'), doc([456]), person))
        self.assertFalse(source.eligible(row('D'), doc([123, 456]), person))

    def test_fund_ownership_is_not_personal(self):
        person = {'cik': 123, 'policy': 'direct'}
        self.assertFalse(source.eligible(row('I'), doc([123], 'Held by an investment fund managed by the reporter.'), person))

    def test_reviewed_sole_entity_requires_the_actual_row_footnote(self):
        person = {'cik': 123, 'policy': 'direct-or-sole-sts'}
        notes = doc([123], 'Held by STS Holdings II LLC; reporter is the sole beneficial owner.')
        self.assertTrue(source.eligible(row('I'), notes, person))
        self.assertFalse(source.eligible(row('I', 'F2'), notes, person))
        self.assertFalse(source.eligible(row('I'), doc([123], 'Held by STS Holdings II LLC as investment manager.'), person))


if __name__ == '__main__':
    unittest.main()
