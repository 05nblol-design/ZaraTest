const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// Importar configurações padronizadas
const { getConfig, validateEnvironment } = require('./config/environment');
const { logger, httpLogger } = require('./config/logger');
const { connectDB } = require('./config/database');
const { errorHandler, notFoundHandler, initializeErrorHandlers } = require('./config/errorHandler');
const { responseMiddleware, requestTimer, healthCheck, apiStatus } = require('./config/responseHandler');

// Importar MongoMemoryServer apenas em desenvolvimento
let MongoMemoryServer;
if (process.env.NODE_ENV !== 'production') {
  MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
}

// Validar e carregar configurações
validateEnvironment();
const config = getConfig();

// Inicializar handlers de erro globais
initializeErrorHandlers();

// Inicializar o app Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.SOCKET_CORS_ORIGIN,
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: config.SOCKET_PING_TIMEOUT,
  pingInterval: config.SOCKET_PING_INTERVAL
});

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://zara-quality-system-2.onrender.com"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Muitas tentativas. Tente novamente em alguns minutos.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Compressão
if (config.COMPRESSION_ENABLED) {
  app.use(compression());
}

// Middlewares básicos
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: config.CORS_CREDENTIALS
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middlewares customizados
app.use(requestTimer);
app.use(httpLogger);
app.use(responseMiddleware);

// Importar NotificationService
const NotificationService = require('./src/services/NotificationService');

// Armazenar usuários conectados para notificações
const connectedUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

// Inicializar serviço de notificações
let notificationService;

// Socket.IO configurado para notificações em tempo real
io.on('connection', (socket) => {
  console.log('👤 Usuário conectado:', socket.id);
  
  // Autenticação do usuário
  socket.on('authenticate', (userData) => {
    if (userData && userData.userId) {
      connectedUsers.set(userData.userId, socket.id);
      userSockets.set(socket.id, userData.userId);
      console.log(`🔐 Usuário autenticado: ${userData.userId} (${socket.id})`);
      
      // Enviar notificações não lidas
      if (notificationService) {
        notificationService.getUserNotifications(userData.userId, true)
          .then(notifications => {
            socket.emit('unread_notifications', notifications);
          })
          .catch(err => console.error('Erro ao buscar notificações:', err));
      }
    }
  });
  
  // Marcar notificação como lida
  socket.on('mark_notification_read', async (data) => {
    const userId = userSockets.get(socket.id);
    if (userId && data.notificationId && notificationService) {
      await notificationService.markNotificationAsRead(data.notificationId, userId);
    }
  });
  
  // Buscar todas as notificações do usuário
  socket.on('get_notifications', async (data) => {
    const userId = userSockets.get(socket.id);
    if (userId && notificationService) {
      const notifications = await notificationService.getUserNotifications(userId, data.unreadOnly);
      socket.emit('notifications_list', notifications);
    }
  });
  
  socket.on('disconnect', () => {
    const userId = userSockets.get(socket.id);
    if (userId) {
      connectedUsers.delete(userId);
      userSockets.delete(socket.id);
      console.log(`👋 Usuário desconectado: ${userId} (${socket.id})`);
    } else {
      console.log('👋 Usuário desconectado:', socket.id);
    }
  });
});

// Disponibilizar io globalmente para uso nas rotas
app.set('io', io);

// Rotas de sistema
app.get('/health', healthCheck);
app.get('/api/status', apiStatus);

// Configuração do MongoDB baseada no ambiente
let mongoServer;
async function startServer() {
  try {
    if (config.NODE_ENV === 'production') {
      // Usar configuração padronizada do banco em produção
      await connectDB();
    } else {
      // Usar MongoMemoryServer em desenvolvimento
      if (MongoMemoryServer) {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
      } else {
        await connectDB();
      }
    }
    
    logger.info('Banco de dados conectado com sucesso');
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Erro de conexão MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ Mongoose desconectado do MongoDB');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      if (mongoServer) {
        await mongoServer.stop();
      }
      console.log('🔒 Conexão MongoDB fechada devido ao encerramento da aplicação');
      process.exit(0);
    });
    
    if (process.env.NODE_ENV === 'production') {
      console.log('✅ MongoDB conectado com sucesso');
      // Inicializar dados essenciais em produção se não existirem
      await initializeProductionData();
    } else {
      console.log('✅ MongoDB Memory Server conectado com sucesso');
      // Inicializar dados de exemplo apenas em desenvolvimento
      await initializeData();
    }
    
    // Inicializar serviço de notificações após conexão com MongoDB
    notificationService = new NotificationService(io);
    // Atualizar método getOnlineUsers para usar os Maps locais
    notificationService.getOnlineUsers = () => connectedUsers;
    // Inicializar SSE Service
    notificationService.initializeSSE();
    console.log('🔔 Serviço de notificações inicializado');
    console.log('📡 SSE Service inicializado');
    
    // Disponibilizar notificationService globalmente
    app.set('notificationService', notificationService);
  } catch (err) {
    console.error('❌ Erro ao conectar ao MongoDB:', err.message);
    console.error('❌ Stack trace:', err.stack);
    process.exit(1);
  }
}

