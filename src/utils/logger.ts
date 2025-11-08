type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const env = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || 'development';

const levelStyle: Record<LogLevel, string> = {
  debug: 'background:#444;color:#fff;border-radius:4px;padding:2px 6px',
  info:  'background:#1677ff;color:#fff;border-radius:4px;padding:2px 6px',
  warn:  'background:#faad14;color:#000;border-radius:4px;padding:2px 6px',
  error: 'background:#ff4d4f;color:#fff;border-radius:4px;padding:2px 6px',
};

function shouldLog(level: LogLevel): boolean {
  if (env === 'production') {
    return level === 'info';
  }
  return true;
}

function stamp(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function print(level: LogLevel, args: any[]) {
  if (!shouldLog(level)) return;
  const tag = level === 'error' ? 'DANGER' : level.toUpperCase();
  const prefix = `%c${tag}%c ${stamp()}`;
  const styleLevel = levelStyle[level];
  const styleTime = 'color:#888;padding-left:6px';
  const payload = [prefix, styleLevel, styleTime, ...args];
  switch (level) {
    case 'debug': return console.debug(...payload);
    case 'info': return console.info(...payload);
    case 'warn': return console.warn(...payload);
    case 'error': return console.error(...payload);
  }
}

export const logger = {
  debug: (...args: any[]) => print('debug', args),
  info: (...args: any[]) => print('info', args),
  warn: (...args: any[]) => print('warn', args),
  error: (...args: any[]) => print('error', args),
};


