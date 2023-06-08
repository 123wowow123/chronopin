let cp;
let Request;
const StoredProcedureName = 'CreateUserCircleLink';

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
            @userId             INT,
            @name               NVARCHAR(1028),

            @id                 INT OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            DECLARE @circleId INT;
            DECLARE @userCircleId INT;

            EXEC [dbo].[CreateCircle]
                @name,

                @id = @circleId OUTPUT;

            EXEC [dbo].[CreateUserCircle]
                @userId,
                @circleId,

                @id = @userCircleId OUTPUT;

            SET @id = @userCircleId;

          END
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
