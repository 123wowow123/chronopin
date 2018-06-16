'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

exports.log = log;
exports.info = info;
exports.infoBlue = infoBlue;
exports.success = success;
exports.warn = warn;
exports.error = error;
exports.stringify = stringify;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var chalk = require('chalk');
var ctx = new chalk.constructor({ level: 1 });

var infoFormat = ctx.magenta;
var infoBlueFormat = ctx.blue;
var successFormat = ctx.green;
var warningFormat = ctx.keyword('orange');
var errorFormat = ctx.bold.red;
var jsonSpace = 2;

function log() {
    var _console;

    (_console = console).log.apply(_console, arguments);
    return this;
}

function info() {
    console.info(infoFormat.apply(undefined, arguments));
    return this;
}

function infoBlue() {
    console.info(infoBlueFormat.apply(undefined, arguments));
    return this;
}

function success() {
    console.log(successFormat.apply(undefined, arguments));
    return this;
}

function warn() {
    console.warn(warningFormat.apply(undefined, arguments));
    return this;
}

function error() {
    console.error(errorFormat.apply(undefined, arguments));
    return this;
}

function stringify(data) {
    return (0, _stringify2.default)(data, null, jsonSpace);
}
//# sourceMappingURL=index.js.map
