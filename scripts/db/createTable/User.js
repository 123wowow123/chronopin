let cp;
let Request;
const TableName = 'User';

module.exports.setup = function setup(connectionPool) {
  cp = connectionPool;
  Request = cp.Request;
  return this;
}

module.exports.createUser = () => {
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
            userName NVARCHAR(255) NOT NULL,
            firstName NVARCHAR(255) NOT NULL,
            lastName NVARCHAR(255) NOT NULL,
            gender NVARCHAR(255),
            locale NCHAR(5),
            facebookId NVARCHAR(25),
            googleId NVARCHAR(25),
            pictureUrl NVARCHAR(1000),
            fbUpdatedTime DATETIME2(7),
            fbVerified BIT,
            googleVerified BIT,
            about NVARCHAR(1000),
            email NVARCHAR(255),
            password NVARCHAR(255),
            role NVARCHAR(255) DEFAULT N'user',
            provider NVARCHAR(255),
            salt NVARCHAR(255),
            websiteUrl NVARCHAR(500),
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
