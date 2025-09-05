// Dashboard Manager JavaScript
let dashboardData = null;
let machinesData = null;
let charts = {};
let refreshInterval = null;
let sseEventSource = null;
let sseConnected = false;
let sseReconnectAttempts = 0;
let maxReconnectAttempts = 5;

// Inicialização do dashboard
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando Dashboard Manager...');
    console.log('📍 DOM carregado, verificando autenticação...');
    
    // Verificar autenticação
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!token || user.role !== 'manager') {
        console.log('❌ Usuário não é gestor, redirecionando...');
        alert('Acesso negado. Apenas gestores podem acessar este dashboard.');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('✅ Usuário autenticado como gestor');
    
    // Configurar nome do usuário
    document.getElementById('userName').textContent = user.name || user.username || 'Gestor';
    
    console.log('✅ Autenticação verificada:', { token: !!token, user: user.role, name: user.name });
    
    // Mostrar skeleton loading
    showSkeletonLoading();
    
    // Configurar event listeners
    console.log('🔧 Configurando event listeners...');
    setupEventListeners();
    
    // Carregar dados iniciais
    console.log('📊 Carregando dados iniciais do dashboard...');
    await loadDashboardData();
    
    // Inicializar SSE para monitoramento em tempo real
    console.log('🔄 Inicializando SSE...');
    initializeSSE();
    
    // Configurar atualização automática como fallback (a cada 60 segundos)
    console.log('⏰ Configurando atualização automática (60s)...');
    refreshInterval = setInterval(async () => {
        if (!sseConnected) {
            await loadMachinesStatus();
        }
    }, 60000);
    
    console.log('✅ Dashboard Manager inicializado com sucesso!');
});

// Configurar event listeners
function setupEventListeners() {
    // Seletor de período
    document.getElementById('periodSelect').addEventListener('change', async function() {
        await loadDashboardData();
    });
    
    // Botão de atualizar
    document.getElementById('refreshBtn').addEventListener('click', async function() {
        await loadDashboardData();
    });
    
    // Filtros de máquinas
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover classe active de todos os botões
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            // Adicionar classe active ao botão clicado
            this.classList.add('active');
            
            // Filtrar máquinas
            const filter = this.dataset.filter;
            filterMachines(filter);
        });
    });
}

// Carregar dados do dashboard
async function loadDashboardData() {
    console.log('🔄 Iniciando carregamento dos dados do dashboard...');
    showLoading(true);
    
    try {
        const period = document.getElementById('periodSelect').value;
        console.log('📅 Período selecionado:', period);
        
        // Carregar dados do dashboard
        console.log('🌐 Fazendo requisição para /dashboard/manager...');
        const response = await apiRequest(`/dashboard/manager?period=${period}`);
        console.log('📊 Resposta do dashboard manager:', response);
        
        if (response && response.data) {
            dashboardData = response.data;
            console.log('✅ Dados do dashboard carregados:', dashboardData);
            
            console.log('🔄 Atualizando KPIs...');
            console.log('📊 KPIs recebidos:', dashboardData.kpis);
            updateKPIs(dashboardData.kpis);
            
            console.log('🔄 Atualizando gráficos...');
            updateCharts(dashboardData);
            
            console.log('🔄 Atualizando alertas...');
            console.log('🚨 Alertas recebidos:', dashboardData.criticalAlerts);
            updateAlerts(dashboardData.criticalAlerts);
        } else {
            console.error('❌ Resposta do dashboard inválida:', response);
            showError('Erro ao carregar dados do dashboard. Resposta inválida do servidor.');
        }
        
        // Carregar status das máquinas
        console.log('🔄 Carregando status das máquinas...');
        await loadMachinesStatus();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados do dashboard:', error);
        console.error('Stack trace:', error.stack);
        showError(`Erro ao carregar dashboard: ${error.message}`);
    } finally {
        console.log('🔄 Removendo overlay de carregamento...');
        showLoading(false);
        console.log('✅ Carregamento finalizado');
    }
}

