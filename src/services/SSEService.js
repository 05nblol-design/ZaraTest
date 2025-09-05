const QualityTest = require('../models/QualityTest');
const Machine = require('../models/Machine');
const OperationSession = require('../models/OperationSession');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Teflon = require('../models/Teflon');

class SSEService {
    constructor() {
        this.connections = new Map();
        this.updateInterval = null;
        this.isRunning = false;
    }

    // Adicionar nova conexão SSE
    addConnection(connectionId, res, userId, username) {
        this.connections.set(connectionId, {
            res,
            userId,
            username,
            connectedAt: new Date(),
            lastHeartbeat: new Date()
        });

        console.log(`📊 SSE: Gestor ${username} conectado (${this.connections.size} conexões ativas)`);
        
        // Iniciar serviço se for a primeira conexão
        if (this.connections.size === 1 && !this.isRunning) {
            this.startService();
        }

        // Enviar dados iniciais
        this.sendInitialData(connectionId);
    }

    // Remover conexão SSE
    removeConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            console.log(`📊 SSE: Gestor ${connection.username} desconectado`);
            this.connections.delete(connectionId);
            
            // Parar serviço se não há mais conexões
            if (this.connections.size === 0 && this.isRunning) {
                this.stopService();
            }
        }
    }

    // Iniciar serviço de atualização automática
    startService() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('🚀 SSE Service iniciado');
        
        // Atualizar dados a cada 5 segundos
        this.updateInterval = setInterval(() => {
            this.broadcastSystemUpdate();
        }, 5000);

        // Heartbeat a cada 30 segundos
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000);
    }

    // Parar serviço de atualização automática
    stopService() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        console.log('⏹️ SSE Service parado');
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Enviar dados iniciais para uma conexão específica
    async sendInitialData(connectionId) {
        try {
            const data = await this.getSystemStatus();
            this.sendToConnection(connectionId, 'initial', data);
        } catch (error) {
            console.error('Erro ao enviar dados iniciais SSE:', error);
        }
    }

    // Broadcast de atualização do sistema para todas as conexões
    async broadcastSystemUpdate() {
        if (this.connections.size === 0) return;
        
        try {
            const data = await this.getSystemStatus();
            this.broadcast('update', data);
        } catch (error) {
            console.error('Erro ao fazer broadcast SSE:', error);
        }
    }

    // Enviar heartbeat para manter conexões vivas
    sendHeartbeat() {
        const now = new Date();
        this.broadcast('heartbeat', { timestamp: now.toISOString() });
        
        // Atualizar timestamp do último heartbeat
        for (const [connectionId, connection] of this.connections) {
            connection.lastHeartbeat = now;
        }
    }

    // Enviar dados para uma conexão específica
    sendToConnection(connectionId, eventType, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || connection.res.writableEnded) {
            this.removeConnection(connectionId);
            return false;
        }

        try {
            const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
            connection.res.write(message);
            return true;
        } catch (error) {
            console.error(`Erro ao enviar SSE para ${connectionId}:`, error);
            this.removeConnection(connectionId);
            return false;
        }
    }

    // Broadcast para todas as conexões
    broadcast(eventType, data) {
        const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        const disconnectedConnections = [];
        
        for (const [connectionId, connection] of this.connections) {
            try {
                if (!connection.res.writableEnded) {
                    connection.res.write(message);
                } else {
                    disconnectedConnections.push(connectionId);
                }
            } catch (error) {
                console.error(`Erro ao enviar broadcast SSE para ${connectionId}:`, error);
                disconnectedConnections.push(connectionId);
            }
        }
        
        // Remover conexões desconectadas
        disconnectedConnections.forEach(connectionId => {
            this.removeConnection(connectionId);
        });
    }

    // Obter status completo do sistema
    async getSystemStatus() {
        try {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            
            const [activeTests, machines, recentSessions, notifications, users, teflons] = await Promise.all([
                QualityTest.find({ status: 'in_progress' })
                    .populate('machineId', 'name location')
                    .lean(),
                Machine.find({}).lean(),
                OperationSession.find({})
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .populate('machineId', 'name')
                    .lean(),
                Notification.find({})
                    .sort({ createdAt: -1 })
                    .limit(20)
                    .lean(),
                User.find({}, 'username role lastLogin')
                    .lean(),
                Teflon.find({})
                    .populate('machineId', 'name')
                    .lean()
            ]);

            // Calcular estatísticas
            const onlineUsers = users.filter(u => 
                u.lastLogin && (now.getTime() - new Date(u.lastLogin).getTime()) < 300000
            );
            
            const overdueTests = activeTests.filter(test => 
                test.deadline && new Date(test.deadline) < now
            );
            
            const teflonsNearExpiry = teflons.filter(teflon => {
                if (!teflon.expiryDate) return false;
                const daysUntilExpiry = (new Date(teflon.expiryDate) - now) / (1000 * 60 * 60 * 24);
                return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
            });

            return {
                timestamp: now.toISOString(),
                summary: {
                    activeTests: activeTests.length,
                    overdueTests: overdueTests.length,
                    totalMachines: machines.length,
                    activeMachines: machines.filter(m => m.status === 'active').length,
                    onlineUsers: onlineUsers.length,
                    unreadNotifications: notifications.filter(n => !n.read).length,
                    teflonsNearExpiry: teflonsNearExpiry.length
                },
                activeTests: activeTests.map(test => ({
                    id: test._id,
                    machineId: test.machineId?._id,
                    machineName: test.machineId?.name,
                    machineLocation: test.machineId?.location,
                    status: test.status,
                    startTime: test.startTime,
                    deadline: test.deadline,
                    progress: this.calculateTestProgress(test),
                    isOverdue: test.deadline && new Date(test.deadline) < now,
                    timeRemaining: this.calculateTimeRemaining(test.deadline)
                })),
                machines: machines.map(machine => ({
                    id: machine._id,
                    name: machine.name,
                    status: machine.status,
                    location: machine.location,
                    lastMaintenance: machine.lastMaintenance,
                    hasActiveTest: activeTests.some(test => 
                        test.machineId && test.machineId._id.toString() === machine._id.toString()
                    )
                })),
                recentActivity: recentSessions.slice(0, 5).map(session => ({
                    id: session._id,
                    machineId: session.machineId?._id,
                    machineName: session.machineId?.name,
                    createdAt: session.createdAt,
                    status: session.status,
                    timeAgo: this.getTimeAgo(session.createdAt)
                })),
                alerts: {
                    overdueTests: overdueTests.map(test => ({
                        id: test._id,
                        machineName: test.machineId?.name,
                        overdueSince: this.getTimeAgo(test.deadline)
                    })),
                    teflonsNearExpiry: teflonsNearExpiry.map(teflon => ({
                        id: teflon._id,
                        machineName: teflon.machineId?.name,
                        expiryDate: teflon.expiryDate,
                        daysRemaining: Math.ceil((new Date(teflon.expiryDate) - now) / (1000 * 60 * 60 * 24))
                    }))
                },
                performance: {
                    connectionsActive: this.connections.size,
                    systemUptime: process.uptime(),
                    memoryUsage: process.memoryUsage()
                }
            };
        } catch (error) {
            console.error('Erro ao obter status do sistema:', error);
            return {
                timestamp: new Date().toISOString(),
                error: 'Erro ao carregar dados do sistema',
                details: error.message
            };
        }
    }

    // Calcular progresso do teste
    calculateTestProgress(test) {
        if (!test.startTime || !test.deadline) return 0;
        
        const now = new Date();
        const start = new Date(test.startTime);
        const end = new Date(test.deadline);
        
        if (now < start) return 0;
        if (now > end) return 100;
        
        const total = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        
        return Math.round((elapsed / total) * 100);
    }

    // Calcular tempo restante
    calculateTimeRemaining(deadline) {
        if (!deadline) return null;
        
        const now = new Date();
        const end = new Date(deadline);
        const diff = end.getTime() - now.getTime();
        
        if (diff <= 0) return 'Vencido';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    // Calcular tempo decorrido
    getTimeAgo(date) {
        if (!date) return 'Desconhecido';
        
        const now = new Date();
        const past = new Date(date);
        const diff = now.getTime() - past.getTime();
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d atrás`;
        if (hours > 0) return `${hours}h atrás`;
        if (minutes > 0) return `${minutes}m atrás`;
        return 'Agora mesmo';
    }

    // Notificar evento específico
    notifyEvent(eventType, data) {
        this.broadcast('event', {
            type: eventType,
            data,
            timestamp: new Date().toISOString()
        });
    }

    // Obter estatísticas do serviço
    getServiceStats() {
        return {
            connectionsActive: this.connections.size,
            isRunning: this.isRunning,
            connections: Array.from(this.connections.entries()).map(([id, conn]) => ({
                id,
                username: conn.username,
                connectedAt: conn.connectedAt,
                lastHeartbeat: conn.lastHeartbeat
            }))
        };
    }
}

module.exports = SSEService;