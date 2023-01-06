let cp;
let Request;
const TableName = 'Medium';

module.exports.setup = function setup(connectionPool) {
  cp = connectionPool;
  Request = cp.Request;
  return this;
}

module.exports.createMedium = function createMedium() {
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
            thumbName NVARCHAR(4000) NOT NULL,
            thumbWidth INT,
            thumbHeight INT,
            originalUrl NVARCHAR(4000),
            originalWidth INT,
            originalHeight INT,
            type NVARCHAR(255) NOT NULL
        );
        CREATE UNIQUE INDEX UQ_INDEX_Medium_thumbName ON [dbo].[${TableName}] (thumbName);
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