// Carregar status das máquinas
async function loadMachinesStatus() {
    try {
        console.log('🔄 Fazendo requisição para /dashboard/machines/status...');
        const response = await apiRequest('/dashboard/machines/status');
        console.log('🏭 Resposta das máquinas:', response);
        
        if (response && response.data) {
            machinesData = response.data;
            console.log('✅ Dados das máquinas carregados:', machinesData.length, 'máquinas');
            updateMachinesGrid(machinesData);
        } else {
            console.warn('⚠️ Resposta das máquinas inválida:', response);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar status das máquinas:', error);
    }
}

// Atualizar KPIs
function updateKPIs(kpis) {
    console.log('📊 Iniciando atualização dos KPIs:', kpis);
    
    const elements = {
        totalTests: document.getElementById('totalTests'),
        completionRate: document.getElementById('completionRate'),
        approvalRate: document.getElementById('approvalRate'),
        productivity: document.getElementById('productivity'),
        machineUtilization: document.getElementById('machineUtilization'),
        avgDuration: document.getElementById('avgDuration')
    };
    
    // Verificar se todos os elementos existem
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`❌ Elemento '${key}' não encontrado no DOM!`);
        } else {
            console.log(`✅ Elemento '${key}' encontrado`);
        }
    }
    
    // Remover skeleton loading e atualizar valores
    if (elements.totalTests) {
        elements.totalTests.innerHTML = '';
        elements.totalTests.textContent = kpis.totalTests || 0;
    }
    if (elements.completionRate) {
        elements.completionRate.innerHTML = '';
        elements.completionRate.textContent = `${(kpis.completionRate || 0).toFixed(1)}%`;
    }
    if (elements.approvalRate) {
        elements.approvalRate.innerHTML = '';
        elements.approvalRate.textContent = `${(kpis.approvalRate || 0).toFixed(1)}%`;
    }
    if (elements.productivity) {
        elements.productivity.innerHTML = '';
        elements.productivity.textContent = (kpis.productivity || 0).toFixed(1);
    }
    if (elements.machineUtilization) {
        elements.machineUtilization.innerHTML = '';
        elements.machineUtilization.textContent = `${(kpis.machineUtilization || 0).toFixed(1)}%`;
    }
    if (elements.avgDuration) {
        elements.avgDuration.innerHTML = '';
        elements.avgDuration.textContent = `${Math.round((kpis.avgTestDuration || 0) / 60)} min`;
    }
    
    console.log('✅ KPIs atualizados com sucesso');
}

// Atualizar gráficos
function updateCharts(data) {
    updateTrendsChart(data.dailyTrends);
    updateMachinePerformanceChart(data.machinePerformance);
    updateOperatorPerformanceChart(data.operatorPerformance);
    updateMachineStatusChart(data.machineStats);
}

// Gráfico de tendências diárias
function updateTrendsChart(dailyTrends) {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    
    if (charts.trends) {
        charts.trends.destroy();
    }
    
    const labels = dailyTrends.map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    const testsData = dailyTrends.map(d => d.totalTests);
    const approvalData = dailyTrends.map(d => d.approvalRate);
    
    charts.trends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Testes Realizados',
                data: testsData,
                borderColor: '#000688',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'Taxa de Aprovação (%)',
                data: approvalData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                yAxisID: 'y1'
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
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Número de Testes'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Taxa de Aprovação (%)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

// Gráfico de performance por máquina
function updateMachinePerformanceChart(machinePerformance) {
    const ctx = document.getElementById('machineChart').getContext('2d');
    
    if (charts.machine) {
        charts.machine.destroy();
    }
    
    const labels = machinePerformance.slice(0, 8).map(m => m.machineName);
    const approvalRates = machinePerformance.slice(0, 8).map(m => m.approvalRate);
    
    charts.machine = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Taxa de Aprovação (%)',
                data: approvalRates,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: '#000688',
                borderWidth: 1
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
                    title: {
                        display: true,
                        text: 'Taxa de Aprovação (%)'
                    }
                }
            }
        }
    });
}

