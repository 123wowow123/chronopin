let cp;
let Request;
const StoredProcedureName = 'CreatePinMediumLink';

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
            @pinId          INT,
            @thumbName          NVARCHAR(4000),
            @thumbWidth         INT,
            @thumbHeight        INT,
            @originalUrl        NVARCHAR(4000),
            @originalWidth      INT,
            @originalHeight     INT,
            @type               VARCHAR(255),
            @utcCreatedDateTime DATETIME2(7),
            @utcDeletedDateTime DATETIME2(7),

            @authorName         VARCHAR(1028),
            @authorUrl          VARCHAR(4000),
            @html               VARCHAR(4000),

            @id                 INT OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            DECLARE @mediumId INT;
            DECLARE @pinMediumId INT;

            IF @utcCreatedDateTime IS NULL
            BEGIN
               SET @utcCreatedDateTime = sysutcdatetime();
            END

            EXEC [dbo].[CreateMedium]
                @thumbName,
                @thumbWidth,
                @thumbHeight,
                @originalUrl,
                @originalWidth,
                @originalHeight,
                @type,

                @authorName,
                @authorUrl,
                @html,

                @id = @mediumId OUTPUT;

            EXEC [dbo].[CreatePinMedium]
                @pinId,
                @mediumId,
                @utcCreatedDateTime,
                @utcDeletedDateTime,
                @id = @pinMediumId OUTPUT;

            SET @id = @mediumId;

          END
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
