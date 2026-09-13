let cp;
let Request;
const StoredProcedureName = 'CreateComment';

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
            @text               NVARCHAR(4000),
            @userId             INT,
            @pinId              INT,
            @utcCreatedDateTime DATETIME2(7),
            @parentCommentId    INT = NULL,
            @utcUpdatedDateTime DATETIME2(7) = NULL,

            @id                 INT OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            IF @utcCreatedDateTime IS NULL
            BEGIN
              SET @utcCreatedDateTime = sysutcdatetime();
            END

            -- @id arrives non-null only when restoring from a backup, where
            -- it carries the original row's id so parentCommentId chains
            -- (and anything else pointing at a comment's id) keep resolving
            -- after a reseed. Mirrors how CreatePin preserves Pin.id.
            IF @id IS NOT NULL
            BEGIN
              SET IDENTITY_INSERT [dbo].[Comment] ON;
            END

            IF @id IS NULL
              INSERT INTO [dbo].[Comment] (text, userId, pinId, parentCommentId, utcCreatedDateTime, utcUpdatedDateTime)
              VALUES (@text, @userId, @pinId, @parentCommentId, @utcCreatedDateTime, @utcUpdatedDateTime);
            ELSE
              INSERT INTO [dbo].[Comment] (id, text, userId, pinId, parentCommentId, utcCreatedDateTime, utcUpdatedDateTime)
              VALUES (@id, @text, @userId, @pinId, @parentCommentId, @utcCreatedDateTime, @utcUpdatedDateTime);

            IF @id IS NOT NULL
            BEGIN
              SET IDENTITY_INSERT [dbo].[Comment] OFF;
            END

            SET @id = SCOPE_IDENTITY();

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
