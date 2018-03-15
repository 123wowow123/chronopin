let cp;
let Request;
const TableName = 'Pin';

module.exports.setup = function setup(connectionPool) {
  cp = connectionPool;
  Request = cp.Request;
  return this;
}

module.exports.createPin = function createPin() {
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
    .then(res => {
      return `Create ${TableName} completed`;
    });
}

function executeDropTable() {
  let sql = `
        DROP TABLE IF EXISTS [dbo].[${TableName}];
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateTable() {
  let sql = `
        CREATE TABLE [dbo].[${TableName}]
        (
            id INT PRIMARY KEY NOT NULL IDENTITY,
            title NVARCHAR(1024) NOT NULL,
            description NVARCHAR(4000),
            sourceUrl NVARCHAR(4000),
            address NVARCHAR(4000),
            priceLowerBound DECIMAL(18,2),
            priceUpperBound DECIMAL(18,2),
            price DECIMAL(18,2),
            tip NVARCHAR(4000),
            utcStartDateTime DATETIME2(0) NOT NULL,
            utcEndDateTime DATETIME2(0) NOT NULL,
            allDay BIT DEFAULT 0 NOT NULL,
            userId INT NOT NULL,
            utcCreatedDateTime DATETIME2(7) DEFAULT SYSUTCDATETIME() NOT NULL,
            utcUpdatedDateTime DATETIME2(7),
            utcDeletedDateTime DATETIME2(7)
        );
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
