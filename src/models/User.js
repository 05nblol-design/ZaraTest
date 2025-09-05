const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['operator', 'leader', 'manager'],
    default: 'operator'
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  active: {
    type: Boolean,
    default: true
  },
  // Campos para o sistema de chat
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  avatar: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para otimizar consultas (username e email já têm índices únicos pelo schema)
UserSchema.index({ role: 1 });
UserSchema.index({ active: 1 });
UserSchema.index({ isOnline: 1 });
UserSchema.index({ lastSeen: -1 });
UserSchema.index({ createdAt: -1 });

// Índice composto para consultas de usuários online por role
UserSchema.index({ isOnline: 1, role: 1 });

// Método para criptografar a senha antes de salvar
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senhas
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);