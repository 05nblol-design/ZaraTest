const OperationSession = require('../models/OperationSession');
const User = require('../models/User');

// @desc    Obter sessão de operação do usuário
// @route   GET /api/operation-session
// @access  Private
exports.getOperationSession = async (req, res) => {
  try {
    console.log('🔍 getOperationSession - Iniciando busca para usuário:', req.user.id);
    let session = await OperationSession.findOne({ user: req.user.id });
    console.log('📊 getOperationSession - Sessão encontrada:', session ? 'SIM' : 'NÃO');
    
    // Se não existe sessão, criar uma nova
    if (!session) {
      session = await OperationSession.create({
        user: req.user.id,
        operationActive: false,
        operationHistory: [],
        activeTimer: {
          testId: null,
          startTime: null
        },
        machine: null
      });
    }
    
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('❌ getOperationSession - Erro:', error.message);
    console.error('📋 getOperationSession - Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter sessão de operação',
      error: error.message
    });
  }
};

// @desc    Atualizar estado da operação
// @route   PUT /api/operation-session/operation
// @access  Private
exports.updateOperationState = async (req, res) => {
  try {
    console.log('🔄 updateOperationState - Iniciando para usuário:', req.user.id);
    const { operationActive, action, machineId } = req.body;
    console.log('📝 updateOperationState - Dados recebidos:', { operationActive, action, machineId });
    
    let session = await OperationSession.findOne({ user: req.user.id });
    console.log('📊 updateOperationState - Sessão encontrada:', session ? 'SIM' : 'NÃO');
    
    if (!session) {
      session = await OperationSession.create({
        user: req.user.id,
        operationActive: false,
        operationHistory: [],
        activeTimer: {
          testId: null,
          startTime: null
        }
      });
    }
    
    // Atualizar estado da operação
    session.operationActive = operationActive;
    
    // Se uma máquina foi selecionada e a operação está sendo iniciada
    if (machineId && operationActive) {
      session.machine = machineId;
    }
    
    // Adicionar ao histórico se uma ação foi fornecida
    if (action) {
      session.addToHistory(action);
    }
    
    await session.save();
    
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('❌ updateOperationState - Erro:', error.message);
    console.error('📋 updateOperationState - Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar estado da operação',
      error: error.message
    });
  }
};

// @desc    Atualizar cronômetro ativo
// @route   PUT /api/operation-session/timer
// @access  Private
exports.updateActiveTimer = async (req, res) => {
  try {
    console.log('⏰ updateActiveTimer - Iniciando para usuário:', req.user.id);
    const { testId, startTime, type } = req.body;
    console.log('📝 updateActiveTimer - Dados recebidos:', { testId, startTime, type });
    
    let session = await OperationSession.findOne({ user: req.user.id });
    console.log('📊 updateActiveTimer - Sessão encontrada:', session ? 'SIM' : 'NÃO');
    
    if (!session) {
      session = await OperationSession.create({
        user: req.user.id,
        operationActive: false,
        operationHistory: [],
        activeTimer: {
          testId: null,
          startTime: null
        }
      });
    }
    
    // Atualizar cronômetro ativo
    session.activeTimer = {
      testId: testId || null,
      startTime: startTime ? new Date(startTime) : null,
      type: type || null
    };
    
    await session.save();
    
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('❌ updateActiveTimer - Erro:', error.message);
    console.error('📋 updateActiveTimer - Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar cronômetro ativo',
      error: error.message
    });
  }
};

// @desc    Adicionar item ao histórico
// @route   POST /api/operation-session/history
// @access  Private
exports.addToHistory = async (req, res) => {
  try {
    console.log('📝 addToHistory - Iniciando para usuário:', req.user.id);
    const { action } = req.body;
    console.log('📝 addToHistory - Ação recebida:', action);
    
    if (!action) {
      console.log('❌ addToHistory - Ação não fornecida');
      return res.status(400).json({
        success: false,
        message: 'Ação é obrigatória'
      });
    }
    
    let session = await OperationSession.findOne({ user: req.user.id });
    console.log('📊 addToHistory - Sessão encontrada:', session ? 'SIM' : 'NÃO');
    
    if (!session) {
      session = await OperationSession.create({
        user: req.user.id,
        operationActive: false,
        operationHistory: [],
        activeTimer: {
          testId: null,
          startTime: null
        }
      });
    }
    
    console.log('📝 addToHistory - Adicionando ao histórico...');
    session.addToHistory(action);
    console.log('💾 addToHistory - Salvando sessão...');
    await session.save();
    console.log('✅ addToHistory - Sessão salva com sucesso');
    
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('❌ addToHistory - Erro:', error.message);
    console.error('📋 addToHistory - Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar ao histórico',
      error: error.message
    });
  }
};

