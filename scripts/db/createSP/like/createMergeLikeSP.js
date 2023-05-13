let cp;
let Request;
const StoredProcedureName = 'CreateMergeLike';

// Setup
module.exports.setup = function (connectionPool) {
  cp = connectionPool;
  Request = cp.Request;
  return this;
};

module.exports.createSP = function createSP() {
  return dropCreateSP()
    .catch(function (err) {
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
  @like               BIT,
  @userId             INT,
  @pinId              INT,
  @utcCreatedDateTime DATETIME2(7),
  @utcUpdatedDateTime DATETIME2(7),
  @utcDeletedDateTime DATETIME2(7),

  @id                 INT OUTPUT
AS
BEGIN

  SET NOCOUNT ON;

  DECLARE @utcCurrentDateTime AS DATETIME2(7) = sysutcdatetime();
  DECLARE @table table (id int);

  IF @utcCreatedDateTime IS NULL
  BEGIN
    SET @utcCreatedDateTime = @utcCurrentDateTime;
  END

  INSERT INTO @table(id)
  SELECT Id
  FROM
  (
    MERGE [dbo].[Like] AS r
    USING (
        VALUES (
          @like,
          @userId,
          @pinId,
          @utcCreatedDateTime,
          @utcUpdatedDateTime,
          @utcDeletedDateTime,

          @utcCurrentDateTime
        )
    ) AS foo (
      [like],
      userId,
      pinId,
      utcCreatedDateTime,
      utcUpdatedDateTime,
      utcDeletedDateTime,

      utcCurrentDateTime
    )
    ON r.userId = foo.userId
      AND r.pinId = foo.pinId
    WHEN MATCHED THEN
      UPDATE SET
        [like] = foo.[like],
        utcUpdatedDateTime = foo.utcCurrentDateTime,
        utcDeletedDateTime = null
    WHEN NOT MATCHED THEN
      INSERT ([like], userId, pinId, utcCreatedDateTime, utcUpdatedDateTime, utcDeletedDateTime)
      VALUES (foo.[like], foo.userId, foo.pinId, foo.utcCreatedDateTime, foo.utcUpdatedDateTime, foo.utcDeletedDateTime)
    OUTPUT inserted.id

  ) AS Changes (Id);

  SELECT @id = id from @table;

END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
