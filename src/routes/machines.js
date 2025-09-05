const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Machine = require('../models/Machine');

// Controlador de máquinas
const machineController = {
  getMachines: async (req, res) => {
    try {
      const machines = await Machine.find();
      res.status(200).json({
        success: true,
        message: 'Lista de máquinas obtida com sucesso',
        data: machines
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar máquinas',
        error: error.message
      });
    }
  },
  getMachine: async (req, res) => {
    try {
      const machine = await Machine.findById(req.params.id);
      if (!machine) {
        return res.status(404).json({
          success: false,
          message: 'Máquina não encontrada'
        });
      }
      res.status(200).json({
        success: true,
        message: 'Máquina obtida com sucesso',
        data: machine
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar máquina',
        error: error.message
      });
    }
  },
  createMachine: async (req, res) => {
    try {
      const machine = new Machine(req.body);
      await machine.save();
      res.status(201).json({
        success: true,
        message: 'Máquina criada com sucesso',
        data: machine
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao criar máquina',
        error: error.message
      });
    }
  },
  updateMachine: async (req, res) => {
    try {
      const machine = await Machine.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!machine) {
        return res.status(404).json({
          success: false,
          message: 'Máquina não encontrada'
        });
      }
      res.status(200).json({
        success: true,
        message: 'Máquina atualizada com sucesso',
        data: machine
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar máquina',
        error: error.message
      });
    }
  },
  deleteMachine: async (req, res) => {
    try {
      const machine = await Machine.findByIdAndDelete(req.params.id);
      if (!machine) {
        return res.status(404).json({
          success: false,
          message: 'Máquina não encontrada'
        });
      }
      res.status(200).json({
        success: true,
        message: 'Máquina excluída com sucesso'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir máquina',
        error: error.message
      });
    }
  },
  updateMachineStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const machine = await Machine.findByIdAndUpdate(
        req.params.id, 
        { status }, 
        { new: true }
      );
      if (!machine) {
        return res.status(404).json({
          success: false,
          message: 'Máquina não encontrada'
        });
      }
      res.status(200).json({
        success: true,
        message: 'Status da máquina atualizado com sucesso',
        data: machine
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar status da máquina',
        error: error.message
      });
    }
  }
};

// Rotas para todos os usuários autenticados
router.get('/', protect, machineController.getMachines);
router.get('/:id', protect, machineController.getMachine);

// Rotas protegidas apenas para líderes e gestores
router.post('/', protect, authorize('leader', 'manager'), machineController.createMachine);
router.put('/:id', protect, authorize('leader', 'manager'), machineController.updateMachine);
router.put('/:id/status', protect, authorize('operator', 'leader', 'manager'), machineController.updateMachineStatus);
router.delete('/:id', protect, authorize('manager'), machineController.deleteMachine);

module.exports = router;