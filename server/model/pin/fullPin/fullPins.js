/*jshint eqnull:true */

'use strict';

import * as mssql from 'mssql';
import * as cp from '../../../sqlConnectionPool';
import * as _ from 'lodash';

import {
    BasePins
} from '../..';

//save //queryForwardByDate

export default class FullPins extends BasePins {
    // Properties
    // this.pins
    // this.queryCount

    constructor(pins) {
        super(pins);
    }

    static queryForwardByDate(fromDateTime, userId, lastPinId, pageSize) {
        return _queryMSSQLPins(true, fromDateTime, userId, lastPinId, 0, pageSize)
            .then(res => {
                //console.log('queryForwardByDate', res);
                return new Pins(res);
            });
    }

    static queryBackwardByDate(fromDateTime, userId, lastPinId, pageSize) {
        return _queryMSSQLPins(false, fromDateTime, userId, lastPinId, 0, pageSize)
            .then(res => {
                //console.log('queryBackwardByDate', res);
                return new Pins(res);
            });
    }

    static queryInitialByDate(fromDateTime, userId, pageSizePrev, pageSizeNext) {
        return _queryMSSQLPinsInitial(fromDateTime, userId, pageSizePrev, pageSizeNext)
            .then(res => {
                //console.log('queryInitialByDate', res);
                return new Pins(res);
            });
    }

    static queryForwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize) {
        return _queryMSSQLPinsFilterByHasFavorite(true, fromDateTime, userId, lastPinId, 0, pageSize)
            .then(res => {
                //console.log('queryForwardByDateFilterByHasFavorite', res);
                return new Pins(res);
            });
    }

    static queryBackwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize) {
        return _queryMSSQLPinsFilterByHasFavorite(false, fromDateTime, userId, lastPinId, 0, pageSize)
            .then(res => {
                //console.log('queryBackwardByDateFilterByHasFavorite', res);
                return new Pins(res);
            });
    }

    static queryInitialByDateFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext) {
        return _queryMSSQLPinsInitialFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext)
            .then(res => {
                //console.log('queryInitialByDateFilterByHasFavorite', res);
                return new Pins(res);
            });
    }

}

function _queryMSSQLPins(queryForward, fromDateTime, userId, lastPinId, offset, pageSize) {
    return cp.getConnection()
        .then(conn => {
            return new Promise(function (resolve, reject) {
                let StoredProcedureName;
                let request = new mssql.Request(conn)
                    .input('offset', mssql.Int, offset)
                    .input('pageSize', mssql.Int, pageSize)
                    .input('userId', mssql.Int, userId)
                    .input('fromDateTime', mssql.DateTime2(7), fromDateTime)
                    .input('lastPinId', mssql.Int, lastPinId)
                    .output('queryCount', mssql.Int);

                //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

                if (queryForward) {
                    StoredProcedureName = 'GetPinsWithFavoriteAndLikeNext';
                    request.execute(`[dbo].[${StoredProcedureName}]`,
                        function (err, recordsets, returnValue, affected) {
                            let queryCount;
                            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
                            if (err) {
                                reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
                            }
                            // ToDo: doesn't always return value
                            try {
                                //console.log('returnValue', returnValue); // always return 0
                                queryCount = request.parameters.queryCount.value;
                                //console.log('queryCount', queryCount);
                            } catch (e) {
                                queryCount = 0;
                            }
                            //console.log('_queryMSSQLPins', recordsets[0]);
                            resolve({
                                pins: recordsets[0],
                                queryCount: queryCount
                            });
                        });
                } else {
                    StoredProcedureName = 'GetPinsWithFavoriteAndLikePrev';
                    request.execute(`[dbo].[${StoredProcedureName}]`,
                        function (err, recordsets, returnValue, affected) {
                            let queryCount;
                            if (err) {
                                reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
                            }
                            // ToDo: doesn't always return value
                            try {
                                //console.log('returnValue', returnValue); // always return 0
                                queryCount = request.parameters.queryCount.value;
                            } catch (e) {
                                queryCount = 0;
                            }

                            resolve({
                                pins: recordsets[0],
                                queryCount: queryCount
                            });
                        });
                }
            });
        });
}

