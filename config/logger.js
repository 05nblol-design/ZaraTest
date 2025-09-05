const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Criar diretório de logs se não existir
const logDir = path.join(__dirname, '..', 'logs');
const fs = require('fs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configuração de formato personalizado
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Configuração de formato para console
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Configuração de transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true
  })
];

// Adicionar transports de arquivo apenas se não estiver no Vercel
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
if (!isVercel) {
  transports.push(
    // Arquivo de logs combinados com rotação diária
    new DailyRotateFile({
      filename: path.join(logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
      level: 'info'
    }),

    // Arquivo de logs de erro com rotação diária
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
      level: 'error'
    }),

    // Arquivo de logs de acesso/auditoria
    new DailyRotateFile({
      filename: path.join(logDir, 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
      level: 'http'
    })
  );
}

// Criar logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'zara-quality-system',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  exitOnError: false
});

// Logger específico para auditoria
const auditTransports = [];

// Adicionar transport de arquivo apenas se não estiver no Vercel
if (!isVercel) {
  auditTransports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );
} else {
  // No Vercel, usar apenas console para auditoria
  auditTransports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );
}

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'zara-quality-audit',
    type: 'audit'
  },
  transports: auditTransports
});

// Middleware para logs de requisições HTTP
const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || 'anonymous'
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });
  
  next();
};

// Função para log de auditoria
const auditLog = (action, userId, details = {}) => {
  auditLogger.info('Audit Log', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Função para log de segurança
const securityLog = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Função para log de performance
const performanceLog = (operation, duration, details = {}) => {
  logger.info('Performance Log', {
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...details
  });
};

module.exports = {
  logger,
  auditLogger,
  httpLogger,
  auditLog,
  securityLog,
  performanceLog
};