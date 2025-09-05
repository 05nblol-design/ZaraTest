const mongoose = require('mongoose');
const { logger } = require('./logger');

// Configurações do MongoDB
const dbConfig = {
  development: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/zaraqualitysystem_dev',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    }
  },
  test: {
    uri: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/zaraqualitysystem_test',
    options: {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  },
  production: {
    uri: process.env.MONGODB_URI,
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000,
      bufferCommands: false,
      retryWrites: true,
      w: 'majority'
    }
  }
};

// Função para conectar ao banco de dados
const connectDB = async () => {
  try {
    const env = process.env.NODE_ENV || 'development';
    const config = dbConfig[env];
    
    if (!config) {
      throw new Error(`Configuração de banco não encontrada para ambiente: ${env}`);
    }
    
    if (!config.uri) {
      throw new Error(`URI do MongoDB não configurada para ambiente: ${env}`);
    }
    
    logger.info('Conectando ao MongoDB...', {
      environment: env,
      uri: config.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') // Mascarar credenciais no log
    });
    
    const conn = await mongoose.connect(config.uri, config.options);
    
    logger.info('MongoDB conectado com sucesso', {
      host: conn.connection.host,
      port: conn.connection.port,
      database: conn.connection.name,
      readyState: conn.connection.readyState
    });
    
    // Event listeners para monitoramento
    mongoose.connection.on('error', (err) => {
      logger.error('Erro na conexão MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB desconectado');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconectado');
    });
    
    return conn;
  } catch (error) {
    logger.error('Erro ao conectar ao MongoDB:', {
      error: error.message,
      stack: error.stack
    });
    
    // Em produção, não sair do processo imediatamente
    if (process.env.NODE_ENV === 'production') {
      // Tentar reconectar após 5 segundos
      setTimeout(() => {
        logger.info('Tentando reconectar ao MongoDB...');
        connectDB();
      }, 5000);
    } else {
      process.exit(1);
    }
  }
};

// Função para desconectar do banco de dados
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB desconectado com sucesso');
  } catch (error) {
    logger.error('Erro ao desconectar do MongoDB:', error);
  }
};

// Função para verificar o status da conexão
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    state: states[mongoose.connection.readyState],
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    database: mongoose.connection.name
  };
};

// Middleware para verificar conexão do banco
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Serviço temporariamente indisponível - Banco de dados desconectado',
      error: 'DATABASE_DISCONNECTED'
    });
  }
  next();
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  checkDBConnection,
  dbConfig
};