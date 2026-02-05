const getTimestamp = () => new Date().toISOString();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  green: '\x1b[32m',
};

export const logger = {
  info: (msg, data = null) => {
    console.log(`${colors.blue}[INFO]${colors.reset} ${getTimestamp()} - ${msg}`, data || '');
  },

  error: (msg, error = null) => {
    console.error(`${colors.red}[ERROR]${colors.reset} ${getTimestamp()} - ${msg}`);
    if (error) console.error(error);
  },

  warn: (msg, data = null) => {
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${getTimestamp()} - ${msg}`, data || '');
  },

  success: (msg, data = null) => {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${getTimestamp()} - ${msg}`, data || '');
  },
};
