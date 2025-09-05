const Notification = require('../models/Notification');
const QualityTest = require('../models/QualityTest');
const User = require('../models/User');
const webpush = require('web-push');
const SSEService = require('./SSEService');

class NotificationService {
  constructor(io) {
    this.io = io;
    this.activeTimers = new Map(); // Armazena timers ativos
    this.testTimeouts = new Map(); // Armazena timeouts de testes
    this.sseService = new SSEService(); // Instância do SSE Service
    
    // Configurar Web Push (você deve configurar as chaves VAPID)
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:' + (process.env.VAPID_EMAIL || 'admin@zaratest.com'),
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }
    
    // Inicializar monitoramento ao iniciar o serviço
    this.initializeMonitoring();
  }

  // Inicializar monitoramento de testes existentes
  async initializeMonitoring() {
    try {
      // Buscar testes em andamento
      const activeTests = await QualityTest.find({
        status: 'in_progress',
        startTime: { $exists: true, $ne: null }
      }).populate('machine operator');

      console.log(`Inicializando monitoramento para ${activeTests.length} testes ativos`);

      // Configurar timers para cada teste ativo
      for (const test of activeTests) {
        // Validação adicional antes de iniciar timer
        if (test.startTime && test.startTime instanceof Date && !isNaN(test.startTime.getTime())) {
          this.startTestTimer(test);
        } else {
          console.warn(`Teste ${test._id} tem startTime inválido, ignorando:`, test.startTime);
        }
      }

      // Inicializar monitoramento de teflon
      this.startTeflonMonitoring();

    } catch (error) {
      console.error('Erro ao inicializar monitoramento:', error);
    }
  }

  // Iniciar timer para um teste específico
  startTestTimer(test) {
    const testId = test._id.toString();
    
    // Limpar timer existente se houver
    this.clearTestTimer(testId);

    // Validar se startTime existe e é válido
    if (!test.startTime || !(test.startTime instanceof Date)) {
      console.error(`Teste ${testId} tem startTime inválido:`, test.startTime);
      return;
    }

    // Calcular tempo limite (exemplo: 30 minutos por padrão)
    const timeLimit = test.expectedDuration || 30; // minutos
    const startTime = new Date(test.startTime);
    const deadline = new Date(startTime.getTime() + timeLimit * 60 * 1000);
    const now = new Date();

    console.log(`Timer iniciado para teste ${testId}, deadline: ${deadline}`);

    // Se já passou do prazo, notificar imediatamente
    if (now > deadline) {
      this.handleTestOverdue(test, Math.floor((now - deadline) / (1000 * 60)));
      return;
    }

    // Configurar timeout para quando o teste vencer
    const timeUntilDeadline = deadline.getTime() - now.getTime();
    
    const timer = setTimeout(() => {
      this.handleTestOverdue(test, 0);
    }, timeUntilDeadline);

    this.activeTimers.set(testId, {
      timer,
      deadline,
      test
    });

    // Configurar verificações periódicas (a cada 5 minutos após o prazo)
    const overdueCheckInterval = setInterval(() => {
      const currentTime = new Date();
      if (currentTime > deadline) {
        const overdueMinutes = Math.floor((currentTime - deadline) / (1000 * 60));
        this.handleTestOverdue(test, overdueMinutes);
      }
    }, 5 * 60 * 1000); // 5 minutos

    this.testTimeouts.set(testId, overdueCheckInterval);
  }

  // Lidar com teste atrasado
  async handleTestOverdue(test, overdueMinutes) {
    try {
      console.log(`Teste ${test._id} está ${overdueMinutes} minutos atrasado`);

      // Validar se startTime existe e é válido
      if (!test.startTime || !(test.startTime instanceof Date)) {
        console.error(`Teste ${test._id} tem startTime inválido:`, test.startTime);
        return;
      }

      // Criar notificação no banco
      const notification = await Notification.createTestOverdueNotification({
        testId: test._id,
        machineId: test.machine._id,
        machineName: test.machine.name,
        operatorId: test.operator._id,
        overdueMinutes,
        deadline: new Date(test.startTime.getTime() + (test.expectedDuration || 30) * 60 * 1000)
      });

      // Enviar notificação em tempo real via WebSocket
      await this.sendRealTimeNotification(notification);

      // Enviar push notification para usuários offline
      await this.sendPushNotifications(notification);

    } catch (error) {
      console.error('Erro ao processar teste atrasado:', error);
    }
  }

  // Parar timer de um teste
  clearTestTimer(testId) {
    if (this.activeTimers.has(testId)) {
      clearTimeout(this.activeTimers.get(testId).timer);
      this.activeTimers.delete(testId);
    }

    if (this.testTimeouts.has(testId)) {
      clearInterval(this.testTimeouts.get(testId));
      this.testTimeouts.delete(testId);
    }
  }

  // Finalizar teste (chamado quando teste é concluído)
  async finishTest(testId) {
    this.clearTestTimer(testId.toString());
    console.log(`Timer removido para teste finalizado: ${testId}`);
  }

  // Monitoramento de validade do teflon
  startTeflonMonitoring() {
    // Verificar validade do teflon a cada 6 horas
    setInterval(async () => {
      await this.checkTeflonExpiry();
    }, 6 * 60 * 60 * 1000);

    // Verificação inicial
    this.checkTeflonExpiry();
  }

  async checkTeflonExpiry() {
    try {
      const Teflon = require('../models/Teflon');
      const today = new Date();

      // Buscar teflons que vencem em até 7 dias
      const expiringTeflons = await Teflon.findExpiringSoon(7);
      
      console.log(`Verificando ${expiringTeflons.length} teflons próximos ao vencimento`);

      for (const teflon of expiringTeflons) {
        const daysUntilExpiry = teflon.daysUntilExpiry;
        
        // Verificar se já foi notificado hoje
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const existingNotification = await Notification.findOne({
          type: 'teflon_expiry',
          'relatedData.teflonId': teflon._id,
          createdAt: { $gte: todayStart }
        });

        // Verificar se já foi notificado recentemente
        const lastNotification = teflon.notifications.lastExpiryNotification;
        const shouldNotify = !lastNotification || 
          (today - lastNotification) > (24 * 60 * 60 * 1000); // 24 horas

        if (!existingNotification && shouldNotify) {
          const notification = await Notification.createTeflonExpiryNotification({
            teflonId: teflon._id,
            code: teflon.batchNumber,
            daysUntilExpiry,
            machineName: teflon.machine ? teflon.machine.name : 'N/A'
          });

          // Atualizar data da última notificação
          teflon.notifications.lastExpiryNotification = today;
          await teflon.save();

          await this.sendRealTimeNotification(notification);
          await this.sendPushNotifications(notification);
          
          console.log(`Notificação de teflon enviada: ${teflon.batchNumber} (${daysUntilExpiry} dias)`);
        }
      }

      // Verificar teflons já expirados
      const expiredTeflons = await Teflon.findExpired();
      
      for (const teflon of expiredTeflons) {
        if (teflon.status !== 'expired') {
          teflon.status = 'expired';
          await teflon.save();
          
          const notification = await Notification.createTeflonExpiryNotification({
            teflonId: teflon._id,
            code: teflon.batchNumber,
            daysUntilExpiry: 0,
            machineName: teflon.machine ? teflon.machine.name : 'N/A',
            isExpired: true
          });

          await this.sendRealTimeNotification(notification);
          await this.sendPushNotifications(notification);
          
          console.log(`Teflon expirado notificado: ${teflon.batchNumber}`);
        }
      }

    } catch (error) {
      console.error('Erro ao verificar validade do teflon:', error);
    }
  }

  // Enviar notificação em tempo real via WebSocket
  async sendRealTimeNotification(notification) {
    try {
      // Buscar usuários online
      const onlineUsers = this.getOnlineUsers();
      
      for (const recipient of notification.recipients) {
        const userId = recipient.userId.toString();
        
        if (onlineUsers.has(userId)) {
          const socketId = onlineUsers.get(userId);
          this.io.to(socketId).emit('notification', {
            id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            timestamp: notification.createdAt,
            relatedData: notification.relatedData
          });
        }
      }

      // Enviar evento SSE para gestores conectados
      await this.sendSSEEvent(notification);

      console.log(`Notificação em tempo real enviada: ${notification.title}`);
    } catch (error) {
      console.error('Erro ao enviar notificação em tempo real:', error);
    }
  }

  // Enviar push notifications para usuários offline
  async sendPushNotifications(notification) {
    try {
      // Buscar usuários offline que têm subscription de push
      const onlineUsers = this.getOnlineUsers();
      
      for (const recipient of notification.recipients) {
        const userId = recipient.userId.toString();
        
        // Se usuário não está online, enviar push notification
        if (!onlineUsers.has(userId)) {
          let user;
          
          // Tentar buscar usuário no banco, mas tratar erros de cast
          try {
            user = await User.findById(userId);
          } catch (dbError) {
            console.log(`Erro ao buscar usuário ${userId} para push notification:`, dbError.message);
            // Pular este usuário se não conseguir buscar
            continue;
          }
          
          if (user && user.pushSubscription) {
            const payload = JSON.stringify({
              title: notification.title,
              body: notification.message,
              icon: '/icon-192x192.png',
              badge: '/badge-72x72.png',
              data: {
                notificationId: notification._id,
                type: notification.type,
                url: '/notifications'
              }
            });

            try {
              await webpush.sendNotification(user.pushSubscription, payload);
              console.log(`Push notification enviada para usuário ${userId}`);
            } catch (pushError) {
              console.error(`Erro ao enviar push para ${userId}:`, pushError);
              
              // Se a subscription é inválida, remover do usuário
              if (pushError.statusCode === 410) {
                user.pushSubscription = null;
                await user.save();
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar push notifications:', error);
    }
  }

  // Enviar evento SSE para gestores
  async sendSSEEvent(notification) {
    try {
      // Determinar tipo de evento baseado no tipo de notificação
      let eventType = 'notification';
      let eventData = {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        timestamp: notification.createdAt,
        relatedData: notification.relatedData
      };

      // Mapear tipos específicos de notificação para eventos SSE
      switch (notification.type) {
        case 'test_overdue':
          eventType = 'test_overdue';
          break;
        case 'test_completed':
          eventType = 'test_completed';
          break;
        case 'teflon_expiry':
          eventType = 'teflon_expired';
          break;
        case 'machine_offline':
          eventType = 'machine_offline';
          break;
        case 'operation_without_test':
          eventType = 'operation_alert';
          break;
      }

      // Enviar evento via SSE
      this.sseService.sendEvent(eventType, eventData);
      
      console.log(`Evento SSE enviado: ${eventType}`);
    } catch (error) {
      console.error('Erro ao enviar evento SSE:', error);
    }
  }

  // Obter usuários online (implementar conforme sua lógica de sessão)
  getOnlineUsers() {
    // Esta função deve retornar um Map com userId -> socketId
    // Implementar conforme sua lógica de gerenciamento de sessões
    return new Map(); // Placeholder
  }

  // Obter instância do SSE Service
  getSSEService() {
    return this.sseService;
  }

  // Inicializar SSE Service
  initializeSSE() {
    this.sseService.startService();
    console.log('SSE Service inicializado no NotificationService');
  }

  // Parar SSE Service
  stopSSE() {
    this.sseService.stopService();
    console.log('SSE Service parado no NotificationService');
  }

  // Método para ser chamado quando um teste inicia
  async onTestStarted(testId) {
    try {
      const test = await QualityTest.findById(testId)
        .populate('machine operator');
      
      if (test) {
        this.startTestTimer(test);
      }
    } catch (error) {
      console.error('Erro ao iniciar monitoramento do teste:', error);
    }
  }

  // Método para ser chamado quando um teste é finalizado
  async onTestFinished(testId) {
    await this.finishTest(testId);
  }

  // Método para criar alerta de operação sem teste de qualidade
  async createOperationWithoutTestAlert(operationData) {
    try {
      const notification = await Notification.createOperationWithoutTestNotification({
        operatorName: operationData.operatorName,
        machineName: operationData.machineName,
        machineId: operationData.machineId,
        operatorId: operationData.operatorId,
        operationMinutes: operationData.operationMinutes
      });

      // Enviar notificação em tempo real
      await this.sendRealTimeNotification(notification);
      
      // Enviar push notifications
      await this.sendPushNotifications(notification);
      
      console.log(`Alerta de operação sem teste criado: ${operationData.operatorName} - ${operationData.machineName}`);
      
      return notification;
    } catch (error) {
      console.error('Erro ao criar alerta de operação sem teste:', error);
      throw error;
    }
  }

  // Marcar notificação como lida
  async markNotificationAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (notification) {
        await notification.markAsRead(userId);
        
        // Notificar via WebSocket que a notificação foi lida
        const onlineUsers = this.getOnlineUsers();
        if (onlineUsers.has(userId.toString())) {
          const socketId = onlineUsers.get(userId.toString());
          this.io.to(socketId).emit('notification_read', {
            notificationId,
            userId
          });
        }
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }

  // Buscar notificações de um usuário
  async getUserNotifications(userId, unreadOnly = false) {
    try {
      if (unreadOnly) {
        return await Notification.getUnreadForUser(userId);
      } else {
        return await Notification.getForUser(userId);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações do usuário:', error);
      return [];
    }
  }
}

module.exports = NotificationService;