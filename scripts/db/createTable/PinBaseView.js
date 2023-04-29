let cp;
let Request;
const TableName = 'PinBaseView';

module.exports.setup = function setup(connectionPool) {
  cp = connectionPool;
  Request = cp.Request;
  return this;
}

module.exports.createPinBaseView = () => {
  return dropCreateTable()
    .catch(function (err) {
      // ... connect error checks
      console.log("err", err);
      throw err;
    });
}

function dropCreateTable() {
  console.log(`Begin drop & create ${TableName}`);
  return Promise.resolve('begin query')
    .then(executeDropTable)
    .then(executeCreateTable)
    // .then(executeCreateTableIndex)
    .then(res => {
      return `Create ${TableName} completed`;
    });
}

function executeDropTable() {
  let sql = `
        DROP VIEW IF EXISTS [dbo].[${TableName}];
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateTable() {
  let sql = `
        CREATE VIEW [dbo].[${TableName}]
          WITH SCHEMABINDING
          AS

        SELECT
              [Pin].[id],
              [Pin].[parentId],
              [Pin].[title],
              [Pin].[description],
              [Pin].[sourceUrl],
              [Pin].[address],
              [Pin].[priceLowerBound],
              [Pin].[priceUpperBound],
              [Pin].[price],
              [Pin].[tip],
              [Pin].[utcStartDateTime],
              [Pin].[utcEndDateTime],
              [Pin].[allDay],
              [Pin].[userId],
              [Pin].[utcCreatedDateTime],
              [Pin].[utcUpdatedDateTime],
              [Pin].[utcDeletedDateTime],

              COUNT([Favorites].[id])                    AS [favoriteCount],
              COUNT([Likes].[id])                        AS [likeCount],
              (CAST((SELECT COUNT(p.id)
                FROM [dbo].[Pin] AS p
                WHERE p.parentId = [Pin].[id] AND [Pin].[parentId] IS NULL) AS BIT)) AS [rootThread],

              [Media].[id]                               AS [Media.id],
              [Media].[thumbName]                        AS [Media.thumbName],
              [Media].[thumbWidth]                       AS [Media.thumbWidth],
              [Media].[thumbHeight]                      AS [Media.thumbHeight],
              [Media].[originalUrl]                      AS [Media.originalUrl],
              [Media].[originalWidth]                    AS [Media.originalWidth],
              [Media].[originalHeight]                   AS [Media.originalHeight],
              [Media].[type]                             AS [Media.type],

              [Media].[authorName]                       AS [Media.authorName],
              [Media].[authorUrl]                        AS [Media.authorUrl],
              [Media].[html]                             AS [Media.html],

              [User].[userName]                          AS [User.userName],

              [Merchant].[id]                           AS [Merchant.id],
              [Merchant].[label]                        AS [Merchant.label],
              [Merchant].[url]                          AS [Merchant.url],
              [Merchant].[price]                        AS [Merchant.price]

            FROM [dbo].[Pin] AS [Pin]
              LEFT JOIN [dbo].[PinMedium] AS [Media.PinMedium]
                ON [Pin].[id] = [Media.PinMedium].[PinId]
              LEFT JOIN [dbo].[Medium] AS [Media]
                ON [Media].[id] = [Media.PinMedium].[MediumId] AND [Media.PinMedium].[utcDeletedDateTime] IS NULL
              LEFT JOIN [dbo].[Favorite] AS [Favorites]
                ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL
              LEFT JOIN [dbo].[Like] AS [Likes] ON [Pin].[id] = [Likes].[PinId] AND [Likes].[utcDeletedDateTime] IS NULL
              LEFT JOIN [dbo].[User] AS [User]
                ON [Pin].[userId] = [User].[id]
              LEFT JOIN [dbo].[Merchant] AS [Merchant]
                ON [Pin].[id] = [Merchant].[pinId]

            GROUP BY [Pin].[utcCreatedDateTime],
              [Pin].[utcUpdatedDateTime],
              [Pin].[id],
              [Pin].[parentId],
              [Pin].[title],
              [Pin].[description],
              [Pin].[address],
              [Pin].[sourceUrl],
              [Pin].[priceLowerBound],
              [Pin].[priceUpperBound],
              [Pin].[price],
              [Pin].[tip],
              [Pin].[utcStartDateTime],
              [Pin].[utcEndDateTime],
              [Pin].[utcDeletedDateTime],
              [Pin].[allDay],
              [Pin].[userId],
              [Media].[id],
              [Media].[thumbName],
              [Media].[thumbWidth],
              [Media].[thumbHeight],
              [Media].[originalUrl],
              [Media].[originalWidth],
              [Media].[originalHeight],
              [Media].[type],

              [Media].[authorName],
              [Media].[authorUrl],
              [Media].[html],

              [User].[userName],

              [Merchant].[id],
              [Merchant].[label],
              [Merchant].[url],
              [Merchant].[price]
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

// function executeCreateTableIndex() {
//   let sql = `
//         CREATE UNIQUE CLUSTERED INDEX IX_Id ON [dbo].[${TableName}] (id); 
//         CREATE INDEX IX_SearchDescription ON [dbo].[${TableName}] (searchDescription);
//         CREATE INDEX IX_UtcStartDateTime ON [dbo].[${TableName}] (utcStartDateTime); 
//         CREATE INDEX IX_SearchTitle ON [dbo].[${TableName}] (searchTitle); 
//         `;

//   return cp.getConnection()
//     .then(conn => {
//       return new Request(conn).batch(sql);
//     });
// }
