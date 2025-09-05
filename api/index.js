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

// Rota básica da API (placeholder)
app.get('/api/*', (req, res) => {
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