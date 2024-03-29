let cp;
let Request;
const StoredProcedureName = 'DeletePinMediumByPinMediumId';

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
          @pinId INT,
          @mediumId INT,
          @utcDeletedDateTime DATETIME2(7) OUTPUT
      AS
        BEGIN

          SET NOCOUNT ON;

          SET @utcDeletedDateTime = sysutcdatetime();

          DELETE [dbo].[PinMedium]
          WHERE pinId = @pinId AND mediumId = @mediumId;

          DELETE [dbo].[Medium]
          WHERE id = @mediumId;

        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}


// Soft Delete but needs more tracking eg: user 
// function executeCreateSP() {
//   let sql = `
//       CREATE PROCEDURE [dbo].[${StoredProcedureName}]
//           @pinId INT,
//           @mediumId INT,
//           @utcDeletedDateTime DATETIME2(7) OUTPUT
//       AS
//         BEGIN

//           SET NOCOUNT ON;

//           SET @utcDeletedDateTime = sysutcdatetime();

//           UPDATE [dbo].[PinMedium]
//           SET utcDeletedDateTime = @utcDeletedDateTime
//           WHERE pinId = @pinId AND mediumId = @mediumId;

//         END;
//         `;

//   return cp.getConnection()
//     .then(conn => {
//       return new Request(conn).batch(sql);
//     });
// }
