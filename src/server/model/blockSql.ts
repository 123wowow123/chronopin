// SQL that is true when either of two users has blocked the other (UserBlock,
// 0076). a and b are SQL expressions: column names or $n parameters. Its own
// module so Notification and Comment can use it without importing UserBlock,
// which imports Notification.
export const blockedBetween = (a: string, b: string) =>
  `EXISTS (SELECT 1 FROM "UserBlock" WHERE ("blockerId" = ${a} AND "blockedId" = ${b}) OR ("blockerId" = ${b} AND "blockedId" = ${a}))`;
