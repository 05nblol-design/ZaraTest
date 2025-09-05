const Joi = require('joi');
const { ValidationError } = require('./errorHandler');
const { logger } = require('./logger');

// Configurações padrão do Joi
const joiOptions = {
  abortEarly: false, // Retornar todos os erros, não apenas o primeiro
  allowUnknown: false, // Não permitir campos desconhecidos
  stripUnknown: true, // Remover campos desconhecidos
  convert: true, // Converter tipos automaticamente
  errors: {
    wrap: {
      label: false // Não envolver labels em aspas
    }
  }
};

// Schemas de validação comuns
const commonSchemas = {
  // ID do MongoDB
  mongoId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('ID inválido'),
  
  // Email
  email: Joi.string().email().lowercase().trim(),
  
  // Senha
  password: Joi.string().min(6).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).message(
    'Senha deve ter pelo menos 6 caracteres, incluindo maiúscula, minúscula e número'
  ),
  
  // Nome
  name: Joi.string().min(2).max(100).trim().pattern(/^[a-zA-ZÀ-ÿ\s]+$/).message(
    'Nome deve conter apenas letras e espaços'
  ),
  
  // Telefone
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).message('Número de telefone inválido'),
  
  // Data
  date: Joi.date().iso(),
  
  // URL
  url: Joi.string().uri(),
  
  // Paginação
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    sortBy: Joi.string().default('createdAt')
  }
};

// Schemas para autenticação
const authSchemas = {
  register: Joi.object({
    name: commonSchemas.name.required(),
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Confirmação de senha não confere'
    }),
    role: Joi.string().valid('operator', 'leader', 'manager').default('operator'),
    department: Joi.string().min(2).max(50).trim(),
    phone: commonSchemas.phone
  }),
  
  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false)
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Confirmação de senha não confere'
    })
  }),
  
  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: commonSchemas.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Confirmação de senha não confere'
    })
  })
};

// Schemas para usuários
const userSchemas = {
  update: Joi.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    phone: commonSchemas.phone,
    department: Joi.string().min(2).max(50).trim(),
    role: Joi.string().valid('operator', 'leader', 'manager'),
    isActive: Joi.boolean()
  }).min(1), // Pelo menos um campo deve ser fornecido
  
  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().max(100).trim(),
    role: Joi.string().valid('operator', 'leader', 'manager'),
    department: Joi.string().max(50).trim(),
    isActive: Joi.boolean()
  })
};

// Schemas para qualidade
const qualitySchemas = {
  create: Joi.object({
    productId: Joi.string().required(),
    batchNumber: Joi.string().required(),
    inspectionDate: commonSchemas.date.required(),
    inspector: commonSchemas.mongoId.required(),
    status: Joi.string().valid('approved', 'rejected', 'pending').required(),
    defects: Joi.array().items(
      Joi.object({
        type: Joi.string().required(),
        severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
        description: Joi.string().max(500),
        location: Joi.string().max(100)
      })
    ),
    notes: Joi.string().max(1000),
    images: Joi.array().items(Joi.string().uri())
  }),
  
  update: Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'pending'),
    defects: Joi.array().items(
      Joi.object({
        type: Joi.string().required(),
        severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
        description: Joi.string().max(500),
        location: Joi.string().max(100)
      })
    ),
    notes: Joi.string().max(1000),
    images: Joi.array().items(Joi.string().uri())
  }).min(1),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    productId: Joi.string(),
    batchNumber: Joi.string(),
    status: Joi.string().valid('approved', 'rejected', 'pending'),
    inspector: commonSchemas.mongoId,
    dateFrom: commonSchemas.date,
    dateTo: commonSchemas.date,
    severity: Joi.string().valid('low', 'medium', 'high', 'critical')
  })
};

// Schemas para relatórios
const reportSchemas = {
  generate: Joi.object({
    type: Joi.string().valid('quality', 'defects', 'performance', 'summary').required(),
    dateFrom: commonSchemas.date.required(),
    dateTo: commonSchemas.date.required(),
    filters: Joi.object({
      productId: Joi.string(),
      department: Joi.string(),
      inspector: commonSchemas.mongoId,
      status: Joi.string().valid('approved', 'rejected', 'pending')
    }),
    format: Joi.string().valid('pdf', 'excel', 'csv').default('pdf')
  })
};

// Middleware de validação
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[property];
    
    const { error, value } = schema.validate(dataToValidate, joiOptions);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      logger.warn('Validation Error', {
        url: req.originalUrl,
        method: req.method,
        errors,
        userId: req.user?.id || 'anonymous'
      });
      
      throw new ValidationError('Dados de entrada inválidos', errors);
    }
    
    // Substituir dados originais pelos dados validados e sanitizados
    req[property] = value;
    next();
  };
};

// Middleware para validar parâmetros da URL
const validateParams = (schema) => validate(schema, 'params');

// Middleware para validar query parameters
const validateQuery = (schema) => validate(schema, 'query');

// Middleware para validar body
const validateBody = (schema) => validate(schema, 'body');

// Middleware para validar ID do MongoDB
const validateMongoId = (paramName = 'id') => {
  const schema = Joi.object({
    [paramName]: commonSchemas.mongoId.required()
  });
  
  return validateParams(schema);
};

// Middleware para validar paginação
const validatePagination = () => {
  const schema = Joi.object(commonSchemas.pagination);
  return validateQuery(schema);
};

// Função para validar dados sem middleware
const validateData = (data, schema) => {
  const { error, value } = schema.validate(data, joiOptions);
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));
    
    throw new ValidationError('Dados inválidos', errors);
  }
  
  return value;
};

// Função para criar schema dinâmico
const createSchema = (fields) => {
  return Joi.object(fields);
};

module.exports = {
  // Schemas
  commonSchemas,
  authSchemas,
  userSchemas,
  qualitySchemas,
  reportSchemas,
  
  // Middlewares
  validate,
  validateParams,
  validateQuery,
  validateBody,
  validateMongoId,
  validatePagination,
  
  // Funções utilitárias
  validateData,
  createSchema,
  
  // Configurações
  joiOptions
};