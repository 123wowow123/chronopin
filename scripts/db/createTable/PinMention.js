let cp;
let Request;
const TableName = 'PinMention';

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
            pinId INT NOT NULL,
            mentionId INT NOT NULL,
            --CONSTRAINT FK_PinMedium_pinId FOREIGN KEY (pinId) REFERENCES [dbo].[Pin] (id),
            --CONSTRAINT FK_PinMedium_mediumId FOREIGN KEY (mediumId) REFERENCES [dbo].[Medium] (id),
        );
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