// Função para inicializar dados essenciais em produção
async function initializeProductionData() {
  try {
    console.log('🔄 Iniciando inicialização de dados de produção...');
    
    // Importar modelos
    const User = require('./src/models/User');
    console.log('✅ Modelo User importado com sucesso');
    
    // Verificar se já existem usuários
    console.log('🔍 Verificando usuários existentes...');
    const userCount = await User.countDocuments();
    console.log(`📊 Número de usuários encontrados: ${userCount}`);
    
    if (userCount === 0) {
      console.log('👤 Criando usuários essenciais...');
      // Criar usuários essenciais
      const users = [
        { username: 'operador1', name: 'Operador', email: 'operador@zara.com', password: '123456', role: 'operator' },
        { username: 'lider1', name: 'Líder', email: 'lider@zara.com', password: '123456', role: 'leader' },
        { username: 'gestor1', name: 'Gestor', email: 'gestor@zara.com', password: '123456', role: 'manager' }
      ];
      
      const createdUsers = await User.create(users);
      console.log(`✅ ${createdUsers.length} usuários essenciais criados em produção`);
      console.log('👥 Usuários criados:', createdUsers.map(u => u.username).join(', '));
    } else {
      console.log('ℹ️ Usuários já existem em produção');
      const existingUsers = await User.find({}, 'username role');
      console.log('👥 Usuários existentes:', existingUsers.map(u => `${u.username} (${u.role})`).join(', '));
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar dados de produção:', error.message);
    console.error('❌ Stack trace completo:', error.stack);
    throw error; // Re-throw para que o erro seja visível
  }
}

// Função para inicializar dados de exemplo
async function initializeData() {
  try {
    // Importar modelos
    const User = require('./src/models/User');
    const Machine = require('./src/models/Machine');
    const QualityTest = require('./src/models/QualityTest');
    
    // Verificar se já existem usuários
    const userCount = await User.countDocuments();
    let usuarios;
    if (userCount === 0) {
      // Criar usuários de exemplo
      usuarios = await User.create([
        { username: 'operador1', name: 'Operador', email: 'operador@zara.com', password: '123456', role: 'operator' },
        { username: 'lider1', name: 'Líder', email: 'lider@zara.com', password: '123456', role: 'leader' },
        { username: 'gestor1', name: 'Gestor', email: 'gestor@zara.com', password: '123456', role: 'manager' }
      ]);
      console.log('Usuários de exemplo criados');
    } else {
      usuarios = await User.find().limit(3);
    }
    
    // Verificar se já existem máquinas
    const machineCount = await Machine.countDocuments();
    if (machineCount === 0) {
      // Criar máquinas de exemplo
      await Machine.create([
        { code: 'M001', name: 'Máquina 1', type: 'Extrusora', location: 'Linha 1', status: 'active' },
        { code: 'M002', name: 'Máquina 2', type: 'Extrusora', location: 'Linha 2', status: 'active' },
        { code: 'M003', name: 'Máquina 3', type: 'Extrusora', location: 'Linha 3', status: 'inactive' }
      ]);
      console.log('Máquinas de exemplo criadas');
    }
    
    // Verificar se já existem testes de qualidade
    const testCount = await QualityTest.countDocuments();
    if (testCount === 0) {
      // Criar alguns testes de qualidade de exemplo com cenários realistas
       const maquinas = await Machine.find().limit(3);
       
       const testesQualidade = [
         // Testes aprovados recentes
         {
           testId: 'TQ001',
           lotNumber: 'L2024001',
           machine: maquinas[0]._id,
           parameters: {
             temperature: 180,
             pressure: 2.5,
             speed: 1200
           },
           result: 'approved',
           status: 'completed',
           operator: usuarios[0]._id,
           deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas no futuro
           createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutos atrás
           completedAt: new Date(Date.now() - 10 * 60 * 1000)
         },
         {
           testId: 'TQ002',
           lotNumber: 'L2024002',
           machine: maquinas[1]._id,
           parameters: {
             temperature: 178,
             pressure: 2.4,
             speed: 1150
           },
           result: 'approved',
           status: 'completed',
           operator: usuarios[1]._id,
           deadline: new Date(Date.now() + 1.5 * 60 * 60 * 1000),
           createdAt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutos atrás
           completedAt: new Date(Date.now() - 20 * 60 * 1000)
         },
         // Testes reprovados (últimos 7 dias)
         {
           testId: 'TQ003',
           lotNumber: 'L2024003',
           machine: maquinas[2]._id,
           parameters: {
             temperature: 175,
             pressure: 2.3,
             speed: 1100
           },
           result: 'rejected',
           status: 'failed',
           notes: 'Temperatura abaixo do limite mínimo',
           operator: usuarios[2]._id,
           deadline: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hora atrás (atrasado)
           createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
           completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
         },
         {
           testId: 'TQ004',
           lotNumber: 'L2024004',
           machine: maquinas[0]._id,
           parameters: {
             temperature: 185,
             pressure: 2.8,
             speed: 1300
           },
           result: 'rejected',
           status: 'failed',
           notes: 'Pressão acima do limite máximo',
           operator: usuarios[0]._id,
           deadline: new Date(Date.now() - 20 * 60 * 60 * 1000), // 20 horas atrás
           createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
           completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000)
         },
         {
           testId: 'TQ005',
           lotNumber: 'L2024005',
           machine: maquinas[1]._id,
           parameters: {
             temperature: 182,
             pressure: 2.4,
             speed: 1250
           },
           result: 'rejected',
           status: 'failed',
           notes: 'Falha no teste de qualidade',
           operator: usuarios[1]._id,
           deadline: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000), // 2.5 dias atrás
           createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
           completedAt: new Date(Date.now() - 2.8 * 24 * 60 * 60 * 1000)
         },
         // Mais testes aprovados para histórico
         {
           testId: 'TQ006',
           lotNumber: 'L2024006',
           machine: maquinas[2]._id,
           parameters: {
             temperature: 179,
             pressure: 2.5,
             speed: 1180
           },
           result: 'approved',
           status: 'completed',
           operator: usuarios[2]._id,
           deadline: new Date(Date.now() + 1 * 60 * 60 * 1000),
           createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutos atrás
           completedAt: new Date(Date.now() - 40 * 60 * 1000)
         },
         {
           testId: 'TQ007',
           lotNumber: 'L2024007',
           machine: maquinas[0]._id,
           parameters: {
             temperature: 181,
             pressure: 2.6,
             speed: 1220
           },
           result: 'approved',
           status: 'completed',
           operator: usuarios[0]._id,
           deadline: new Date(Date.now() + 30 * 60 * 1000),
           createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 horas atrás
           completedAt: new Date(Date.now() - 1.2 * 60 * 60 * 1000)
         },
         {
           testId: 'TQ008',
           lotNumber: 'L2024008',
           machine: maquinas[1]._id,
           parameters: {
             temperature: 180,
             pressure: 2.5,
             speed: 1200
           },
           result: 'pending',
           status: 'in_progress',
           operator: usuarios[1]._id,
           deadline: new Date(Date.now() + 50 * 60 * 1000), // 50 minutos no futuro
           createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutos atrás
         }
      ];
      
      await QualityTest.create(testesQualidade);
       console.log('Testes de qualidade de exemplo criados');
     }
     
     // Criar sessões de operação com cenários de testes atrasados
     const OperationSession = require('./src/models/OperationSession');
     const sessionCount = await OperationSession.countDocuments();
     if (sessionCount === 0) {
       const maquinas = await Machine.find().limit(3);
       
       const sessoes = [
         // Sessão ativa há mais de 30 minutos (teste atrasado)
         {
           user: usuarios[0]._id,
           operationActive: true,
           activeTimer: {
             type: 'dashboard',
             machineId: maquinas[0]._id.toString(),
             startTime: new Date(Date.now() - 45 * 60 * 1000) // 45 minutos atrás
           },
           operationHistory: [
             {
               time: new Date(Date.now() - 45 * 60 * 1000).toLocaleTimeString('pt-BR'),
               action: 'start_operation',
               timestamp: new Date(Date.now() - 45 * 60 * 1000)
             }
           ],
           lastActivity: new Date(Date.now() - 5 * 60 * 1000)
         },
         // Outra sessão ativa há mais de 30 minutos (teste atrasado)
         {
           user: usuarios[1]._id,
           operationActive: true,
           activeTimer: {
             type: 'dashboard',
             machineId: maquinas[1]._id.toString(),
             startTime: new Date(Date.now() - 35 * 60 * 1000) // 35 minutos atrás
           },
           operationHistory: [
             {
               time: new Date(Date.now() - 35 * 60 * 1000).toLocaleTimeString('pt-BR'),
               action: 'start_operation',
               timestamp: new Date(Date.now() - 35 * 60 * 1000)
             }
           ],
           lastActivity: new Date(Date.now() - 2 * 60 * 1000)
         },
         // Sessão recente (não atrasada)
         {
           user: usuarios[2]._id,
           operationActive: true,
           activeTimer: {
             type: 'dashboard',
             machineId: maquinas[2]._id.toString(),
             startTime: new Date(Date.now() - 15 * 60 * 1000) // 15 minutos atrás
           },
           operationHistory: [
             {
               time: new Date(Date.now() - 15 * 60 * 1000).toLocaleTimeString('pt-BR'),
               action: 'start_operation',
               timestamp: new Date(Date.now() - 15 * 60 * 1000)
             }
           ],
           lastActivity: new Date(Date.now() - 1 * 60 * 1000)
         }
       ];
       
       await OperationSession.create(sessoes);
       console.log('Sessões de operação de exemplo criadas');
     }
   } catch (err) {
     console.error('Erro ao inicializar dados:', err);
  }
}