// Gráfico de performance por operador
function updateOperatorPerformanceChart(operatorPerformance) {
    const ctx = document.getElementById('operatorChart').getContext('2d');
    
    if (charts.operator) {
        charts.operator.destroy();
    }
    
    const labels = operatorPerformance.slice(0, 8).map(o => o.operatorName);
    const approvalRates = operatorPerformance.slice(0, 8).map(o => o.approvalRate);
    
    charts.operator = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Taxa de Aprovação (%)',
                data: approvalRates,
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: '#10b981',
                borderWidth: 1
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
                    title: {
                        display: true,
                        text: 'Taxa de Aprovação (%)'
                    }
                }
            }
        }
    });
}

// Gráfico de status das máquinas
function updateMachineStatusChart(machineStats) {
    const ctx = document.getElementById('machineStatusChart').getContext('2d');
    
    if (charts.machineStatus) {
        charts.machineStatus.destroy();
    }
    
    charts.machineStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ativas', 'Inativas', 'Manutenção'],
            datasets: [{
                data: [
                    machineStats.active,
                    machineStats.inactive,
                    machineStats.needMaintenance
                ],
                backgroundColor: [
                    '#10b981',
                    '#ef4444',
                    '#f59e0b'
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
                    position: 'bottom'
                }
            }
        }
    });
}

// Atualizar grid de máquinas
function updateMachinesGrid(machines) {
    console.log('🔄 Atualizando grid de máquinas com', machines.length, 'máquinas');
    console.log('🏭 Dados das máquinas:', machines);
    
    const grid = document.getElementById('machinesGrid');
    
    if (!grid) {
        console.error('❌ Elemento machinesGrid não encontrado!');
        return;
    }
    
    console.log('✅ Elemento machinesGrid encontrado');
    grid.innerHTML = '';
    
    if (!machines || machines.length === 0) {
        console.warn('⚠️ Nenhuma máquina para exibir');
        grid.innerHTML = '<div class="no-data">Nenhuma máquina encontrada</div>';
        return;
    }
    
    machines.forEach((machine, index) => {
        console.log(`🏭 Criando card para máquina ${index + 1}:`, machine.name, machine);
        try {
            const card = createMachineCard(machine);
            grid.appendChild(card);
            console.log(`✅ Card da máquina ${machine.name} criado com sucesso`);
        } catch (error) {
            console.error(`❌ Erro ao criar card da máquina ${machine.name}:`, error);
        }
    });
    
    console.log('✅ Grid de máquinas atualizado com', machines.length, 'cards');
}

