export class Logger {
  static log(msg: string, data?: any) {
    if (data) {
      console.log(`\x1b[36m${msg}\x1b[0m`, data);
    } else {
      console.log(`\x1b[36m${msg}\x1b[0m`);
    }
  }

  static warn(msg: string, data?: any) {
    if (data) {
      console.warn(`\x1b[33m${msg}\x1b[0m`, data);
    } else {
      console.warn(`\x1b[33m${msg}\x1b[0m`);
    }
  }

  static error(msg: string, data?: any) {
    if (data) {
      console.error(`\x1b[31m${msg}\x1b[0m`, data);
    } else {
      console.error(`\x1b[31m${msg}\x1b[0m`);
    }
  }
} 