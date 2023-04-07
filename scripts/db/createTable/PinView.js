let cp;
let Request;
const TableName = 'PinView';

module.exports.setup = function setup(connectionPool) {
  cp = connectionPool;
  Request = cp.Request;
  return this;
}

module.exports.createPinView = function createPinView() {
  return dropCreateTable()
    .catch(function(err) {
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
    .then(executeCreateTableIndex)
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
            id,
            parentId,
            title,
            description,
            sourceUrl,
            address,
            priceLowerBound,
            priceUpperBound,
            price,
            tip,
            utcStartDateTime,
            utcEndDateTime,
            allDay,
            userId,
            utcCreatedDateTime,
            utcUpdatedDateTime,
            utcDeletedDateTime,

            LEFT(title, 64) AS searchTitle,
            LEFT(description, 64) AS searchDescription

        FROM [dbo].[Pin]
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateTableIndex() {
  let sql = `
        CREATE UNIQUE CLUSTERED INDEX IX_Id ON [dbo].[${TableName}] (id); 
        CREATE INDEX IX_SearchDescription ON [dbo].[${TableName}] (searchDescription);
        CREATE INDEX IX_UtcStartDateTime ON [dbo].[${TableName}] (utcStartDateTime); 
        CREATE INDEX IX_SearchTitle ON [dbo].[${TableName}] (searchTitle); 
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
