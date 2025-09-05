const { logger } = require('./logger');

// Classe para padronizar respostas de sucesso
class ApiResponse {
  constructor(success = true, message = '', data = null, meta = null) {
    this.success = success;
    this.message = message;
    this.timestamp = new Date().toISOString();
    
    if (data !== null) {
      this.data = data;
    }
    
    if (meta !== null) {
      this.meta = meta;
    }
  }
}

// Classe para respostas paginadas
class PaginatedResponse extends ApiResponse {
  constructor(data, pagination, message = 'Dados recuperados com sucesso') {
    super(true, message, data, {
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1
      }
    });
  }
}

// Funções helper para respostas padronizadas
const responses = {
  // Sucesso geral
  success: (res, data = null, message = 'Operação realizada com sucesso', statusCode = 200) => {
    const response = new ApiResponse(true, message, data);
    return res.status(statusCode).json(response);
  },
  
  // Criação bem-sucedida
  created: (res, data = null, message = 'Recurso criado com sucesso') => {
    const response = new ApiResponse(true, message, data);
    return res.status(201).json(response);
  },
  
  // Atualização bem-sucedida
  updated: (res, data = null, message = 'Recurso atualizado com sucesso') => {
    const response = new ApiResponse(true, message, data);
    return res.status(200).json(response);
  },
  
  // Exclusão bem-sucedida
  deleted: (res, message = 'Recurso excluído com sucesso') => {
    const response = new ApiResponse(true, message);
    return res.status(200).json(response);
  },
  
  // Sem conteúdo
  noContent: (res, message = 'Operação realizada com sucesso') => {
    const response = new ApiResponse(true, message);
    return res.status(204).json(response);
  },
  
  // Dados paginados
  paginated: (res, data, pagination, message = 'Dados recuperados com sucesso') => {
    const response = new PaginatedResponse(data, pagination, message);
    return res.status(200).json(response);
  },
  
  // Erro de validação
  validationError: (res, errors, message = 'Dados inválidos') => {
    const response = new ApiResponse(false, message, null, { errors });
    return res.status(400).json(response);
  },
  
  // Não autorizado
  unauthorized: (res, message = 'Não autorizado') => {
    const response = new ApiResponse(false, message);
    return res.status(401).json(response);
  },
  
  // Acesso negado
  forbidden: (res, message = 'Acesso negado') => {
    const response = new ApiResponse(false, message);
    return res.status(403).json(response);
  },
  
  // Não encontrado
  notFound: (res, message = 'Recurso não encontrado') => {
    const response = new ApiResponse(false, message);
    return res.status(404).json(response);
  },
  
  // Conflito
  conflict: (res, message = 'Conflito de dados') => {
    const response = new ApiResponse(false, message);
    return res.status(409).json(response);
  },
  
  // Erro interno
  serverError: (res, message = 'Erro interno do servidor') => {
    const response = new ApiResponse(false, message);
    return res.status(500).json(response);
  },
  
  // Serviço indisponível
  serviceUnavailable: (res, message = 'Serviço temporariamente indisponível') => {
    const response = new ApiResponse(false, message);
    return res.status(503).json(response);
  }
};

// Middleware para adicionar métodos de resposta ao objeto res
const responseMiddleware = (req, res, next) => {
  // Adicionar métodos de resposta ao objeto res
  res.apiSuccess = (data, message, statusCode) => responses.success(res, data, message, statusCode);
  res.apiCreated = (data, message) => responses.created(res, data, message);
  res.apiUpdated = (data, message) => responses.updated(res, data, message);
  res.apiDeleted = (message) => responses.deleted(res, message);
  res.apiNoContent = (message) => responses.noContent(res, message);
  res.apiPaginated = (data, pagination, message) => responses.paginated(res, data, pagination, message);
  res.apiValidationError = (errors, message) => responses.validationError(res, errors, message);
  res.apiUnauthorized = (message) => responses.unauthorized(res, message);
  res.apiForbidden = (message) => responses.forbidden(res, message);
  res.apiNotFound = (message) => responses.notFound(res, message);
  res.apiConflict = (message) => responses.conflict(res, message);
  res.apiServerError = (message) => responses.serverError(res, message);
  res.apiServiceUnavailable = (message) => responses.serviceUnavailable(res, message);
  
  next();
};

// Middleware para log de respostas
const responseLogger = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override do método send
  res.send = function(data) {
    logResponse(req, res, data);
    return originalSend.call(this, data);
  };
  
  // Override do método json
  res.json = function(data) {
    logResponse(req, res, data);
    return originalJson.call(this, data);
  };
  
  next();
};

// Função para log de respostas
const logResponse = (req, res, data) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    userId: req.user?.id || 'anonymous',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    responseTime: Date.now() - req.startTime,
    responseSize: JSON.stringify(data).length
  };
  
  // Log baseado no status code
  if (res.statusCode >= 500) {
    logger.error('API Response - Server Error', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('API Response - Client Error', logData);
  } else {
    logger.info('API Response - Success', logData);
  }
};

// Middleware para adicionar timestamp de início da requisição
const requestTimer = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

// Função para criar resposta de health check
const healthCheck = (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  const healthData = {
    status: 'healthy',
    uptime: `${Math.floor(uptime / 60)} minutes`,
    timestamp: new Date().toISOString(),
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
    },
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };
  
  return responses.success(res, healthData, 'Sistema funcionando normalmente');
};

// Função para criar resposta de status da API
const apiStatus = (req, res) => {
  const statusData = {
    api: 'Zara Quality System API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      quality: '/api/quality',
      reports: '/api/reports',
      notifications: '/api/notifications'
    }
  };
  
  return responses.success(res, statusData, 'API Status');
};

module.exports = {
  ApiResponse,
  PaginatedResponse,
  responses,
  responseMiddleware,
  responseLogger,
  requestTimer,
  healthCheck,
  apiStatus
};