// Importar rotas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const machineRoutes = require('./src/routes/machines');
const qualityTestRoutes = require('./src/routes/qualityTests');
const teflonRoutes = require('./src/routes/teflon');
const operationSessionRoutes = require('./src/routes/operationSession');


// Importar testes automáticos
// Autotest removido - não faz mais parte do novo sistema

// Iniciar o servidor MongoDB e registrar rotas após conexão
startServer().then(() => {
  // Endpoint de debug para rota operador
app.get('/api/debug/operador', (req, res) => {
  try {
    const fs = require('fs');
    const filePath = path.join(__dirname, 'client', 'dist', 'index.html');
    
    // Verificar se o arquivo existe
    const fileExists = fs.existsSync(filePath);
    
    // Verificar se a pasta dist existe
    const distPath = path.join(__dirname, 'client', 'dist');
    const distExists = fs.existsSync(distPath);
    
    // Listar arquivos na pasta dist se existir
    let distFiles = [];
    if (distExists) {
      distFiles = fs.readdirSync(distPath);
    }
    
    res.json({
      success: true,
      debug: {
        filePath,
        fileExists,
        distPath,
        distExists,
        distFiles,
        __dirname,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint de debug temporário
app.get('/api/debug/status', async (req, res) => {
  try {
    const User = require('./src/models/User');
    const userCount = await User.countDocuments();
    const users = await User.find({}, 'username role');
    
    res.json({
      success: true,
      mongodb_connected: mongoose.connection.readyState === 1,
      connection_state: mongoose.connection.readyState,
      user_count: userCount,
      users: users.map(u => ({ username: u.username, role: u.role })),
      environment: process.env.NODE_ENV,
      mongodb_uri_configured: !!(process.env.MONGODB_URI || process.env.MONGO_URI)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      mongodb_connected: mongoose.connection.readyState === 1,
      connection_state: mongoose.connection.readyState
    });
  }
});

// Endpoint para criar usuários específicos
app.post('/api/debug/create-users', async (req, res) => {
  try {
    const User = require('./src/models/User');
    
    // Usuários específicos solicitados
    const usersToCreate = [
      {
        username: 'operador',
        name: 'Operador',
        email: 'operador@zara.com',
        password: '123456',
        role: 'operator'
      },
      {
        username: 'gestor',
        name: 'Gestor',
        email: 'gestor@zara.com',
        password: '123456',
        role: 'manager'
      },
      {
        username: 'lider',
        name: 'Líder',
        email: 'lider@zara.com',
        password: '123456',
        role: 'leader'
      }
    ];
    
    const results = [];
    
    for (const userData of usersToCreate) {
      try {
        // Verificar se o usuário já existe
        const existingUser = await User.findOne({ username: userData.username });
        
        if (existingUser) {
          results.push({ username: userData.username, status: 'already_exists', role: userData.role });
        } else {
          // Criar o usuário
          const newUser = await User.create(userData);
          results.push({ username: userData.username, status: 'created', role: userData.role });
        }
      } catch (error) {
        results.push({ username: userData.username, status: 'error', error: error.message });
      }
    }
    
    res.json({
      success: true,
      results: results,
      message: 'Processo de criação de usuários concluído'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint temporário para resetar senhas dos usuários operador e lider
app.post('/api/debug/reset-passwords', async (req, res) => {
  try {
    const User = require('./models/User');
    
    // Usuários para resetar senha
    const usersToReset = ['operador', 'lider'];
    const newPassword = '123456';
    
    const results = [];
    
    for (const username of usersToReset) {
      try {
        const user = await User.findOne({ username });
        
        if (user) {
          // Definir a senha diretamente - o middleware pre('save') fará o hash
          user.password = newPassword;
          await user.save();
          results.push({ username, status: 'password_reset', message: 'Senha resetada para 123456' });
        } else {
          results.push({ username, status: 'not_found', message: 'Usuário não encontrado' });
        }
      } catch (error) {
        results.push({ username, status: 'error', error: error.message });
      }
    }
    
    res.json({
      success: true,
      results: results,
      message: 'Processo de reset de senhas concluído'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para verificar informações dos usuários (debug)
app.get('/api/debug/user-info/:username', async (req, res) => {
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Testar se a senha '123456' funciona
    const passwordTest = await bcrypt.compare('123456', user.password);
    
    res.json({
      success: true,
      user: {
        username: user.username,
        name: user.name,
        role: user.role,
        active: user.active,
        email: user.email,
        passwordHash: user.password.substring(0, 20) + '...',
        passwordTestResult: passwordTest
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

  // Usar rotas após conexão com MongoDB
  app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/quality-tests', qualityTestRoutes);
app.use('/api/teflon', teflonRoutes);
app.use('/api/operation-session', operationSessionRoutes);
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/sse', require('./src/routes/sse'));

// Servir arquivos estáticos do React build
const staticPath = path.join(__dirname, 'client', 'dist');
console.log('🔍 Caminho dos arquivos estáticos:', staticPath);
console.log('🔍 Verificando se o diretório existe:', require('fs').existsSync(staticPath));
if (require('fs').existsSync(staticPath)) {
  console.log('📁 Arquivos no diretório dist:', require('fs').readdirSync(staticPath));
}
app.use(express.static(staticPath));

// Rotas específicas para diferentes tipos de usuário (React SPA)
const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
console.log('🔍 Caminho do index.html:', indexPath);
console.log('🔍 Verificando se index.html existe:', require('fs').existsSync(indexPath));

app.get('/operador', (req, res) => {
  res.sendFile(indexPath);
});

app.get('/login', (req, res) => {
  res.sendFile(indexPath);
});

app.get('/dashboard', (req, res) => {
  res.sendFile(indexPath);
});

app.get('/lider', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

app.get('/gestor', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// Rota catch-all para SPA routing (deve vir após rotas específicas)
app.get('*', (req, res, next) => {
  // Se for uma rota de API, passe para o próximo middleware
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Para outras rotas, serve o index.html do React para permitir client-side routing
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// Middleware para rotas não encontradas (deve vir após todas as rotas)
app.use(notFoundHandler);

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

// Endpoint para resetar usuários (apenas em produção)
app.post('/api/reset-users', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      return res.status(403).json({
        success: false,
        message: 'Este endpoint só funciona em produção'
      });
    }

    const bcrypt = require('bcryptjs');
    const User = require('./src/models/User');

    console.log('🔄 Iniciando reset de usuários...');

    // Remover todos os usuários existentes
    const deleteResult = await User.deleteMany({});
    console.log(`🗑️ ${deleteResult.deletedCount} usuários removidos`);

    // Usuários padrão com senha 123456
     const defaultUsers = [
       {
         username: 'operador',
         email: 'operador@zara.com',
         password: '123456',
         role: 'operator',
         name: 'Operador Sistema'
       },
       {
         username: 'gestor',
         email: 'gestor@zara.com',
         password: '123456',
         role: 'manager',
         name: 'Gestor Qualidade'
       },
       {
         username: 'lider',
         email: 'lider@zara.com',
         password: '123456',
         role: 'leader',
         name: 'Líder Produção'
       },
       {
         username: 'admin',
         email: 'admin@zara.com',
         password: '123456',
         role: 'manager',
         name: 'Administrador Sistema'
       }
     ];

    const createdUsers = [];
    const errors = [];

    // Criar novos usuários
    for (const userData of defaultUsers) {
      try {
        // Criar usuário (o middleware pre('save') fará o hash automaticamente)
        const user = new User({
          username: userData.username,
          email: userData.email,
          password: userData.password, // Senha em texto plano - será hasheada pelo middleware
          role: userData.role,
          name: userData.name
        });

        await user.save();
        console.log(`✅ Usuário criado: ${userData.username} (${userData.role})`);
        
        // Verificar se a senha foi salva corretamente
        const savedUser = await User.findOne({ username: userData.username });
        const isPasswordValid = await bcrypt.compare('123456', savedUser.password);
        
        createdUsers.push({
          username: userData.username,
          role: userData.role,
          email: userData.email,
          passwordTest: isPasswordValid
        });
        
      } catch (error) {
        console.error(`❌ Erro ao criar usuário ${userData.username}:`, error.message);
        errors.push({
          username: userData.username,
          error: error.message
        });
      }
    }

    const totalUsers = await User.countDocuments();
    console.log(`✅ Reset concluído. Total de usuários: ${totalUsers}`);

    res.json({
      success: true,
      message: 'Reset de usuários concluído com sucesso',
      data: {
        usersDeleted: deleteResult.deletedCount,
        usersCreated: createdUsers.length,
        totalUsers: totalUsers,
        createdUsers: createdUsers,
        errors: errors
      }
    });
    
  } catch (error) {
    console.error('❌ Erro durante o reset:', error);
    res.status(500).json({
      success: false,
      message: 'Erro durante o reset de usuários',
      error: error.message
    });
  }
});

// Endpoint para criar usuários padrão (apenas em produção)
app.post('/api/setup/create-users', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      return res.status(403).json({
        success: false,
        message: 'Este endpoint só funciona em produção'
      });
    }

    const bcrypt = require('bcryptjs');
    const User = require('./src/models/User');
    const Machine = require('./src/models/Machine');

    // Definir usuários a serem criados
    const usersToCreate = [
      {
        username: 'admin',
        password: 'admin123',
        role: 'leader',
        name: 'Administrador',
        email: 'admin@zara.com'
      },
      {
        username: 'operador',
        password: 'operador123',
        role: 'operator',
        name: 'Operador Sistema',
        email: 'operador@zara.com'
      },
      {
        username: 'lider',
        password: 'lider123',
        role: 'leader',
        name: 'Líder Produção',
        email: 'lider@zara.com'
      },
      {
        username: 'gestor',
        password: 'gestor123',
        role: 'manager',
        name: 'Gestor Qualidade',
        email: 'gestor@zara.com'
      }
    ];

    const createdUsers = [];
    const existingUsers = [];

    // Criar cada usuário
    for (const userData of usersToCreate) {
      // Verificar se usuário já existe
      const existingUser = await User.findOne({ 
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });
      
      if (existingUser) {
        existingUsers.push(userData.username);
        continue;
      }

      // Criar senha hash
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Criar usuário
      const user = new User({
        username: userData.username,
        password: hashedPassword,
        role: userData.role,
        name: userData.name,
        email: userData.email
      });
      
      await user.save();
      createdUsers.push({
        username: userData.username,
        email: userData.email,
        role: userData.role
      });
    }

    // Criar máquinas básicas se não existirem
    const existingMachines = await Machine.countDocuments();
    let machinesCreated = false;
    
    if (existingMachines === 0) {
      const machines = [
        {
          code: 'MAQ001',
          name: 'Máquina 01',
          type: 'Produção',
          location: 'Setor A',
          status: 'active'
        },
        {
          code: 'MAQ002',
          name: 'Máquina 02', 
          type: 'Produção',
          location: 'Setor B',
          status: 'active'
        },
        {
          code: 'MAQ003',
          name: 'Máquina 03',
          type: 'Teste',
          location: 'Laboratório',
          status: 'active'
        }
      ];
      
      await Machine.insertMany(machines);
      machinesCreated = true;
    }

    res.json({
      success: true,
      message: 'Setup concluído',
      data: {
        usersCreated: createdUsers.length,
        usersExisting: existingUsers.length,
        machinesCreated: machinesCreated ? 3 : 0,
        createdUsers,
        existingUsers
      }
    });

  } catch (error) {
    console.error('Erro no setup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuários',
      error: error.message
    });
  }
});
  
  
  // Middleware de tratamento de erro para rotas da API
  app.use((err, req, res, next) => {
    // Só aplicar para rotas da API
    if (req.path.startsWith('/api/')) {
      console.error('Erro na API:', err);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
      });
    } else {
      next(err);
    }
  });
  
  // Arquivos estáticos já configurados anteriormente
  
  console.log('✅ Rotas registradas após conexão com MongoDB');
}).catch(err => {
  console.error('❌ Erro ao inicializar servidor:', err);
  process.exit(1);
});

// Rota raiz - servir sistema (React se disponível, senão sistema antigo)
app.get('/', (req, res) => {
  console.log('🔍 Tentando servir index.html da rota raiz:', indexPath);
  res.sendFile(indexPath);
});

// Rota de status da API
app.get('/api/status', (req, res) => {
  // Determinar URL do frontend baseada no ambiente
  // Detectar se está rodando no Render automaticamente
  const isRender = process.env.RENDER || 
                   process.env.RENDER_SERVICE_ID || 
                   (process.env.NODE_ENV === 'production' && process.env.PORT);
  
  const frontendUrl = isRender 
    ? 'https://zara-quality-system-2.onrender.com'
    : 'http://localhost:3000';
    
  res.json({
    success: true,
    message: 'API Zara Quality System está funcionando!',
    version: '1.0.0',
    frontend: frontendUrl
  });
});

// Iniciar o servidor
// Rota catch-all para React SPA (deve ser a última rota)
app.get('*', (req, res) => {
  // Não interceptar rotas da API
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  console.log('🔍 Servindo SPA para rota:', req.path, 'usando:', indexPath);
  res.sendFile(indexPath);
});

const PORT = config.PORT;
const HOST = process.env.NODE_ENV === 'production' ? undefined : '0.0.0.0';
server.listen(PORT, HOST, () => {
  logger.info(`Servidor rodando na porta ${PORT}`, {
    port: PORT,
    environment: config.NODE_ENV,
    host: HOST || 'default',
    url: config.NODE_ENV === 'production' ? 'Produção' : `http://0.0.0.0:${PORT}`
  });
  
  if (config.NODE_ENV === 'production') {
    logger.info('Aplicação em produção');
    // Sinalizar para PM2 que a aplicação está pronta
    if (process.send) {
      process.send('ready');
    }
  } else {
    logger.info('Modo desenvolvimento ativo');
    // Testes automáticos foram removidos para otimização
    logger.info('Sistema pronto para desenvolvimento');
  }
});

// Tratamento de sinais para produção (graceful shutdown)
const gracefulShutdown = async (signal) => {
  logger.info(`Recebido ${signal}, encerrando servidor graciosamente...`);
  
  try {
    // Fechar servidor HTTP
    await new Promise((resolve) => {
      server.close(resolve);
    });
    logger.info('Servidor HTTP encerrado');
    
    // Fechar conexão MongoDB
    const { disconnectDB } = require('./config/database');
    await disconnectDB();
    
    // Fechar MongoDB Memory Server se existir
    if (mongoServer) {
      await mongoServer.stop();
      logger.info('MongoDB Memory Server encerrado');
    }
    
    logger.info('Aplicação encerrada graciosamente');
    process.exit(0);
  } catch (error) {
    logger.error('Erro durante encerramento gracioso:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));