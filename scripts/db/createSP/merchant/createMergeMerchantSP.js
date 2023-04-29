let cp;
let Request;
const StoredProcedureName = 'CreateMergeMerchant';

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
  @url                NVARCHAR(1024),
  @price              DECIMAL(18, 2),
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
    MERGE [dbo].[Merchant] AS r
    USING (
        VALUES (
          @url,
          @price,
          @pinId
        )
    ) AS foo (
      url,
      price,
      pinId
    )
    ON r.pinId = foo.pinId
    WHEN MATCHED THEN
      UPDATE SET
        [url] = foo.[url],
        price = foo.price
    WHEN NOT MATCHED THEN
      INSERT ([url], price, pinId)
      VALUES (foo.[url], foo.price, foo.pinId)
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
