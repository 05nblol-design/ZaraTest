const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['test_overdue', 'teflon_expiry', 'system_alert', 'quality_alert']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['operator', 'leader', 'manager']
    },
    read: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    }
  }],
  relatedData: {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QualityTest'
    },
    teflonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teflon'
    },
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine'
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'dismissed'],
    default: 'active'
  },
  expiresAt: {
    type: Date
  },
  metadata: {
    overdueMinutes: Number,
    daysUntilExpiry: Number,
    originalDeadline: Date,
    severity: String
  }
}, {
  timestamps: true
});

// Índices para performance
notificationSchema.index({ 'recipients.userId': 1, status: 1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Métodos estáticos
notificationSchema.statics.createTestOverdueNotification = async function(testData) {
  const User = mongoose.model('User');
  
  // Buscar gestores e líderes para notificar
  const recipients = await User.find({
    role: { $in: ['leader', 'manager'] }
  }).select('_id role');
  
  const notification = new this({
    type: 'test_overdue',
    title: 'Teste de Qualidade Atrasado',
    message: `Teste ${testData.testId} na máquina ${testData.machineName} está ${testData.overdueMinutes} minutos atrasado`,
    priority: testData.overdueMinutes > 60 ? 'critical' : 'high',
    recipients: recipients.map(user => ({
      userId: user._id,
      role: user.role
    })),
    relatedData: {
      testId: testData.testId,
      machineId: testData.machineId,
      operatorId: testData.operatorId
    },
    metadata: {
      overdueMinutes: testData.overdueMinutes,
      originalDeadline: testData.deadline,
      severity: testData.overdueMinutes > 60 ? 'critical' : 'high'
    },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expira em 24h
  });
  
  return await notification.save();
};

notificationSchema.statics.createTeflonExpiryNotification = async function(teflonData) {
  const User = mongoose.model('User');
  
  // Buscar gestores e líderes para notificar sobre teflon
  const recipients = await User.find({
    role: { $in: ['leader', 'manager', 'operator'] }
  }).select('_id role');
  
  const isExpired = teflonData.isExpired || teflonData.daysUntilExpiry <= 0;
  const title = isExpired ? 'Teflon Expirado' : 'Teflon Próximo ao Vencimento';
  const message = isExpired 
    ? `Teflon ${teflonData.code} na máquina ${teflonData.machineName} está EXPIRADO`
    : `Teflon ${teflonData.code} na máquina ${teflonData.machineName} vence em ${teflonData.daysUntilExpiry} dias`;
  
  let priority;
  if (isExpired) {
    priority = 'critical';
  } else if (teflonData.daysUntilExpiry <= 1) {
    priority = 'critical';
  } else if (teflonData.daysUntilExpiry <= 3) {
    priority = 'high';
  } else {
    priority = 'medium';
  }
  
  const notification = new this({
    type: 'teflon_expiry',
    title,
    message,
    priority,
    recipients: recipients.map(user => ({
      userId: user._id,
      role: user.role
    })),
    relatedData: {
      teflonId: teflonData.teflonId
    },
    metadata: {
      daysUntilExpiry: teflonData.daysUntilExpiry,
      severity: priority,
      machineName: teflonData.machineName,
      isExpired
    },
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expira em 7 dias
  });
  
  return await notification.save();
};

notificationSchema.statics.createOperationWithoutTestNotification = async function(operationData) {
  const User = mongoose.model('User');
  
  // Buscar líderes e gestores para notificar
  const recipients = await User.find({
    role: { $in: ['leader', 'manager'] }
  }).select('_id role');
  
  const notification = new this({
    type: 'quality_alert',
    title: 'Operação Sem Teste de Qualidade',
    message: `Operador ${operationData.operatorName} na máquina ${operationData.machineName} está operando há ${operationData.operationMinutes} minutos sem realizar teste de qualidade`,
    priority: 'high',
    recipients: recipients.map(user => ({
      userId: user._id,
      role: user.role
    })),
    relatedData: {
      machineId: operationData.machineId,
      operatorId: operationData.operatorId
    },
    metadata: {
      operationMinutes: operationData.operationMinutes,
      severity: 'high',
      alertType: 'no_quality_test'
    },
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // Expira em 12h
  });
  
  return await notification.save();
};

// Método para marcar como lida
notificationSchema.methods.markAsRead = function(userId) {
  const recipient = this.recipients.find(r => r.userId.toString() === userId.toString());
  if (recipient) {
    recipient.read = true;
    recipient.readAt = new Date();
  }
  return this.save();
};

// Método para buscar notificações não lidas de um usuário
notificationSchema.statics.getUnreadForUser = function(userId) {
  return this.find({
    'recipients.userId': userId,
    'recipients.read': false,
    status: 'active'
  }).populate('relatedData.testId relatedData.teflonId relatedData.machineId relatedData.operatorId')
    .sort({ createdAt: -1 });
};

// Método para buscar todas as notificações de um usuário
notificationSchema.statics.getForUser = function(userId, limit = 50) {
  return this.find({
    'recipients.userId': userId
  }).populate('relatedData.testId relatedData.teflonId relatedData.machineId relatedData.operatorId')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Notification', notificationSchema);