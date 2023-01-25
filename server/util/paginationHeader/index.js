import * as response from '../../api/response';

export function setPaginationHeader(res, req) {
    let urlPrefix = req.protocol + '://' + req.get('Host') + req.baseUrl + req.path;
    return results => {
        let queryCount = results.queryCount;
        return response.setPaginationHeader(res, urlPrefix, queryCount)(results);
    };
}

export function setPaginationObject(res, req) {
    let urlPrefix = req.protocol + '://' + req.get('Host') + req.baseUrl + req.path;
    return results => {
        let queryCount = results.queryCount;
        return response.setPaginationObject(res, urlPrefix, queryCount)(results);
    };
}