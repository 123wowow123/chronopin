let cp;
let Request;
const TableName = 'Pin';

module.exports.setup = function setup(connectionPool) {
  cp = connectionPool;
  Request = cp.Request;
  return this;
}

module.exports.createPin = () => {
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
    .then(res => {
      return `Create ${TableName} completed`;
    });
}

function executeDropTable() {
  let sql = `
        DROP VIEW IF EXISTS [dbo].[PinView];
        DROP VIEW IF EXISTS [dbo].[PinBaseView];
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
            id INT PRIMARY KEY NOT NULL IDENTITY(1,1),
            parentId INT,
            title NVARCHAR(1024) NOT NULL,
            description NVARCHAR(max),
            sourceUrl NVARCHAR(4000),
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

        CREATE INDEX IX_UtcStartDateTime ON [dbo].[${TableName}] (utcStartDateTime); 
        CREATE INDEX parentId ON [dbo].[${TableName}] (parentId); 
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
