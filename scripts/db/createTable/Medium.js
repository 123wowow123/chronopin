let cp;
let Request;
const TableName = 'Medium';

module.exports.setup = function setup(connectionPool) {
  cp = connectionPool;
  Request = cp.Request;
  return this;
}

module.exports.create = () => {
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
            thumbName NVARCHAR(4000),
            thumbWidth INT,
            thumbHeight INT,
            originalUrl NVARCHAR(4000),
            originalWidth INT,
            originalHeight INT,
            type NVARCHAR(255) NOT NULL,

            authorName NVARCHAR(1028),
            authorUrl NVARCHAR(4000),
            html NVARCHAR(4000),
        );
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