function _queryMSSQLPinsInitial(fromDateTime, userId, pageSizePrev, pageSizeNext) {
    return cp.getConnection()
        .then(conn => {
            return new Promise(function (resolve, reject) {
                const StoredProcedureName = 'GetPinsWithFavoriteAndLikeInitial';
                let request = new mssql.Request(conn)
                    .input('pageSizePrev', mssql.Int, pageSizePrev)
                    .input('pageSizeNext', mssql.Int, pageSizeNext)
                    .input('userId', mssql.Int, userId)
                    .input('fromDateTime', mssql.DateTime2(7), fromDateTime)
                    .output('queryCount', mssql.Int);

                //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

                request.execute(`[dbo].[${StoredProcedureName}]`,
                    function (err, recordsets, returnValue, affected) {
                        let queryCount;
                        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
                        if (err) {
                            reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
                        }
                        // ToDo: doesn't always return value
                        try {
                            //console.log('returnValue', returnValue); // always return 0
                            queryCount = request.parameters.queryCount.value;
                            //console.log('queryCount', queryCount);
                        } catch (e) {
                            queryCount = 0;
                        }

                        resolve({
                            pins: recordsets[0],
                            queryCount: queryCount
                        });
                    });
            });
        });
}


function _queryMSSQLPinsFilterByHasFavorite(queryForward, fromDateTime, userId, lastPinId, offset, pageSize) {
    return cp.getConnection()
        .then(conn => {
            return new Promise(function (resolve, reject) {
                let StoredProcedureName;
                let request = new mssql.Request(conn)
                    .input('offset', mssql.Int, offset)
                    .input('pageSize', mssql.Int, pageSize)
                    .input('userId', mssql.Int, userId)
                    .input('fromDateTime', mssql.DateTime2(7), fromDateTime)
                    .input('lastPinId', mssql.Int, lastPinId)
                    .output('queryCount', mssql.Int);

                //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

                if (queryForward) {
                    StoredProcedureName = 'GetPinsWithFavoriteAndLikeNextFilterByHasFavorite';
                    request.execute(`[dbo].[${StoredProcedureName}]`,
                        function (err, recordsets, returnValue, affected) {
                            let queryCount;
                            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
                            if (err) {
                                reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
                            }
                            // ToDo: doesn't always return value
                            try {
                                //console.log('returnValue', returnValue); // always return 0
                                queryCount = request.parameters.queryCount.value;
                                //console.log('queryCount', queryCount);
                            } catch (e) {
                                queryCount = 0;
                            }
                            //console.log('_queryMSSQLPins', recordsets[0]);
                            resolve({
                                pins: recordsets[0],
                                queryCount: queryCount
                            });
                        });
                } else {
                    StoredProcedureName = 'GetPinsWithFavoriteAndLikePrevFilterByHasFavorite';
                    request.execute(`[dbo].[${StoredProcedureName}]`,
                        function (err, recordsets, returnValue, affected) {
                            let queryCount;
                            if (err) {
                                reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
                            }
                            // ToDo: doesn't always return value
                            try {
                                //console.log('returnValue', returnValue); // always return 0
                                queryCount = request.parameters.queryCount.value;
                            } catch (e) {
                                queryCount = 0;
                            }

                            resolve({
                                pins: recordsets[0],
                                queryCount: queryCount
                            });
                        });
                }
            });
        });
}

function _queryMSSQLPinsInitialFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext) {
    return cp.getConnection()
        .then(conn => {
            return new Promise(function (resolve, reject) {
                const StoredProcedureName = 'GetPinsWithFavoriteAndLikeInitialFilterByHasFavorite';
                let request = new mssql.Request(conn)
                    .input('pageSizePrev', mssql.Int, pageSizePrev)
                    .input('pageSizeNext', mssql.Int, pageSizeNext)
                    .input('userId', mssql.Int, userId)
                    .input('fromDateTime', mssql.DateTime2(7), fromDateTime)
                    .output('queryCount', mssql.Int);

                //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

                request.execute(`[dbo].[${StoredProcedureName}]`,
                    function (err, recordsets, returnValue, affected) {
                        let queryCount;
                        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
                        if (err) {
                            reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
                        }
                        // ToDo: doesn't always return value
                        try {
                            //console.log('returnValue', returnValue); // always return 0
                            queryCount = request.parameters.queryCount.value;
                            //console.log('queryCount', queryCount);
                        } catch (e) {
                            queryCount = 0;
                        }

                        resolve({
                            pins: recordsets[0],
                            queryCount: queryCount
                        });
                    });
            });
        });
}