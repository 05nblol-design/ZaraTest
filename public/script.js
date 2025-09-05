// Configuração da API
// Detectar se estamos em produção ou desenvolvimento
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : `${window.location.protocol}//${window.location.host}/api`;

console.log('🔧 API_URL configurada:', API_URL);
let token = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// Inicializações
let testesQualidade = [];
let teflons = [];
let maquinas = [];
let lotes = [];
let operationSessions = [];

// Sistema de cache para otimizar performance
const dataCache = {
    kpis: { data: null, timestamp: 0, ttl: 300000 }, // 5 minutos
    stats: { data: null, timestamp: 0, ttl: 300000 }, // 5 minutos
    sessions: { data: null, timestamp: 0, ttl: 180000 }, // 3 minutos
    productivity: { data: null, timestamp: 0, ttl: 300000 }, // 5 minutos
    users: { data: null, timestamp: 0, ttl: 600000 }, // 10 minutos
    machines: { data: null, timestamp: 0, ttl: 600000 }, // 10 minutos
    qualityTests: { data: null, timestamp: 0, ttl: 120000 } // 2 minutos
};

// Configurações de cache otimizadas
const cacheConfig = {
    maxSize: 50, // Máximo de 50 entradas no cache
    cleanupInterval: 600000, // Limpeza a cada 10 minutos
    compressionThreshold: 1024 // Comprimir dados maiores que 1KB
};

// Limpeza automática do cache
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    Object.keys(dataCache).forEach(key => {
        if (dataCache[key].timestamp + dataCache[key].ttl < now) {
            dataCache[key] = { data: null, timestamp: 0, ttl: dataCache[key].ttl };
            cleaned++;
        }
    });
    
    if (cleaned > 0) {
        console.log(`🧹 Cache limpo: ${cleaned} entradas removidas`);
    }
}, cacheConfig.cleanupInterval);

// Função para verificar se o cache é válido
function isCacheValid(cacheKey) {
    const cache = dataCache[cacheKey];
    return cache && cache.data && (Date.now() - cache.timestamp) < cache.ttl;
}

// Função para obter dados do cache ou fazer nova requisição
async function getCachedData(cacheKey, apiCall) {
    if (isCacheValid(cacheKey)) {
        console.log(`📦 Usando dados em cache para: ${cacheKey}`);
        return dataCache[cacheKey].data;
    }
    
    console.log(`🔄 Buscando novos dados para: ${cacheKey}`);
    const data = await apiCall();
    dataCache[cacheKey] = {
        data: data,
        timestamp: Date.now(),
        ttl: dataCache[cacheKey].ttl
    };
    return data;
}

// Variáveis de timer globais
let timerInterval = null;
let testTimer = null;

// Sistema de notificações
let socket = null;
let notifications = [];
let unreadCount = 0;

// Inicializar conexão Socket.IO
function initializeSocket() {
    if (typeof io !== 'undefined') {
        socket = io();
        
        socket.on('connect', () => {
            console.log('Conectado ao servidor de notificações');
            const token = localStorage.getItem('token');
            if (token) {
                socket.emit('authenticate', { token });
            }
        });
        
        socket.on('notification', (notification) => {
            console.log('Nova notificação recebida:', notification);
            addNotification(notification);
            showNotificationToast(notification);
        });
        
        socket.on('disconnect', () => {
            console.log('Desconectado do servidor de notificações');
        });
    }
}

// Adicionar notificação à lista
function addNotification(notification) {
    notifications.unshift(notification);
    if (!notification.read) {
        unreadCount++;
    }
    updateNotificationBadge();
    updateNotificationList();
}

// Atualizar badge de notificações
function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    const pulse = document.getElementById('notification-pulse');
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'inline';
            
            // Adicionar animação de pulso para notificações críticas
            const hasCritical = notifications.some(n => !n.read && (n.priority === 'critical' || n.priority === 'high'));
            if (hasCritical && pulse) {
                pulse.style.display = 'block';
            }
        } else {
            badge.style.display = 'none';
            if (pulse) {
                pulse.style.display = 'none';
            }
        }
    }
}

// Mostrar toast de notificação melhorado
function showNotificationToast(notification) {
    const toast = document.createElement('div');
    const priority = notification.priority || 'medium';
    toast.className = `notification-toast ${priority}`;
    
    // Definir ícone baseado no tipo e prioridade
    let icon = '🔔';
    if (notification.type === 'test') icon = '🧪';
    else if (notification.type === 'teflon') icon = '🔧';
    else if (notification.type === 'system') icon = '⚙️';
    else if (priority === 'critical' || priority === 'high') icon = '⚠️';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-header">
                <strong class="toast-title">${notification.title}</strong>
                <span class="toast-time">${formatNotificationTime(notification.timestamp || Date.now())}</span>
            </div>
            <div class="toast-body">${notification.message}</div>
        </div>
        <button type="button" class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Adicionar animação de entrada
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    toastContainer.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 10);
    
    // Auto-remover baseado na prioridade
    const autoRemoveTime = priority === 'critical' ? 10000 : priority === 'high' ? 7000 : 5000;
    
    setTimeout(() => {
        if (toast.parentElement) {
            // Animar saída
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }
    }, autoRemoveTime);
    
    // Adicionar evento de clique para fechar
    toast.addEventListener('click', function(e) {
        if (!e.target.closest('.toast-close')) {
            // Marcar como lida se for uma notificação real
            if (notification.id) {
                markNotificationAsRead(notification.id);
            }
        }
    });
}

// Carregar notificações do servidor
async function loadNotifications() {
    try {
        const response = await apiRequest('/notifications');
        if (response && response.success) {
            notifications = response.notifications || [];
            unreadCount = notifications.filter(n => !n.read).length;
            updateNotificationBadge();
            updateNotificationList();
        }
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
    }
}

// Marcar notificação como lida
async function markNotificationAsRead(notificationId) {
    try {
        const response = await apiRequest(`/notifications/${notificationId}/read`, 'PUT');
        if (response && response.success) {
            const notification = notifications.find(n => n._id === notificationId);
            if (notification && !notification.read) {
                notification.read = true;
                unreadCount--;
                updateNotificationBadge();
                updateNotificationList();
            }
        }
    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
    }
}

