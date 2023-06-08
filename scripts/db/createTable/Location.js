let cp;
let Request;
const TableName = 'Location';

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
            pinId INT NOT NULL,
            address NVARCHAR(2000) NOT NULL
            -- CONSTRAINT FK_Address_pinId FOREIGN KEY (pinId) REFERENCES [dbo].[Pin] (id)
        );
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
