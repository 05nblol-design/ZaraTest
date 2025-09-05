const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SSEService = require('../services/SSEService');

// Instância global do serviço SSE
const sseService = new SSEService();

// Middleware para verificar se o usuário é gestor
const requireManager = (req, res, next) => {
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas gestores podem acessar este recurso.' });
    }
    next();
};

// Endpoint SSE para monitoramento em tempo real
router.get('/monitor', protect, requireManager, (req, res) => {
    // Configurar headers SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const userId = req.user.id;
    const username = req.user.username;
    const connectionId = `manager_${userId}_${Date.now()}`;
    
    // Adicionar conexão ao serviço SSE
    sseService.addConnection(connectionId, res, userId, username);

    // Limpar conexão quando cliente desconectar
    req.on('close', () => {
        sseService.removeConnection(connectionId);
    });

    req.on('error', () => {
        sseService.removeConnection(connectionId);
    });
});

// Endpoint para obter estatísticas do serviço SSE
router.get('/stats', protect, requireManager, (req, res) => {
    try {
        const stats = sseService.getServiceStats();
        res.json(stats);
    } catch (error) {
        console.error('Erro ao obter estatísticas SSE:', error);
        res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
});

// Endpoint para notificar eventos específicos
router.post('/notify', protect, requireManager, (req, res) => {
    try {
        const { eventType, data } = req.body;
        sseService.notifyEvent(eventType, data);
        res.json({ success: true, message: 'Evento notificado com sucesso' });
    } catch (error) {
        console.error('Erro ao notificar evento SSE:', error);
        res.status(500).json({ error: 'Erro ao notificar evento' });
    }
});

// Exportar router
module.exports = router;