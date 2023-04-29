let cp;
let Request;
const TableName = 'Like';

module.exports.setup = function setup(connectionPool) {
  cp = connectionPool;
  Request = cp.Request;
  return this;
}

module.exports.createLike = () => {
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
            id INT PRIMARY KEY NOT NULL IDENTITY,
            [like] BIT NOT NULL,
            userId INT NOT NULL,
            pinId INT NOT NULL,
            utcCreatedDateTime DATETIME2(7) DEFAULT SYSUTCDATETIME() NOT NULL,
            utcUpdatedDateTime DATETIME2(7),
            utcDeletedDateTime DATETIME2(7),
            CONSTRAINT UC_like_userId_pinId UNIQUE (userId, pinId)
            --CONSTRAINT FK_Like_userId FOREIGN KEY (userId) REFERENCES [dbo].[User] (id),
            --CONSTRAINT FK_Like_pinId FOREIGN KEY (pinId) REFERENCES [dbo].[Pin] (id)
        );
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
