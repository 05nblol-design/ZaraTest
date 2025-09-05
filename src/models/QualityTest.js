const mongoose = require('mongoose');

const QualityTestSchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true,
    unique: true
  },
  machine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: true
  },
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lotNumber: {
    type: String,
    required: true,
    trim: true
  },
  parameters: {
    temperature: {
      type: Number,
      required: true
    },
    pressure: {
      type: Number,
      required: true
    },
    speed: {
      type: Number,
      required: true
    },
    other: {
      type: Map,
      of: String
    }
  },
  bathtubTest: {
    performed: {
      type: Boolean,
      default: false
    },
    result: {
      type: String,
      enum: ['passed', 'failed', 'pending'],
      default: 'pending'
    },
    notes: String
  },
  testDuration: {
    type: Number, // duração em segundos
    default: 0
  },
  timerStarted: {
    type: Date,
    default: null
  },
  timerCompleted: {
    type: Boolean,
    default: false
  },
  timerAlertSent: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date,
    default: null
  },
  expectedDuration: {
    type: Number, // duração esperada em minutos
    default: 2 // 2 minutos por padrão
  },
  attachments: [{
    type: {
      type: String,
      enum: ['photo', 'video'],
      required: true
    },
    path: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'delayed'],
    default: 'pending'
  },
  result: {
    type: String,
    enum: ['approved', 'rejected', 'pending'],
    default: 'pending'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  deadline: {
    type: Date,
    required: true
  }
});

// Método para verificar se o teste está atrasado
QualityTestSchema.methods.isDelayed = function() {
  if (this.status === 'completed' || this.status === 'failed') {
    return false;
  }
  return new Date() > this.deadline;
};

// Método para verificar se o cronômetro de 2 minutos expirou
QualityTestSchema.methods.isTimerExpired = function() {
  if (!this.timerStarted || this.timerCompleted) {
    return false;
  }
  
  const twoMinutesInMs = 2 * 60 * 1000; // 2 minutos em milissegundos
  const elapsedTime = new Date() - this.timerStarted;
  
  return elapsedTime >= twoMinutesInMs;
};

module.exports = mongoose.model('QualityTest', QualityTestSchema);