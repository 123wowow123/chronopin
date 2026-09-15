// Console logging with a little colour, for the server and scripts.

const ESC = '\x1b[';
const color = (open: string, close: string) => (text: string) => `${ESC}${open}m${text}${ESC}${close}m`;
const magenta = color('35', '39');
const blue = color('34', '39');
const green = color('32', '39');
const yellow = color('33', '39');
const boldRed = (text: string) => color('1', '22')(color('31', '39')(text));

const join = (msgs: unknown[]) => msgs.map((m) => (typeof m === 'string' ? m : String(m))).join(' ');

export const log = {
  log(...msgs: unknown[]) {
    console.log(...msgs);
    return log;
  },
  info(...msgs: unknown[]) {
    console.info(magenta(join(msgs)));
    return log;
  },
  infoBlue(...msgs: unknown[]) {
    console.info(blue(join(msgs)));
    return log;
  },
  success(...msgs: unknown[]) {
    console.log(green(join(msgs)));
    return log;
  },
  warn(...msgs: unknown[]) {
    console.warn(yellow(join(msgs)));
    return log;
  },
  error(...msgs: unknown[]) {
    console.error(boldRed(join(msgs)));
    return log;
  },
  stringify(data: unknown) {
    return JSON.stringify(data, null, 2);
  },
};

export default log;