// Criar card de máquina
function createMachineCard(machine) {
    const card = document.createElement('div');
    card.className = `machine-card ${machine.operationalStatus}`;
    card.dataset.status = machine.operationalStatus;
    
    const statusText = {
        'testing': 'Em Teste',
        'idle': 'Ociosa',
        'offline': 'Offline',
        'maintenance': 'Manutenção'
    };
    
    const statusIcon = {
        'testing': '🔄',
        'idle': '⏸️',
        'offline': '❌',
        'maintenance': '🔧'
    };
    
    let testInfo = '';
    if (machine.currentTest) {
        const duration = Math.floor(machine.currentTest.duration / 60);
        testInfo = `
            <div class="test-info">
                <span>Operador: ${machine.currentTest.operator}</span>
                <span>Duração: ${duration}min</span>
            </div>
        `;
    } else if (machine.lastTest) {
        const lastTestDate = new Date(machine.lastTest.createdAt).toLocaleDateString('pt-BR');
        testInfo = `
            <div class="test-info">
                <span>Último teste: ${lastTestDate}</span>
                <span>Resultado: ${machine.lastTest.result === 'approved' ? '✅' : '❌'}</span>
            </div>
        `;
    }
    
    let teflonInfo = '';
    if (machine.teflonStatus) {
        const daysLeft = machine.teflonStatus.daysUntilExpiration;
        const teflonClass = daysLeft <= 7 ? 'critical' : daysLeft <= 15 ? 'warning' : 'ok';
        teflonInfo = `
            <div class="teflon-info ${teflonClass}">
                <span>Teflon: ${daysLeft > 0 ? `${daysLeft} dias` : 'Vencido'}</span>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="machine-header">
            <div class="machine-name">
                <h4>${machine.name}</h4>
                <span class="machine-code">${machine.code}</span>
            </div>
            <div class="machine-status">
                <span class="status-icon">${statusIcon[machine.operationalStatus]}</span>
                <span class="status-text">${statusText[machine.operationalStatus]}</span>
            </div>
        </div>
        <div class="machine-details">
            <div class="machine-location">
                <span>📍 ${machine.location}</span>
            </div>
            ${testInfo}
            ${teflonInfo}
        </div>
    `;
    
    return card;
}

// Filtrar máquinas
function filterMachines(filter) {
    const cards = document.querySelectorAll('.machine-card');
    
    cards.forEach(card => {
        if (filter === 'all' || card.dataset.status === filter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Atualizar alertas
function updateAlerts(alerts) {
    document.getElementById('delayedTestsCount').textContent = alerts.delayedTests || 0;
    document.getElementById('expiredTeflonCount').textContent = alerts.expiredTeflon || 0;
    document.getElementById('inactiveMachinesCount').textContent = alerts.inactiveMachines || 0;
    document.getElementById('maintenanceCount').textContent = alerts.maintenanceNeeded || 0;
    
    // Atualizar classes dos alertas baseado na severidade
    updateAlertSeverity('delayedTestsAlert', alerts.delayedTests);
    updateAlertSeverity('expiredTeflonAlert', alerts.expiredTeflon);
    updateAlertSeverity('inactiveMachinesAlert', alerts.inactiveMachines);
    updateAlertSeverity('maintenanceAlert', alerts.maintenanceNeeded);
}

// Atualizar severidade do alerta
function updateAlertSeverity(alertId, count) {
    const alert = document.getElementById(alertId);
    alert.classList.remove('critical', 'warning', 'info');
    
    if (count > 5) {
        alert.classList.add('critical');
    } else if (count > 0) {
        alert.classList.add('warning');
    } else {
        alert.classList.add('info');
    }
}

// Mostrar skeleton loading
function showSkeletonLoading() {
    console.log('🔄 Mostrando skeleton loading...');
    
    // Mostrar skeleton nos KPIs
    const kpiElements = [
        'totalTests', 'completionRate', 'approvalRate', 
        'productivity', 'machineUtilization', 'avgDuration'
    ];
    
    kpiElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '<div class="skeleton-text"></div>';
        }
    });
    
    // Mostrar skeleton nos alertas
    const alertElements = [
        'delayedTestsCount', 'expiredTeflonCount', 
        'inactiveMachinesCount', 'maintenanceCount'
    ];
    
    alertElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '<div class="skeleton-text"></div>';
        }
    });
    
    // Mostrar skeleton no grid de máquinas
    const machinesGrid = document.getElementById('machinesGrid');
    if (machinesGrid) {
        machinesGrid.innerHTML = Array(6).fill(0).map(() => `
            <div class="machine-card skeleton">
                <div class="machine-header">
                    <div class="machine-name">
                        <div class="skeleton-text"></div>
                        <div class="skeleton-text small"></div>
                    </div>
                    <div class="skeleton-text small"></div>
                </div>
                <div class="machine-details">
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text"></div>
                </div>
            </div>
        `).join('');
    }
    
    console.log('✅ Skeleton loading exibido');
}

