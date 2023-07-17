let cp;
let Request;
const StoredProcedureName = 'CreateMergeFollowUser';

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
  @userId             INT,
  @followingUserId    INT,
  @utcCheckedDateTime DATETIME2(7),
  @utcCreatedDateTime DATETIME2(7),

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

  IF @utcCheckedDateTime IS NULL
  BEGIN
    SET @utcCheckedDateTime = @utcCurrentDateTime;
  END

  INSERT INTO @table(id)
  SELECT Id
  FROM
  (
    MERGE [dbo].[FollowUser] AS r
    USING (
        VALUES (
          @userId,
          @followingUserId,
          @utcCheckedDateTime,
          @utcCreatedDateTime
        )
    ) AS foo (
      userId,
      followingUserId,
      utcCheckedDateTime,
      utcCreatedDateTime
    )
    ON r.userId = foo.userId
      AND r.followingUserId = foo.followingUserId
      AND r.utcCreatedDateTime = foo.utcCreatedDateTime
    WHEN MATCHED THEN
      UPDATE SET
        utcCheckedDateTime = foo.utcCheckedDateTime
    WHEN NOT MATCHED THEN
      INSERT (userId, followingUserId, utcCheckedDateTime, utcCreatedDateTime)
      VALUES (foo.userId, foo.followingUserId, foo.utcCheckedDateTime, foo.utcCreatedDateTime)
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
