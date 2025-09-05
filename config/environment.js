const path = require('path');
const { logger } = require('./logger');

// Carregar variáveis de ambiente
require('dotenv').config();

// Validar variáveis obrigatórias
const requiredEnvVars = {
  production: [
    'MONGODB_URI',
    'JWT_SECRET',
    'NODE_ENV'
  ],
  development: [
    'JWT_SECRET'
  ],
  test: [
    'JWT_SECRET'
  ]
};

// Função para validar variáveis de ambiente
const validateEnvironment = () => {
  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env] || requiredEnvVars.development;
  
  const missing = required.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    const error = `Variáveis de ambiente obrigatórias não encontradas: ${missing.join(', ')}`;
    logger.error(error);
    throw new Error(error);
  }
  
  logger.info('Validação de variáveis de ambiente concluída', {
    environment: env,
    requiredVars: required.length
  });
};

// Configurações da aplicação
const config = {
  // Ambiente
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Servidor
  PORT: parseInt(process.env.PORT) || 3000,
  HOST: process.env.HOST || 'localhost',
  
  // Banco de dados
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/zaraqualitysystem',
  MONGODB_URI_TEST: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/zaraqualitysystem_test',
  
  // Autenticação
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Upload de arquivos
  UPLOAD_PATH: process.env.UPLOAD_PATH || path.join(__dirname, '..', 'uploads'),
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  ALLOWED_FILE_TYPES: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,pdf,doc,docx').split(','),
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
  
  // Frontend URL
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Logs
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_DIR: process.env.LOG_DIR || path.join(__dirname, '..', 'logs'),
  
  // Socket.IO
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
  SOCKET_PING_TIMEOUT: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
  SOCKET_PING_INTERVAL: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
  
  // Chat
  CHAT_ENABLED: process.env.CHAT_ENABLED === 'true',
  CHAT_MAX_MESSAGE_LENGTH: parseInt(process.env.CHAT_MAX_MESSAGE_LENGTH) || 1000,
  CHAT_RATE_LIMIT: parseInt(process.env.CHAT_RATE_LIMIT) || 10,
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  
  // Segurança
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  SESSION_SECRET: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  
  // Notificações
  NOTIFICATION_ENABLED: process.env.NOTIFICATION_ENABLED !== 'false',
  EMAIL_ENABLED: process.env.EMAIL_ENABLED === 'true',
  
  // Performance
  COMPRESSION_ENABLED: process.env.COMPRESSION_ENABLED !== 'false',
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 3600, // 1 hora
  
  // Monitoramento
  HEALTH_CHECK_ENABLED: process.env.HEALTH_CHECK_ENABLED !== 'false',
  METRICS_ENABLED: process.env.METRICS_ENABLED === 'true',
  
  // Desenvolvimento
  DEBUG: process.env.DEBUG === 'true',
  HOT_RELOAD: process.env.HOT_RELOAD === 'true'
};

// Configurações específicas por ambiente
const environmentConfigs = {
  development: {
    ...config,
    DEBUG: true,
    LOG_LEVEL: 'debug',
    CORS_ORIGIN: '*',
    HOT_RELOAD: true
  },
  
  test: {
    ...config,
    PORT: 0, // Porta aleatória para testes
    LOG_LEVEL: 'error',
    MONGODB_URI: config.MONGODB_URI_TEST,
    JWT_EXPIRES_IN: '1h',
    NOTIFICATION_ENABLED: false,
    CHAT_ENABLED: false
  },
  
  production: {
    ...config,
    DEBUG: false,
    LOG_LEVEL: process.env.LOG_LEVEL || 'warn',
    CORS_CREDENTIALS: true,
    HOT_RELOAD: false,
    COMPRESSION_ENABLED: true,
    METRICS_ENABLED: true
  }
};

// Obter configuração para o ambiente atual
const getConfig = () => {
  const env = config.NODE_ENV;
  const envConfig = environmentConfigs[env] || environmentConfigs.development;
  
  // Log das configurações (sem dados sensíveis)
  const safeConfig = { ...envConfig };
  delete safeConfig.JWT_SECRET;
  delete safeConfig.SESSION_SECRET;
  delete safeConfig.MONGODB_URI;
  delete safeConfig.MONGODB_URI_TEST;
  
  logger.info('Configuração carregada', {
    environment: env,
    port: envConfig.PORT,
    logLevel: envConfig.LOG_LEVEL,
    debug: envConfig.DEBUG
  });
  
  return envConfig;
};

// Função para verificar se está em produção
const isProduction = () => config.NODE_ENV === 'production';

// Função para verificar se está em desenvolvimento
const isDevelopment = () => config.NODE_ENV === 'development';

// Função para verificar se está em teste
const isTest = () => config.NODE_ENV === 'test';

module.exports = {
  config,
  getConfig,
  validateEnvironment,
  isProduction,
  isDevelopment,
  isTest
};