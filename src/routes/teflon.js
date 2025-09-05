const express = require('express');
const router = express.Router();
const { 
  registerTeflonChange, 
  getTeflonChanges, 
  getTeflonChange,
  updateTeflonChange,
  getTeflonStats,
  getTeflonAlerts
} = require('../controllers/teflonController');
const { protect, authorize } = require('../middleware/auth');

// Rotas protegidas para todos os usuários autenticados
router.post('/', protect, registerTeflonChange);
router.get('/:id', protect, getTeflonChange);
router.get('/alerts/all', protect, getTeflonAlerts);

// Rotas protegidas para todos os usuários autenticados (operadores veem apenas seus registros)
router.get('/', protect, getTeflonChanges);

// Rotas protegidas apenas para líderes e gestores
router.put('/:id', protect, authorize('leader', 'manager'), updateTeflonChange);
router.get('/stats/overview', protect, authorize('leader', 'manager'), getTeflonStats);

module.exports = router;