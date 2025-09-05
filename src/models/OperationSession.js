const mongoose = require('mongoose');

const OperationSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // Um usuário pode ter apenas uma sessão ativa
  },
  machine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: false // Máquina selecionada para a operação
  },
  operationActive: {
    type: Boolean,
    default: false
  },
  operationHistory: [{
    time: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  activeTimer: {
    testId: {
      type: String,
      default: null
    },
    startTime: {
      type: Date,
      default: null
    },
    type: {
      type: String,
      enum: ['dashboard', 'form'],
      default: 'dashboard'
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Atualizar o campo updatedAt antes de salvar
OperationSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.lastActivity = new Date();
  next();
});

// Método para adicionar item ao histórico
OperationSessionSchema.methods.addToHistory = function(action) {
  const now = new Date();
  const timeLabel = now.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  this.operationHistory.push({
    time: timeLabel,
    action: action,
    timestamp: now
  });
  
  // Manter apenas os últimos 10 itens
  if (this.operationHistory.length > 10) {
    this.operationHistory.shift();
  }
};

// Método para limpar sessão
OperationSessionSchema.methods.clearSession = function() {
  this.operationActive = false;
  this.operationHistory = [];
  this.activeTimer = {
    testId: null,
    startTime: null,
    type: 'dashboard' // Definir um valor válido do enum
  };
};

module.exports = mongoose.model('OperationSession', OperationSessionSchema);