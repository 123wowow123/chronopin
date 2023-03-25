let cp;
let Request;
const StoredProcedureName = 'CreateUser';

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
            @userName      NVARCHAR(255),
            @firstName     NVARCHAR(255),
            @lastName      NVARCHAR(255),
            @gender        NVARCHAR(255),
            @locale        NCHAR(5),
            @facebookId    NVARCHAR(25),
            @googleId      NVARCHAR(25),
            @pictureUrl    NVARCHAR(255),
            @fbUpdatedTime DATETIME2(7),
            @fbVerified        BIT,
            @googleVerified    BIT,
            @about         NVARCHAR(1000),
            @email         NVARCHAR(255),
            @password      NVARCHAR(255),
            @provider      NVARCHAR(255),
            @role          NVARCHAR(255),
            @salt          NVARCHAR(255),
            @websiteUrl    NVARCHAR(500),
            @utcCreatedDateTime DATETIME2(7),
            @utcUpdatedDateTime DATETIME2(7),
            @utcDeletedDateTime DATETIME2(7),

            @id            INT OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            IF @utcCreatedDateTime IS NULL
            BEGIN
               SET @utcCreatedDateTime = sysutcdatetime();
            END

            INSERT INTO [dbo].[User] (
              userName,
              firstName,
              lastName,
              gender,
              locale,
              facebookId,
              googleId,
              pictureUrl,
              fbUpdatedTime,
              fbVerified,
              googleVerified,
              about,
              email,
              password,
              provider,
              role,
              salt,
              websiteUrl,
              utcCreatedDateTime,
              utcUpdatedDateTime,
              utcDeletedDateTime
            )
            VALUES (
              @userName,
              @firstName,
              @lastName,
              @gender,
              @locale,
              @facebookId,
              @googleId,
              @pictureUrl,
              @fbUpdatedTime,
              @fbVerified,
              @googleVerified,
              @about,
              @email,
              @password,
              @provider,
              @role,
              @salt,
              @websiteUrl,
              @utcCreatedDateTime,
              @utcUpdatedDateTime,
              @utcDeletedDateTime
            );

            SET @id = SCOPE_IDENTITY();

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
