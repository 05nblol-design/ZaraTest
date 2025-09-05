const express = require('express');
const {
  getOperationSession,
  updateOperationState,
  updateActiveTimer,
  addToHistory,
  clearOperationSession,
  syncOperationSession,
  getAllOperationSessions
} = require('../controllers/operationSessionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(protect);

// @route   GET /api/operation-session
// @desc    Obter sessão de operação do usuário
// @access  Private
router.get('/', getOperationSession);

// @route   PUT /api/operation-session/operation
// @desc    Atualizar estado da operação
// @access  Private
router.put('/operation', updateOperationState);

// @route   PUT /api/operation-session/timer
// @desc    Atualizar cronômetro ativo
// @access  Private
router.put('/timer', updateActiveTimer);

// @route   POST /api/operation-session/history
// @desc    Adicionar item ao histórico
// @access  Private
router.post('/history', addToHistory);

// @route   DELETE /api/operation-session
// @desc    Limpar sessão de operação
// @access  Private
router.delete('/', clearOperationSession);

// @route   PUT /api/operation-session/sync
// @desc    Sincronizar sessão completa
// @access  Private
router.put('/sync', syncOperationSession);

// @route   GET /api/operation-sessions
// @desc    Obter todas as sessões de operação (apenas líderes)
// @access  Private (Leader only)
router.get('/all', getAllOperationSessions);

module.exports = router;