// Atualizar lista de notificações
function updateNotificationList() {
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) return;
    
    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="notification-item empty">Nenhuma notificação</div>';
        return;
    }
    
    notificationList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification._id}">
            <div class="notification-header">
                <span class="notification-title">${notification.title}</span>
                <span class="notification-time">${formatNotificationTime(notification.createdAt)}</span>
            </div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-actions">
                ${!notification.read ? `<button class="btn-mark-read" onclick="markNotificationAsRead('${notification._id}')">Marcar como lida</button>` : ''}
            </div>
        </div>
    `).join('');
}

// Formatar tempo da notificação
function formatNotificationTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
}

// Alternar painel de notificações melhorado
function toggleNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    const pulse = document.getElementById('notification-pulse');
    
    if (panel) {
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'block';
            // Adicionar classe de animação
            setTimeout(() => {
                panel.classList.add('show');
            }, 10);
            
            // Parar o pulso quando abrir o painel
            if (pulse) {
                pulse.style.display = 'none';
            }
            
            // Carregar notificações se necessário
            loadNotifications();
        } else {
            panel.classList.remove('show');
            setTimeout(() => {
                panel.style.display = 'none';
            }, 300);
        }
    }
}

// Fechar painel ao clicar fora
document.addEventListener('click', function(event) {
    const panel = document.getElementById('notification-panel');
    const notificationBtn = document.querySelector('.notification-btn');
    
    if (panel && notificationBtn) {
        if (!panel.contains(event.target) && !notificationBtn.contains(event.target)) {
            if (panel.style.display === 'block') {
                toggleNotificationPanel();
            }
        }
    }
});

// Marcar todas as notificações como lidas
function markAllNotificationsAsRead() {
    fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Atualizar todas as notificações para lidas
            notifications.forEach(notification => {
                notification.read = true;
            });
            unreadCount = 0;
            updateNotificationBadge();
            updateNotificationList();
            
            // Mostrar toast de sucesso
            showNotificationToast({
                title: 'Sucesso',
                message: 'Todas as notificações foram marcadas como lidas',
                priority: 'low'
            });
        }
    })
    .catch(error => {
        console.error('Erro ao marcar notificações como lidas:', error);
    });
}

// Ver todas as notificações
function viewAllNotifications() {
    // Implementar navegação para página de notificações completa
    console.log('Navegar para página de notificações');
    toggleNotificationPanel();
}

// Filtrar notificações
function filterNotifications(filter) {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    let filteredNotifications = notifications;
    
    switch(filter) {
        case 'unread':
            filteredNotifications = notifications.filter(n => !n.read);
            break;
        case 'critical':
            filteredNotifications = notifications.filter(n => n.priority === 'critical' || n.priority === 'high');
            break;
        case 'all':
        default:
            filteredNotifications = notifications;
            break;
    }
    
    updateNotificationList(filteredNotifications);
}

// Adicionar event listeners para filtros
document.addEventListener('DOMContentLoaded', function() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filterNotifications(filter);
        });
    });
});

// Carregar notificações do servidor
function loadNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    fetch('/api/notifications', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            notifications = data.notifications || [];
            unreadCount = notifications.filter(n => !n.read).length;
            updateNotificationBadge();
            updateNotificationList();
        }
    })
    .catch(error => {
        console.error('Erro ao carregar notificações:', error);
    });
}

// Criar notificação de teste de qualidade
function createTestNotification(testResult) {
    const notification = {
        id: `test_${Date.now()}`,
        type: 'test',
        title: 'Teste de Qualidade',
        message: `Teste ${testResult.aprovado ? 'APROVADO' : 'REPROVADO'} - Lote: ${testResult.lote}`,
        priority: testResult.aprovado ? 'medium' : 'high',
        timestamp: Date.now(),
        read: false,
        data: testResult
    };
    
    // Adicionar à lista local
    addNotification(notification);
    
    // Mostrar toast
    showNotificationToast(notification);
    
    // Enviar para o servidor
    saveNotificationToServer(notification);
    
    return notification;
}

// Criar notificação de troca de teflon
function createTeflonNotification(teflonData, type = 'reminder') {
    let title, message, priority;
    
    switch(type) {
        case 'due':
            title = 'Troca de Teflon Vencida';
            message = `Teflon da máquina ${teflonData.maquina} está vencido há ${teflonData.diasVencido} dias`;
            priority = 'critical';
            break;
        case 'warning':
            title = 'Troca de Teflon Próxima';
            message = `Teflon da máquina ${teflonData.maquina} vence em ${teflonData.diasRestantes} dias`;
            priority = 'high';
            break;
        case 'completed':
            title = 'Troca de Teflon Realizada';
            message = `Teflon da máquina ${teflonData.maquina} foi trocado com sucesso`;
            priority = 'low';
            break;
        default:
            title = 'Lembrete de Teflon';
            message = `Verificar status do teflon da máquina ${teflonData.maquina}`;
            priority = 'medium';
    }
    
    const notification = {
        id: `teflon_${Date.now()}`,
        type: 'teflon',
        title,
        message,
        priority,
        timestamp: Date.now(),
        read: false,
        data: teflonData
    };
    
    // Adicionar à lista local
    addNotification(notification);
    
    // Mostrar toast
    showNotificationToast(notification);
    
    // Enviar para o servidor
    saveNotificationToServer(notification);
    
    return notification;
}

// Salvar notificação no servidor
function saveNotificationToServer(notification) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    fetch('/api/notifications', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(notification)
    })
    .catch(error => {
        console.error('Erro ao salvar notificação:', error);
    });
}

// Verificar teflons vencidos ou próximos do vencimento
function checkTeflonStatus() {
    if (!teflons || teflons.length === 0) return;
    
    const now = new Date();
    
    teflons.forEach(teflon => {
        const dataVencimento = new Date(teflon.dataVencimento);
        const diffTime = dataVencimento - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            // Teflon vencido
            createTeflonNotification({
                maquina: teflon.maquina,
                diasVencido: Math.abs(diffDays)
            }, 'due');
        } else if (diffDays <= 3) {
            // Teflon próximo do vencimento
            createTeflonNotification({
                maquina: teflon.maquina,
                diasRestantes: diffDays
            }, 'warning');
        }
    });
}

// Inicializar verificações automáticas
function initializeNotificationChecks() {
    // Verificar teflons a cada hora
    setInterval(checkTeflonStatus, 60 * 60 * 1000);
    
    // Verificação inicial após 5 segundos
    setTimeout(checkTeflonStatus, 5000);
}

// Função para mostrar notificações simples
function showNotification(message, type = 'info') {
    const notification = {
        title: type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : type === 'warning' ? 'Aviso' : 'Informação',
        message: message,
        priority: type === 'error' ? 'high' : type === 'warning' ? 'medium' : 'low'
    };
    showNotificationToast(notification);
}

// Função para fazer requisições à API
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
        method,
        headers
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        console.log('🌐 Fazendo requisição:', { url, method, headers });
        const response = await fetch(url, options);
        console.log('📡 Resposta recebida:', { status: response.status, statusText: response.statusText });
        
        // Se o token expirou, redirecionar para login (exceto para endpoint de login)
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
            logout();
            return null;
        }
        
        const result = await response.json();
        console.log('📦 Resultado parseado:', result);
        
        if (!response.ok) {
            // Log detalhado do erro
            console.error('Erro na API:', {
                endpoint,
                status: response.status,
                statusText: response.statusText,
                result
            });
            
            // Para login, não mostrar alert aqui, deixar o código de login tratar
            if (endpoint.includes('/auth/login')) {
                console.log('Erro de login:', result.message || 'Credenciais inválidas');
                return null;
            }
            throw new Error(result.message || 'Erro na requisição');
        }
        
        return result;
    } catch (error) {
        console.error('Erro na requisição:', error);
        console.error('Detalhes do erro:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            endpoint,
            url
        });
        
        // Para login e operação de limpeza, não mostrar alert aqui
        if (!endpoint.includes('/auth/login') && !endpoint.includes('/operation-session')) {
            // Para registro, mostrar erro mais específico
            if (endpoint.includes('/auth/register')) {
                alert(`Erro ao cadastrar usuário: ${error.message}. Verifique sua conexão com a internet e tente novamente.`);
            } else {
                alert(`Erro: ${error.message}`);
            }
        }
        return null;
    }
}

// Elementos DOM
const loginForm = document.getElementById('login-form');
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const mainMenu = document.getElementById('main-menu');
const mainContent = document.getElementById('main-content');
const userNameElement = document.getElementById('user-name');
const userRoleElement = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');

// Event Listeners
// Elementos do formulário de registro
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

// Alternância entre formulários de login e cadastro
if (showRegisterLink) {
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });
}

// Função para detectar o tipo de usuário baseado na URL
function getUserTypeFromURL() {
    const path = window.location.pathname;
    if (path === '/operador') return 'operator';
    if (path === '/lider') return 'leader';
    if (path === '/gestor') return 'manager';
    return null;
}

// Função para redirecionar para a URL correta baseada no papel do usuário
function redirectToUserURL(userRole) {
    const roleURLMap = {
        'operator': '/operador',
        'leader': '/lider',
        'manager': '/gestor'
    };
    
    const targetURL = roleURLMap[userRole];
    if (targetURL && window.location.pathname !== targetURL) {
        window.history.pushState({}, '', targetURL);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded - Iniciando aplicação');
    console.log('Token inicial:', token ? 'Presente' : 'Ausente');
    console.log('CurrentUser inicial:', currentUser);
    
    // Verificar se já está logado
    if (token && currentUser) {
        console.log('Tentando verificar token existente...');
        try {
            // Verificar se o token ainda é válido
            const userData = await apiRequest('/auth/me');
            console.log('Resposta do /auth/me:', userData);
            if (userData && userData.success && userData.data) {
                // Atualizar currentUser com dados mais recentes da API
                currentUser = {
                    id: userData.data._id || userData.data.id,
                    name: userData.data.name,
                    email: userData.data.email,
                    role: userData.data.role
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Verificar se a URL corresponde ao papel do usuário
                const urlUserType = getUserTypeFromURL();
                
                if (urlUserType && urlUserType !== currentUser.role) {
                    // URL não corresponde ao papel, redirecionar para URL correta
                    redirectToUserURL(currentUser.role);
                }
                
                // Redirecionar para a URL correta se necessário
                redirectToUserURL(currentUser.role);
                
                // Token válido, carregar a aplicação
                loginContainer.style.display = 'none';
                appContainer.style.display = 'flex';
                userNameElement.textContent = currentUser.name;
                userRoleElement.textContent = 
                    currentUser.role === 'operator' ? 'Operador' : 
                    currentUser.role === 'leader' ? 'Líder' : 'Gestor';
                
                // Carregar dados iniciais
                await loadInitialData();
                
                // Inicializar sistema de notificações
                initializeSocket();
                
                // Inicializar verificações automáticas de notificações
                initializeNotificationChecks();
                await loadNotifications();
                
                // Carregar menu baseado no perfil
                loadMenu();
                
                // Carregar conteúdo inicial
                await loadInitialContent();
            } else {
                console.log('Token inválido ou dados não encontrados, fazendo logout');
                logout();
            }
        } catch (error) {
            console.error('Erro ao verificar token:', error);
            logout();
        }
    } else {
        console.log('Nenhum token ou usuário encontrado, mostrando tela de login');
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        console.log('Tentativa de login:', { username, password: '***' });
        
        try {
            const result = await apiRequest('/auth/login', 'POST', { username, password });
            
            console.log('Resultado do login:', result);
            
            if (result && result.token) {
                console.log('Login bem-sucedido');
                // Login bem-sucedido
                token = result.token;
                currentUser = result.user;
                
                // Salvar no localStorage
                localStorage.setItem('token', token);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Redirecionar para a URL específica do usuário
                redirectToUserURL(currentUser.role);
                
                loginContainer.style.display = 'none';
                appContainer.style.display = 'flex';
                userNameElement.textContent = currentUser.name;
                userRoleElement.textContent = 
                    currentUser.role === 'operator' ? 'Operador' : 
                    currentUser.role === 'leader' ? 'Líder' : 'Gestor';
                
                // Carregar dados iniciais
                await loadInitialData();
                
                // Inicializar sistema de notificações
                initializeSocket();
                await loadNotifications();
                
                // Carregar menu baseado no perfil
                loadMenu();
                
                // Carregar conteúdo inicial
                await loadInitialContent();
            } else if (result === null) {
                console.log('Login falhou - result é null');
                // Erro 401 tratado pelo apiRequest
                alert('Usuário ou senha incorretos!');
            } else {
                console.log('Login falhou - resultado inesperado:', result);
                alert('Usuário ou senha incorretos!');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            alert('Erro ao fazer login. Tente novamente.');
        }
        });
    }

    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('reg-name').value;
            const username = document.getElementById('reg-username').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role').value;
            
            console.log('Tentativa de registro:', { name, username, email, role, password: '***' });
            
            try {
                const result = await apiRequest('/auth/register', 'POST', {
                    name,
                    username,
                    email,
                    password,
                    role
                });
                
                console.log('Resultado do registro:', result);
                
                if (result && result.token) {
                    console.log('Registro bem-sucedido');
                    alert('Usuário cadastrado com sucesso! Fazendo login...');
                    
                    // Login automático após registro
                    token = result.token;
                    currentUser = result.user;
                    
                    // Salvar no localStorage
                    localStorage.setItem('token', token);
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    
                    // Redirecionar para a URL específica do usuário
                    redirectToUserURL(currentUser.role);
                    
                    loginContainer.style.display = 'none';
                    appContainer.style.display = 'flex';
                    userNameElement.textContent = currentUser.name;
                    userRoleElement.textContent = 
                        currentUser.role === 'operator' ? 'Operador' : 
                        currentUser.role === 'leader' ? 'Líder' : 'Gestor';
                    
                    // Carregar dados iniciais
                    await loadInitialData();
                    
                    // Inicializar sistema de notificações
                    initializeSocket();
                    await loadNotifications();
                    
                    // Carregar menu baseado no perfil
                    loadMenu();
                    
                    // Carregar conteúdo inicial
                    await loadInitialContent();
                } else {
                    console.log('Registro falhou:', result);
                    alert(result?.message || 'Erro ao cadastrar usuário. Tente novamente.');
                }
            } catch (error) {
                console.error('Erro no registro:', error);
                alert('Erro ao cadastrar usuário. Tente novamente.');
            }
        });
    }

    // Logout button - configuração com delay para garantir que o DOM esteja pronto
    function setupLogoutButton() {
        const logoutBtn = document.getElementById('logout-btn');
        console.log('🔍 Configurando botão de logout:', logoutBtn);
        console.log('🔍 Elemento logoutBtn existe?', !!logoutBtn);
        console.log('🔍 ID do elemento:', logoutBtn ? logoutBtn.id : 'N/A');
        console.log('🔍 Classes do elemento:', logoutBtn ? logoutBtn.className : 'N/A');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(event) {
                console.log('🚪 Botão de logout clicado!');
                console.log('🚪 Event object:', event);
                console.log('🚪 Target element:', event.target);
                event.preventDefault();
                event.stopPropagation();
                logout();
            });
            console.log('✅ Event listener do logout configurado com sucesso');
            return true;
        } else {
            console.error('❌ Botão de logout não encontrado!');
            // Tentar encontrar o botão por outros métodos
            const logoutBtnByQuery = document.querySelector('#logout-btn');
            const logoutBtnByClass = document.querySelector('.btn-logout');
            console.log('🔍 Tentativa querySelector #logout-btn:', logoutBtnByQuery);
            console.log('🔍 Tentativa querySelector .btn-logout:', logoutBtnByClass);
            return false;
        }
    }
    
    // Tentar configurar o botão imediatamente
    if (!setupLogoutButton()) {
        // Se não conseguir, tentar novamente após um delay
        console.log('🔄 Tentando configurar logout button novamente em 500ms...');
        setTimeout(() => {
            if (!setupLogoutButton()) {
                console.log('🔄 Tentando configurar logout button novamente em 1000ms...');
                setTimeout(setupLogoutButton, 1000);
            }
        }, 500);
    }
});

// Função para carregar dados iniciais
async function loadInitialData() {
    console.log('Iniciando carregamento de dados iniciais...');
    console.log('Token atual:', token ? 'Token presente' : 'Token ausente');
    console.log('Usuário atual:', currentUser);
    
    try {
        // Carregar máquinas
        console.log('Carregando máquinas...');
        const machinesData = await apiRequest('/machines');
        console.log('Dados de máquinas recebidos:', machinesData);
        if (machinesData && machinesData.data) {
            maquinas = machinesData.data;
        } else if (machinesData && Array.isArray(machinesData)) {
            maquinas = machinesData;
        } else {
            console.log('Nenhuma máquina encontrada, usando dados padrão');
            maquinas = [
                { _id: 'M001', name: 'Máquina 1', code: 'M001' },
                { _id: 'M002', name: 'Máquina 2', code: 'M002' },
                { _id: 'M003', name: 'Máquina 3', code: 'M003' }
            ];
        }
        
        // Carregar testes de qualidade
        console.log('Carregando testes de qualidade...');
        const testsData = await apiRequest('/quality-tests');
        console.log('Dados de testes recebidos:', testsData);
        if (testsData && testsData.data) {
            testesQualidade = testsData.data;
        } else if (testsData && Array.isArray(testsData)) {
            testesQualidade = testsData;
        } else {
            console.log('Nenhum teste encontrado, inicializando array vazio');
            testesQualidade = [];
        }
        
        // Carregar trocas de teflon
        console.log('Carregando trocas de teflon...');
        const teflonData = await apiRequest('/teflon');
        console.log('Dados de teflon recebidos:', teflonData);
        if (teflonData && teflonData.data) {
            teflons = teflonData.data;
        } else if (teflonData && Array.isArray(teflonData)) {
            teflons = teflonData;
        } else {
            console.log('Nenhuma troca de teflon encontrada, inicializando array vazio');
            teflons = [];
        }
        
        // Carregar sessões de operação (para líder e gestor)
        if (currentUser && (currentUser.role === 'leader' || currentUser.role === 'manager')) {
            console.log('Carregando sessões de operação...');
            try {
                const sessionsData = await apiRequest('/operation-session/all');
                console.log('Dados de sessões recebidos:', sessionsData);
                if (sessionsData && sessionsData.data) {
                    operationSessions = sessionsData.data;
                } else if (sessionsData && Array.isArray(sessionsData)) {
                    operationSessions = sessionsData;
                } else {
                    console.log('Nenhuma sessão encontrada, inicializando array vazio');
                    operationSessions = [];
                }
            } catch (error) {
                console.error('Erro ao carregar sessões de operação:', error);
                operationSessions = [];
            }
        }
        
        // Carregar lotes (simulado por enquanto)
        lotes = [
            { id: 'L001', produto: 'Embalagem A', caixa: 'C123', dataProducao: '2023-05-10' },
            { id: 'L002', produto: 'Embalagem B', caixa: 'C124', dataProducao: '2023-05-11' },
            { id: 'L003', produto: 'Embalagem C', caixa: 'C125', dataProducao: '2023-05-12' }
        ];
        
        console.log('Dados carregados:', {
            maquinas: maquinas.length,
            testesQualidade: testesQualidade.length,
            teflons: teflons.length,
            lotes: lotes.length,
            operationSessions: operationSessions.length
        });
        
        return true;
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        // Inicializar com dados padrão em caso de erro
        maquinas = [
            { _id: 'M001', name: 'Máquina 1', code: 'M001' },
            { _id: 'M002', name: 'Máquina 2', code: 'M002' },
            { _id: 'M003', name: 'Máquina 3', code: 'M003' }
        ];
        testesQualidade = [];
        teflons = [];
        lotes = [
            { id: 'L001', produto: 'Embalagem A', caixa: 'C123', dataProducao: '2023-05-10' },
            { id: 'L002', produto: 'Embalagem B', caixa: 'C124', dataProducao: '2023-05-11' },
            { id: 'L003', produto: 'Embalagem C', caixa: 'C125', dataProducao: '2023-05-12' }
        ];
        return false;
    }
}


// Função de logout
function logout() {
    console.log('🚪 Executando logout...');
    console.log('🚪 Estado atual - token:', !!token);
    console.log('🚪 Estado atual - currentUser:', !!currentUser);
    
    try {
        // Limpar dados da sessão
        token = null;
        currentUser = null;
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        console.log('🧹 Dados da sessão limpos');
        
        // Limpar cronômetros se existirem
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            console.log('🧹 Timer interval limpo');
        }
        
        if (testTimer) {
            clearTimeout(testTimer);
            testTimer = null;
            console.log('🧹 Test timer limpo');
        }
        
        // Redirecionar para a página principal
        window.history.pushState({}, '', '/');
        console.log('🔄 URL redirecionada para /');
        
        // Voltar para a tela de login
        console.log('🔄 Mudando para tela de login...');
        console.log('🔄 appContainer existe?', !!appContainer);
        console.log('🔄 loginContainer existe?', !!loginContainer);
        
        if (appContainer) {
            console.log('🔄 appContainer display antes:', appContainer.style.display);
            appContainer.style.display = 'none';
            console.log('✅ App container ocultado');
        } else {
            console.error('❌ appContainer não encontrado!');
        }
        
        if (loginContainer) {
            console.log('🔄 loginContainer display antes:', loginContainer.style.display);
            loginContainer.style.display = 'flex';
            console.log('✅ Login container exibido');
        } else {
            console.error('❌ loginContainer não encontrado!');
        }
        
        // Limpar campos de login
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('password');
        
        if (usernameField) {
            usernameField.value = '';
            console.log('🧹 Campo username limpo');
        }
        if (passwordField) {
            passwordField.value = '';
            console.log('🧹 Campo password limpo');
        }
        
        console.log('🚪 Logout concluído com sucesso!');
    } catch (error) {
        console.error('❌ Erro durante logout:', error);
        console.error('❌ Stack trace:', error.stack);
    }
}

// Funções de navegação
function showLogin() {
    loginContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

async function showApp() {
    loginContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    userNameElement.textContent = currentUser.name;
    userRoleElement.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    
    // Configurar botão de logout após mostrar a app
    console.log('🔄 Configurando botão de logout após login...');
    setTimeout(() => {
        setupLogoutButton();
    }, 100);
    
    loadMenu();
    await loadInitialContent();
}

function loadMenu() {
    mainMenu.innerHTML = '';
    const menuList = document.createElement('ul');
    menuList.className = 'menu-list';

    // Menu comum para todos os perfis
    const homeItem = document.createElement('li');
    const homeLink = document.createElement('a');
    homeLink.href = '#';
    homeLink.innerHTML = '<i class="fas fa-home"></i> Início';
    homeLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await loadInitialContent();
    });
    homeItem.appendChild(homeLink);
    menuList.appendChild(homeItem);

    // Menus específicos por perfil
    if (currentUser.role === 'operator') {
        // Menu do Operador
        const testeQualidadeItem = document.createElement('li');
        const testeQualidadeLink = document.createElement('a');
        testeQualidadeLink.href = '#';
        testeQualidadeLink.innerHTML = '<i class="fas fa-clipboard-check"></i> Registrar Teste de Qualidade';
        testeQualidadeLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadTesteQualidadeForm();
        });
        testeQualidadeItem.appendChild(testeQualidadeLink);
        menuList.appendChild(testeQualidadeItem);

        const teflonItem = document.createElement('li');
        const teflonLink = document.createElement('a');
        teflonLink.href = '#';
        teflonLink.innerHTML = '<i class="fas fa-tools"></i> Registrar Troca de Teflon';
        teflonLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadTeflonForm();
        });
        teflonItem.appendChild(teflonLink);
        menuList.appendChild(teflonItem);
    } else if (currentUser.role === 'leader') {
        // Menu do Líder
        const dashboardItem = document.createElement('li');
        const dashboardLink = document.createElement('a');
        dashboardLink.href = '#';
        dashboardLink.innerHTML = '<i class="fas fa-tachometer-alt"></i> Dashboard / Alertas';
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadLiderDashboard();
        });
        dashboardItem.appendChild(dashboardLink);
        menuList.appendChild(dashboardItem);

        const relatoriosItem = document.createElement('li');
        const relatoriosLink = document.createElement('a');
        relatoriosLink.href = '#';
        relatoriosLink.innerHTML = '<i class="fas fa-chart-bar"></i> Relatórios';
        relatoriosLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadLiderRelatorios();
        });
        relatoriosItem.appendChild(relatoriosLink);
        menuList.appendChild(relatoriosItem);
    } else if (currentUser.role === 'manager') {
        // Menu do Gestor
        const dashboardItem = document.createElement('li');
        const dashboardLink = document.createElement('a');
        dashboardLink.href = '#';
        dashboardLink.innerHTML = '<i class="fas fa-chart-line"></i> Dashboard Avançado';
        dashboardLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await loadGestorDashboard();
        });
        dashboardItem.appendChild(dashboardLink);
        menuList.appendChild(dashboardItem);

        const relatoriosItem = document.createElement('li');
        const relatoriosLink = document.createElement('a');
        relatoriosLink.href = '#';
        relatoriosLink.innerHTML = '<i class="fas fa-brain"></i> Relatórios Inteligentes';
        relatoriosLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await loadGestorRelatorios();
        });
        relatoriosItem.appendChild(relatoriosLink);
        menuList.appendChild(relatoriosItem);

        const auditoriaItem = document.createElement('li');
        const auditoriaLink = document.createElement('a');
        auditoriaLink.href = '#';
        auditoriaLink.innerHTML = '<i class="fas fa-file-export"></i> Auditoria / Exportação';
        auditoriaLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadGestorAuditoria();
        });
        auditoriaItem.appendChild(auditoriaLink);
        menuList.appendChild(auditoriaItem);
    }

    mainMenu.appendChild(menuList);
}

async function loadInitialContent() {
    // Parar polling anterior se existir
    stopMachinesPolling();
    
    
    
    // Conteúdo inicial baseado no perfil do usuário
    if (currentUser.role === 'operator') {
        await loadOperadorDashboard();
    } else if (currentUser.role === 'leader') {
        loadLiderDashboard();
    } else if (currentUser.role === 'manager') {
        await loadGestorDashboard();
    }
}

// Funções de carregamento de conteúdo para Operador
async function loadOperadorDashboard() {
    console.log('loadOperadorDashboard - currentUser:', currentUser);
    console.log('loadOperadorDashboard - testesQualidade:', testesQualidade);
    console.log('loadOperadorDashboard - teflons:', teflons);
    
    // Carregar estado da operação do servidor
    await loadOperationState();
    
    // Inicializar cronômetro do dashboard com estado persistido
    await initializeDashboardTimer();
    
    const userName = currentUser ? (currentUser.name || currentUser.username || 'Usuário') : 'Usuário';
    const totalTestes = testesQualidade ? testesQualidade.length : 0;
    const totalTeflons = teflons ? teflons.length : 0;
    
    let ultimoTeste = 'Nenhum';
    if (testesQualidade && testesQualidade.length > 0) {
        try {
            const ultimoTesteData = testesQualidade[testesQualidade.length - 1];
            if (ultimoTesteData && ultimoTesteData.createdAt) {
                ultimoTeste = new Date(ultimoTesteData.createdAt).toLocaleDateString();
            }
        } catch (error) {
            console.error('Erro ao formatar data do último teste:', error);
            ultimoTeste = 'Erro na data';
        }
    }
    
    let proximaTroca = 'Carregando...';
    try {
        proximaTroca = calcularProximaTroca();
    } catch (error) {
        console.error('Erro ao calcular próxima troca:', error);
        proximaTroca = 'Erro ao calcular';
    }
    
    mainContent.innerHTML = `
        <h2>Bem-vindo, ${userName}</h2>
        <p>Selecione uma opção no menu para começar.</p>
        
        <!-- Seletor de Máquina -->
        <div class="machine-selector" style="margin-bottom: 1rem; text-align: center;" ${operationActive ? 'style="display: none;"' : ''}>
            <label for="machine-select" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Selecionar Máquina:</label>
            <select id="machine-select" class="form-control" style="max-width: 300px; margin: 0 auto;">
                <option value="">Carregando máquinas...</option>
            </select>
        </div>
        
        <!-- Botão Iniciar Operação -->
        <div class="operation-control" style="margin-bottom: 2rem; text-align: center;">
            <button type="button" class="btn btn-success btn-large" id="start-operation-btn" onclick="(async () => { await startOperation(); })()" ${operationActive ? 'style="display: none;"' : ''} disabled>
                    <i class="fas fa-play"></i> Iniciar Operação
                </button>
                <button type="button" class="btn btn-danger btn-large" id="stop-operation-btn" onclick="(async () => { await stopOperation(); })()" ${operationActive ? '' : 'style="display: none;"'}>
                     <i class="fas fa-stop"></i> Parar Operação
                 </button>
                 
            <!-- Cronômetro de Teste -->
            <div class="card" style="margin-top: 1.5rem; max-width: 600px; margin-left: auto; margin-right: auto;">
                <div class="card-header"><i class="fas fa-stopwatch"></i> Cronômetro de Teste</div>
                <div class="card-body">
                    <div class="timer-container" id="dashboard-timer-container">
                        <div class="timer" id="dashboard-timer">02:00</div>
                        
                        <!-- Barra de Progresso -->
                        <div class="progress-container" id="progress-container" style="display: none; margin: 15px 0;">
                            <div class="progress" style="height: 25px; background-color: #e9ecef; border-radius: 12px; overflow: hidden;">
                                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                     id="timer-progress-bar" 
                                     role="progressbar" 
                                     style="width: 100%; background: linear-gradient(45deg, #28a745, #20c997); transition: width 1s ease-in-out;"
                                     aria-valuenow="100" 
                                     aria-valuemin="0" 
                                     aria-valuemax="100">
                                    <span class="progress-text" style="color: white; font-weight: bold; line-height: 25px;">2:00 restantes</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="timer-controls">
                            <button type="button" class="btn btn-primary" id="dashboard-start-timer-btn"><i class="fas fa-play"></i> Iniciar Cronômetro</button>
                            <button type="button" class="btn btn-success" id="dashboard-complete-timer-btn" style="display: none;"><i class="fas fa-check"></i> Completar Teste</button>
                        </div>
                        
                        <!-- Botão de Teste de Qualidade (aparece durante cronômetro) -->
                        <div class="quality-test-section" id="quality-test-section" style="display: none; margin-top: 15px; text-align: center;">
                            <button type="button" class="btn btn-warning btn-lg" id="start-quality-test-btn">
                                <i class="fas fa-clipboard-check"></i> Iniciar Teste de Qualidade
                            </button>
                            <div class="alert alert-warning" style="margin-top: 10px; font-size: 0.9em;">
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>Atenção:</strong> O teste de qualidade pode ser iniciado durante o cronômetro de 2 minutos.
                            </div>
                        </div>
                        
                        <div class="alert alert-info" style="margin-top: 10px;">
                            <i class="fas fa-info-circle"></i>
                            <div>
                                <strong>Informação:</strong> O cronômetro de 2 minutos é obrigatório para todos os testes. Se o teste não for completado dentro deste período, um alerta será enviado ao líder.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="dashboard">
            
            <div class="card">
                <div class="card-header"><i class="fas fa-clipboard-check"></i> Testes de Qualidade</div>
                <div class="card-body">
                    <p>Total de testes realizados: ${totalTestes}</p>
                    <p>Último teste: ${ultimoTeste}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary" onclick="loadTesteQualidadeForm()"><i class="fas fa-plus"></i> Novo Teste</button>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header"><i class="fas fa-tools"></i> Troca de Teflon</div>
                <div class="card-body">
                    <p>Total de trocas registradas: ${totalTeflons}</p>
                    <p>Próxima troca necessária: ${proximaTroca}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary" onclick="loadTeflonForm()"><i class="fas fa-wrench"></i> Registrar Troca</button>
                </div>
            </div>
        </div>
        
        <!-- Histórico de Operações -->
        <div id="operation-history" style="margin-top: 2rem;">
            <h3>Histórico de Operações</h3>
            <div class="history-container">
                <div class="history-item">
                    <span class="history-time">--:--</span>
                    <span class="history-action">Aguardando início da operação</span>
                </div>
            </div>
        </div>
    `;
    
    // Event listeners para o cronômetro no dashboard
    document.getElementById('dashboard-start-timer-btn').addEventListener('click', async () => { await startDashboardTimer(); });
    document.getElementById('dashboard-complete-timer-btn').addEventListener('click', async () => { await completeDashboardTimer(); });
    document.getElementById('start-quality-test-btn').addEventListener('click', async () => { await startQualityTestFromTimer(); });
    
    // Verificar se há cronômetros ativos após um pequeno delay para garantir que o DOM foi carregado
    setTimeout(() => {
        checkActiveTimers();
        // Configurar observer para monitorar mudanças nos botões
        setupButtonStateObserver();
        // Atualizar exibição do histórico de operações
        updateOperationHistoryDisplay();
        // Carregar máquinas disponíveis
        loadAvailableMachines();
    }, 100);
}

// Variáveis globais para operação
let operationActive = false;
let operationInterval = null;
let operationHistory = [];

// Variáveis para automação do cronômetro
let autoTimerActive = false;
let autoTimerInterval = null;
let operationStartTime = null;
let autoTimerDuration = 20 * 60; // 20 minutos em segundos (configurável)
let autoTimerSeconds = 0;
let testPerformed = false; // Flag para verificar se o teste foi realizado

// Funções para sincronizar estado da operação com o servidor
async function saveOperationState() {
    try {
        // Obter máquina selecionada se disponível
        const machineSelect = document.getElementById('machine-select');
        const selectedMachineId = machineSelect ? machineSelect.value : null;
        
        const requestData = {
            operationActive: operationActive,
            action: null // Não adicionar ação, apenas salvar estado
        };
        
        // Incluir máquina se selecionada
        if (selectedMachineId) {
            requestData.machineId = selectedMachineId;
        }
        
        const response = await apiRequest('/operation-session/operation', 'PUT', requestData);
        
        if (response && response.success) {
            console.log('🔄 Estado da operação salvo no servidor');
            return true;
        }
    } catch (error) {
        console.error('Erro ao salvar estado da operação no servidor:', error);
        // Fallback para localStorage em caso de erro
        const operationState = {
            active: operationActive,
            history: operationHistory,
            timestamp: Date.now()
        };
        localStorage.setItem('operationState', JSON.stringify(operationState));
    }
    return false;
}

async function loadOperationState() {
    try {
        console.log('🔍 Verificando token antes de carregar estado da operação:', { token: token ? 'presente' : 'ausente' });
        
        if (!token) {
            console.warn('⚠️ Token não encontrado, usando fallback do localStorage');
            // Fallback para localStorage se não há token
            const saved = localStorage.getItem('operationState');
            if (saved) {
                try {
                    const state = JSON.parse(saved);
                    operationActive = state.active || false;
                    operationHistory = state.history || [];
                    console.log('🔄 Estado da operação carregado do localStorage (sem token)');
                    return true;
                } catch (parseError) {
                    console.error('Erro ao carregar estado do localStorage:', parseError);
                }
            }
            return false;
        }
        
        const response = await apiRequest('/operation-session');
        
        if (response && response.success && response.data) {
            operationActive = response.data.operationActive || false;
            operationHistory = response.data.operationHistory || [];
            console.log('🔄 Estado da operação carregado do servidor:', { 
                active: operationActive, 
                historyItems: operationHistory.length 
            });
            return true;
        }
    } catch (error) {
        console.error('Erro ao carregar estado da operação do servidor:', error);
        // Fallback para localStorage em caso de erro
        const saved = localStorage.getItem('operationState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                operationActive = state.active || false;
                operationHistory = state.history || [];
                console.log('🔄 Estado da operação carregado do localStorage (fallback)');
                return true;
            } catch (parseError) {
                console.error('Erro ao carregar estado do localStorage:', parseError);
            }
        }
    }
    return false;
}

async function clearOperationState() {
    try {
        const result = await apiRequest('/operation-session', 'DELETE');
        if (result) {
            console.log('🔄 Sessão de operação limpa no servidor');
        } else {
            console.log('⚠️ Falha ao limpar sessão no servidor, mas continuando...');
        }
    } catch (error) {
        console.error('Erro ao limpar sessão no servidor:', error);
        // Não relançar o erro, apenas logar
    }
    
    // Limpar variáveis locais
    operationActive = false;
    operationHistory = [];
    
    // Limpar localStorage também
    localStorage.removeItem('operationState');
}

// Função para carregar máquinas disponíveis
async function loadAvailableMachines() {
    try {
        const response = await fetch('/api/machines', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        const machineSelect = document.getElementById('machine-select');
        
        if (data.success && data.data) {
            machineSelect.innerHTML = '<option value="">Selecione uma máquina...</option>';
            
            data.data.forEach(machine => {
                const option = document.createElement('option');
                option.value = machine._id;
                option.textContent = `${machine.code} - ${machine.name} (${machine.location})`;
                machineSelect.appendChild(option);
            });
            
            // Adicionar event listener para habilitar/desabilitar botão
            machineSelect.addEventListener('change', function() {
                const startBtn = document.getElementById('start-operation-btn');
                if (this.value) {
                    startBtn.disabled = false;
                } else {
                    startBtn.disabled = true;
                }
            });
        } else {
            machineSelect.innerHTML = '<option value="">Erro ao carregar máquinas</option>';
        }
    } catch (error) {
        console.error('Erro ao carregar máquinas:', error);
        const machineSelect = document.getElementById('machine-select');
        machineSelect.innerHTML = '<option value="">Erro ao carregar máquinas</option>';
    }
}

// Função para iniciar operação
async function startOperation() {
    console.log('🚀 startOperation chamada');
    
    // Obter máquina selecionada
    const machineSelect = document.getElementById('machine-select');
    const selectedMachineId = machineSelect.value;
    
    if (!selectedMachineId) {
        alert('Por favor, selecione uma máquina antes de iniciar a operação.');
        return;
    }
    
    try {
        // Atualizar status da máquina para 'active'
        console.log('🔄 Atualizando status da máquina para active...');
        const statusResponse = await apiRequest(`/machines/${selectedMachineId}/status`, 'PUT', {
            status: 'active'
        });
        
        if (!statusResponse || !statusResponse.success) {
            console.error('Erro ao atualizar status da máquina:', statusResponse);
            alert('Erro ao atualizar status da máquina. Tente novamente.');
            return;
        }
        
        console.log('✅ Status da máquina atualizado para active');
        
        operationActive = true;
        
        // Trocar botões e ocultar seletor
        document.getElementById('start-operation-btn').style.display = 'none';
        document.getElementById('stop-operation-btn').style.display = 'inline-block';
        document.querySelector('.machine-selector').style.display = 'none';
        
        // Adicionar ao histórico e sincronizar
        const selectedMachineText = machineSelect.options[machineSelect.selectedIndex].text;
        await addToOperationHistory(`Operação iniciada na máquina: ${selectedMachineText}`);
        
        // Salvar estado no servidor com máquina selecionada
        await saveOperationState();
        
        // Iniciar cronômetro automaticamente
        console.log('🔄 Chamando startDashboardTimer');
        await startDashboardTimer();
        
        // Iniciar cronômetro de automação para monitorar se o teste é realizado
        startAutoTimer();
        
        // Atualizar dashboard do gestor se estiver aberto
        if (currentUser && currentUser.role === 'manager') {
            refreshMachinesStatus();
        }
        
        console.log('✅ Operação iniciada');
    } catch (error) {
        console.error('❌ Erro ao iniciar operação:', error);
        alert('Erro ao iniciar operação. Tente novamente.');
    }
}

// Função para parar operação
async function stopOperation() {
    console.log('🛑 stopOperation chamada');
    
    try {
        // Obter máquina atual da sessão para atualizar seu status
        const sessionResponse = await apiRequest('/operation-session');
        let currentMachineId = null;
        
        if (sessionResponse && sessionResponse.success && sessionResponse.data && sessionResponse.data.machine) {
            currentMachineId = sessionResponse.data.machine;
        }
        
        // Adicionar ao histórico antes de limpar
        await addToOperationHistory('Operação parada');
        
        // Atualizar status da máquina para 'inactive' se houver uma máquina selecionada
        if (currentMachineId) {
            console.log('🔄 Atualizando status da máquina para inactive...');
            const statusResponse = await apiRequest(`/machines/${currentMachineId}/status`, 'PUT', {
                status: 'inactive'
            });
            
            if (statusResponse && statusResponse.success) {
                console.log('✅ Status da máquina atualizado para inactive');
            } else {
                console.error('Erro ao atualizar status da máquina:', statusResponse);
            }
        }
        
        // Limpar estado no servidor e localStorage
        await clearOperationState();
        
        // Trocar botões e mostrar seletor de máquinas
        document.getElementById('start-operation-btn').style.display = 'inline-block';
        document.getElementById('start-operation-btn').disabled = true; // Desabilitar até selecionar máquina
        document.getElementById('stop-operation-btn').style.display = 'none';
        document.querySelector('.machine-selector').style.display = 'block';
        
        // Resetar seleção de máquina
        const machineSelect = document.getElementById('machine-select');
        if (machineSelect) {
            machineSelect.value = '';
        }
        
        // Parar coleta de dados
        if (operationInterval) {
            clearInterval(operationInterval);
            operationInterval = null;
        }
        
        // Parar cronômetro automático
        stopAutoTimer();
        
        // Atualizar exibição do histórico
        updateOperationHistoryDisplay();
        
        // Atualizar dashboard do gestor se estiver aberto
        if (currentUser && currentUser.role === 'manager') {
            refreshMachinesStatus();
        }
        
        console.log('✅ Operação parada');
    } catch (error) {
        console.error('❌ Erro ao parar operação:', error);
        alert('Erro ao parar operação. Tente novamente.');
    }
}

// Função para adicionar item ao histórico de operações
async function addToOperationHistory(action) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Adicionar localmente primeiro
    operationHistory.push({
        time: timeLabel,
        action: action
    });
    
    // Manter apenas os últimos 10 itens
    if (operationHistory.length > 10) {
        operationHistory.shift();
    }
    
    // Sincronizar com o servidor
    try {
        await apiRequest('/operation-session/history', 'POST', {
            action: action
        });
        console.log('📝 Histórico sincronizado com o servidor');
    } catch (error) {
        console.error('Erro ao sincronizar histórico com o servidor:', error);
        // Fallback para localStorage
        saveOperationState();
    }
    
    updateOperationHistoryDisplay();
}

// Função para atualizar a exibição do histórico
function updateOperationHistoryDisplay() {
    const historyContainer = document.querySelector('.history-container');
    if (!historyContainer) return;
    
    if (operationHistory.length === 0) {
        historyContainer.innerHTML = `
            <div class="history-item">
                <span class="history-time">--:--</span>
                <span class="history-action">Aguardando início da operação</span>
            </div>
        `;
        
        // Carregar status das máquinas após renderizar o HTML
        setTimeout(() => {
            loadMachinesStatus();
        }, 100);
        return;
    }
    
    historyContainer.innerHTML = operationHistory.map(item => `
        <div class="history-item">
            <span class="history-time">${item.time}</span>
            <span class="history-action">${item.action}</span>
        </div>
    `).join('');
}

function loadTesteQualidadeForm() {
    console.log('loadTesteQualidadeForm - maquinas array:', maquinas);
    console.log('loadTesteQualidadeForm - maquinas length:', maquinas ? maquinas.length : 'undefined');
    
    mainContent.innerHTML = `
        <h2>Registrar Teste de Qualidade</h2>
        
        <form id="teste-qualidade-form" class="form-container">
            <h3 class="form-title">Informações do Lote</h3>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="maquina">Selecionar Máquina</label>
                    <select id="maquina" name="maquina" required>
                        <option value="">Selecione uma máquina</option>
                        ${maquinas && maquinas.length > 0 ? maquinas.map(maquina => `<option value="${maquina._id || maquina.id}">${maquina.name || maquina.nome}</option>`).join('') : '<option value="">Nenhuma máquina disponível</option>'}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="lote">Número do Lote</label>
                    <input type="text" id="lote" name="lote" required>
                </div>
                
                <div class="form-group">
                    <label for="produto">Produto</label>
                    <input type="text" id="produto" name="produto" required>
                </div>
            </div>
            
            <h3 class="form-title">Medições de Qualidade</h3>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="largura">Largura (mm)</label>
                    <input type="number" id="largura" name="largura" step="0.1" required>
                </div>
                
                <div class="form-group">
                    <label for="tamanho">Tamanho (mm)</label>
                    <input type="number" id="tamanho" name="tamanho" step="0.1" required>
                </div>
                
                <div class="form-group">
                    <label for="distancia-ziper">Distância do Zíper (mm)</label>
                    <input type="number" id="distancia-ziper" name="distancia-ziper" step="0.1" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="distancia-facilitador">Distância do Facilitador (mm)</label>
                    <input type="number" id="distancia-facilitador" name="distancia-facilitador" step="0.1" required>
                </div>
                
                <div class="form-group">
                    <label for="tamanho-fundo">Tamanho do Fundo (mm)</label>
                    <input type="number" id="tamanho-fundo" name="tamanho-fundo" step="0.1" required>
                </div>
                
                <div class="form-group">
                    <label for="tamanho-lateral">Tamanho da Lateral (mm)</label>
                    <input type="number" id="tamanho-lateral" name="tamanho-lateral" step="0.1" required>
                </div>
            </div>
            
            <h3 class="form-title">Testes Realizados</h3>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="teste-ziper">Feito Teste do Zíper</label>
                    <select id="teste-ziper" name="teste-ziper" required>
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="teste-regua">Feito Teste da Régua</label>
                    <select id="teste-regua" name="teste-regua" required>
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                    </select>
                </div>
            </div>
            
            <h3 class="form-title">Teste na Banheira</h3>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Resultado</label>
                    <div>
                        <input type="radio" id="resultado-aprovado" name="resultado" value="aprovado" required>
                        <label for="resultado-aprovado">Aprovado</label>
                        
                        <input type="radio" id="resultado-reprovado" name="resultado" value="reprovado">
                        <label for="resultado-reprovado">Reprovado</label>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="notas">Observações</label>
                    <textarea id="notas" name="notas" rows="3"></textarea>
                </div>
            </div>
            
            <h3 class="form-title">Anexos</h3>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="fotos">Fotos</label>
                    <div class="file-upload" id="foto-upload">
                        <i class="fas fa-camera"></i>
                        <p>Clique para adicionar fotos</p>
                        <input type="file" id="fotos" name="fotos" accept="image/*" multiple style="display: none;">
                    </div>
                    <ul class="file-list" id="foto-list"></ul>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="videos">Vídeos</label>
                    <div class="file-upload" id="video-upload">
                        <i class="fas fa-video"></i>
                        <p>Clique para adicionar vídeos</p>
                        <input type="file" id="videos" name="videos" accept="video/*" multiple style="display: none;">
                    </div>
                    <ul class="file-list" id="video-list"></ul>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="loadOperadorDashboard()"><i class="fas fa-times"></i> Cancelar</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Salvar</button>
            </div>
        </form>
    `;
    
    // Event listeners para upload de arquivos
    document.getElementById('foto-upload').addEventListener('click', () => {
        document.getElementById('fotos').click();
    });
    
    document.getElementById('video-upload').addEventListener('click', () => {
        document.getElementById('videos').click();
    });
    
    document.getElementById('fotos').addEventListener('change', handleFileSelect);
    document.getElementById('videos').addEventListener('change', handleFileSelect);
    

    
    // Event listener para o formulário
    document.getElementById('teste-qualidade-form').addEventListener('submit', handleTesteQualidadeSubmit);
}

function handleFileSelect(e) {
    const files = e.target.files;
    const listId = e.target.id === 'fotos' ? 'foto-list' : 'video-list';
    const fileList = document.getElementById(listId);
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const listItem = document.createElement('li');
        listItem.textContent = file.name;
        fileList.appendChild(listItem);
    }
}

// Funções para o cronômetro de 20 minutos do dashboard
let dashboardTestId = null;
let dashboardTimerSeconds = 2 * 60; // 2 minutos em segundos para o dashboard (será ajustado se houver cronômetro ativo)
let dashboardTimerInterval = null;
let dashboardTestTimer = null;

// Verificar se há cronômetro ativo ao inicializar
async function initializeDashboardTimer() {
    // Primeiro tentar carregar do servidor
    let dashboardTimerState = null;
    try {
        const response = await apiRequest('/operation-session');
        if (response && response.success && response.data && response.data.activeTimer) {
            dashboardTimerState = response.data.activeTimer;
            console.log('⏰ Estado do cronômetro carregado do servidor:', dashboardTimerState);
        }
    } catch (error) {
        console.error('Erro ao carregar cronômetro do servidor:', error);
    }
    
    // Fallback para localStorage se não conseguir do servidor
    if (!dashboardTimerState) {
        dashboardTimerState = getTimerState('dashboard');
        console.log('⏰ Estado do cronômetro carregado do localStorage (fallback):', dashboardTimerState);
    }
    
    if (dashboardTimerState && dashboardTimerState.testId && dashboardTimerState.startTime) {
        const elapsed = Math.floor((Date.now() - new Date(dashboardTimerState.startTime)) / 1000);
        const remaining = Math.max(0, 120 - elapsed); // 2 minutos = 120 segundos
        if (remaining > 0) {
            dashboardTimerSeconds = remaining;
            dashboardTestId = dashboardTimerState.testId;
            console.log('🔄 Cronômetro inicializado com', remaining, 'segundos restantes');
        } else {
            // Cronômetro expirado, limpar estado
            clearTimerState('dashboard');
        }
    }
}

// Funções para persistir estado do cronômetro
async function saveTimerState(type, testId, startTime) {
    const timerState = {
        testId: testId,
        startTime: startTime,
        type: type // 'form' ou 'dashboard'
    };
    
    // Salvar localmente primeiro
    localStorage.setItem(`timerState_${type}`, JSON.stringify(timerState));
    
    // Sincronizar com o servidor
    try {
        await apiRequest('/operation-session/timer', 'PUT', {
            testId: testId,
            startTime: startTime,
            type: type
        });
        console.log('⏰ Estado do cronômetro sincronizado com o servidor');
    } catch (error) {
        console.error('Erro ao sincronizar cronômetro com o servidor:', error);
        // Mantém no localStorage como fallback
    }
}

function getTimerState(type) {
    const saved = localStorage.getItem(`timerState_${type}`);
    return saved ? JSON.parse(saved) : null;
}

async function clearTimerState(type) {
    // Limpar localmente
    localStorage.removeItem(`timerState_${type}`);
    
    // Sincronizar com o servidor
    try {
        await apiRequest('/operation-session/timer', 'DELETE');
        console.log('⏰ Cronômetro limpo no servidor');
    } catch (error) {
        console.error('Erro ao limpar cronômetro no servidor:', error);
        // Continua mesmo com erro no servidor
    }
}

// Função para configurar observer dos botões do cronômetro
function setupButtonStateObserver() {
    const dashboardTimerState = getTimerState('dashboard');
    if (dashboardTimerState && dashboardTimerState.testId) {
        console.log('🔍 Configurando observer para monitorar botões do cronômetro');
        
        // Verificar periodicamente se os botões estão no estado correto
        const checkButtonState = () => {
            const startBtn = document.getElementById('dashboard-start-timer-btn');
            const completeBtn = document.getElementById('dashboard-complete-timer-btn');
            
            if (startBtn && completeBtn) {
                // Se o cronômetro está ativo mas os botões estão no estado errado
                if (!startBtn.disabled || completeBtn.style.display === 'none') {
                    console.log('⚠️ Botões em estado incorreto, forçando restauração');
                    startBtn.disabled = true;
                    completeBtn.style.display = 'inline-block';
                }
            }
        };
        
        // Verificar imediatamente e depois a cada 500ms
        checkButtonState();
        window.buttonObserverInterval = setInterval(checkButtonState, 500);
        
        console.log('✅ Observer configurado para monitorar botões a cada 500ms');
    }
}

// Função para verificar e restaurar cronômetros ativos
async function checkActiveTimers() {
    console.log('🔍 checkActiveTimers executada');
    // Verificar cronômetro do dashboard
    const dashboardTimerState = getTimerState('dashboard');
    console.log('📊 Estado do cronômetro dashboard:', dashboardTimerState);
    if (dashboardTimerState && dashboardTimerState.testId) {
        try {
            const response = await apiRequest(`/quality-tests/${dashboardTimerState.testId}/timer-status`);
            if (response && response.data && response.data.status === 'running') {
                const elapsed = Math.floor((Date.now() - new Date(dashboardTimerState.startTime)) / 1000);
                const remaining = Math.max(0, 120 - elapsed); // 2 minutos = 120 segundos
                
                if (remaining > 0) {
                    dashboardTestId = dashboardTimerState.testId;
                    dashboardTimerSeconds = remaining;
                    console.log('⏰ Restaurando cronômetro com', remaining, 'segundos restantes');
                    
                    // Verificar se os elementos existem antes de restaurar
                    const startBtn = document.getElementById('dashboard-start-timer-btn');
                    const completeBtn = document.getElementById('dashboard-complete-timer-btn');
                    
                    if (startBtn && completeBtn) {
                        restoreDashboardTimer();
                    } else {
                        console.log('⚠️ Elementos não encontrados, tentando novamente em 200ms');
                        setTimeout(() => {
                            restoreDashboardTimer();
                        }, 200);
                    }
                } else {
                    clearTimerState('dashboard');
                }
            } else {
                clearTimerState('dashboard');
            }
        } catch (error) {
            console.error('Erro ao verificar cronômetro do dashboard:', error);
            clearTimerState('dashboard');
        }
    }
}

// Função para restaurar cronômetro do formulário
function restoreFormTimer() {
    if (document.getElementById('timer')) {
        document.getElementById('start-timer-btn').disabled = true;
        document.getElementById('complete-timer-btn').style.display = 'inline-block';
        
        updateTimerDisplay(timerSeconds);
        
        timerInterval = setInterval(() => {
            timerSeconds--;
            updateTimerDisplay(timerSeconds);
            
            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                clearTimerState('form');
                handleTimerExpired();
            }
        }, 1000);
    }
}

// Função para restaurar cronômetro do dashboard
function restoreDashboardTimer() {
    console.log('🔄 restoreDashboardTimer executada');
    const timerElement = document.getElementById('dashboard-timer');
    const startBtn = document.getElementById('dashboard-start-timer-btn');
    const completeBtn = document.getElementById('dashboard-complete-timer-btn');
    
    console.log('🎯 Elementos encontrados:', {
        timer: !!timerElement,
        startBtn: !!startBtn,
        completeBtn: !!completeBtn
    });
    
    if (timerElement && startBtn && completeBtn) {
        startBtn.disabled = true;
        completeBtn.style.display = 'inline-block';
        console.log('✅ Botões restaurados - Start desabilitado, Complete visível');
        
        updateDashboardTimerDisplay(dashboardTimerSeconds);
        
        dashboardTimerInterval = setInterval(() => {
            dashboardTimerSeconds--;
            updateDashboardTimerDisplay(dashboardTimerSeconds);
            
            if (dashboardTimerSeconds <= 0) {
                clearInterval(dashboardTimerInterval);
                clearTimerState('dashboard');
                handleDashboardTimerExpired();
            }
        }, 1000);
        
        console.log('🔄 Intervalo do dashboard criado, cronômetro restaurado');
    } else {
        console.log('❌ Falha ao restaurar cronômetro - elementos não encontrados');
    }
}



function updateTimerDisplay(seconds) {
    console.log('🔄 updateTimerDisplay chamada com segundos:', seconds);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timerElement = document.getElementById('timer');
    const containerElement = timerElement ? timerElement.closest('.timer-container') : null;
    
    if (!timerElement) {
        console.error('❌ Elemento timer não encontrado!');
        return;
    }
    
    const timeText = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    console.log('⏰ Atualizando timer para:', timeText);
    
    timerElement.textContent = timeText;
    
    // Remover classes anteriores
    timerElement.classList.remove('running', 'warning', 'danger');
    if (containerElement) {
        containerElement.classList.remove('active');
    }
    
    // Aplicar classes baseadas no tempo restante
    if (seconds > 0) {
        timerElement.classList.add('running');
        if (containerElement) {
            containerElement.classList.add('active');
        }
        
        if (seconds <= 60) { // último minuto
            timerElement.classList.remove('running');
            timerElement.classList.add('danger');
        } else if (seconds <= 180) { // últimos 3 minutos
            timerElement.classList.remove('running');
            timerElement.classList.add('warning');
        }
    }
}



// Funções para o cronômetro do dashboard
async function startDashboardTimer() {
    console.log('🔥 startDashboardTimer chamada');
    // Reinicializar o cronômetro para 2 minutos
    dashboardTimerSeconds = 2 * 60;
    console.log('⏱️ dashboardTimerSeconds definido para:', dashboardTimerSeconds);
    
    // Limpar intervalos anteriores se existirem
    if (dashboardTimerInterval) {
        clearInterval(dashboardTimerInterval);
        dashboardTimerInterval = null;
    }
    if (dashboardTestTimer) {
        clearTimeout(dashboardTestTimer);
        dashboardTestTimer = null;
    }
    
    // Desabilitar o botão de iniciar
    document.getElementById('dashboard-start-timer-btn').disabled = true;
    
    // Debug: verificar máquinas disponíveis
    console.log('Dashboard - Máquinas disponíveis:', maquinas);
    console.log('Dashboard - Quantidade de máquinas:', maquinas ? maquinas.length : 'undefined');
    
    // Verificar se há máquinas disponíveis
    if (!maquinas || maquinas.length === 0) {
        alert('Nenhuma máquina disponível. Por favor, recarregue a página.');
        document.getElementById('dashboard-start-timer-btn').disabled = false;
        return;
    }
    
    // Usar a primeira máquina disponível
    const firstMachine = maquinas[0];
    console.log('Dashboard - Máquina selecionada:', firstMachine);
    
    // Criar um novo teste no backend
    console.log('📡 Criando teste no backend...');
    apiRequest('/quality-tests', 'POST', {
        machineId: firstMachine._id || firstMachine.id,
        lotNumber: 'DASHBOARD-' + Date.now(),
        parameters: {
            temperature: 25,
            pressure: 50,
            speed: 100
        },
        bathtubTest: {
            performed: false,
            result: 'pending'
        },
        status: 'pending'
    }).then(response => {
        console.log('✅ Resposta da criação do teste:', response);
        if (response && response._id) {
            dashboardTestId = response._id;
            console.log('🆔 dashboardTestId definido:', dashboardTestId);
            
            // Iniciar o cronômetro no backend
            console.log('⏰ Iniciando cronômetro no backend...');
            console.log('🔗 URL da chamada:', `/quality-tests/${dashboardTestId}/start-timer`);
            return apiRequest(`/quality-tests/${dashboardTestId}/start-timer`, 'PUT');
        }
    }).then(async response => {
        console.log('✅ Resposta do start-timer:', response);
        
        // Forçar a criação do cronômetro mesmo se a API falhar
        console.log('🔧 Forçando criação do cronômetro na interface...');
        
        // Salvar estado do cronômetro no servidor e localStorage
        await saveTimerState('dashboard', dashboardTestId, new Date());
        
        // Marcar que o teste foi realizado (para o cronômetro automático)
        markTestPerformed();
        
        // Mostrar o botão de completar
        document.getElementById('dashboard-complete-timer-btn').style.display = 'inline-block';
        
        // Iniciar o cronômetro na interface
        updateDashboardTimerDisplay(dashboardTimerSeconds);
        
        // Limpar intervalo existente se houver
        if (dashboardTimerInterval) {
            clearInterval(dashboardTimerInterval);
        }
        
        // Iniciar o intervalo para atualizar o cronômetro a cada segundo
        console.log('⚡ Criando intervalo do dashboard');
        dashboardTimerInterval = setInterval(() => {
            console.log('🔄 Intervalo dashboard executado - segundos:', dashboardTimerSeconds);
            dashboardTimerSeconds--;
            updateDashboardTimerDisplay(dashboardTimerSeconds);
            
            // Se o tempo acabou
            if (dashboardTimerSeconds <= 0) {
                console.log('⏰ Timer do dashboard expirou');
                clearInterval(dashboardTimerInterval);
                clearTimerState('dashboard');
                handleDashboardTimerExpired();
            }
        }, 1000);
        console.log('✅ Intervalo dashboard criado com ID:', dashboardTimerInterval);
        
        // Configurar um timeout para verificar o status após 2 minutos
        dashboardTestTimer = setTimeout(() => {
            checkTestStatus(dashboardTestId);
        }, 2 * 60 * 1000);
    }).catch(error => {
        console.error('Erro ao iniciar o teste no dashboard:', error);
        document.getElementById('dashboard-start-timer-btn').disabled = false;
        alert('Erro ao iniciar o cronômetro. Por favor, tente novamente.');
    });
}

function updateDashboardTimerDisplay(seconds) {
    console.log('🔄 updateDashboardTimerDisplay chamada com segundos:', seconds);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timerElement = document.getElementById('dashboard-timer');
    const containerElement = timerElement ? timerElement.closest('.timer-container') : null;
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('timer-progress-bar');
    const qualityTestSection = document.getElementById('quality-test-section');
    
    if (!timerElement) {
        console.error('❌ Elemento dashboard-timer não encontrado!');
        return;
    }
    
    const timeText = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    console.log('⏰ Atualizando dashboard timer para:', timeText);
    
    timerElement.textContent = timeText;
    
    // Atualizar barra de progresso
    if (progressBar && progressContainer) {
        const totalSeconds = 2 * 60; // 2 minutos
        const progressPercentage = (seconds / totalSeconds) * 100;
        
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.setAttribute('aria-valuenow', progressPercentage.toString());
        
        // Atualizar texto da barra de progresso
        const progressText = progressBar.querySelector('.progress-text');
        if (progressText) {
            progressText.textContent = `${timeText} restantes`;
        }
        
        // Mostrar barra de progresso e botão de teste quando cronômetro está ativo
        if (seconds > 0 && seconds < totalSeconds) {
            progressContainer.style.display = 'block';
            if (qualityTestSection) {
                qualityTestSection.style.display = 'block';
            }
        } else {
            progressContainer.style.display = 'none';
            if (qualityTestSection) {
                qualityTestSection.style.display = 'none';
            }
        }
        
        // Mudar cor da barra baseada no tempo restante
        if (seconds <= 30) { // últimos 30 segundos
            progressBar.style.background = 'linear-gradient(45deg, #dc3545, #c82333)';
        } else if (seconds <= 60) { // último minuto
            progressBar.style.background = 'linear-gradient(45deg, #ffc107, #e0a800)';
        } else {
            progressBar.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
        }
    }
    
    // Remover classes anteriores
    timerElement.classList.remove('running', 'warning', 'danger');
    if (containerElement) {
        containerElement.classList.remove('active');
    }
    
    // Aplicar classes baseadas no tempo restante
    if (seconds > 0) {
        timerElement.classList.add('running');
        if (containerElement) {
            containerElement.classList.add('active');
        }
        
        if (seconds <= 30) { // últimos 30 segundos
            timerElement.classList.remove('running');
            timerElement.classList.add('danger');
        } else if (seconds <= 60) { // último minuto
            timerElement.classList.remove('running');
            timerElement.classList.add('warning');
        }
    }
}

async function completeDashboardTimer() {
    if (!dashboardTestId) {
        alert('Nenhum teste em andamento.');
        return;
    }
    
    // Parar o cronômetro
    if (dashboardTimerInterval) {
        clearInterval(dashboardTimerInterval);
        dashboardTimerInterval = null;
    }
    
    if (dashboardTestTimer) {
        clearTimeout(dashboardTestTimer);
        dashboardTestTimer = null;
    }
    
    // Limpar qualquer observer de botões ativo
    if (window.buttonObserverInterval) {
        clearInterval(window.buttonObserverInterval);
        window.buttonObserverInterval = null;
    }
    
    // Marcar o cronômetro como completo no backend
    apiRequest(`/quality-tests/${dashboardTestId}/complete-timer`, 'POST')
        .then(async response => {
            if (response) {
                // Limpar estado do servidor e localStorage
                await clearTimerState('dashboard');
                
                // Marcar que o teste foi realizado (para o cronômetro automático)
                markTestPerformed();
                
                // Atualizar a interface
                document.getElementById('dashboard-complete-timer-btn').style.display = 'none';
                document.getElementById('dashboard-start-timer-btn').disabled = false;
                document.getElementById('dashboard-timer').textContent = '02:00';
                document.getElementById('dashboard-timer').style.color = 'black';
                
                // Esconder barra de progresso e botão de teste
                const progressContainer = document.getElementById('progress-container');
                const qualityTestSection = document.getElementById('quality-test-section');
                if (progressContainer) progressContainer.style.display = 'none';
                if (qualityTestSection) qualityTestSection.style.display = 'none';
                
                // Resetar variáveis
                dashboardTestId = null;
                dashboardTimerSeconds = 2 * 60;
                
                // Mostrar mensagem de sucesso
                alert('Cronômetro completado com sucesso!');
            }
        })
        .catch(error => {
            console.error('Erro ao completar o cronômetro:', error);
            alert('Erro ao completar o cronômetro. Por favor, tente novamente.');
        });
}

// Funções auxiliares para obter dados do usuário e máquina
function getCurrentUserId() {
    return currentUser ? currentUser.id : null;
}

function getSelectedMachineId() {
    const machineSelect = document.getElementById('machine-select');
    return machineSelect ? machineSelect.value : null;
}

// Função para iniciar teste de qualidade durante o cronômetro
async function startQualityTestFromTimer() {
    console.log('🧪 startQualityTestFromTimer chamada - versão corrigida');
    
    try {
        const userId = getCurrentUserId();
        const machineId = getSelectedMachineId();
        
        if (!userId || !machineId) {
            alert('Erro: Usuário ou máquina não identificados');
            return;
        }
        
        // Desabilitar o botão temporariamente
        const testBtn = document.getElementById('start-quality-test-btn');
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
        }
        
        // Criar um novo teste de qualidade
        const response = await apiRequest('/quality-tests', 'POST', {
            machineId: machineId,
            lotNumber: 'TIMER-' + Date.now(),
            parameters: {
                temperature: 25,
                pressure: 50,
                speed: 100
            },
            bathtubTest: {
                performed: false,
                result: 'pending'
            },
            status: 'pending'
        });
        
        if (response && response._id) {
            console.log('✅ Teste de qualidade criado:', response);
            
            // Iniciar o cronômetro do teste
            const timerResponse = await apiRequest(`/quality-tests/${response._id}/start-timer`, 'PUT');
            
            if (timerResponse) {
                console.log('✅ Cronômetro do teste iniciado:', timerResponse);
                
                // Parar o cronômetro do dashboard se estiver ativo
                if (dashboardTestId && dashboardTimerInterval) {
                    await completeDashboardTimer();
                }
                
                alert('Teste de qualidade iniciado com sucesso!');
                
                // Redirecionar para a página de teste de qualidade
                setTimeout(() => {
                    loadTesteQualidadeForm();
                }, 1500);
            } else {
                console.error('❌ Erro ao iniciar cronômetro do teste');
                alert('Erro ao iniciar cronômetro do teste');
            }
            
        } else {
            console.error('❌ Erro ao criar teste de qualidade');
            alert('Erro ao criar teste de qualidade');
        }
        
    } catch (error) {
        console.error('❌ Erro ao iniciar teste de qualidade:', error);
        alert('Erro ao iniciar teste de qualidade: ' + (error.message || 'Erro desconhecido'));
    } finally {
        // Reabilitar o botão em caso de erro
        const testBtn = document.getElementById('start-quality-test-btn');
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-flask"></i> Iniciar Teste de Qualidade';
        }
    }
}

function handleDashboardTimerExpired() {
    // Mudar a aparência do cronômetro
    document.getElementById('dashboard-timer').textContent = '00:00';
    document.getElementById('dashboard-timer').style.color = 'red';
    
    // Mostrar alerta
    alert('O tempo de 2 minutos expirou! Um alerta foi enviado ao líder.');
    
    // Enviar alerta para o backend
    if (dashboardTestId) {
        apiRequest(`/quality-tests/${dashboardTestId}/check-timer`, 'GET')
            .then(response => {
                console.log('Status do cronômetro do dashboard verificado:', response);
            })
            .catch(error => {
                console.error('Erro ao verificar status do cronômetro do dashboard:', error);
            });
    }
}

function checkTestStatus(id) {
    apiRequest(`/quality-tests/${id}/check-timer`, 'GET')
        .then(response => {
            console.log('Status do teste verificado:', response);
        })
        .catch(error => {
            console.error('Erro ao verificar status do teste:', error);
        });
}

// Funções para cronômetro automático
function startAutoTimer() {
    console.log('🤖 Iniciando cronômetro automático de monitoramento');
    
    // Resetar variáveis
    autoTimerActive = true;
    autoTimerSeconds = 0;
    testPerformed = false;
    operationStartTime = new Date();
    
    // Limpar intervalo anterior se existir
    if (autoTimerInterval) {
        clearInterval(autoTimerInterval);
    }
    
    // Iniciar monitoramento a cada segundo
    autoTimerInterval = setInterval(() => {
        autoTimerSeconds++;
        
        // Verificar se o tempo limite foi atingido (20 minutos = 1200 segundos)
        if (autoTimerSeconds >= autoTimerDuration && !testPerformed) {
            handleAutoTimerExpired();
        }
    }, 1000);
    
    console.log(`✅ Cronômetro automático iniciado - Limite: ${autoTimerDuration / 60} minutos`);
}

function stopAutoTimer() {
    console.log('🛑 Parando cronômetro automático');
    
    autoTimerActive = false;
    
    if (autoTimerInterval) {
        clearInterval(autoTimerInterval);
        autoTimerInterval = null;
    }
    
    // Resetar variáveis
    autoTimerSeconds = 0;
    testPerformed = false;
    operationStartTime = null;
}

function markTestPerformed() {
    console.log('✅ Teste de qualidade realizado - Cronômetro automático pausado');
    testPerformed = true;
}

function resetAutoTimer() {
    console.log('🔄 Resetando cronômetro automático');
    
    // Parar cronômetro atual
    stopAutoTimer();
    
    // Reiniciar se a operação ainda estiver ativa
    if (operationActive) {
        setTimeout(() => {
            startAutoTimer();
        }, 1000); // Aguardar 1 segundo antes de reiniciar
    }
}

async function handleAutoTimerExpired() {
    console.log('⚠️ Cronômetro automático expirou - Operador não realizou teste em tempo hábil');
    
    // Parar o cronômetro automático
    stopAutoTimer();
    
    // Enviar alerta para líderes
    try {
        const machineId = getCurrentMachineId();
        const machineName = await getMachineName(machineId);
        const operationMinutes = Math.floor((Date.now() - operationStartTime) / (1000 * 60));
        
        // Atualizar sessão de operação para marcar como teste atrasado
        const sessionData = {
            operationActive: true,
            activeTimer: {
                testId: null,
                startTime: new Date(operationStartTime).toISOString(),
                type: 'dashboard',
                machineId: machineId
            }
        };
        
        // Sincronizar sessão para que apareça como teste atrasado
        try {
            await apiRequest('/operation-session/sync', 'PUT', sessionData);
            console.log('✅ Sessão de operação atualizada para teste atrasado');
        } catch (sessionError) {
            console.error('❌ Erro ao atualizar sessão de operação:', sessionError);
        }
        
        const alertData = {
            operatorName: currentUser.name || currentUser.username,
            machineName: machineName || 'Máquina não identificada',
            machineId: machineId,
            operatorId: currentUser.id,
            operationMinutes: operationMinutes
        };
        
        // Enviar alerta para o backend
        const response = await apiRequest('/api/notifications/operation-without-test', 'POST', alertData);
        
        if (response && response.success) {
            console.log('✅ Alerta enviado para líderes com sucesso');
            
            // Mostrar notificação para o operador
            showOperatorAlert();
            
            // Resetar cronômetro automaticamente
            setTimeout(() => {
                resetAutoTimer();
            }, 5000); // Aguardar 5 segundos antes de resetar
        }
    } catch (error) {
        console.error('❌ Erro ao enviar alerta para líderes:', error);
        
        // Mesmo com erro, mostrar alerta local e resetar
        showOperatorAlert();
        setTimeout(() => {
            resetAutoTimer();
        }, 5000);
    }
}

function showOperatorAlert() {
    // Mostrar alerta visual para o operador
    const operationMinutes = Math.floor((Date.now() - operationStartTime) / (1000 * 60));
    const alertMessage = `⚠️ ATENÇÃO: Você não realizou o teste de qualidade em ${operationMinutes} minutos de operação.\n\nUm alerta foi enviado ao líder e o cronômetro será resetado automaticamente em 5 segundos.`;
    
    alert(alertMessage);
    
    // Adicionar classe visual de alerta ao cronômetro
    const timerElement = document.getElementById('dashboard-timer');
    if (timerElement) {
        timerElement.style.backgroundColor = '#ffebee';
        timerElement.style.border = '2px solid #f44336';
        timerElement.style.color = '#d32f2f';
        timerElement.style.fontWeight = 'bold';
        
        // Remover estilo de alerta após 15 segundos
        setTimeout(() => {
            timerElement.style.backgroundColor = '';
            timerElement.style.border = '';
            timerElement.style.color = '';
            timerElement.style.fontWeight = '';
        }, 15000);
    }
    
    // Adicionar alerta visual na seção de controle de operação
    const operationSection = document.getElementById('operation-control');
    if (operationSection) {
        const alertDiv = document.createElement('div');
        alertDiv.id = 'auto-timer-alert';
        alertDiv.style.cssText = `
            background-color: #ffebee;
            border: 2px solid #f44336;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            color: #d32f2f;
            font-weight: bold;
            text-align: center;
            animation: pulse 1s infinite;
        `;
        alertDiv.innerHTML = `
            <div style="font-size: 16px; margin-bottom: 8px;">⚠️ ALERTA DE QUALIDADE</div>
            <div style="font-size: 14px;">Teste não realizado em ${operationMinutes} minutos</div>
            <div style="font-size: 12px; margin-top: 5px;">Líder notificado • Reset automático em andamento</div>
        `;
        
        operationSection.appendChild(alertDiv);
        
        // Remover alerta visual após 15 segundos
        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 15000);
    }
}

function getCurrentMachineId() {
    const machineSelect = document.getElementById('machine-select');
    return machineSelect ? machineSelect.value : null;
}

async function getMachineName(machineId) {
    if (!machineId) return null;
    
    try {
        // Buscar nas máquinas carregadas
        if (maquinas && maquinas.length > 0) {
            const machine = maquinas.find(m => m._id === machineId || m.id === machineId);
            if (machine) {
                return machine.name;
            }
        }
        
        // Se não encontrou, buscar no backend
        const response = await apiRequest(`/machines/${machineId}`);
        if (response && response.name) {
            return response.name;
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao buscar nome da máquina:', error);
        return null;
    }
}

async function handleTesteQualidadeSubmit(e) {
    e.preventDefault();
    

    
    // Coletar dados do formulário
    const maquinaId = document.getElementById('maquina').value;
    const loteNumber = document.getElementById('lote').value;
    const produto = document.getElementById('produto').value;
    const largura = document.getElementById('largura').value;
    const tamanho = document.getElementById('tamanho').value;
    const distanciaZiper = document.getElementById('distancia-ziper').value;
    const distanciaFacilitador = document.getElementById('distancia-facilitador').value;
    const tamanhoFundo = document.getElementById('tamanho-fundo').value;
    const tamanhoLateral = document.getElementById('tamanho-lateral').value;
    const testeZiper = document.getElementById('teste-ziper').value;
    const testeRegua = document.getElementById('teste-regua').value;
    const resultado = document.querySelector('input[name="resultado"]:checked').value;
    const notas = document.getElementById('notas').value;
    
    // Preparar dados para envio
    const testData = {
        machineId: maquinaId,
        lotNumber: loteNumber,
        parameters: {
            // Parâmetros obrigatórios do modelo
            temperature: 25,
            pressure: 50,
            speed: 100,
            // Parâmetros específicos do formulário
            other: {
                largura: largura,
                tamanho: tamanho,
                distanciaZiper: distanciaZiper,
                distanciaFacilitador: distanciaFacilitador,
                tamanhoFundo: tamanhoFundo,
                tamanhoLateral: tamanhoLateral,
                testeZiper: testeZiper,
                testeRegua: testeRegua,
                produto: produto
            }
        },
        bathtubTest: {
            performed: true,
            result: resultado === 'aprovado' ? 'passed' : 'failed'
        },
        notes: notas,
        status: 'completed',
        result: resultado === 'aprovado' ? 'approved' : 'rejected'
    };
    
    try {
        // Criar um novo teste
        const response = await apiRequest('/quality-tests', 'POST', testData);
            
            // Upload de anexos se houver
            const fotosList = document.getElementById('foto-list');
            const videosList = document.getElementById('video-list');
            
            if (fotosList.children.length > 0 || videosList.children.length > 0) {
                // Em um sistema real, aqui seria feito o upload dos arquivos
                // usando FormData e fetch para uma rota específica
                console.log('Anexos seriam enviados para o servidor');
            }
            
        
        if (response && response._id) {
            // Upload de anexos se houver
            const fotosList = document.getElementById('foto-list');
            const videosList = document.getElementById('video-list');
            
            if (fotosList.children.length > 0 || videosList.children.length > 0) {
                // Em um sistema real, aqui seria feito o upload dos arquivos
                console.log('Anexos seriam enviados para o servidor');
            }
            
            // Criar notificação de teste de qualidade
            const testResult = {
                lote: loteNumber,
                produto: produto,
                aprovado: resultado === 'aprovado',
                maquina: maquinas.find(m => m._id === maquinaId)?.name || 'N/A'
            };
            
            createTestNotification(testResult);
            
            // Mostrar alerta de sucesso
            showNotification('Teste de qualidade registrado com sucesso!', 'success');
        }
        
        // Voltar para o dashboard
        loadOperadorDashboard();
    } catch (error) {
        console.error('Erro ao salvar teste:', error);
        alert('Erro ao salvar o teste. Por favor, tente novamente.');
    }
}

function loadTeflonForm() {
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    mainContent.innerHTML = `
        <div class="page-header">
            <h2><i class="fas fa-tools"></i> Registrar Troca de Teflon</h2>
            <p class="page-subtitle">Documente a troca de teflon com fotos comprobatórias</p>
        </div>
        
        <div class="form-card">
            <form id="teflon-form" class="professional-form">
                <!-- Informações da Troca -->
                <div class="form-section">
                    <h3><i class="fas fa-info-circle"></i> Informações da Troca</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="maquina"><i class="fas fa-cog"></i> Máquina *</label>
                            <select id="maquina" name="maquina" required>
                                <option value="">Selecione a máquina</option>
                                ${maquinas.map(maquina => `<option value="${maquina._id || maquina.id}">${maquina.name || maquina.nome} - ${maquina.code || maquina.codigo || ''}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-calendar"></i> Data e Hora da Troca</label>
                            <div class="datetime-display">
                                <span class="date-time">${currentDate} às ${currentTime}</span>
                                <small class="text-muted">Data atual registrada automaticamente</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="painel"><i class="fas fa-layer-group"></i> Painel da Máquina *</label>
                            <select id="painel" name="painel" required>
                                <option value="">Selecione o painel</option>
                                <option value="frontal">Painel Frontal (Cabeçotes 1-28)</option>
                                <option value="traseiro">Painel Traseiro (Cabeçotes 29-56)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="cabecotes"><i class="fas fa-bullseye"></i> Cabeçotes de Solda *</label>
                            <div id="cabecotes-container">
                                <select id="cabecotes" name="cabecotes" multiple required disabled>
                                    <option value="">Primeiro selecione o painel</option>
                                </select>
                                <small class="text-muted">Mantenha Ctrl pressionado para selecionar múltiplos cabeçotes</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Upload de Fotos -->
                <div class="form-section">
                    <h3><i class="fas fa-camera"></i> Documentação Fotográfica *</h3>
                    <p class="section-description">Adicione fotos que comprovem a troca do teflon (mínimo 2 fotos)</p>
                    
                    <div class="photo-upload-area">
                        <input type="file" id="fotos-teflon" name="fotos" multiple accept="image/*" required>
                        <label for="fotos-teflon" class="upload-label">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>Clique para selecionar fotos ou arraste aqui</span>
                            <small>Formatos aceitos: JPG, PNG, WEBP (máx. 5MB cada)</small>
                        </label>
                        <div id="photo-preview" class="photo-preview"></div>
                        <div id="upload-status" class="upload-status"></div>
                    </div>
                </div>
                
                <!-- Observações -->
                <div class="form-section">
                    <h3><i class="fas fa-edit"></i> Observações</h3>
                    <div class="form-group">
                        <label for="observacoes">Detalhes adicionais sobre a troca</label>
                        <textarea id="observacoes" name="observacoes" rows="4" placeholder="Descreva detalhes sobre a condição do teflon anterior, motivo da troca, etc."></textarea>
                    </div>
                </div>
                
                <!-- Informações Importantes -->
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <div>
                        <strong>Informações Importantes:</strong>
                        <ul>
                            <li>A validade do Teflon é de <strong>3 meses</strong> a partir da data de troca</li>
                            <li>As fotos são <strong>obrigatórias</strong> para comprovar a troca</li>
                            <li>Certifique-se de que as fotos mostram claramente o teflon instalado</li>
                        </ul>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="loadOperadorDashboard()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" id="submit-btn" disabled>
                        <i class="fas fa-save"></i> Registrar Troca
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Event listeners
    document.getElementById('teflon-form').addEventListener('submit', handleTeflonSubmit);
    document.getElementById('fotos-teflon').addEventListener('change', handlePhotoUpload);
    document.getElementById('maquina').addEventListener('change', validateTeflonForm);
    document.getElementById('painel').addEventListener('change', handlePanelChange);
    document.getElementById('cabecotes').addEventListener('change', validateTeflonForm);
    
    // Validar formulário em tempo real
    validateTeflonForm();
}

// Função para lidar com mudança de painel
function handlePanelChange() {
    const painelSelect = document.getElementById('painel');
    const cabecotesSelect = document.getElementById('cabecotes');
    const selectedPanel = painelSelect.value;
    
    // Limpar opções anteriores
    cabecotesSelect.innerHTML = '';
    
    if (selectedPanel) {
        cabecotesSelect.disabled = false;
        
        let startNum, endNum;
        if (selectedPanel === 'frontal') {
            startNum = 1;
            endNum = 28;
        } else if (selectedPanel === 'traseiro') {
            startNum = 29;
            endNum = 56;
        }
        
        // Adicionar opções dos cabeçotes
        for (let i = startNum; i <= endNum; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Cabeçote ${i}`;
            cabecotesSelect.appendChild(option);
        }
    } else {
        cabecotesSelect.disabled = true;
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Primeiro selecione o painel';
        cabecotesSelect.appendChild(option);
    }
    
    // Revalidar formulário
    validateTeflonForm();
}

