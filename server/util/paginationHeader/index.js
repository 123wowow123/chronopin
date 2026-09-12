import * as response from '../../api/response';

export function setPaginationHeader(res, req, carryParams) {
    let urlPrefix = req.protocol + '://' + req.get('Host') + req.baseUrl + req.path;
    return results => {
        let queryCount = results.queryCount;
        return response.setPaginationHeader(res, urlPrefix, queryCount, carryParams)(results);
    };
}

export function setPaginationObject(res, req, carryParams) {
    let urlPrefix = req.protocol + '://' + req.get('Host') + req.baseUrl + req.path;
    return results => {
        let queryCount = results.queryCount;
        return response.setPaginationObject(res, urlPrefix, queryCount, carryParams)(results);
    };
}
