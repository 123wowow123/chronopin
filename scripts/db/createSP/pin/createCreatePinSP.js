let cp;
let Request;
const StoredProcedureName = 'CreatePin';

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
      @parentId           INT,
      @title              NVARCHAR(1024),
      @description        NVARCHAR(max),
      @sourceDescription  NVARCHAR(max),
      @sourceUrl          NVARCHAR(4000),
      @priceLowerBound    DECIMAL(18, 2),
      @priceUpperBound    DECIMAL(18, 2),
      @price              DECIMAL(18, 2),
      @tip                NVARCHAR(4000),
      @utcStartDateTime   DATETIME2,
      @utcEndDateTime     DATETIME2,
      @allDay             BIT,
      @userId             INT,
      @sentimentScore     DECIMAL(18, 17),
      @utcCreatedDateTime DATETIME2(7),
      @utcUpdatedDateTime DATETIME2(7),
      @utcDeletedDateTime DATETIME2(7),
      @id                 INT OUT
    AS
    BEGIN

      SET NOCOUNT ON;

      IF @id IS NOT NULL
      BEGIN
          SET IDENTITY_INSERT dbo.Pin ON;
      END

      IF @utcCreatedDateTime IS NULL
      BEGIN
        SET @utcCreatedDateTime = sysutcdatetime();
      END

      IF @allDay IS NULL
      BEGIN
        SET @allDay = 0;
      END

      IF @id IS NULL
        INSERT INTO [dbo].[Pin] (
          parentId,
          title,
          description,
          sourceDescription,
          sourceUrl,
          priceLowerBound,
          priceUpperBound,
          price,
          tip,
          utcStartDateTime,
          utcEndDateTime,
          allDay,
          userId,
          sentimentScore,
          utcCreatedDateTime,
          utcUpdatedDateTime,
          utcDeletedDateTime)
        VALUES (
          @parentId,
          @title,
          @description,
          @sourceDescription,
          @sourceUrl,
          @priceLowerBound,
          @priceUpperBound,
          @price,
          @tip,
          @utcStartDateTime,
          @utcEndDateTime,
          @allDay,
          @userId,
          @sentimentScore,
          @utcCreatedDateTime,
          @utcUpdatedDateTime,
          @utcDeletedDateTime);
      ELSE 
        INSERT INTO [dbo].[Pin] (
          id,
          parentId,
          title,
          description,
          sourceDescription,
          sourceUrl,
          priceLowerBound,
          priceUpperBound,
          price,
          tip,
          utcStartDateTime,
          utcEndDateTime,
          allDay,
          userId,
          sentimentScore,
          utcCreatedDateTime,
          utcUpdatedDateTime,
          utcDeletedDateTime)
        VALUES (
          @id,
          @parentId,
          @title,
          @description,
          @sourceDescription,
          @sourceUrl,
          @priceLowerBound,
          @priceUpperBound,
          @price,
          @tip,
          @utcStartDateTime,
          @utcEndDateTime,
          @allDay,
          @userId,
          @sentimentScore,
          @utcCreatedDateTime,
          @utcUpdatedDateTime,
          @utcDeletedDateTime);

      IF @id IS NOT NULL
      BEGIN
        SET IDENTITY_INSERT dbo.Pin OFF;
      END

      SET @id = SCOPE_IDENTITY();


    END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