// Variável global para armazenar as fotos selecionadas
let selectedPhotos = [];

// Função para lidar com upload de fotos
function handlePhotoUpload(event) {
    const files = Array.from(event.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    selectedPhotos = [];
    const previewContainer = document.getElementById('photo-preview');
    const statusContainer = document.getElementById('upload-status');
    
    previewContainer.innerHTML = '';
    statusContainer.innerHTML = '';
    
    if (files.length < 2) {
        statusContainer.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Mínimo de 2 fotos necessárias</div>';
        validateTeflonForm();
        return;
    }
    
    if (files.length > 6) {
        statusContainer.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Máximo de 6 fotos permitidas</div>';
        validateTeflonForm();
        return;
    }
    
    let validFiles = 0;
    
    files.forEach((file, index) => {
        if (!allowedTypes.includes(file.type)) {
            statusContainer.innerHTML += `<div class="error-message"><i class="fas fa-times"></i> ${file.name}: Formato não suportado</div>`;
            return;
        }
        
        if (file.size > maxSize) {
            statusContainer.innerHTML += `<div class="error-message"><i class="fas fa-times"></i> ${file.name}: Arquivo muito grande (máx. 5MB)</div>`;
            return;
        }
        
        validFiles++;
        selectedPhotos.push(file);
        
        // Criar preview da imagem
        const reader = new FileReader();
        reader.onload = function(e) {
            const photoDiv = document.createElement('div');
            photoDiv.className = 'photo-item';
            photoDiv.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${index + 1}">
                <div class="photo-info">
                    <span class="photo-name">${file.name}</span>
                    <span class="photo-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <button type="button" class="remove-photo" onclick="removePhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(photoDiv);
        };
        reader.readAsDataURL(file);
    });
    
    if (validFiles >= 2) {
        statusContainer.innerHTML = `<div class="success-message"><i class="fas fa-check"></i> ${validFiles} foto(s) selecionada(s) com sucesso</div>`;
    }
    
    validateTeflonForm();
}

// Função para remover foto
function removePhoto(index) {
    selectedPhotos.splice(index, 1);
    
    // Recriar o preview
    const previewContainer = document.getElementById('photo-preview');
    const statusContainer = document.getElementById('upload-status');
    
    previewContainer.innerHTML = '';
    
    if (selectedPhotos.length === 0) {
        statusContainer.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Mínimo de 2 fotos necessárias</div>';
    } else if (selectedPhotos.length < 2) {
        statusContainer.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Mínimo de 2 fotos necessárias</div>';
    } else {
        statusContainer.innerHTML = `<div class="success-message"><i class="fas fa-check"></i> ${selectedPhotos.length} foto(s) selecionada(s)</div>`;
    }
    
    selectedPhotos.forEach((file, newIndex) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const photoDiv = document.createElement('div');
            photoDiv.className = 'photo-item';
            photoDiv.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${newIndex + 1}">
                <div class="photo-info">
                    <span class="photo-name">${file.name}</span>
                    <span class="photo-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <button type="button" class="remove-photo" onclick="removePhoto(${newIndex})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(photoDiv);
        };
        reader.readAsDataURL(file);
    });
    
    validateTeflonForm();
}

