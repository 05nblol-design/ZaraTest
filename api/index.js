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

// Rota básica da API (placeholder para outras rotas)
app.get('/api/*', (req, res) => {
  res.status(503).json({
    success: false,
    message: 'API em manutenção - funcionalidades completas em breve',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/*', (req, res) => {
  res.status(503).json({
    success: false,
    message: 'API em manutenção - funcionalidades completas em breve',
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