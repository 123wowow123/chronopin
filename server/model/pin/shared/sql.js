import * as mssql from 'mssql';
import * as cp from '../../../sqlConnectionPool';

export function createPinMSSQL(pin, userId) {
    return cp.getConnection()
        .then(conn => {
            return new Promise(function (resolve, reject) {
                const StoredProcedureName = 'CreatePin';
                let request = new mssql.Request(conn)
                    .input('parentId', mssql.Int, pin.parentId)
                    .input('title', mssql.NVarChar(1024), pin.title)
                    .input('description', mssql.NVarChar(4000), pin.description)
                    .input('sourceUrl', mssql.NVarChar(4000), pin.sourceUrl)
                    .input('priceLowerBound', mssql.Decimal(18, 2), pin.priceLowerBound)
                    .input('priceUpperBound', mssql.Decimal(18, 2), pin.priceUpperBound)
                    .input('price', mssql.Decimal(18, 2), pin.price)
                    .input('tip', mssql.NVarChar(4000), pin.tip)
                    .input('utcStartDateTime', mssql.DateTime2(0), pin.utcStartDateTime)
                    .input('utcEndDateTime', mssql.DateTime2(0), pin.utcEndDateTime)
                    .input('allDay', mssql.Bit, pin.allDay)
                    .input('userId', mssql.Int, userId)
                    .input('utcCreatedDateTime', mssql.DateTime2(7), pin.utcCreatedDateTime)
                    .input('utcUpdatedDateTime', mssql.DateTime2(7), pin.utcUpdatedDateTime)
                    .input('utcDeletedDateTime', mssql.DateTime2(7), pin.utcDeletedDateTime)
                    .output('id', mssql.Int, pin.id);

                //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

                request.execute(`[dbo].[${StoredProcedureName}]`,
                    (err, res, returnValue, affected) => {
                        if (err) {
                            return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
                        }
                        // ToDo: doesn't always return value
                        try {
                            //console.log('returnValue', returnValue); // always return 0
                            pin.id = res.output.id;

                            //console.log('queryCount', queryCount);
                        } catch (e) {
                            throw e;
                        }

                        resolve({
                            pin: pin
                        });

                    });
            });
        });
}