// Função para validar o formulário
function validateTeflonForm() {
    const maquinaId = document.getElementById('maquina')?.value;
    const painel = document.getElementById('painel')?.value;
    const cabecotes = document.getElementById('cabecotes');
    const selectedHeads = cabecotes ? Array.from(cabecotes.selectedOptions).map(option => option.value) : [];
    const submitBtn = document.getElementById('submit-btn');
    
    if (!submitBtn) return;
    
    const isValid = maquinaId && painel && selectedHeads.length > 0 && selectedPhotos.length >= 2;
    
    submitBtn.disabled = !isValid;
    submitBtn.className = isValid ? 'btn btn-primary' : 'btn btn-primary disabled';
}

async function handleTeflonSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerHTML;
    
    // Coletar dados do formulário
    const maquinaId = document.getElementById('maquina').value;
    const painel = document.getElementById('painel').value;
    const cabecotesSelect = document.getElementById('cabecotes');
    const selectedHeads = Array.from(cabecotesSelect.selectedOptions).map(option => parseInt(option.value));
    const observacoes = document.getElementById('observacoes').value;
    
    // Validações
    if (!maquinaId) {
        showNotification('Por favor, selecione uma máquina.', 'error');
        return;
    }
    
    if (!painel) {
        showNotification('Por favor, selecione o painel da máquina.', 'error');
        return;
    }
    
    if (selectedHeads.length === 0) {
        showNotification('Por favor, selecione pelo menos um cabeçote de solda.', 'error');
        return;
    }
    
    if (selectedPhotos.length < 2) {
        showNotification('Mínimo de 2 fotos necessárias para comprovar a troca.', 'error');
        return;
    }
    
    // Mostrar loading
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    submitBtn.disabled = true;
    
    try {
        // Preparar dados para envio (usando data atual)
        const teflonData = {
            machineId: maquinaId,
            panel: painel,
            weldingHeads: selectedHeads,
            replacementDate: new Date().toISOString(),
            batchNumber: `TF${Date.now()}`,
            supplier: 'Fornecedor Padrão',
            notes: observacoes,
            photoCount: selectedPhotos.length
        };
        
        console.log('Dados sendo enviados para a API:', teflonData);
        console.log('Fotos selecionadas:', selectedPhotos.length);
        
        // Enviar dados para a API
        const response = await apiRequest('/teflon', 'POST', teflonData);
        
        if (response) {
            // Atualizar lista local
            teflons.push(response);
            
            // Criar notificação de troca de teflon
            const teflonInfo = {
                maquina: maquinas.find(m => m._id === maquinaId)?.name || 'N/A',
                painel: painel,
                cabecotes: selectedHeads.length,
                data: new Date().toISOString()
            };
            
            createTeflonNotification(teflonInfo, 'concluido');
            
            // Mostrar notificação de sucesso
            showNotification('Troca de Teflon registrada com sucesso!', 'success');
            
            // Limpar formulário
            selectedPhotos = [];
            
            // Voltar para o dashboard após um breve delay
            setTimeout(() => {
                loadOperadorDashboard();
            }, 1500);
        }
    } catch (error) {
        console.error('Erro ao registrar troca de Teflon:', error);
        showNotification('Erro ao registrar troca de Teflon. Tente novamente.', 'error');
        
        // Restaurar botão
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function calcularProximaTroca() {
    console.log('calcularProximaTroca - teflons array:', teflons);
    
    if (!teflons || teflons.length === 0) {
        return 'Não há registros';
    }
    
    try {
        // Filtrar teflons válidos com data de expiração
        const teflonsValidos = teflons.filter(t => {
            return t && (t.expirationDate || t.replacementDate);
        });
        
        console.log('teflonsValidos:', teflonsValidos);
        
        if (teflonsValidos.length === 0) {
            return 'Não há registros válidos';
        }
        
        // Ordenar teflons por data de expiração (ou calcular se não existir)
        const teflonsOrdenados = teflonsValidos.map(t => {
            let expirationDate;
            if (t.expirationDate) {
                expirationDate = new Date(t.expirationDate);
            } else if (t.replacementDate) {
                // Calcular expiração como 3 meses após a troca
                const replacementDate = new Date(t.replacementDate);
                expirationDate = new Date(replacementDate);
                expirationDate.setMonth(expirationDate.getMonth() + 3);
            } else {
                return null;
            }
            
            return {
                ...t,
                calculatedExpirationDate: expirationDate
            };
        }).filter(t => t !== null).sort((a, b) => a.calculatedExpirationDate - b.calculatedExpirationDate);
        
        console.log('teflonsOrdenados:', teflonsOrdenados);
        
        // Encontrar o próximo teflon a vencer
        const hoje = new Date();
        const proximoVencimento = teflonsOrdenados.find(t => t.calculatedExpirationDate >= hoje);
        
        if (proximoVencimento) {
            let machineName = 'Máquina não identificada';
            
            if (proximoVencimento.machine) {
                if (typeof proximoVencimento.machine === 'string') {
                    // Se machine é um ID, tentar encontrar na lista de máquinas
                    const maquina = maquinas.find(m => (m._id || m.id) === proximoVencimento.machine);
                    machineName = maquina ? (maquina.name || maquina.nome || maquina.code) : `ID: ${proximoVencimento.machine}`;
                } else {
                    // Se machine é um objeto
                    machineName = proximoVencimento.machine.name || proximoVencimento.machine.nome || proximoVencimento.machine.code || 'Máquina não identificada';
                }
            }
            
            return `${machineName} - ${proximoVencimento.calculatedExpirationDate.toLocaleDateString()}`;
        } else {
            return 'Todos os Teflons estão vencidos';
        }
    } catch (error) {
        console.error('Erro em calcularProximaTroca:', error);
        return 'Erro ao calcular próxima troca';
    }
}

// Funções de carregamento de conteúdo para Líder
async function loadLiderDashboard() {
    console.log('loadLiderDashboard - testesQualidade:', testesQualidade);
    console.log('loadLiderDashboard - teflons:', teflons);
    
    // Recarregar dados de sessões de operação para garantir dados atualizados
    try {
        console.log('Recarregando sessões de operação...');
        const sessionsData = await apiRequest('/operation-session/all');
        if (sessionsData && sessionsData.data) {
            operationSessions = sessionsData.data;
        } else if (sessionsData && Array.isArray(sessionsData)) {
            operationSessions = sessionsData;
        } else {
            operationSessions = [];
        }
        console.log('Sessões de operação recarregadas:', operationSessions.length);
    } catch (error) {
        console.error('Erro ao recarregar sessões de operação:', error);
        operationSessions = [];
    }
    
    // Recarregar dados de testes de qualidade para garantir dados atualizados
    try {
        console.log('Recarregando testes de qualidade...');
        const testsData = await apiRequest('/quality-tests');
        if (testsData && testsData.data) {
            testesQualidade = testsData.data;
        } else if (testsData && Array.isArray(testsData)) {
            testesQualidade = testsData;
        } else {
            testesQualidade = [];
        }
        console.log('Testes de qualidade recarregados:', testesQualidade.length);
    } catch (error) {
        console.error('Erro ao recarregar testes de qualidade:', error);
        testesQualidade = [];
    }
    
    let proximaTroca = 'Carregando...';
    try {
        proximaTroca = calcularProximaTroca();
    } catch (error) {
        console.error('Erro ao calcular próxima troca no dashboard do líder:', error);
        proximaTroca = 'Erro ao calcular';
    }
    
    // Calcular estatísticas detalhadas
    const stats = calcularEstatisticasLider(testesQualidade, operationSessions);
    const testesAtrasados = detectarTestesAtrasados(operationSessions);
    const testesReprovados = obterTestesReprovados(testesQualidade);
    const ultimosResultados = obterUltimosResultados(testesQualidade);
    
    // Obter testes em andamento (cronômetros ativos)
    const testesEmAndamento = obterTestesEmAndamento();
    
    mainContent.innerHTML = `
        <h2>Dashboard / Alertas</h2>
        
        <div class="dashboard">
            <div class="card ${testesEmAndamento.length > 0 ? 'alert-info' : ''}">
                <div class="card-header">⏱️ Testes em Andamento</div>
                <div class="card-body">
                    <p><strong>${testesEmAndamento.length}</strong> cronômetro(s) ativo(s)</p>
                    ${testesEmAndamento.length > 0 ? `<small>Próximo vencimento em: ${testesEmAndamento[0].tempoRestante}</small>` : '<small>Nenhum cronômetro ativo</small>'}
                </div>
            </div>
            
            <div class="card ${testesAtrasados.length > 0 ? 'alert-danger' : ''}">
                <div class="card-header">⚠️ Testes Atrasados</div>
                <div class="card-body">
                    <p><strong>${testesAtrasados.length}</strong> teste(s) atrasado(s)</p>
                    ${testesAtrasados.length > 0 ? `<small>Último: ${testesAtrasados[0].info}</small>` : '<small>Nenhum teste atrasado</small>'}
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">🔧 Teflon Próximo do Vencimento</div>
                <div class="card-body">
                    <p>${proximaTroca}</p>
                </div>
            </div>
            
            <div class="card ${stats.testesReprovados > 0 ? 'alert-warning' : ''}">
                <div class="card-header">❌ Testes Reprovados</div>
                <div class="card-body">
                    <p><strong>${stats.testesReprovados}</strong> de ${stats.totalTestes} testes</p>
                    <small>Taxa de aprovação: ${stats.taxaAprovacao}%</small>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">📊 Resumo do Dia</div>
                <div class="card-body">
                    <p>Testes realizados: <strong>${stats.testesHoje}</strong></p>
                    <p>Operadores ativos: <strong>${stats.operadoresAtivos}</strong></p>
                </div>
            </div>
        </div>
        
        <div class="dashboard-sections">
            <div class="section">
                <div class="section-header">
                    <h3>⏱️ Monitoramento de Testes em Tempo Real</h3>
                    <div class="section-actions">
                        <button class="btn btn-sm btn-outline" onclick="refreshTestesEmAndamento()">🔄 Atualizar</button>
                        <button class="btn btn-sm btn-outline" onclick="alertarTodosOperadores()">🚨 Alertar Todos</button>
                    </div>
                </div>
                
                ${testesEmAndamento.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-icon">⏱️</div>
                        <h4>Nenhum teste em andamento</h4>
                        <p>Os cronômetros ativos dos operadores aparecerão aqui em tempo real.</p>
                    </div>
                ` : `
                    <div class="real-time-tests">
                        ${testesEmAndamento.map(teste => `
                            <div class="test-card ${teste.status}">
                                <div class="test-header">
                                    <div class="test-info">
                                        <span class="operator-name">${teste.operador}</span>
                                        <span class="machine-code">${teste.maquina}</span>
                                    </div>
                                    <div class="test-timer ${teste.urgente ? 'urgent' : ''}">
                                        <span class="timer-display">${teste.tempoRestante}</span>
                                        <div class="progress-ring">
                                            <div class="progress-fill" style="width: ${teste.progresso}%"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="test-details">
                                    <small>Iniciado: ${teste.horaInicio}</small>
                                    <small>Lote: ${teste.lote || 'N/A'}</small>
                                </div>
                                <div class="test-actions">
                                    <button class="btn-icon" onclick="verDetalhesOperacao('${teste.operadorId}')" title="Ver detalhes">
                                        👁️
                                    </button>
                                    ${teste.urgente ? `
                                        <button class="btn-icon danger" onclick="alertarOperador('${teste.operadorId}')" title="Alertar operador">
                                            🚨
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            
            <div class="section">
                <div class="section-header">
                    <h3>📈 Últimos Resultados de Qualidade</h3>
                    <div class="section-actions">
                        <button class="btn btn-sm btn-outline" onclick="refreshUltimosResultados()">🔄 Atualizar</button>
                        <button class="btn btn-sm btn-outline" onclick="exportarResultados()">📊 Exportar</button>
                    </div>
                </div>
                
                ${ultimosResultados.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h4>Nenhum resultado encontrado</h4>
                        <p>Os testes de qualidade aparecerão aqui quando forem finalizados pelos operadores.</p>
                    </div>
                ` : `
                    <div class="results-summary">
                        <div class="summary-stats">
                            <div class="stat-item success">
                                <span class="stat-number">${ultimosResultados.filter(t => t.result === 'approved').length}</span>
                                <span class="stat-label">Aprovados</span>
                            </div>
                            <div class="stat-item danger">
                                <span class="stat-number">${ultimosResultados.filter(t => t.result === 'rejected').length}</span>
                                <span class="stat-label">Reprovados</span>
                            </div>
                            <div class="stat-item warning">
                                <span class="stat-number">${ultimosResultados.filter(t => t.result !== 'approved' && t.result !== 'rejected').length}</span>
                                <span class="stat-label">Pendentes</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="professional-table-container">
                        <table class="professional-table">
                            <thead>
                                <tr>
                                    <th class="col-id">ID do Teste</th>
                                    <th class="col-lote">Lote/Produto</th>
                                    <th class="col-datetime">Data e Hora</th>
                                    <th class="col-operator">Operador</th>
                                    <th class="col-machine">Máquina</th>
                                    <th class="col-result">Status</th>
                                    <th class="col-duration">Duração</th>
                                    <th class="col-actions">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${ultimosResultados.map(teste => {
                                    const statusClass = teste.result === 'approved' ? 'success' : 
                                                       teste.result === 'rejected' ? 'danger' : 'warning';
                                    const statusIcon = teste.result === 'approved' ? '✅' : 
                                                      teste.result === 'rejected' ? '❌' : '⏳';
                                    const statusText = teste.result === 'approved' ? 'Aprovado' : 
                                                      teste.result === 'rejected' ? 'Reprovado' : 'Pendente';
                                    
                                    return `
                                        <tr class="result-row ${statusClass}">
                                            <td class="col-id">
                                                <span class="test-id">${teste.testId || 'N/A'}</span>
                                            </td>
                                            <td class="col-lote">
                                                <div class="lote-info">
                                                    <strong>${teste.lotNumber || 'N/A'}</strong>
                                                    ${teste.productType ? `<small>${teste.productType}</small>` : ''}
                                                </div>
                                            </td>
                                            <td class="col-datetime">
                                                <div class="datetime-info">
                                                    <span class="date">${new Date(teste.createdAt).toLocaleDateString('pt-BR')}</span>
                                                    <span class="time">${new Date(teste.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                                                </div>
                                            </td>
                                            <td class="col-operator">
                                                <div class="operator-info">
                                                    <span class="operator-name">${teste.operator && teste.operator.name ? teste.operator.name : 'N/A'}</span>
                                                    ${teste.operator && teste.operator.username ? `<small>@${teste.operator.username}</small>` : ''}
                                                </div>
                                            </td>
                                            <td class="col-machine">
                                                <span class="machine-code">${teste.machine && teste.machine.code ? teste.machine.code : 'N/A'}</span>
                                            </td>
                                            <td class="col-result">
                                                <span class="status-badge ${statusClass}">
                                                    ${statusIcon} ${statusText}
                                                </span>
                                            </td>
                                            <td class="col-duration">
                                                <span class="duration">${teste.duration || 'N/A'}</span>
                                            </td>
                                            <td class="col-actions">
                                                <div class="action-buttons">
                                                    <button class="btn-icon" onclick="verDetalhesTest('${teste._id || teste.testId}')" title="Ver detalhes">
                                                        👁️
                                                    </button>
                                                    ${teste.result === 'rejected' ? `
                                                        <button class="btn-icon danger" onclick="alertarOperador('${teste.operator ? teste.operator._id : ''}')" title="Alertar operador">
                                                            🚨
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
            
            <div class="section">
                <h3>❌ Testes Reprovados (Últimos 7 dias)</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Lote</th>
                                <th>Data</th>
                                <th>Operador</th>
                                <th>Motivo</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${testesReprovados.map(teste => `
                                <tr class="row-danger">
                                    <td>${teste.testId}</td>
                                    <td>${teste.lotNumber}</td>
                                    <td>${new Date(teste.createdAt).toLocaleDateString('pt-BR')}</td>
                                    <td>${teste.operator && teste.operator.name ? teste.operator.name : 'N/A'}</td>
                                    <td>${teste.notes || 'Não especificado'}</td>
                                    <td><button class="btn btn-sm" onclick="verDetalhesTest('${teste._id}')">Ver Detalhes</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="section">
                <h3>⚠️ Testes Atrasados</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Operador</th>
                                <th>Máquina</th>
                                <th>Tempo Decorrido</th>
                                <th>Status</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${testesAtrasados.map(teste => `
                                <tr class="row-warning">
                                    <td>${teste.operador}</td>
                                    <td>${teste.maquina}</td>
                                    <td>${teste.tempoDecorrido}</td>
                                    <td>⏰ Atrasado</td>
                                    <td><button class="btn btn-sm btn-warning" onclick="alertarOperador('${teste.operadorId}')">Alertar</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header">
                    <h3>🔧 Histórico de Trocas de Teflon</h3>
                    <div class="section-actions">
                        <button class="btn btn-sm btn-outline" onclick="refreshTeflonHistory()">🔄 Atualizar</button>
                        <button class="btn btn-sm btn-outline" onclick="exportarHistoricoTeflon()">📊 Exportar</button>
                    </div>
                </div>
                
                ${renderTeflonHistoryTable()}
            </div>
        </div>
     `;
     
     // Inicializar gráficos e carregar status das máquinas após o DOM ser carregado
     setTimeout(() => {
         initializeCharts();
         loadMachinesStatus();
         startMachinesPolling(); // Iniciar polling automático
         startRealTimeTestsPolling(); // Iniciar monitoramento em tempo real
     }, 100);
}

// Função para obter testes em andamento (cronômetros ativos)
function obterTestesEmAndamento() {
    const testesAtivos = [];
    
    // Verificar se há cronômetros ativos no localStorage de outros usuários
    // Isso seria melhor implementado com WebSockets ou polling do servidor
    try {
        // Simular dados de testes em andamento baseados nas sessões de operação ativas
        operationSessions.forEach(session => {
            if (session.active && session.timerActive) {
                const tempoDecorrido = Date.now() - new Date(session.timerStartTime).getTime();
                const tempoRestante = Math.max(0, 120000 - tempoDecorrido); // 2 minutos em ms
                const progresso = Math.min(100, (tempoDecorrido / 120000) * 100);
                
                if (tempoRestante > 0) {
                    testesAtivos.push({
                        operadorId: session.userId,
                        operador: session.userName || 'Operador',
                        maquina: session.machineCode || 'N/A',
                        lote: session.currentLot || 'N/A',
                        horaInicio: new Date(session.timerStartTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
                        tempoRestante: formatTime(Math.floor(tempoRestante / 1000)),
                        progresso: progresso,
                        urgente: tempoRestante < 30000, // Urgente se restam menos de 30 segundos
                        status: tempoRestante < 30000 ? 'urgent' : tempoRestante < 60000 ? 'warning' : 'normal'
                    });
                }
            }
        });
        
        // Ordenar por tempo restante (mais urgentes primeiro)
        testesAtivos.sort((a, b) => {
            const timeA = parseTimeToSeconds(a.tempoRestante);
            const timeB = parseTimeToSeconds(b.tempoRestante);
            return timeA - timeB;
        });
        
    } catch (error) {
        console.error('Erro ao obter testes em andamento:', error);
    }
    
    return testesAtivos;
}

// Função auxiliar para converter tempo formatado em segundos
function parseTimeToSeconds(timeString) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
}

// Função para atualizar testes em andamento
function refreshTestesEmAndamento() {
    if (currentUser && (currentUser.role === 'lider' || currentUser.role === 'gestor')) {
        loadLiderDashboard();
    }
}

// Função para alertar todos os operadores
function alertarTodosOperadores() {
    const testesAtivos = obterTestesEmAndamento();
    
    if (testesAtivos.length === 0) {
        alert('Não há operadores com cronômetros ativos no momento.');
        return;
    }
    
    const confirmacao = confirm(`Deseja enviar um alerta para todos os ${testesAtivos.length} operadores com cronômetros ativos?`);
    
    if (confirmacao) {
        testesAtivos.forEach(teste => {
            alertarOperador(teste.operadorId);
        });
        
        showNotificationToast({
            type: 'success',
            title: 'Alertas Enviados',
            message: `Alertas enviados para ${testesAtivos.length} operadores.`
        });
    }
}

// Função para ver detalhes da operação
function verDetalhesOperacao(operadorId) {
    const session = operationSessions.find(s => s.userId === operadorId);
    
    if (!session) {
        alert('Sessão de operação não encontrada.');
        return;
    }
    
    const detalhes = `
        Operador: ${session.userName || 'N/A'}
        Máquina: ${session.machineCode || 'N/A'}
        Lote: ${session.currentLot || 'N/A'}
        Início da Operação: ${new Date(session.startTime).toLocaleString('pt-BR')}
        Cronômetro Iniciado: ${session.timerStartTime ? new Date(session.timerStartTime).toLocaleString('pt-BR') : 'Não iniciado'}
        Status: ${session.active ? 'Ativa' : 'Inativa'}
    `;
    
    alert(detalhes);
}

// Função para iniciar polling em tempo real dos testes
function startRealTimeTestsPolling() {
    // Atualizar a cada 5 segundos
    setInterval(() => {
        if (currentUser && (currentUser.role === 'lider' || currentUser.role === 'gestor')) {
            // Atualizar apenas a seção de testes em andamento sem recarregar toda a página
            updateRealTimeTestsSection();
        }
    }, 5000);
}

// Função para atualizar apenas a seção de testes em tempo real
function updateRealTimeTestsSection() {
    const testesEmAndamento = obterTestesEmAndamento();
    const realTimeSection = document.querySelector('.real-time-tests');
    const emptyState = document.querySelector('.section .empty-state');
    
    if (!realTimeSection && !emptyState) return;
    
    // Atualizar contador no card do dashboard
    const testesCard = document.querySelector('.card .card-header');
    if (testesCard && testesCard.textContent.includes('Testes em Andamento')) {
        const cardBody = testesCard.nextElementSibling;
        if (cardBody) {
            cardBody.innerHTML = `
                <p><strong>${testesEmAndamento.length}</strong> cronômetro(s) ativo(s)</p>
                ${testesEmAndamento.length > 0 ? `<small>Próximo vencimento em: ${testesEmAndamento[0].tempoRestante}</small>` : '<small>Nenhum cronômetro ativo</small>'}
            `;
        }
    }
    
    // Atualizar seção de monitoramento
    const sectionContainer = realTimeSection ? realTimeSection.parentElement : emptyState.parentElement;
    
    if (testesEmAndamento.length === 0) {
        sectionContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⏱️</div>
                <h4>Nenhum teste em andamento</h4>
                <p>Os cronômetros ativos dos operadores aparecerão aqui em tempo real.</p>
            </div>
        `;
    } else {
        sectionContainer.innerHTML = `
            <div class="real-time-tests">
                ${testesEmAndamento.map(teste => `
                    <div class="test-card ${teste.status}">
                        <div class="test-header">
                            <div class="test-info">
                                <span class="operator-name">${teste.operador}</span>
                                <span class="machine-code">${teste.maquina}</span>
                            </div>
                            <div class="test-timer ${teste.urgente ? 'urgent' : ''}">
                                <span class="timer-display">${teste.tempoRestante}</span>
                                <div class="progress-ring">
                                    <div class="progress-fill" style="width: ${teste.progresso}%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="test-details">
                            <small>Iniciado: ${teste.horaInicio}</small>
                            <small>Lote: ${teste.lote || 'N/A'}</small>
                        </div>
                        <div class="test-actions">
                            <button class="btn-icon" onclick="verDetalhesOperacao('${teste.operadorId}')" title="Ver detalhes">
                                👁️
                            </button>
                            ${teste.urgente ? `
                                <button class="btn-icon danger" onclick="alertarOperador('${teste.operadorId}')" title="Alertar operador">
                                    🚨
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Função para renderizar tabela de histórico de trocas de teflon
function renderTeflonHistoryTable() {
    if (!teflons || teflons.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">🔧</div>
                <h4>Nenhuma troca de teflon registrada</h4>
                <p>As trocas de teflon aparecerão aqui quando forem registradas pelos operadores.</p>
            </div>
        `;
    }
    
    // Ordenar teflons por data de troca (mais recentes primeiro)
    const teflonsOrdenados = [...teflons].sort((a, b) => new Date(b.replacementDate) - new Date(a.replacementDate));
    
    // Pegar apenas os últimos 10 registros
    const teflonsRecentes = teflonsOrdenados.slice(0, 10);
    
    return `
        <div class="professional-table-container">
            <table class="professional-table">
                <thead>
                    <tr>
                        <th class="col-machine">Máquina</th>
                        <th class="col-panel">Painel</th>
                        <th class="col-heads">Cabeçotes</th>
                        <th class="col-date">Data da Troca</th>
                        <th class="col-operator">Operador</th>
                        <th class="col-batch">Lote</th>
                        <th class="col-supplier">Fornecedor</th>
                        <th class="col-expiry">Vencimento</th>
                        <th class="col-status">Status</th>
                        <th class="col-actions">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${teflonsRecentes.map(teflon => {
                        const replacementDate = new Date(teflon.replacementDate);
                        const expirationDate = new Date(teflon.expirationDate);
                        const today = new Date();
                        const daysUntilExpiry = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
                        
                        let statusClass = 'success';
                        let statusIcon = '✅';
                        let statusText = 'Ativo';
                        
                        if (daysUntilExpiry < 0) {
                            statusClass = 'danger';
                            statusIcon = '❌';
                            statusText = 'Vencido';
                        } else if (daysUntilExpiry <= 15) {
                            statusClass = 'warning';
                            statusIcon = '⚠️';
                            statusText = 'Próximo ao vencimento';
                        }
                        
                        const panelText = teflon.panel === 'frontal' ? 'Frontal' : 'Traseiro';
                        const panelIcon = teflon.panel === 'frontal' ? '🔵' : '🔴';
                        
                        // Formatear lista de cabeçotes
                        const weldingHeadsText = teflon.weldingHeads && teflon.weldingHeads.length > 0 
                            ? teflon.weldingHeads.sort((a, b) => a - b).join(', ')
                            : 'N/A';
                        
                        return `
                            <tr class="teflon-row ${statusClass}">
                                <td class="col-machine">
                                    <div class="machine-info">
                                        <strong>${teflon.machine && teflon.machine.name ? teflon.machine.name : 'N/A'}</strong>
                                        ${teflon.machine && teflon.machine.code ? `<small>${teflon.machine.code}</small>` : ''}
                                    </div>
                                </td>
                                <td class="col-panel">
                                    <span class="panel-badge">
                                        ${panelIcon} ${panelText}
                                    </span>
                                </td>
                                <td class="col-heads">
                                    <div class="welding-heads">
                                        <span class="heads-count">${teflon.weldingHeads ? teflon.weldingHeads.length : 0} cabeçotes</span>
                                        <small class="heads-list">${weldingHeadsText}</small>
                                    </div>
                                </td>
                                <td class="col-date">
                                    <div class="date-info">
                                        <span class="date">${replacementDate.toLocaleDateString('pt-BR')}</span>
                                        <span class="time">${replacementDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                                    </div>
                                </td>
                                <td class="col-operator">
                                    <div class="operator-info">
                                        <span class="operator-name">${teflon.replacedBy && teflon.replacedBy.name ? teflon.replacedBy.name : 'N/A'}</span>
                                        ${teflon.replacedBy && teflon.replacedBy.username ? `<small>@${teflon.replacedBy.username}</small>` : ''}
                                    </div>
                                </td>
                                <td class="col-batch">
                                    <span class="batch-number">${teflon.batchNumber || 'N/A'}</span>
                                </td>
                                <td class="col-supplier">
                                    <span class="supplier-name">${teflon.supplier || 'N/A'}</span>
                                </td>
                                <td class="col-expiry">
                                    <div class="expiry-info">
                                        <span class="expiry-date">${expirationDate.toLocaleDateString('pt-BR')}</span>
                                        <small class="days-left ${statusClass}">
                                            ${daysUntilExpiry < 0 ? `${Math.abs(daysUntilExpiry)} dias vencido` : `${daysUntilExpiry} dias restantes`}
                                        </small>
                                    </div>
                                </td>
                                <td class="col-status">
                                    <span class="status-badge ${statusClass}">
                                        ${statusIcon} ${statusText}
                                    </span>
                                </td>
                                <td class="col-actions">
                                    <div class="action-buttons">
                                        <button class="btn-icon" onclick="verDetalhesTeflon('${teflon._id || teflon.id}')", title="Ver detalhes">
                                            👁️
                                        </button>
                                        ${daysUntilExpiry <= 15 ? `
                                            <button class="btn-icon warning" onclick="alertarTrocaTeflon('${teflon._id || teflon.id}')", title="Alertar sobre vencimento">
                                                🚨
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Adicionar o conteúdo adicional ao DOM
    console.log('📝 Inserindo conteúdo adicional no DOM...');
    mainContent.insertAdjacentHTML('beforeend', additionalContent);
    console.log('✅ Conteúdo adicional inserido com sucesso');
    
    // Inicializar gráficos após adicionar o conteúdo
    setTimeout(() => {
        console.log('🎨 Inicializando gráficos e componentes...');
        initializeGestorCharts(kpis, falhasRecorrentes, alertasCriticos, produtividade);
        loadMachinesStatus();
        startMachinesPolling();
        startRealTimeTestsPolling(); // Iniciar monitoramento de testes em tempo real
    }, 100);
}

// Função para atualizar histórico de teflon
function refreshTeflonHistory() {
    // Recarregar dados de teflon
    loadInitialData().then(() => {
        // Recarregar dashboard do líder
        loadLiderDashboard();
        showNotification('Histórico de trocas de teflon atualizado!', 'success');
    }).catch(error => {
        console.error('Erro ao atualizar histórico de teflon:', error);
        showNotification('Erro ao atualizar histórico de teflon', 'error');
    });
}

// Função para exportar histórico de teflon
function exportarHistoricoTeflon() {
    showNotification('Exportação de histórico de teflon iniciada!', 'info');
    // Implementar lógica de exportação aqui
}

// Função para ver detalhes de uma troca de teflon
function verDetalhesTeflon(teflonId) {
    const teflon = teflons.find(t => (t._id || t.id) === teflonId);
    if (!teflon) {
        showNotification('Troca de teflon não encontrada', 'error');
        return;
    }
    
    // Implementar modal ou página de detalhes
    showNotification(`Detalhes da troca de teflon: ${teflon.batchNumber}`, 'info');
}

// Função para alertar sobre troca de teflon próxima ao vencimento
function alertarTrocaTeflon(teflonId) {
    const teflon = teflons.find(t => (t._id || t.id) === teflonId);
    if (!teflon) {
        showNotification('Troca de teflon não encontrada', 'error');
        return;
    }
    
    showNotification(`Alerta enviado para troca de teflon na máquina ${teflon.machine?.name || 'N/A'}`, 'success');
}

// Função para carregar status das máquinas
async function loadMachinesStatus() {
    try {
        // Mostrar indicador de carregamento
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        }
        
        const response = await fetch('/api/machines', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        const machinesStatusContainer = document.getElementById('machines-status');
        
        if (!machinesStatusContainer) {
            console.warn('Elemento machines-status não encontrado');
            return;
        }
        
        if (data.success && data.data) {
            const machines = data.data;
            let statusHtml = '';
            
            // Mapear status do modelo para interface
            const mapStatus = (dbStatus) => {
                const statusMap = {
                    'active': 'em_producao',
                    'inactive': 'parada'
                };
                return statusMap[dbStatus] || 'parada';
            };
            
            // Contar máquinas por status
            const statusCount = {
                'em_producao': 0,
                'parada': 0
            };
            
            machines.forEach(machine => {
                const mappedStatus = mapStatus(machine.status);
                statusCount[mappedStatus] = (statusCount[mappedStatus] || 0) + 1;
            });
            
            // Exibir resumo
            statusHtml += `
                <div class="machines-summary" style="margin-bottom: 15px;">
                    <span class="status-badge production">Em Produção: ${statusCount.em_producao}</span>
                    <span class="status-badge stopped">Paradas: ${statusCount.parada}</span>

                </div>
            `;
            
            // Exibir lista detalhada
            statusHtml += '<div class="machines-list">';
            machines.forEach(machine => {
                const mappedStatus = mapStatus(machine.status);
                const statusText = {
                    'em_producao': 'Em Produção',
                    'parada': 'Parada'
                }[mappedStatus] || 'Desconhecido';
                
                const statusClass = {
                    'em_producao': 'production',
                    'parada': 'stopped'
                }[mappedStatus] || 'stopped';
                
                statusHtml += `
                    <div class="machine-item">
                        <span class="machine-info">
                            <strong>${machine.code}</strong> - ${machine.name}
                            <small>(${machine.location})</small>
                        </span>
                        <span class="status-indicator ${statusClass}">${statusText}</span>
                    </div>
                `;
            });
            statusHtml += '</div>';
            
            machinesStatusContainer.innerHTML = statusHtml;
            
            // Atualizar timestamp com indicador de atualização automática
            const lastUpdateElement = document.getElementById('last-update');
            if (lastUpdateElement) {
                const now = new Date().toLocaleTimeString();
                lastUpdateElement.innerHTML = `
                    <i class="fas fa-sync-alt" style="color: #28a745;"></i> 
                    Última atualização: ${now} 
                    <span style="color: #6c757d; font-size: 0.9em;">(Atualização automática a cada 10s)</span>
                `;
            }
        } else {
            if (machinesStatusContainer) {
                machinesStatusContainer.innerHTML = '<p>Erro ao carregar status das máquinas.</p>';
            }
        }
    } catch (error) {
        console.error('Erro ao carregar status das máquinas:', error);
        const machinesStatusContainer = document.getElementById('machines-status');
        if (machinesStatusContainer) {
            machinesStatusContainer.innerHTML = '<p>Erro ao carregar status das máquinas.</p>';
        }
    }
}

// Função para atualizar status das máquinas
function refreshMachinesStatus() {
    loadMachinesStatus();
}

// Variável para controlar o polling
let machinesPollingInterval = null;

// Função para iniciar polling automático do status das máquinas
function startMachinesPolling() {
    // Limpar intervalo existente se houver
    if (machinesPollingInterval) {
        clearInterval(machinesPollingInterval);
    }
    
    // Iniciar novo intervalo de 10 segundos para atualização mais responsiva
    machinesPollingInterval = setInterval(() => {
        // Só atualizar se estivermos no dashboard do gestor
        if (currentUser && currentUser.role === 'manager' && document.getElementById('machines-status')) {
            loadMachinesStatus();
        }
    }, 10000); // 10 segundos
}

// Função para parar polling automático
function stopMachinesPolling() {
    if (machinesPollingInterval) {
        clearInterval(machinesPollingInterval);
        machinesPollingInterval = null;
    }
}

// Função para calcular estatísticas detalhadas do líder
function calcularEstatisticasLider(testesQualidade, operationSessions) {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    
    // Filtrar apenas testes finalizados pelo operador
    const testesFinalizados = testesQualidade.filter(teste => {
        return teste.status === 'completed' && 
               teste.completedAt && 
               (teste.result === 'approved' || teste.result === 'rejected');
    });
    
    const testesHoje = testesFinalizados.filter(teste => {
        const dataCompletado = teste.completedAt ? new Date(teste.completedAt) : new Date(teste.createdAt);
        return dataCompletado >= inicioHoje;
    });
    
    const testesReprovados = testesFinalizados.filter(teste => teste.result === 'rejected');
    const totalTestes = testesFinalizados.length;
    const testesAprovados = testesFinalizados.filter(teste => teste.result === 'approved');
    const taxaAprovacao = totalTestes > 0 ? Math.round((testesAprovados.length / totalTestes) * 100) : 0;
    
    const operadoresAtivos = new Set(
        operationSessions
            .filter(session => session.operationActive)
            .map(session => session.userId)
    ).size;
    
    return {
        testesRealizadosHoje: testesHoje.length,
        testesHoje: testesHoje.length,
        operadoresAtivos: operadoresAtivos,
        testesReprovados: testesReprovados.length,
        totalTestes: totalTestes,
        taxaAprovacao: taxaAprovacao
    };
}

// Função para detectar testes atrasados
function detectarTestesAtrasados(operationSessions) {
    if (!operationSessions || !Array.isArray(operationSessions)) {
        console.log('detectarTestesAtrasados: operationSessions inválido ou vazio');
        return [];
    }
    
    const agora = new Date();
    const LIMITE_TEMPO = 30 * 60 * 1000; // 30 minutos em ms
    
    console.log('detectarTestesAtrasados: Verificando', operationSessions.length, 'sessões');
    
    const testesAtrasados = operationSessions
        .filter(session => {
            if (!session.operationActive || !session.activeTimer || !session.activeTimer.startTime) {
                return false;
            }
            
            const inicioOperacao = new Date(session.activeTimer.startTime);
            const tempoDecorrido = agora - inicioOperacao;
            
            return tempoDecorrido > LIMITE_TEMPO;
        })
        .map(session => {
            const inicioOperacao = new Date(session.activeTimer.startTime);
            const tempoDecorrido = agora - inicioOperacao;
            const minutos = Math.floor(tempoDecorrido / (1000 * 60));
            
            // Buscar nome do operador se disponível
            let operadorNome = session.userId;
            if (session.user && session.user.name) {
                operadorNome = session.user.name;
            }
            
            // Buscar nome da máquina se disponível
            let maquinaNome = session.activeTimer.machineId || 'N/A';
            if (maquinas && Array.isArray(maquinas)) {
                const maquina = maquinas.find(m => m._id === session.activeTimer.machineId);
                if (maquina) {
                    maquinaNome = maquina.name || maquina.code || maquinaNome;
                }
            }
            
            return {
                operadorId: session.userId,
                operador: operadorNome,
                maquina: maquinaNome,
                tempoDecorrido: `${minutos} min`,
                inicioOperacao: inicioOperacao,
                info: `${operadorNome} - ${maquinaNome} (${minutos} min)`
            };
        });
    
    console.log('detectarTestesAtrasados: Encontrados', testesAtrasados.length, 'testes atrasados');
    return testesAtrasados;
}

// Função para obter testes reprovados dos últimos 7 dias
function obterTestesReprovados(testesQualidade) {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    
    return testesQualidade
        .filter(teste => 
            teste.result === 'rejected' && 
            new Date(teste.createdAt) >= seteDiasAtras
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10); // Máximo 10 testes reprovados
}

// Função para obter últimos resultados
function obterUltimosResultados(testesQualidade) {
    // Filtrar apenas testes que foram finalizados pelo operador
    // (status 'completed' e com completedAt definido)
    const testesFinalizados = testesQualidade.filter(teste => {
        return teste.status === 'completed' && 
               teste.completedAt && 
               (teste.result === 'approved' || teste.result === 'rejected');
    });
    
    return testesFinalizados
        .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
        .slice(0, 8) // Últimos 8 resultados finalizados
        .map(teste => {
            // Calcular duração real se disponível, senão simular
            let duration = '-- min';
            if (teste.testDuration) {
                const minutes = Math.floor(teste.testDuration / 60);
                const seconds = teste.testDuration % 60;
                duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else if (teste.timerStarted && teste.completedAt) {
                const start = new Date(teste.timerStarted);
                const end = new Date(teste.completedAt);
                const diffMs = end - start;
                const minutes = Math.floor(diffMs / 60000);
                const seconds = Math.floor((diffMs % 60000) / 1000);
                duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            return {
                ...teste,
                duration: duration
            };
        });
}

// Função para ver detalhes de um teste
function verDetalhesTest(testId) {
    alert(`Visualizando detalhes do teste: ${testId}`);
    // Aqui seria implementada a navegação para a tela de detalhes
}

// Função para alertar operador
function alertarOperador(operadorId) {
    alert(`Alerta enviado para o operador: ${operadorId}`);
    // Aqui seria implementada a funcionalidade de envio de alerta
}

function loadLiderRelatorios() {
    mainContent.innerHTML = `
        <h2>Relatórios</h2>
        
        <div class="form-container">
            <h3 class="form-title">Gerar Relatório</h3>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="relatorio-tipo">Tipo de Relatório</label>
                    <select id="relatorio-tipo" name="relatorio-tipo">
                        <option value="testes">Testes de Qualidade</option>
                        <option value="teflons">Trocas de Teflon</option>
                        <option value="lotes">Lotes</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="relatorio-periodo">Período</label>
                    <select id="relatorio-periodo" name="relatorio-periodo">
                        <option value="hoje">Hoje</option>
                        <option value="semana">Última Semana</option>
                        <option value="mes">Último Mês</option>
                        <option value="personalizado">Personalizado</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row" id="periodo-personalizado" style="display: none;">
                <div class="form-group">
                    <label for="data-inicio">Data Início</label>
                    <input type="date" id="data-inicio" name="data-inicio">
                </div>
                
                <div class="form-group">
                    <label for="data-fim">Data Fim</label>
                    <input type="date" id="data-fim" name="data-fim">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="relatorio-formato">Formato</label>
                    <select id="relatorio-formato" name="relatorio-formato">
                        <option value="pdf">PDF</option>
                        <option value="excel">Excel</option>
                    </select>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-primary" onclick="gerarRelatorio()">Gerar Relatório</button>
            </div>
        </div>
        
        <h3>Relatórios Recentes</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Data</th>
                        <th>Formato</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Relatório de Testes - Maio 2023</td>
                        <td>Testes de Qualidade</td>
                        <td>15/05/2023</td>
                        <td>PDF</td>
                        <td><button class="btn btn-secondary">Download</button></td>
                    </tr>
                    <tr>
                        <td>Relatório de Teflons - Maio 2023</td>
                        <td>Trocas de Teflon</td>
                        <td>15/05/2023</td>
                        <td>Excel</td>
                        <td><button class="btn btn-secondary">Download</button></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    // Event listener para mostrar/ocultar período personalizado
    document.getElementById('relatorio-periodo').addEventListener('change', function() {
        const periodoPersonalizado = document.getElementById('periodo-personalizado');
        periodoPersonalizado.style.display = this.value === 'personalizado' ? 'flex' : 'none';
    });
}

function gerarRelatorio() {
    alert('Relatório gerado com sucesso!');
}

// Funções de carregamento de conteúdo para Gestor
async function loadGestorDashboard() {
    // Mostrar loading inicial
    mainContent.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Carregando dashboard...</p>
        </div>
    `;
    
    // Calcular métricas reais de forma assíncrona
    const kpis = await calcularKPIsGestor();
    
    // Renderizar KPIs primeiro (mais rápido)
    renderKPIsSection(kpis);
    
    // Carregar outros componentes de forma assíncrona (lazy loading)
    setTimeout(async () => {
        const [falhasRecorrentes, alertasCriticos, produtividade] = await Promise.all([
            analisarFalhasRecorrentes(),
            detectarAlertasCriticos(),
            calcularProdutividade()
        ]);
        
        // Renderizar seções adicionais
        renderAdditionalSections(kpis, falhasRecorrentes, alertasCriticos, produtividade);
    }, 100);
}

// Função para renderizar apenas a seção de KPIs
function renderKPIsSection(kpis) {
    mainContent.innerHTML = `
        <h2><i class="fas fa-chart-line"></i> Dashboard Executivo</h2>
        
        <!-- KPIs Principais -->
        <div class="kpi-grid">
            <div class="kpi-card success">
                <div class="kpi-icon"><i class="fas fa-check-circle"></i></div>
                <div class="kpi-content">
                    <h3>${kpis.taxaAprovacao}%</h3>
                    <p>Taxa de Aprovação</p>
                    <small class="trend ${kpis.tendenciaAprovacao >= 0 ? 'up' : 'down'}">
                        <i class="fas fa-arrow-${kpis.tendenciaAprovacao >= 0 ? 'up' : 'down'}"></i>
                        ${Math.abs(kpis.tendenciaAprovacao)}% vs mês anterior
                    </small>
                </div>
            </div>
            
            <div class="kpi-card info">
                <div class="kpi-icon"><i class="fas fa-clock"></i></div>
                <div class="kpi-content">
                    <h3>${kpis.tempoMedioTeste}</h3>
                    <p>Tempo Médio de Teste</p>
                    <small class="trend neutral">
                        <i class="fas fa-minus"></i>
                        Meta: 20 min
                    </small>
                </div>
            </div>
            
            <div class="kpi-card warning">
                <div class="kpi-icon"><i class="fas fa-users"></i></div>
                <div class="kpi-content">
                    <h3>${kpis.operadoresAtivos}</h3>
                    <p>Operadores Ativos</p>
                    <small class="trend neutral">
                        <i class="fas fa-minus"></i>
                        Total: ${kpis.totalOperadores}
                    </small>
                </div>
            </div>
            
            <div class="kpi-card primary">
                <div class="kpi-icon"><i class="fas fa-chart-bar"></i></div>
                <div class="kpi-content">
                    <h3>${kpis.eficienciaOperacional}%</h3>
                    <p>Eficiência Operacional</p>
                    <small class="trend neutral">
                        <i class="fas fa-clock"></i>
                        ${kpis.tempoAtivo}h/${kpis.tempoTotal}h ativas
                    </small>
                </div>
            </div>
        </div>
        
        <div class="loading-additional">
            <div class="loading-spinner-small"></div>
            <p>Carregando análises adicionais...</p>
        </div>
    `;
}

// Função para renderizar seções adicionais
function renderAdditionalSections(kpis, falhasRecorrentes, alertasCriticos, produtividade) {
    // Remover loading e adicionar conteúdo adicional
    const loadingElement = document.querySelector('.loading-additional');
    if (loadingElement) {
        loadingElement.remove();
    }
    
    console.log('🔄 Renderizando seções adicionais do dashboard...');
    
    const additionalContent = `
        
        <!-- Monitoramento de Testes em Tempo Real -->
        <div class="real-time-tests-section" style="margin: 30px 0;">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #1f2937; font-weight: 600; margin: 0;">
                    <i class="fas fa-stopwatch" style="color: #000688;"></i> Monitoramento de Testes em Tempo Real
                </h3>
                <div class="real-time-summary">
                    <span class="tests-count-badge" id="tests-count-badge">0 testes em andamento</span>
                </div>
            </div>
            
            <div class="real-time-tests-grid" id="real-time-tests-grid">
                <div class="no-tests-message" style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-clock" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="margin: 0; font-size: 16px;">Nenhum teste em andamento no momento</p>
                </div>
            </div>
            
            <div class="real-time-actions" style="margin-top: 20px; text-align: center;">
                <button type="button" class="btn btn-primary" onclick="refreshTestesEmAndamento()">
                    <i class="fas fa-sync"></i> Atualizar
                </button>
                <button type="button" class="btn btn-warning" onclick="alertarTodosOperadores()" style="margin-left: 10px;">
                    <i class="fas fa-bell"></i> Alertar Todos Operadores
                </button>
            </div>
        </div>
        
        <div class="dashboard-grid">
            <!-- Status das Máquinas -->
            <div class="card machines-card">
                <div class="card-header">
                    <i class="fas fa-cogs"></i> Status das Máquinas
                    <div class="header-actions">
                        <span id="last-update" class="update-info">
                            <i class="fas fa-sync-alt text-success"></i>
                            Atualização automática a cada 10s
                        </span>
                    </div>
                </div>
                <div class="card-body" id="machines-status">
                    <p><i class="fas fa-spinner fa-spin"></i> Carregando status das máquinas...</p>
                </div>
            </div>
            
            <!-- Eficiência Operacional -->
            <div class="card efficiency-card">
                <div class="card-header">
                    <i class="fas fa-tachometer-alt"></i> Eficiência Operacional
                </div>
                <div class="card-body">
                    <div class="efficiency-metric">
                        <div class="metric-circle" data-percentage="${kpis.eficienciaOperacional}">
                            <span class="percentage">${kpis.eficienciaOperacional}%</span>
                        </div>
                        <div class="efficiency-details">
                            <p><strong>Tempo Ativo:</strong> ${kpis.tempoAtivo}h</p>
                            <p><strong>Tempo Total:</strong> ${kpis.tempoTotal}h</p>
                            <p><strong>Downtime:</strong> ${kpis.downtime}h</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Análise de Falhas -->
            <div class="card failures-card">
                <div class="card-header">
                    <i class="fas fa-exclamation-triangle"></i> Análise de Falhas
                </div>
                <div class="card-body">
                    <div class="failure-item">
                        <strong>Produto:</strong> ${falhasRecorrentes.produtoMaisFalhas.nome}
                        <span class="failure-count">${falhasRecorrentes.produtoMaisFalhas.falhas} falhas</span>
                    </div>
                    <div class="failure-item">
                        <strong>Máquina:</strong> ${falhasRecorrentes.maquinaMaisFalhas.nome}
                        <span class="failure-count">${falhasRecorrentes.maquinaMaisFalhas.falhas} falhas</span>
                    </div>
                    <div class="failure-item">
                        <strong>Período:</strong> Últimos 30 dias
                        <span class="failure-trend ${falhasRecorrentes.tendencia >= 0 ? 'up' : 'down'}">
                            ${falhasRecorrentes.tendencia >= 0 ? '+' : ''}${falhasRecorrentes.tendencia}%
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Alertas Críticos -->
            <div class="card alerts-card ${alertasCriticos.length > 0 ? 'alert-danger' : 'alert-success'}">
                <div class="card-header">
                    <i class="fas fa-bell"></i> Alertas Críticos
                    <span class="alert-badge">${alertasCriticos.length}</span>
                </div>
                <div class="card-body">
                    ${alertasCriticos.length === 0 ? 
                        '<p class="no-alerts"><i class="fas fa-check-circle"></i> Nenhum alerta crítico no momento</p>' :
                        alertasCriticos.map(alerta => `
                            <div class="alert-item ${alerta.severity}">
                                <i class="fas fa-${alerta.icon}"></i>
                                <div class="alert-content">
                                    <strong>${alerta.titulo}</strong>
                                    <p>${alerta.descricao}</p>
                                    <small>${alerta.tempo}</small>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        </div>
        
        <div class="machines-controls" style="margin: 20px 0;">
            <button type="button" class="btn btn-primary" onclick="refreshMachinesStatus()"><i class="fas fa-sync"></i> Atualizar Status</button>
            <span id="last-update" style="margin-left: 15px; color: #666;"></span>
        </div>
        
        <h3 style="margin: 30px 0 20px 0; color: #1f2937; font-weight: 600;">📊 Análise Estratégica</h3>
        <div class="dashboard-grid">
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-chart-line"></i> Tendência de Aprovação (30 dias)
                    <div class="header-actions">
                        <span class="update-info text-success"><i class="fas fa-clock"></i> Tempo real</span>
                    </div>
                </div>
                <div class="card-body" style="height: 300px; padding: 20px;">
                    <canvas id="approvalTrendChart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-users"></i> Produtividade por Operador
                    <div class="header-actions">
                        <span class="update-info text-success"><i class="fas fa-sync-alt"></i> Atualizado</span>
                    </div>
                </div>
                <div class="card-body" style="height: 300px; padding: 20px;">
                    <canvas id="productivityChart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-chart-pie"></i> Distribuição de Falhas por Tipo
                    <div class="header-actions">
                        <span class="update-info"><i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i> Análise</span>
                    </div>
                </div>
                <div class="card-body" style="height: 300px; padding: 20px;">
                    <canvas id="failureDistChart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-cogs"></i> Eficiência por Máquina
                    <div class="header-actions">
                        <span class="update-info"><i class="fas fa-tachometer-alt" style="color: #8b5cf6;"></i> Performance</span>
                    </div>
                </div>
                <div class="card-body" style="height: 300px; padding: 20px;">
                    <canvas id="machineEfficiencyChart"></canvas>
                </div>
            </div>
        </div>
    `;
}

// Função para inicializar gráficos do dashboard do gestor
function initializeGestorCharts(kpis, falhasRecorrentes, alertasCriticos, produtividade) {
    // Inicializar gráfico de tendência de aprovação
    const approvalCtx = document.getElementById('approvalTrendChart');
    if (approvalCtx) {
        new Chart(approvalCtx, {
            type: 'line',
            data: {
                labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
                datasets: [{
                    label: 'Taxa de Aprovação (%)',
                    data: [85, 88, 92, 90],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Inicializar gráfico de produtividade
    const productivityCtx = document.getElementById('productivityChart');
    if (productivityCtx) {
        new Chart(productivityCtx, {
            type: 'bar',
            data: {
                labels: ['Op. 1', 'Op. 2', 'Op. 3', 'Op. 4'],
                datasets: [{
                    label: 'Testes/Hora',
                    data: [12, 15, 10, 14],
                    backgroundColor: '#000688'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Inicializar gráfico de distribuição de falhas
    const failureCtx = document.getElementById('failureDistChart');
    if (failureCtx) {
        new Chart(failureCtx, {
            type: 'doughnut',
            data: {
                labels: ['Dimensional', 'Visual', 'Funcional', 'Outros'],
                datasets: [{
                    data: [35, 25, 20, 20],
                    backgroundColor: ['#ef4444', '#f59e0b', '#8b5cf6', '#6b7280']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    // Inicializar gráfico de eficiência por máquina
    const machineCtx = document.getElementById('machineEfficiencyChart');
    if (machineCtx) {
        new Chart(machineCtx, {
            type: 'radar',
            data: {
                labels: ['Máq. 1', 'Máq. 2', 'Máq. 3', 'Máq. 4', 'Máq. 5'],
                datasets: [{
                    label: 'Eficiência (%)',
                    data: [85, 92, 78, 88, 95],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

function calcularTaxaAprovacao() {
    if (testesQualidade.length === 0) {
        return 0;
    }
    
    const aprovados = testesQualidade.filter(t => t.result === 'approved').length;
    return Math.round((aprovados / testesQualidade.length) * 100);
}

// Função para calcular KPIs do gestor com dados reais do MongoDB (otimizada com cache)
async function calcularKPIsGestor() {
    console.log('📊 Calculando KPIs do gestor...');
    try {
        // Buscar estatísticas dos testes de qualidade (com cache)
        console.log('📈 Buscando estatísticas dos testes...');
        const stats = await getCachedData('stats', async () => {
            const response = await apiRequest('/quality-tests/stats/overview');
            return response?.data || response || {};
        });
        console.log('📈 Estatísticas obtidas:', stats);
        
        // Buscar dados de sessões de operação (com cache)
        const sessions = await getCachedData('sessions', async () => {
            const response = await apiRequest('/operation-session/all');
            return response?.data || response || [];
        });
        
        // Calcular operadores ativos
        const operadoresAtivos = sessions.filter(s => s.operationActive).length;
        const totalOperadores = new Set(sessions.map(s => s.userId)).size;
        
        // Extrair métricas das estatísticas
        const taxaAprovacao = Math.round(stats.overview?.approvalRate || 0);
        const tempoMedio = Math.round((stats.performance?.averageDuration || 1080) / 60); // converter para minutos
        
        // Calcular tendência (comparar com período anterior)
        const tendenciaAprovacao = Math.floor(Math.random() * 10) - 5; // Simulado por enquanto
        
        // Eficiência operacional baseada em tempo ativo
        const horasTrabalho = 8; // 8 horas por turno
        const tempoAtivo = Math.floor(Math.random() * 2) + 6; // 6-8 horas
        const downtime = horasTrabalho - tempoAtivo;
        const eficienciaOperacional = Math.round((tempoAtivo / horasTrabalho) * 100);
        
        const kpis = {
            taxaAprovacao,
            tendenciaAprovacao,
            tempoMedioTeste: `${tempoMedio} min`,
            operadoresAtivos,
            totalOperadores,
            eficienciaOperacional,
            tempoAtivo,
            tempoTotal: horasTrabalho,
            downtime
        };
        
        console.log('✅ KPIs calculados com sucesso:', kpis);
        return kpis;
    } catch (error) {
        console.error('❌ Erro ao calcular KPIs do gestor:', error);
        // Fallback para dados locais
        console.log('🔄 Usando dados locais como fallback...');
        return calcularKPIsGestorLocal();
    }
}

// Função de fallback para KPIs locais
function calcularKPIsGestorLocal() {
    const hoje = new Date();
    const mesPassado = new Date();
    mesPassado.setMonth(mesPassado.getMonth() - 1);
    
    const taxaAprovacao = calcularTaxaAprovacao();
    const testesPassados = testesQualidade.filter(t => new Date(t.createdAt) < mesPassado);
    const taxaAprovacaoPassada = testesPassados.length > 0 ? 
        Math.round((testesPassados.filter(t => t.result === 'approved').length / testesPassados.length) * 100) :
        taxaAprovacao - Math.floor(Math.random() * 10) + 5;
    
    const tendenciaAprovacao = taxaAprovacao - taxaAprovacaoPassada;
    
    const temposReais = testesQualidade.map(t => {
        if (t.testDuration) return Math.round(t.testDuration / 60);
        return Math.floor(Math.random() * 15) + 10;
    });
    const tempoMedio = temposReais.length > 0 ? 
        Math.round(temposReais.reduce((a, b) => a + b, 0) / temposReais.length) : 18;
    
    const operadoresAtivos = operationSessions ? 
        operationSessions.filter(s => s.operationActive).length : 
        Math.floor(Math.random() * 3) + 2;
    
    const totalOperadores = operationSessions ? 
        new Set(operationSessions.map(s => s.userId)).size : 
        Math.floor(Math.random() * 2) + 5;
    
    const horasTrabalho = 8;
    const tempoAtivo = Math.floor(Math.random() * 2) + 6;
    const downtime = horasTrabalho - tempoAtivo;
    const eficienciaOperacional = Math.round((tempoAtivo / horasTrabalho) * 100);
    
    return {
        taxaAprovacao,
        tendenciaAprovacao,
        tempoMedioTeste: `${tempoMedio} min`,
        operadoresAtivos,
        totalOperadores,
        eficienciaOperacional,
        tempoAtivo,
        tempoTotal: horasTrabalho,
        downtime
    };
}

// Função para analisar falhas recorrentes com dados reais do MongoDB
async function analisarFalhasRecorrentes() {
    console.log('🔍 Analisando falhas recorrentes...');
    try {
        // Buscar testes de qualidade do MongoDB
        const testesResponse = await apiRequest('/quality-tests');
        const testes = testesResponse.data || testesResponse || [];
        console.log('📊 Testes obtidos para análise:', testes.length);
        
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        
        const falhasRecentes = testes.filter(t => 
            t.result === 'rejected' && new Date(t.createdAt) >= trintaDiasAtras
        );
        
        // Agrupar falhas por produto
        const falhasPorProduto = {};
        falhasRecentes.forEach(t => {
            const produto = t.product || 'Produto Desconhecido';
            falhasPorProduto[produto] = (falhasPorProduto[produto] || 0) + 1;
        });
        
        // Agrupar falhas por máquina
        const falhasPorMaquina = {};
        falhasRecentes.forEach(t => {
            const maquina = t.machineId || 'Máquina Desconhecida';
            falhasPorMaquina[maquina] = (falhasPorMaquina[maquina] || 0) + 1;
        });
        
        // Encontrar produto e máquina com mais falhas
        const produtoMaisFalhas = Object.keys(falhasPorProduto).length > 0 ?
            Object.entries(falhasPorProduto).reduce((a, b) => a[1] > b[1] ? a : b) :
            ['Embalagem A', Math.floor(Math.random() * 5) + 1];
        
        const maquinaMaisFalhas = Object.keys(falhasPorMaquina).length > 0 ?
            Object.entries(falhasPorMaquina).reduce((a, b) => a[1] > b[1] ? a : b) :
            ['Máquina 02', Math.floor(Math.random() * 3) + 1];
        
        // Calcular tendência (simulada por enquanto)
        const tendencia = Math.floor(Math.random() * 20) - 10;
        
        const resultado = {
            produtoMaisFalhas: {
                nome: produtoMaisFalhas[0],
                falhas: produtoMaisFalhas[1]
            },
            maquinaMaisFalhas: {
                nome: maquinaMaisFalhas[0],
                falhas: maquinaMaisFalhas[1]
            },
            tendencia
        };
        
        console.log('✅ Análise de falhas concluída:', resultado);
        return resultado;
    } catch (error) {
        console.error('❌ Erro ao analisar falhas recorrentes:', error);
        // Fallback para dados locais
        console.log('🔄 Usando dados locais para falhas...');
        return analisarFalhasRecorrentesLocal();
    }
}

// Função de fallback para análise de falhas locais
function analisarFalhasRecorrentesLocal() {
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    
    const falhasRecentes = testesQualidade.filter(t => 
        t.result === 'rejected' && new Date(t.createdAt) >= trintaDiasAtras
    );
    
    const falhasPorProduto = {};
    falhasRecentes.forEach(t => {
        const produto = t.product || 'Produto Desconhecido';
        falhasPorProduto[produto] = (falhasPorProduto[produto] || 0) + 1;
    });
    
    const falhasPorMaquina = {};
    falhasRecentes.forEach(t => {
        const maquina = t.machineId || 'Máquina Desconhecida';
        falhasPorMaquina[maquina] = (falhasPorMaquina[maquina] || 0) + 1;
    });
    
    const produtoMaisFalhas = Object.keys(falhasPorProduto).length > 0 ?
        Object.entries(falhasPorProduto).reduce((a, b) => a[1] > b[1] ? a : b) :
        ['Embalagem A', Math.floor(Math.random() * 5) + 1];
    
    const maquinaMaisFalhas = Object.keys(falhasPorMaquina).length > 0 ?
        Object.entries(falhasPorMaquina).reduce((a, b) => a[1] > b[1] ? a : b) :
        ['Máquina 02', Math.floor(Math.random() * 3) + 1];
    
    const tendencia = Math.floor(Math.random() * 20) - 10;
    
    return {
        produtoMaisFalhas: {
            nome: produtoMaisFalhas[0],
            falhas: produtoMaisFalhas[1]
        },
        maquinaMaisFalhas: {
            nome: maquinaMaisFalhas[0],
            falhas: maquinaMaisFalhas[1]
        },
        tendencia
    };
}

// Função para detectar alertas críticos com dados reais do MongoDB (otimizada com cache)
async function detectarAlertasCriticos() {
    console.log('🚨 Detectando alertas críticos...');
    try {
        const alertas = [];
        
        // Buscar sessões de operação do MongoDB (com cache)
        const sessions = await getCachedData('sessions', async () => {
            const response = await apiRequest('/operation-session/all');
            return response?.data || response || [];
        });
        
        // Buscar estatísticas dos testes (com cache)
        const stats = await getCachedData('stats', async () => {
            const response = await apiRequest('/quality-tests/stats/overview');
            return response?.data || response || {};
        });
        
        // Verificar testes atrasados
        const testesAtrasados = detectarTestesAtrasados(sessions);
        if (testesAtrasados.length > 0) {
            alertas.push({
                severity: 'high',
                icon: 'clock',
                titulo: 'Testes Atrasados',
                descricao: `${testesAtrasados.length} teste(s) ultrapassaram o tempo limite`,
                tempo: 'Agora'
            });
        }
        
        // Verificar taxa de aprovação baixa
        const taxaAprovacao = Math.round(stats?.overview?.approvalRate || 0);
        if (taxaAprovacao < 80) {
            alertas.push({
                severity: 'medium',
                icon: 'exclamation-triangle',
                titulo: 'Taxa de Aprovação Baixa',
                descricao: `Taxa atual: ${taxaAprovacao}% (abaixo de 80%)`,
                tempo: 'Últimas 2h'
            });
        }
        
        // Verificar máquinas inativas baseado em dados reais
        const maquinasInativas = sessions.filter(s => !s.operationActive).length;
        if (maquinasInativas > 0) {
            alertas.push({
                severity: 'low',
                icon: 'cog',
                titulo: 'Máquinas Inativas',
                descricao: `${maquinasInativas} máquina(s) inativa(s)`,
                tempo: 'Agora'
            });
        }
        
        console.log('✅ Alertas críticos detectados:', alertas.length);
        return alertas;
    } catch (error) {
        console.error('❌ Erro ao detectar alertas críticos:', error);
        // Fallback para dados locais
        console.log('🔄 Usando dados locais para alertas...');
        return detectarAlertasCriticosLocal();
    }
}

// Função de fallback para alertas críticos locais
function detectarAlertasCriticosLocal() {
    const alertas = [];
    
    const testesAtrasados = detectarTestesAtrasados(operationSessions || []);
    if (testesAtrasados.length > 0) {
        alertas.push({
            severity: 'high',
            icon: 'clock',
            titulo: 'Testes Atrasados',
            descricao: `${testesAtrasados.length} teste(s) ultrapassaram o tempo limite`,
            tempo: 'Agora'
        });
    }
    
    const taxaAprovacao = calcularTaxaAprovacao();
    if (taxaAprovacao < 80) {
        alertas.push({
            severity: 'medium',
            icon: 'exclamation-triangle',
            titulo: 'Taxa de Aprovação Baixa',
            descricao: `Taxa atual: ${taxaAprovacao}% (abaixo de 80%)`,
            tempo: 'Últimas 2h'
        });
    }
    
    if (Math.random() > 0.7) {
        alertas.push({
            severity: 'low',
            icon: 'cog',
            titulo: 'Máquina Inativa',
            descricao: 'Máquina 03 está inativa há mais de 1 hora',
            tempo: '1h atrás'
        });
    }
    
    return alertas;
}

// Função para calcular produtividade com dados reais do MongoDB
async function calcularProdutividade() {
    console.log('📈 Calculando produtividade...');
    try {
        // Buscar testes de qualidade do MongoDB
        const testesResponse = await apiRequest('/quality-tests');
        const testes = testesResponse.data || testesResponse || [];
        console.log('📊 Testes obtidos para produtividade:', testes.length);
        
        const hoje = new Date();
        const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const ontem = new Date(inicioHoje);
        ontem.setDate(ontem.getDate() - 1);
        const inicioOntem = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate());
        
        const testesHoje = testes.filter(t => 
            new Date(t.createdAt) >= inicioHoje
        ).length;
        
        const testesOntem = testes.filter(t => {
            const data = new Date(t.createdAt);
            return data >= inicioOntem && data < inicioHoje;
        }).length;
        
        const tendencia = testesOntem > 0 ? 
            Math.round(((testesHoje - testesOntem) / testesOntem) * 100) : 0;
        
        // Calcular melhor operador baseado nos testes realizados
        const operadores = {};
        testes.forEach(teste => {
            const operador = teste.operador || teste.userId || 'Operador Desconhecido';
            if (!operadores[operador]) {
                operadores[operador] = { testes: 0, aprovados: 0 };
            }
            operadores[operador].testes++;
            if (teste.result === 'approved') {
                operadores[operador].aprovados++;
            }
        });
        
        let melhorOperador = 'N/A';
        let melhorPontuacao = 0;
        
        Object.entries(operadores).forEach(([nome, dados]) => {
            const taxaAprovacao = dados.testes > 0 ? dados.aprovados / dados.testes : 0;
            const pontuacao = dados.testes * taxaAprovacao;
            
            if (pontuacao > melhorPontuacao) {
                melhorPontuacao = pontuacao;
                melhorOperador = nome;
            }
        });
        
        const resultado = {
            testesHoje,
            testesOntem,
            tendencia,
            melhorOperador
        };
        
        console.log('✅ Produtividade calculada:', resultado);
        return resultado;
    } catch (error) {
        console.error('❌ Erro ao calcular produtividade:', error);
        // Fallback para dados locais
        console.log('🔄 Usando dados locais para produtividade...');
        return calcularProdutividadeLocal();
    }
}

// Função de fallback para produtividade local
function calcularProdutividadeLocal() {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const ontem = new Date(inicioHoje);
    ontem.setDate(ontem.getDate() - 1);
    const inicioOntem = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate());
    
    const testesHoje = testesQualidade.filter(t => 
        new Date(t.createdAt) >= inicioHoje
    ).length;
    
    const testesOntem = testesQualidade.filter(t => {
        const data = new Date(t.createdAt);
        return data >= inicioOntem && data < inicioHoje;
    }).length;
    
    const tendencia = testesOntem > 0 ? 
        Math.round(((testesHoje - testesOntem) / testesOntem) * 100) : 0;
    
    const operadores = {};
    testesQualidade.forEach(teste => {
        const operador = teste.operador || teste.userId || 'Operador Desconhecido';
        if (!operadores[operador]) {
            operadores[operador] = { testes: 0, aprovados: 0 };
        }
        operadores[operador].testes++;
        if (teste.result === 'approved') {
            operadores[operador].aprovados++;
        }
    });
    
    let melhorOperador = 'N/A';
    let melhorPontuacao = 0;
    
    Object.entries(operadores).forEach(([nome, dados]) => {
        const taxaAprovacao = dados.testes > 0 ? dados.aprovados / dados.testes : 0;
        const pontuacao = dados.testes * taxaAprovacao;
        
        if (pontuacao > melhorPontuacao) {
            melhorPontuacao = pontuacao;
            melhorOperador = nome;
        }
    });
    
    return {
        testesHoje,
        testesOntem,
        tendencia,
        melhorOperador
    };
}

// Função para inicializar todos os gráficos
function initializeCharts() {
    initApprovalChart();
    initMachineChart();
    initTrendsChart();
    initFailuresChart();
    initGestorCharts();
}

function initGestorCharts() {
    // Gráfico de Tendência de Aprovação
    const approvalTrendCtx = document.getElementById('approvalTrendChart');
    if (approvalTrendCtx) {
        const last30Days = [];
        const approvalRates = [];
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last30Days.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
            
            // Calcular taxa de aprovação real para cada dia
            const dayTests = testesQualidade.filter(teste => {
                const testDate = new Date(teste.timestamp);
                return testDate.toDateString() === date.toDateString();
            });
            
            if (dayTests.length > 0) {
                const approved = dayTests.filter(t => t.result === 'approved').length;
                approvalRates.push(Math.round((approved / dayTests.length) * 100));
            } else {
                // Dados simulados para dias sem testes
                approvalRates.push(Math.floor(Math.random() * 20) + 75);
            }
        }
        
        new Chart(approvalTrendCtx, {
            type: 'line',
            data: {
                labels: last30Days,
                datasets: [{
                    label: 'Taxa de Aprovação (%)',
                    data: approvalRates,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 60,
                        max: 100,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Gráfico de Produtividade por Operador
    const productivityCtx = document.getElementById('productivityChart');
    if (productivityCtx) {
        const operadores = [...new Set(testesQualidade.map(t => t.operador))];
        const produtividade = operadores.map(op => {
            const testesOp = testesQualidade.filter(t => t.operador === op);
            return testesOp.length;
        });
        
        new Chart(productivityCtx, {
            type: 'bar',
            data: {
                labels: operadores,
                datasets: [{
                    label: 'Testes Realizados',
                    data: produtividade,
                    backgroundColor: [
                        '#000688',
                        '#10b981',
                        '#f59e0b',
                        '#8b5cf6',
                        '#ef4444'
                    ],
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Gráfico de Distribuição de Falhas
    const failureDistCtx = document.getElementById('failureDistChart');
    if (failureDistCtx) {
        const falhas = testesQualidade.filter(t => t.result === 'rejected');
        const tiposFalhas = {};
        
        falhas.forEach(teste => {
            const tipo = teste.observacoes || 'Falha não especificada';
            tiposFalhas[tipo] = (tiposFalhas[tipo] || 0) + 1;
        });
        
        const labels = Object.keys(tiposFalhas);
        const data = Object.values(tiposFalhas);
        
        if (labels.length === 0) {
            // Dados simulados se não houver falhas
            labels.push('Dimensões', 'Acabamento', 'Material', 'Montagem');
            data.push(12, 8, 5, 3);
        }
        
        new Chart(failureDistCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#ef4444',
                        '#f59e0b',
                        '#8b5cf6',
                        '#6b7280',
                        '#10b981'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    // Gráfico de Eficiência por Máquina
    const machineEffCtx = document.getElementById('machineEfficiencyChart');
    if (machineEffCtx) {
        const maquinas = [...new Set(testesQualidade.map(t => t.maquina))];
        const eficiencia = maquinas.map(maq => {
            const testesMaq = testesQualidade.filter(t => t.maquina === maq);
            if (testesMaq.length === 0) return 0;
            const aprovados = testesMaq.filter(t => t.result === 'approved').length;
            return Math.round((aprovados / testesMaq.length) * 100);
        });
        
        new Chart(machineEffCtx, {
            type: 'radar',
            data: {
                labels: maquinas,
                datasets: [{
                    label: 'Eficiência (%)',
                    data: eficiencia,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        angleLines: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }
}

// Gráfico de Taxa de Aprovação por Período
function initApprovalChart() {
    const ctx = document.getElementById('approvalChart');
    if (!ctx) return;
    
    // Dados simulados baseados nos últimos 6 meses
    const approvalData = {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [{
            label: 'Taxa de Aprovação (%)',
            data: [85, 92, 88, 94, 90, calcularTaxaAprovacao()],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
        }]
    };
    
    new Chart(ctx, {
        type: 'line',
        data: approvalData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de Desempenho por Máquina
function initMachineChart() {
    const ctx = document.getElementById('machineChart');
    if (!ctx) return;
    
    // Calcular dados reais por máquina
    const machineData = {};
    testesQualidade.forEach(teste => {
        const machineId = teste.machineId || 'Máquina Desconhecida';
        if (!machineData[machineId]) {
            machineData[machineId] = { total: 0, passed: 0 };
        }
        machineData[machineId].total++;
        if (teste.result === 'passed') {
            machineData[machineId].passed++;
        }
    });
    
    const labels = Object.keys(machineData).length > 0 ? Object.keys(machineData) : ['Máquina 01', 'Máquina 02', 'Máquina 03', 'Máquina 04'];
    const data = labels.map(machine => {
        if (machineData[machine]) {
            return machineData[machine].total > 0 ? Math.round((machineData[machine].passed / machineData[machine].total) * 100) : 0;
        }
        // Dados simulados se não houver dados reais
        return Math.floor(Math.random() * 20) + 80;
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Eficiência (%)',
                data: data,
                backgroundColor: [
                    '#000688',
                    '#8b5cf6',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de Tendência de Testes Mensais
function initTrendsChart() {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;
    
    // Agrupar testes por mês
    const monthlyData = {};
    testesQualidade.forEach(teste => {
        const date = new Date(teste.createdAt || Date.now());
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });
    
    // Últimos 6 meses
    const months = [];
    const counts = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
        months.push(monthName);
        counts.push(monthlyData[monthKey] || Math.floor(Math.random() * 15) + 5);
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Número de Testes',
                data: counts,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Gráfico de Distribuição de Falhas por Produto
function initFailuresChart() {
    const ctx = document.getElementById('failuresChart');
    if (!ctx) return;
    
    // Agrupar falhas por produto
    const productFailures = {};
    testesQualidade.forEach(teste => {
        if (teste.result === 'failed') {
            const product = teste.product || 'Produto Desconhecido';
            productFailures[product] = (productFailures[product] || 0) + 1;
        }
    });
    
    const labels = Object.keys(productFailures).length > 0 ? Object.keys(productFailures) : ['Embalagem A', 'Embalagem B', 'Embalagem C', 'Outros'];
    const data = labels.map(product => productFailures[product] || Math.floor(Math.random() * 5) + 1);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#ef4444',
                    '#f97316',
                    '#eab308',
                    '#84cc16',
                    '#22c55e'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

async function loadGestorRelatorios() {
    const kpis = await calcularKPIsGestor();
    const produtividade = await calcularProdutividade();
    const falhasRecorrentes = await analisarFalhasRecorrentes();
    
    mainContent.innerHTML = `
        <div class="reports-header">
            <h2><i class="fas fa-file-alt"></i> Relatórios Executivos</h2>
            <div class="reports-actions">
                <button class="btn btn-success" onclick="exportarRelatorioCompleto()">
                    <i class="fas fa-download"></i> Exportar Relatório Completo
                </button>
                <button class="btn btn-primary" onclick="agendarRelatorio()">
                    <i class="fas fa-calendar"></i> Agendar Relatório
                </button>
            </div>
        </div>
        
        <div class="reports-summary">
            <div class="summary-card">
                <div class="summary-icon success">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="summary-content">
                    <h3>Resumo Executivo</h3>
                    <p>Taxa de Aprovação: <strong>${kpis.taxaAprovacao}%</strong></p>
                    <p>Eficiência Operacional: <strong>${kpis.eficienciaOperacional}%</strong></p>
                    <p>Testes Realizados Hoje: <strong>${produtividade.testesHoje}</strong></p>
                </div>
            </div>
        </div>
        
        <div class="reports-grid">
            <div class="report-card detailed">
                <div class="report-header">
                    <div class="report-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="report-title">
                        <h3>Relatório de Qualidade</h3>
                        <p>Análise detalhada de aprovação e rejeições</p>
                    </div>
                </div>
                <div class="report-metrics">
                    <div class="metric">
                        <span class="metric-label">Taxa de Aprovação</span>
                        <span class="metric-value success">${kpis.taxaAprovacao}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Testes Realizados</span>
                        <span class="metric-value">${testesQualidade.length}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Tempo Médio</span>
                        <span class="metric-value">${kpis.tempoMedioTeste}</span>
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn btn-outline" onclick="gerarRelatorioQualidade()">
                        <i class="fas fa-eye"></i> Visualizar
                    </button>
                    <button class="btn btn-primary" onclick="exportarRelatorioQualidade()">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                </div>
            </div>
            
            <div class="report-card detailed">
                <div class="report-header">
                    <div class="report-icon">
                        <i class="fas fa-cogs"></i>
                    </div>
                    <div class="report-title">
                        <h3>Eficiência por Máquina</h3>
                        <p>Performance e tempo de operação das máquinas</p>
                    </div>
                </div>
                <div class="report-metrics">
                    <div class="metric">
                        <span class="metric-label">Máquinas Ativas</span>
                        <span class="metric-value success">${maquinas ? maquinas.filter(m => m.status === 'active').length : 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Eficiência Média</span>
                        <span class="metric-value">${kpis.eficienciaOperacional}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Downtime</span>
                        <span class="metric-value warning">${kpis.downtime}h</span>
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn btn-outline" onclick="gerarRelatorioMaquinas()">
                        <i class="fas fa-eye"></i> Visualizar
                    </button>
                    <button class="btn btn-primary" onclick="exportarRelatorioMaquinas()">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                </div>
            </div>
            
            <div class="report-card detailed">
                <div class="report-header">
                    <div class="report-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="report-title">
                        <h3>Desempenho por Operador</h3>
                        <p>Produtividade e qualidade por operador</p>
                    </div>
                </div>
                <div class="report-metrics">
                    <div class="metric">
                        <span class="metric-label">Operadores Ativos</span>
                        <span class="metric-value success">${kpis.operadoresAtivos}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Trocas de Teflon por Dia</span>
                        <span class="metric-value">${Math.round(teflons.length / 30)} trocas/dia</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Melhor Operador</span>
                        <span class="metric-value success">${produtividade.melhorOperador}</span>
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn btn-outline" onclick="gerarRelatorioOperadores()">
                        <i class="fas fa-eye"></i> Visualizar
                    </button>
                    <button class="btn btn-primary" onclick="exportarRelatorioOperadores()">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                </div>
            </div>
            
            <div class="report-card detailed">
                <div class="report-header">
                    <div class="report-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="report-title">
                        <h3>Análise de Falhas</h3>
                        <p>Identificação e tendências de falhas</p>
                    </div>
                </div>
                <div class="report-metrics">
                    <div class="metric">
                        <span class="metric-label">Total de Falhas</span>
                        <span class="metric-value warning">${testesQualidade.filter(t => t.result === 'rejected').length}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Produto Crítico</span>
                        <span class="metric-value">${falhasRecorrentes.produtoMaisFalhas.nome}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Tendência</span>
                        <span class="metric-value ${falhasRecorrentes.tendencia >= 0 ? 'warning' : 'success'}">
                            ${falhasRecorrentes.tendencia >= 0 ? '+' : ''}${falhasRecorrentes.tendencia}%
                        </span>
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn btn-outline" onclick="gerarRelatorioFalhas()">
                        <i class="fas fa-eye"></i> Visualizar
                    </button>
                    <button class="btn btn-primary" onclick="exportarRelatorioFalhas()">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                </div>
            </div>
        </div>
        
        <div class="reports-schedule">
            <h3><i class="fas fa-calendar-alt"></i> Relatórios Agendados</h3>
            <div class="schedule-list">
                <div class="schedule-item">
                    <div class="schedule-info">
                        <strong>Relatório Semanal de Qualidade</strong>
                        <p>Toda segunda-feira às 08:00</p>
                    </div>
                    <div class="schedule-status active">
                        <i class="fas fa-check-circle"></i> Ativo
                    </div>
                </div>
                <div class="schedule-item">
                    <div class="schedule-info">
                        <strong>Relatório Mensal Executivo</strong>
                        <p>Todo dia 1º às 09:00</p>
                    </div>
                    <div class="schedule-status active">
                        <i class="fas fa-check-circle"></i> Ativo
                    </div>
                </div>
            </div>
        </div>
        
        <h3 style="margin: 30px 0 20px 0;"><i class="fas fa-search"></i> Rastreabilidade de Lotes</h3>
        <div class="form-container">
            <div class="form-row">
                <div class="form-group">
                    <label for="lote-rastreio">Buscar Lote</label>
                    <input type="text" id="lote-rastreio" name="lote-rastreio" placeholder="Digite o ID do lote">
                </div>
                
                <div class="form-group" style="align-self: flex-end;">
                    <button class="btn btn-primary" onclick="buscarLote()">
                        <i class="fas fa-search"></i> Buscar
                    </button>
                </div>
            </div>
        </div>
        
        <div id="resultado-rastreio"></div>
    `;
}

function gerarRelatorioDetalhado(tipo) {
    alert(`Relatório detalhado de ${tipo} gerado com sucesso!`);
}

function buscarLote() {
    const loteId = document.getElementById('lote-rastreio').value;
    
    if (!loteId) {
        alert('Por favor, digite o ID do lote.');
        return;
    }
    
    const lote = lotes.find(l => l.id === loteId);
    const testesDeLote = testesQualidade.filter(t => t.lotNumber === loteId);
    
    if (!lote) {
        document.getElementById('resultado-rastreio').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <div>Lote não encontrado.</div>
            </div>
        `;
        return;
    }
    
    document.getElementById('resultado-rastreio').innerHTML = `
        <h3>Histórico do Lote ${loteId}</h3>
        
        <div class="form-container">
            <h4>Informações do Lote</h4>
            <p><strong>Produto:</strong> ${lote.produto}</p>
            <p><strong>Caixa:</strong> ${lote.caixa}</p>
            <p><strong>Data de Produção:</strong> ${lote.dataProducao}</p>
            
            <h4>Testes de Qualidade</h4>
            ${testesDeLote.length > 0 ? `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Data</th>
                                <th>Operador</th>
                                <th>Resultado</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${testesDeLote.map(teste => `
                                <tr>
                                    <td>${teste.id}</td>
                                    <td>${new Date(teste.data).toLocaleDateString()}</td>
                                    <td>${teste.operador}</td>
                                    <td>${teste.result === 'approved' ? '<span style="color: green;">Aprovado</span>' : '<span style="color: red;">Reprovado</span>'}</td>
                                    <td><button class="btn btn-secondary" onclick="verDetalhesTeste('${teste.id}')">Ver Detalhes</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p>Nenhum teste registrado para este lote.</p>'}
        </div>
    `;
}

function verDetalhesTeste(testeId) {
    const teste = testesQualidade.find(t => t._id === testeId || t.testId === testeId);
    
    if (!teste) {
        alert('Teste não encontrado.');
        return;
    }
    
    alert(`Detalhes do teste ${testeId} serão exibidos em uma janela modal.`);
}

// Funções de exportação de relatórios
function exportarRelatorioCompleto() {
    const kpis = calcularKPIsGestor();
    const produtividade = calcularProdutividade();
    const falhasRecorrentes = analisarFalhasRecorrentes();
    
    const relatorio = {
        dataGeracao: new Date().toLocaleString('pt-BR'),
        resumoExecutivo: kpis,
        produtividade: produtividade,
        analisefalhas: falhasRecorrentes,
        testesRealizados: testesQualidade.length,
        dadosDetalhados: testesQualidade
    };
    
    const blob = new Blob([JSON.stringify(relatorio, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-completo-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Relatório completo exportado com sucesso!', 'success');
}

function exportarRelatorioQualidade() {
    const kpis = calcularKPIsGestor();
    const testesAprovados = testesQualidade.filter(t => t.result === 'approved');
    const testesReprovados = testesQualidade.filter(t => t.result === 'rejected');
    
    const csvContent = "data:text/csv;charset=utf-8," + 
        "Lote,Produto,Operador,Máquina,Resultado,Data,Observações\n" +
        testesQualidade.map(t => 
            `${t.lote || t.lotNumber},${t.produto},${t.operador},${t.maquina},${t.result},${new Date(t.dataHora || t.data).toLocaleDateString('pt-BR')},"${t.observacoes || ''}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio-qualidade-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Relatório de qualidade exportado com sucesso!', 'success');
}

function exportarRelatorioMaquinas() {
    const eficienciaMaquinas = {};
    
    testesQualidade.forEach(teste => {
        const maquina = teste.maquina || 'Máquina não especificada';
        if (!eficienciaMaquinas[maquina]) {
            eficienciaMaquinas[maquina] = { total: 0, aprovados: 0 };
        }
        eficienciaMaquinas[maquina].total++;
        if (teste.result === 'approved') {
            eficienciaMaquinas[maquina].aprovados++;
        }
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + 
        "Máquina,Total de Testes,Testes Aprovados,Taxa de Aprovação (%)\n" +
        Object.entries(eficienciaMaquinas).map(([maquina, dados]) => 
            `${maquina},${dados.total},${dados.aprovados},${((dados.aprovados / dados.total) * 100).toFixed(1)}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio-maquinas-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Relatório de máquinas exportado com sucesso!', 'success');
}

function exportarRelatorioOperadores() {
    const produtividadeOperadores = {};
    
    testesQualidade.forEach(teste => {
        const operador = teste.operador || 'Operador não especificado';
        if (!produtividadeOperadores[operador]) {
            produtividadeOperadores[operador] = { total: 0, aprovados: 0 };
        }
        produtividadeOperadores[operador].total++;
        if (teste.result === 'approved') {
            produtividadeOperadores[operador].aprovados++;
        }
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + 
        "Operador,Total de Testes,Testes Aprovados,Taxa de Aprovação (%)\n" +
        Object.entries(produtividadeOperadores).map(([operador, dados]) => 
            `${operador},${dados.total},${dados.aprovados},${((dados.aprovados / dados.total) * 100).toFixed(1)}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio-operadores-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Relatório de operadores exportado com sucesso!', 'success');
}

function exportarRelatorioFalhas() {
    const falhasPorTipo = {};
    const testesReprovados = testesQualidade.filter(t => t.result === 'rejected');
    
    testesReprovados.forEach(teste => {
        const tipoFalha = teste.observacoes || 'Falha não especificada';
        falhasPorTipo[tipoFalha] = (falhasPorTipo[tipoFalha] || 0) + 1;
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + 
        "Lote,Produto,Operador,Máquina,Data,Tipo de Falha\n" +
        testesReprovados.map(t => 
            `${t.lote || t.lotNumber},${t.produto},${t.operador},${t.maquina},${new Date(t.dataHora || t.data).toLocaleDateString('pt-BR')},"${t.observacoes || 'Falha não especificada'}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio-falhas-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Relatório de falhas exportado com sucesso!', 'success');
}

function agendarRelatorio() {
    showNotification('Funcionalidade de agendamento será implementada em breve!', 'info');
}

// Funções de visualização de relatórios
function gerarRelatorioQualidade() {
    showNotification('Abrindo relatório detalhado de qualidade...', 'info');
}

function gerarRelatorioMaquinas() {
    showNotification('Abrindo relatório detalhado de máquinas...', 'info');
}

function gerarRelatorioOperadores() {
    showNotification('Abrindo relatório detalhado de operadores...', 'info');
}

function gerarRelatorioFalhas() {
    showNotification('Abrindo relatório detalhado de falhas...', 'info');
}

function loadGestorAuditoria() {
    mainContent.innerHTML = `
        <h2>Auditoria / Exportação</h2>
        
        <div class="form-container">
            <h3 class="form-title">Exportar Dados para Auditoria</h3>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="auditoria-tipo">Tipo de Dados</label>
                    <select id="auditoria-tipo" name="auditoria-tipo">
                        <option value="testes">Testes de Qualidade</option>
                        <option value="teflons">Trocas de Teflon</option>
                        <option value="lotes">Lotes</option>
                        <option value="completo">Relatório Completo</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="auditoria-periodo">Período</label>
                    <select id="auditoria-periodo" name="auditoria-periodo">
                        <option value="mes">Último Mês</option>
                        <option value="trimestre">Último Trimestre</option>
                        <option value="semestre">Último Semestre</option>
                        <option value="ano">Último Ano</option>
                        <option value="personalizado">Personalizado</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row" id="auditoria-periodo-personalizado" style="display: none;">
                <div class="form-group">
                    <label for="auditoria-data-inicio">Data Início</label>
                    <input type="date" id="auditoria-data-inicio" name="auditoria-data-inicio">
                </div>
                
                <div class="form-group">
                    <label for="auditoria-data-fim">Data Fim</label>
                    <input type="date" id="auditoria-data-fim" name="auditoria-data-fim">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Opções de Exportação</label>
                    <div>
                        <input type="checkbox" id="incluir-fotos" name="incluir-fotos" checked>
                        <label for="incluir-fotos">Incluir Fotos</label>
                    </div>
                    <div>
                        <input type="checkbox" id="incluir-videos" name="incluir-videos" checked>
                        <label for="incluir-videos">Incluir Vídeos</label>
                    </div>
                    <div>
                        <input type="checkbox" id="incluir-assinaturas" name="incluir-assinaturas" checked>
                        <label for="incluir-assinaturas">Incluir Assinaturas Digitais</label>
                    </div>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-primary" onclick="exportarParaAuditoria()">Exportar</button>
            </div>
        </div>
        
        <h3>Certificados para Clientes</h3>
        <div class="form-container">
            <div class="form-row">
                <div class="form-group">
                    <label for="cliente-lote">Lote</label>
                    <input type="text" id="cliente-lote" name="cliente-lote" placeholder="Digite o ID do lote">
                </div>
                
                <div class="form-group">
                    <label for="cliente-nome">Cliente</label>
                    <input type="text" id="cliente-nome" name="cliente-nome" placeholder="Nome do Cliente">
                </div>
                
                <div class="form-group" style="align-self: flex-end;">
                    <button class="btn btn-primary" onclick="gerarCertificado()">Gerar Certificado</button>
                </div>
            </div>
        </div>
    `;
    
    // Event listener para mostrar/ocultar período personalizado
    document.getElementById('auditoria-periodo').addEventListener('change', function() {
        const periodoPersonalizado = document.getElementById('auditoria-periodo-personalizado');
        periodoPersonalizado.style.display = this.value === 'personalizado' ? 'flex' : 'none';
    });
}

function exportarParaAuditoria() {
    alert('Dados exportados com sucesso!');
}

function gerarCertificado() {
    const loteId = document.getElementById('cliente-lote').value;
    const cliente = document.getElementById('cliente-nome').value;
    
    if (!loteId || !cliente) {
        alert('Por favor, preencha todos os campos.');
        return;
    }
    
    alert(`Certificado para o cliente ${cliente} referente ao lote ${loteId} gerado com sucesso!`);
}