// Mostrar/ocultar loading
function showLoading(show) {
    console.log(`🔄 ${show ? 'Mostrando' : 'Ocultando'} overlay de carregamento...`);
    const overlay = document.getElementById('loadingOverlay');
    
    if (!overlay) {
        console.error('❌ Elemento loadingOverlay não encontrado!');
        return;
    }
    
    overlay.style.display = show ? 'flex' : 'none';
    console.log(`✅ Overlay ${show ? 'exibido' : 'ocultado'} com sucesso`);
}

// Mostrar erro
function showError(message) {
    alert(message);
}

// Inicializar conexão SSE
function initializeSSE() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Token não encontrado para SSE');
        return;
    }

    console.log('🔄 Iniciando conexão SSE...');
    
    // Fechar conexão existente se houver
    if (sseEventSource) {
        sseEventSource.close();
    }

    // Criar nova conexão SSE
    sseEventSource = new EventSource(`/api/sse/monitor?token=${token}`);
    
    sseEventSource.onopen = function(event) {
        console.log('✅ SSE conectado com sucesso');
        sseConnected = true;
        sseReconnectAttempts = 0;
        updateConnectionStatus(true);
    };
    
    sseEventSource.onmessage = function(event) {
        console.log('📨 Dados SSE recebidos:', event.data);
        try {
            const data = JSON.parse(event.data);
            handleSSEData('message', data);
        } catch (error) {
            console.error('Erro ao processar dados SSE:', error);
        }
    };
    
    // Eventos específicos
    sseEventSource.addEventListener('initial', function(event) {
        console.log('🎯 Dados iniciais SSE recebidos');
        try {
            const data = JSON.parse(event.data);
            handleSSEData('initial', data);
        } catch (error) {
            console.error('Erro ao processar dados iniciais SSE:', error);
        }
    });
    
    sseEventSource.addEventListener('update', function(event) {
        try {
            const data = JSON.parse(event.data);
            handleSSEData('update', data);
        } catch (error) {
            console.error('Erro ao processar atualização SSE:', error);
        }
    });
    
    sseEventSource.addEventListener('event', function(event) {
        try {
            const data = JSON.parse(event.data);
            handleSSEData('event', data);
        } catch (error) {
            console.error('Erro ao processar evento SSE:', error);
        }
    });
    
    sseEventSource.addEventListener('heartbeat', function(event) {
        // Heartbeat para manter conexão viva
        console.log('💓 Heartbeat SSE recebido');
    });
    
    sseEventSource.onerror = function(event) {
        console.error('❌ Erro na conexão SSE:', event);
        sseConnected = false;
        updateConnectionStatus(false);
        
        // Tentar reconectar
        if (sseReconnectAttempts < maxReconnectAttempts) {
            sseReconnectAttempts++;
            console.log(`🔄 Tentativa de reconexão SSE ${sseReconnectAttempts}/${maxReconnectAttempts}`);
            setTimeout(() => {
                initializeSSE();
            }, 5000 * sseReconnectAttempts); // Delay progressivo
        } else {
            console.error('❌ Máximo de tentativas de reconexão SSE atingido');
        }
    };
}

// Processar dados recebidos via SSE
function handleSSEData(eventType, data) {
    console.log(`📊 Processando dados SSE (${eventType}):`, data);
    
    if (data.error) {
        console.error('Erro nos dados SSE:', data.error);
        return;
    }
    
    // Atualizar dados do dashboard
    if (data.summary) {
        updateDashboardSummary(data.summary);
    }
    
    if (data.activeTests) {
        updateActiveTestsDisplay(data.activeTests);
    }
    
    if (data.machines) {
        updateMachinesDisplay(data.machines);
    }
    
    if (data.recentActivity) {
        updateRecentActivityDisplay(data.recentActivity);
    }
    
    if (data.alerts) {
        updateAlertsDisplay(data.alerts);
    }
    
    // Atualizar timestamp da última atualização
    if (data.timestamp) {
        updateLastUpdateTime(data.timestamp);
    }
    
    // Processar eventos específicos
    if (eventType === 'event' && data.type) {
        handleSpecificEvent(data.type, data.data);
    }
}

