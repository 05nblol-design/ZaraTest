const express = require('express');
const router = express.Router();
const { 
  createQualityTest, 
  updateQualityTest, 
  getQualityTests, 
  getQualityTest,
  getQualityTestStats,
  addAttachment,
  startTimer,
  completeTimer,
  checkTimerStatus
} = require('../controllers/qualityTestController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Rotas protegidas para todos os usuários autenticados
router.post('/', protect, createQualityTest);
router.get('/:id', protect, getQualityTest);
router.put('/:id', protect, updateQualityTest);

// Rotas para o cronômetro
router.put('/:id/start-timer', protect, startTimer);
router.put('/:id/complete-timer', protect, completeTimer);
router.get('/:id/timer-status', protect, checkTimerStatus);

// Rota para upload de anexos
router.post('/:id/attachments', protect, upload.single('file'), addAttachment);

// Rotas protegidas para todos os usuários autenticados (operadores veem apenas seus testes)
router.get('/', protect, getQualityTests);

// Rotas protegidas apenas para líderes e gestores
router.get('/stats/overview', protect, authorize('leader', 'manager'), getQualityTestStats);

module.exports = router;