let cp;
let Request;
const NAME = 'GetPrevPinIdsPaginatedFunc';

// Setup
module.exports.setup = function(connectionPool) {
  cp = connectionPool;
  Request = cp.Request;
  return this;
};

module.exports.createSP = function createSP() {
  return dropCreateSP()
    .catch(function(err) {
      // ... connect error checks
      console.log("err", err);
      throw err;
    });
};

function dropCreateSP() {
  console.log(`Begin drop & create ${NAME}`);
  return Promise.resolve('begin query')
    .then(executeDropSP)
    .then(executeCreateSP)
    .then(res => {
      return `Create ${NAME} completed`;
    });
}

function executeDropSP() {
  let sql = `
        DROP FUNCTION IF EXISTS [dbo].[${NAME}];
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateSP() {
  let sql = `
        CREATE FUNCTION ${NAME} (
          @offset       INT,
          @pageSize     INT,
          @fromDateTime DATETIME2(7),
          @lastPinId    INT
        )
        RETURNS TABLE AS
        RETURN 
        (
          SELECT
            [Pin].id

            FROM [dbo].[Pin] AS [Pin]

            WHERE ([Pin].[utcStartDateTime] < @fromDateTime 
              OR ([Pin].[utcStartDateTime] = @fromDateTime AND [Pin].[id] < @lastPinId))
              AND [Pin].[utcDeletedDateTime] IS NULL

            ORDER BY [Pin].[utcStartDateTime] DESC, [Pin].[id] DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
          )
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