// Atualizar resumo do dashboard
function updateDashboardSummary(summary) {
    // Atualizar cards de estatísticas
    const statsCards = {
        'activeTests': summary.activeTests || 0,
        'overdueTests': summary.overdueTests || 0,
        'activeMachines': summary.activeMachines || 0,
        'onlineUsers': summary.onlineUsers || 0,
        'unreadNotifications': summary.unreadNotifications || 0,
        'teflonsNearExpiry': summary.teflonsNearExpiry || 0
    };
    
    Object.entries(statsCards).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = value;
            
            // Adicionar animação de atualização
            element.classList.add('updated');
            setTimeout(() => element.classList.remove('updated'), 1000);
        }
    });
}

// Atualizar exibição de testes ativos
function updateActiveTestsDisplay(activeTests) {
    const container = document.getElementById('activeTestsContainer');
    if (!container) return;
    
    // Implementar atualização da lista de testes ativos
    console.log('Atualizando testes ativos:', activeTests);
}

// Atualizar exibição de máquinas
function updateMachinesDisplay(machines) {
    const container = document.getElementById('machinesContainer');
    if (!container) return;
    
    // Implementar atualização da lista de máquinas
    console.log('Atualizando máquinas:', machines);
}

// Atualizar exibição de atividade recente
function updateRecentActivityDisplay(recentActivity) {
    const container = document.getElementById('recentActivityContainer');
    if (!container) return;
    
    // Implementar atualização da atividade recente
    console.log('Atualizando atividade recente:', recentActivity);
}

// Atualizar exibição de alertas
function updateAlertsDisplay(alerts) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    
    // Implementar atualização de alertas
    console.log('Atualizando alertas:', alerts);
    
    // Mostrar notificações para alertas críticos
    if (alerts.overdueTests && alerts.overdueTests.length > 0) {
        showNotification('Atenção: Testes em atraso detectados!', 'warning');
    }
    
    if (alerts.teflonsNearExpiry && alerts.teflonsNearExpiry.length > 0) {
        showNotification('Atenção: Teflons próximos ao vencimento!', 'warning');
    }
}

// Processar eventos específicos
function handleSpecificEvent(eventType, eventData) {
    console.log(`🎯 Evento específico recebido: ${eventType}`, eventData);
    
    switch (eventType) {
        case 'test_overdue':
            showNotification('Teste em atraso detectado!', 'error');
            break;
        case 'test_completed':
            showNotification('Teste concluído com sucesso!', 'success');
            break;
        case 'machine_offline':
            showNotification('Máquina ficou offline!', 'warning');
            break;
        case 'teflon_expired':
            showNotification('Teflon vencido detectado!', 'error');
            break;
        default:
            console.log('Evento não reconhecido:', eventType);
    }
}

// Atualizar status da conexão
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.className = connected ? 'connected' : 'disconnected';
        statusElement.textContent = connected ? 'Conectado' : 'Desconectado';
    }
}

// Atualizar timestamp da última atualização
function updateLastUpdateTime(timestamp) {
    const element = document.getElementById('lastUpdateTime');
    if (element) {
        const date = new Date(timestamp);
        element.textContent = `Última atualização: ${date.toLocaleTimeString()}`;
    }
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Adicionar ao container de notificações
    const container = document.getElementById('notificationsContainer') || document.body;
    container.appendChild(notification);
    
    // Remover após 5 segundos
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Fechar conexão SSE
function closeSSE() {
    if (sseEventSource) {
        console.log('🔌 Fechando conexão SSE');
        sseEventSource.close();
        sseEventSource = null;
        sseConnected = false;
    }
}

// Logout
function logout() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    closeSSE();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Cleanup ao sair da página
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Fechar conexão SSE
    closeSSE();
    
    // Destruir gráficos
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
});