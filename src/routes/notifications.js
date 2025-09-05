const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(protect);

// Criar alerta de operação sem teste de qualidade
router.post('/operation-without-test', async (req, res) => {
  try {
    const { operatorName, machineName, machineId, operatorId, operationMinutes } = req.body;
    
    const notificationService = req.app.get('notificationService');
    
    if (!notificationService) {
      return res.status(500).json({ error: 'Serviço de notificações não disponível' });
    }
    
    const notification = await notificationService.createOperationWithoutTestAlert({
      operatorName,
      machineName,
      machineId,
      operatorId,
      operationMinutes
    });
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Erro ao criar alerta de operação sem teste:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar todas as notificações do usuário
router.get('/', async (req, res) => {
  try {
    const { unread_only = false, limit = 50 } = req.query;
    const notificationService = req.app.get('notificationService');
    
    if (notificationService) {
      const notifications = await notificationService.getUserNotifications(
        req.user.id, 
        unread_only === 'true'
      );
      res.json(notifications);
    } else {
      // Fallback se o serviço não estiver disponível
      const query = {
        'recipients.userId': req.user.id
      };
      
      if (unread_only === 'true') {
        query['recipients.read'] = false;
        query.status = 'active';
      }
      
      const notifications = await Notification.find(query)
        .populate('relatedData.testId relatedData.teflonId relatedData.machineId relatedData.operatorId')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
      
      res.json(notifications);
    }
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar apenas notificações não lidas
router.get('/unread', async (req, res) => {
  try {
    const notificationService = req.app.get('notificationService');
    
    if (notificationService) {
      const notifications = await notificationService.getUserNotifications(req.user.id, true);
      res.json(notifications);
    } else {
      const notifications = await Notification.getUnreadForUser(req.user.id);
      res.json(notifications);
    }
  } catch (error) {
    console.error('Erro ao buscar notificações não lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Contar notificações não lidas
router.get('/unread/count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      'recipients.userId': req.user.id,
      'recipients.read': false,
      status: 'active'
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Erro ao contar notificações não lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar notificação como lida
router.patch('/:id/read', async (req, res) => {
  try {
    const notificationService = req.app.get('notificationService');
    
    if (notificationService) {
      await notificationService.markNotificationAsRead(req.params.id, req.user.id);
    } else {
      const notification = await Notification.findById(req.params.id);
      if (notification) {
        await notification.markAsRead(req.user.id);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar todas as notificações como lidas
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      {
        'recipients.userId': req.user.id,
        'recipients.read': false
      },
      {
        $set: {
          'recipients.$.read': true,
          'recipients.$.readAt': new Date()
        }
      }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Resolver/descartar notificação
router.patch('/:id/resolve', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }
    
    // Verificar se o usuário tem permissão para resolver (apenas gestores e líderes)
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    
    if (!user || !['leader', 'manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Sem permissão para resolver notificações' });
    }
    
    notification.status = 'resolved';
    await notification.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao resolver notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar notificação manual (apenas para gestores)
router.post('/', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'manager') {
      return res.status(403).json({ error: 'Sem permissão para criar notificações' });
    }
    
    const { type, title, message, priority, recipientRoles } = req.body;
    
    // Buscar usuários destinatários
    const recipients = await User.find({
      role: { $in: recipientRoles || ['operator', 'leader', 'manager'] }
    }).select('_id role');
    
    const notification = new Notification({
      type: type || 'system_alert',
      title,
      message,
      priority: priority || 'medium',
      recipients: recipients.map(u => ({
        userId: u._id,
        role: u.role
      })),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
    });
    
    await notification.save();
    
    // Enviar notificação em tempo real
    const notificationService = req.app.get('notificationService');
    if (notificationService) {
      await notificationService.sendRealTimeNotification(notification);
      await notificationService.sendPushNotifications(notification);
    }
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registrar subscription para push notifications
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription) {
      return res.status(400).json({ error: 'Subscription é obrigatória' });
    }
    
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, {
      pushSubscription: subscription
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao registrar subscription:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover subscription para push notifications
router.delete('/subscribe', async (req, res) => {
  try {
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, {
      $unset: { pushSubscription: 1 }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover subscription:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;