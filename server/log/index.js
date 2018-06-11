const chalk = require('chalk');
const ctx = new chalk.constructor({level: 1});

const infoFormat = ctx.magenta;
const infoBlueFormat = ctx.blue;
const successFormat = ctx.green;
const warningFormat = ctx.keyword('orange');
const errorFormat = ctx.bold.red;
const jsonSpace = 2;

export function log(...mgs) {
    console.log(...mgs);
    return this;
}

export function info(...mgs) {
    console.info(infoFormat(...mgs));
    return this;
}

export function infoBlue(...mgs) {
    console.info(infoBlueFormat(...mgs));
    return this;
}

export function success(...mgs) {
    console.log(successFormat(...mgs));
    return this;
}

export function warn(...mgs) {
    console.warn(warningFormat(...mgs));
    return this;
}

export function error(...mgs) {
    console.error(errorFormat(...mgs));
    return this;
}

export function stringify(data) {
    return JSON.stringify(data, null, jsonSpace);
}
