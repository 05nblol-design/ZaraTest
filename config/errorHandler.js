const { logger } = require('./logger');
const { isProduction } = require('./environment');

// Classe para erros customizados da aplicação
class AppError extends Error {
  constructor(message, statusCode, code = null, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Erros específicos da aplicação
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Erro interno do servidor') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

// Função para tratar erros do MongoDB
const handleMongoError = (err) => {
  let error;
  
  // Erro de duplicação (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = new ConflictError(`${field} '${value}' já existe`);
  }
  // Erro de validação do Mongoose
  else if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    error = new ValidationError('Dados inválidos', errors);
  }
  // Erro de cast (ID inválido)
  else if (err.name === 'CastError') {
    error = new ValidationError(`ID inválido: ${err.value}`);
  }
  // Outros erros do MongoDB
  else {
    error = new DatabaseError('Erro na operação do banco de dados');
  }
  
  return error;
};

// Função para tratar erros do JWT
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return new AuthenticationError('Token inválido');
  }
  if (err.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expirado');
  }
  return new AuthenticationError('Erro de autenticação');
};

// Função para tratar erros de validação do Joi
const handleJoiError = (err) => {
  const errors = err.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));
  
  return new ValidationError('Dados de entrada inválidos', errors);
};

// Middleware para capturar erros assíncronos
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware para tratar erros 404
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Rota ${req.originalUrl} não encontrada`);
  next(error);
};

// Função para enviar resposta de erro
const sendErrorResponse = (err, res) => {
  const response = {
    success: false,
    status: err.status || 'error',
    message: err.message,
    code: err.code || 'INTERNAL_ERROR'
  };
  
  // Adicionar detalhes em desenvolvimento
  if (!isProduction()) {
    response.stack = err.stack;
    if (err.details) {
      response.details = err.details;
    }
  }
  
  // Adicionar detalhes de validação se existirem
  if (err.details && err.code === 'VALIDATION_ERROR') {
    response.details = err.details;
  }
  
  res.status(err.statusCode || 500).json(response);
};

// Middleware principal de tratamento de erros
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Log do erro
  const logData = {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  };
  
  // Log baseado na severidade
  if (err.statusCode >= 500) {
    logger.error('Server Error', logData);
  } else if (err.statusCode >= 400) {
    logger.warn('Client Error', logData);
  } else {
    logger.info('Request Error', logData);
  }
  
  // Tratar diferentes tipos de erro
  if (err.name === 'MongoError' || err.name === 'MongoServerError' || err.code === 11000) {
    error = handleMongoError(err);
  } else if (err.name === 'ValidationError' && err.errors) {
    error = handleMongoError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if (err.isJoi) {
    error = handleJoiError(err);
  } else if (!err.isOperational) {
    // Erro não operacional - não expor detalhes
    error = {
      message: 'Algo deu errado!',
      statusCode: 500,
      isOperational: true
    };
  }
  
  sendErrorResponse(error, res);
};

// Middleware para tratar rejeições não capturadas
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason.message || reason,
      stack: reason.stack,
      promise: promise.toString()
    });
    
    // Fechar servidor graciosamente
    process.exit(1);
  });
};

// Middleware para tratar exceções não capturadas
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', {
      error: err.message,
      stack: err.stack
    });
    
    // Fechar aplicação imediatamente
    process.exit(1);
  });
};

// Função para inicializar handlers globais
const initializeErrorHandlers = () => {
  handleUnhandledRejection();
  handleUncaughtException();
  
  logger.info('Handlers de erro globais inicializados');
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  catchAsync,
  notFoundHandler,
  errorHandler,
  initializeErrorHandlers
};