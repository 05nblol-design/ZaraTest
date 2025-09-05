const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Controlador de usuários (a ser implementado)
const userController = {
  getUsers: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Lista de usuários obtida com sucesso',
      data: []
    });
  },
  getUser: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Usuário obtido com sucesso',
      data: {}
    });
  },
  updateUser: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: {}
    });
  },
  deleteUser: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });
  }
};

// Rotas protegidas apenas para gestores
router.get('/', protect, authorize('manager'), userController.getUsers);
router.get('/:id', protect, authorize('manager'), userController.getUser);
router.put('/:id', protect, authorize('manager'), userController.updateUser);
router.delete('/:id', protect, authorize('manager'), userController.deleteUser);

module.exports = router;