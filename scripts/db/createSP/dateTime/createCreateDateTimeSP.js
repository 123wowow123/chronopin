let cp;
let Request;
const StoredProcedureName = 'CreateDateTime';

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
            @title NVARCHAR(1024),
            @description NVARCHAR(max),
            @sourceUrl NVARCHAR(4000),
            @tip NVARCHAR(4000),
            @utcStartDateTime DATETIME2(0),
            @utcEndDateTime DATETIME2(0),
            @allDay BIT,
            @alwaysShow BIT,
            @utcCreatedDateTime DATETIME2(7),
            @utcUpdatedDateTime DATETIME2(7),

            @id                 INT OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            IF @utcCreatedDateTime IS NULL
            BEGIN
               SET @utcCreatedDateTime = sysutcdatetime();
            END

            IF @allDay IS NULL
            BEGIN
               SET @allDay = 0;
            END

            INSERT INTO [dbo].[DateTime] (
              title,
              description,
              sourceUrl,
              tip,
              utcStartDateTime,
              utcEndDateTime,
              allDay,
              alwaysShow,
              utcCreatedDateTime,
              utcUpdatedDateTime
            )
            VALUES (
              @title,
              @description,
              @sourceUrl,
              @tip,
              @utcStartDateTime,
              @utcEndDateTime,
              @allDay,
              @alwaysShow,
              @utcCreatedDateTime,
              @utcUpdatedDateTime
            );

            SET @id = SCOPE_IDENTITY();

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
