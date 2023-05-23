let cp;
let Request;
const StoredProcedureName = 'CreateMergeLocation';

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
  @address            NVARCHAR(2000),
  @pinId              INT,
  
  @id                 INT OUTPUT
AS
BEGIN

  SET NOCOUNT ON;

  DECLARE @table table (id int);

  INSERT INTO @table(id)
  SELECT Id
  FROM
  (
    MERGE [dbo].[Location] AS r
    USING (
        VALUES (
          @address,
          @pinId
        )
    ) AS foo (
      address,
      pinId
    )
    ON r.pinId = foo.pinId AND r.id = @id
    WHEN MATCHED THEN
      UPDATE SET
        address = foo.address
    WHEN NOT MATCHED THEN
      INSERT (address, pinId)
      VALUES (foo.address, foo.pinId)
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
