const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
const staticPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(staticPath));

// Rota de status da API
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'API Status - Vercel',
    timestamp: new Date().toISOString(),
    data: {
      api: 'Zara Quality System API',
      version: '1.0.0',
      environment: 'production',
      platform: 'vercel'
    }
  });
});

// Endpoints básicos da API
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalOperations: 0,
      activeOperations: 0,
      completedToday: 0,
      pendingTests: 0,
      machines: {
        active: 0,
        maintenance: 0,
        offline: 0
      }
    }
  });
});

app.get('/api/operation-session/all', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Nenhuma operação encontrada'
  });
});

app.get('/api/quality-tests', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Nenhum teste encontrado'
  });
});

app.post('/api/quality-tests', (req, res) => {
  const { machine, lotNumber, parameters, bathtubTest } = req.body;
  
  if (!machine || !lotNumber) {
    return res.status(400).json({
      success: false,
      message: 'Máquina e número do lote são obrigatórios'
    });
  }
  
  const testId = `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  res.status(201).json({
    success: true,
    data: {
      id: testId,
      testId,
      machine,
      lotNumber,
      parameters: parameters || { temperature: 180, pressure: 2.5, speed: 100 },
      bathtubTest: bathtubTest || { enabled: true, duration: 120 },
      status: 'pending',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    message: 'Teste de qualidade criado com sucesso'
  });
});

app.get('/api/machines', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Máquina 01', status: 'active', location: 'Setor A' },
      { id: 2, name: 'Máquina 02', status: 'active', location: 'Setor A' },
      { id: 3, name: 'Máquina 03', status: 'maintenance', location: 'Setor B' },
      { id: 4, name: 'Máquina 04', status: 'active', location: 'Setor B' },
      { id: 5, name: 'Máquina 05', status: 'offline', location: 'Setor C' }
    ],
    message: 'Máquinas carregadas com sucesso'
  });
});

app.post('/api/operation-session', (req, res) => {
  const { machine, operator, status, startTime } = req.body;
  res.json({
    success: true,
    data: {
      id: Date.now(),
      machine,
      operator,
      status,
      startTime,
      createdAt: new Date().toISOString()
    },
    message: 'Sessão de operação criada com sucesso'
  });
});

app.put('/api/operation-session/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  res.json({
    success: true,
    data: {
      id: parseInt(id),
      ...updateData,
      updatedAt: new Date().toISOString()
    },
    message: 'Sessão de operação atualizada com sucesso'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Usuários de demonstração
  const demoUsers = {
    'operador': { role: 'operator', name: 'Operador Demo' },
    'lider': { role: 'leader', name: 'Líder Demo' },
    'gestor': { role: 'manager', name: 'Gestor Demo' }
  };
  
  if (demoUsers[username] && password === '123456') {
    res.json({
      success: true,
      data: {
        token: 'demo-token-' + Date.now(),
        user: {
          id: Date.now(),
          username,
          ...demoUsers[username]
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Credenciais inválidas'
    });
  }
});

// Rota catch-all para APIs não implementadas (deve vir por último)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado',
    timestamp: new Date().toISOString()
  });
});

// Servir o frontend para todas as outras rotas
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        message: 'Página não encontrada',
        error: 'Frontend não encontrado'
      });
    }
  });
});

module.exports = app;