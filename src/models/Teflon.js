const mongoose = require('mongoose');
const moment = require('moment');

const TeflonSchema = new mongoose.Schema({
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: true
  },
  replacedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  replacementDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expirationDate: {
    type: Date,
    required: true
  },
  batchNumber: {
    type: String,
    required: true
  },
  supplier: {
    type: String,
    required: true
  },
  notes: String,
  // Informações dos cabeçotes de solda
  panel: {
    type: String,
    enum: ['frontal', 'traseiro'],
    required: true
  },
  weldingHeads: {
    type: [Number],
    required: true,
    validate: {
      validator: function(heads) {
        // Verificar se todos os cabeçotes estão no range correto baseado no painel
        if (this.panel === 'frontal') {
          return heads.every(head => head >= 1 && head <= 28);
        } else if (this.panel === 'traseiro') {
          return heads.every(head => head >= 29 && head <= 56);
        }
        return false;
      },
      message: 'Cabeçotes devem estar no range correto: frontal (1-28) ou traseiro (29-56)'
    }
  },
  alertSent: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'replaced'],
    default: 'active'
  },
  notifications: {
    expiryWarningDays: {
      type: Number,
      default: 3 // Alertar 3 dias antes do vencimento
    },
    lastExpiryNotification: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual para calcular dias até expiração
TeflonSchema.virtual('daysUntilExpiry').get(function() {
  const today = new Date();
  const expiry = new Date(this.expirationDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para verificar se está próximo ao vencimento
TeflonSchema.virtual('isNearExpiry').get(function() {
  return this.daysUntilExpiry <= this.notifications.expiryWarningDays;
});

// Middleware para calcular a data de expiração (5 dias após a troca)
TeflonSchema.pre('save', function(next) {
  // Só calcula automaticamente se for um documento novo E não tiver expirationDate definida
  if (this.isNew && (!this.expirationDate || this.expirationDate === null || this.expirationDate === undefined)) {
    this.expirationDate = moment(this.replacementDate).add(5, 'days').toDate();
  }
  
  // Atualizar status se expirado
  const today = new Date();
  if (this.expirationDate < today && this.status === 'active') {
    this.status = 'expired';
  }
  
  next();
});

// Métodos estáticos para buscar teflons que precisam de notificação
TeflonSchema.statics.findExpiringSoon = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    expirationDate: { $lte: futureDate, $gte: new Date() },
    status: 'active'
  }).populate('machineId replacedBy');
};

TeflonSchema.statics.findExpired = function() {
  return this.find({
    expirationDate: { $lt: new Date() },
    status: { $in: ['active', 'expired'] }
  }).populate('machineId replacedBy');
};

// Configurar virtuals para serem incluídos no JSON
TeflonSchema.set('toJSON', { virtuals: true });
TeflonSchema.set('toObject', { virtuals: true });

// Método para verificar se o Teflon está próximo da expiração (3 dias antes)
TeflonSchema.methods.isNearExpiration = function() {
  const today = new Date();
  const threeDaysFromNow = moment(today).add(3, 'days').toDate();
  
  return today < this.expirationDate && this.expirationDate <= threeDaysFromNow;
};

// Método para verificar se o Teflon já expirou
TeflonSchema.methods.isExpired = function() {
  return new Date() > this.expirationDate;
};

module.exports = mongoose.model('Teflon', TeflonSchema);