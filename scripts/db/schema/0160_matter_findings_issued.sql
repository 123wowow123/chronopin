-- "findings-issued": an official body (an inspector general, the Office of
-- Special Counsel, an ethics committee) issued findings about the person's
-- conduct without imposing a penalty. It is not "investigated", which is a step
-- in a process and not an outcome, and it is not a sanction or a conviction.
ALTER TABLE "PersonMatter" DROP CONSTRAINT "CK_PersonMatter_status";
ALTER TABLE "PersonMatter" ADD CONSTRAINT "CK_PersonMatter_status" CHECK ("status" IN (
  'investigated', 'charged', 'convicted', 'pleaded-guilty', 'acquitted', 'dismissed', 'closed-no-action',
  'settled', 'found-liable', 'sanctioned', 'findings-issued', 'pardoned', 'overturned'));
