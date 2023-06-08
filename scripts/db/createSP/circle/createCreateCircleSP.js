let cp;
let Request;
const StoredProcedureName = 'CircleMention';

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
            @name               NVARCHAR(1028),
            @utcCreatedDateTime DATETIME2(7),

            @id                 INT OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            IF EXISTS(SELECT id FROM [dbo].[Circle] WHERE name = @name)
            BEGIN
                SELECT top 1 @id = id FROM [dbo].[Circle] WHERE name = @name
            END
            ELSE
            BEGIN
                --insert new row
                INSERT INTO [dbo].[Circle] (
                  name,
                  utcCreatedDateTime
                )
                VALUES (
                  @name,
                  @utcCreatedDateTime
                );

                SET @id = SCOPE_IDENTITY();
            END

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