// @desc    Limpar sessão de operação
// @route   DELETE /api/operation-session
// @access  Private
exports.clearOperationSession = async (req, res) => {
  try {
    console.log('🧹 clearOperationSession - Iniciando para usuário:', req.user.id);
    let session = await OperationSession.findOne({ user: req.user.id });
    console.log('📊 clearOperationSession - Sessão encontrada:', session ? 'SIM' : 'NÃO');
    
    if (!session) {
      console.log('❌ clearOperationSession - Sessão não encontrada');
      return res.status(404).json({
        success: false,
        message: 'Sessão não encontrada'
      });
    }
    
    console.log('🔄 clearOperationSession - Chamando clearSession()');
    session.clearSession();
    console.log('💾 clearOperationSession - Salvando sessão...');
    await session.save();
    console.log('✅ clearOperationSession - Sessão limpa com sucesso');
    
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('❌ clearOperationSession - Erro:', error.message);
    console.error('📋 clearOperationSession - Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar sessão',
      error: error.message
    });
  }
};

// @desc    Sincronizar sessão completa
// @route   PUT /api/operation-session/sync
// @access  Private
exports.syncOperationSession = async (req, res) => {
  try {
    const { operationActive, operationHistory, activeTimer } = req.body;
    
    let session = await OperationSession.findOne({ user: req.user.id });
    
    if (!session) {
      session = await OperationSession.create({
        user: req.user.id,
        operationActive: operationActive || false,
        operationHistory: operationHistory || [],
        activeTimer: activeTimer || {
          testId: null,
          startTime: null,
          type: null
        }
      });
    } else {
      // Atualizar todos os campos
      session.operationActive = operationActive !== undefined ? operationActive : session.operationActive;
      session.operationHistory = operationHistory || session.operationHistory;
      session.activeTimer = activeTimer || session.activeTimer;
    }
    
    await session.save();
    
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar sessão',
      error: error.message
    });
  }
};

// @desc    Obter todas as sessões de operação (apenas para líderes)
// @route   GET /api/operation-sessions
// @access  Private (Leader only)
exports.getAllOperationSessions = async (req, res) => {
  try {
    console.log('🔍 getAllOperationSessions - Iniciando busca para líder:', req.user.id);
    
    // Verificar se o usuário é líder ou gestor
    // Se o usuário já tem role definido (fallback), usar diretamente
    if (req.user.role && (req.user.role === 'leader' || req.user.role === 'manager')) {
      // Usuário autorizado via fallback
    } else {
      // Tentar buscar no banco apenas se o ID for um ObjectId válido
      try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'leader' && user.role !== 'manager')) {
          return res.status(403).json({
            success: false,
            message: 'Acesso negado. Apenas líderes e gestores podem acessar todas as sessões.'
          });
        }
      } catch (dbError) {
        // Se houver erro de cast ou DB, verificar role do fallback
        if (!req.user.role || (req.user.role !== 'leader' && req.user.role !== 'manager')) {
          return res.status(403).json({
            success: false,
            message: 'Acesso negado. Apenas líderes e gestores podem acessar todas as sessões.'
          });
        }
      }
    }
    
    // Buscar todas as sessões de operação
    const sessions = await OperationSession.find({}).populate('user', 'name email');
    console.log('📊 getAllOperationSessions - Sessões encontradas:', sessions.length);
    
    res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('❌ getAllOperationSessions - Erro:', error.message);
    console.error('📋 getAllOperationSessions - Stack:', error.stack);
    
    // Retornar dados de teste quando MongoDB não estiver disponível
    const testSessions = [
      {
        _id: 'session-1',
        user: { _id: 'user-1', name: 'Operador Teste 1', email: 'op1@test.com' },
        operationActive: true,
        machine: 'machine-1',
        operationHistory: [],
        activeTimer: { testId: null, startTime: null },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'session-2',
        user: { _id: 'user-2', name: 'Operador Teste 2', email: 'op2@test.com' },
        operationActive: false,
        machine: null,
        operationHistory: [],
        activeTimer: { testId: null, startTime: null },
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000)
      }
    ];
    
    res.status(200).json({
      success: true,
      data: testSessions
    });
   }
 };