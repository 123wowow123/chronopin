let cp;
let Request;
const StoredProcedureName = 'UpdatePin';

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
            @id                 INT,
            @parentId           INT,
            @title              NVARCHAR(1024),
            @description        NVARCHAR(4000),
            @sourceUrl          NVARCHAR(4000),
            @address            NVARCHAR(4000),
            @priceLowerBound    DECIMAL(18, 2),
            @priceUpperBound    DECIMAL(18, 2),
            @price              DECIMAL(18, 2),
            @tip                NVARCHAR(4000),
            @utcStartDateTime   DATETIME2,
            @utcEndDateTime     DATETIME2,
            @allDay             BIT,
            @userId             INT
        AS
          BEGIN

            SET NOCOUNT ON;

            DECLARE @utcUpdatedDateTime DATETIME2 = sysutcdatetime();

            UPDATE [dbo].[Pin]
            SET
              parentId = @parentId,
              title = @title,
              description = @description,
              sourceUrl = @sourceUrl,
              address = @address,
              priceLowerBound = @priceLowerBound,
              priceUpperBound = @priceUpperBound,
              price = @price,
              tip = @tip,
              utcStartDateTime = @utcStartDateTime,
              utcEndDateTime = @utcEndDateTime,
              allDay = @allDay,
              userId = @userId,
              utcUpdatedDateTime = @utcUpdatedDateTime
            WHERE id = @id;

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
