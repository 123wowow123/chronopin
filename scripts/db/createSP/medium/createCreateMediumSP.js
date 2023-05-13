let cp;
let Request;
const StoredProcedureName = 'CreateMedium';

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
  console.log(`Begin drop & create ${StoredProcedureName}`);
  return Promise.resolve('begin query')
    .then(executeDropSP)
    .then(executeCreateSP)
    .then(res => {
      return `Create ${StoredProcedureName} completed`;
    });
}

function executeDropSP() {
  let sql = `
        IF OBJECTPROPERTY(object_id('[dbo].[${StoredProcedureName}]'), N'IsProcedure') = 1
          DROP PROCEDURE [dbo].[${StoredProcedureName}]
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateSP() {
  let sql = `
        CREATE PROCEDURE [dbo].[${StoredProcedureName}]
            @thumbName          NVARCHAR(4000),
            @thumbWidth         INT,
            @thumbHeight        INT,
            @originalUrl        NVARCHAR(4000),
            @originalWidth      INT,
            @originalHeight     INT,
            @type               VARCHAR(255),

            @authorName         VARCHAR(1028),
            @authorUrl          VARCHAR(4000),
            @html               VARCHAR(4000),

            @id                 INT OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            INSERT INTO [dbo].[Medium] (
              thumbName,
              thumbWidth,
              thumbHeight,
              originalUrl,
              originalWidth,
              originalHeight,
              type,

              authorName,
              authorUrl,
              html
            )
            VALUES (
              @thumbName,
              @thumbWidth,
              @thumbHeight,
              @originalUrl,
              @originalWidth,
              @originalHeight,
              @type,

              @authorName,
              @authorUrl,
              @html
              );

            SET @id = SCOPE_IDENTITY();

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
