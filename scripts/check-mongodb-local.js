#!/usr/bin/env node

/**
 * Script para verificar se MongoDB local está configurado e funcionando
 * Uso: node scripts/check-mongodb-local.js
 */

const { exec } = require('child_process');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
  subtitle: (msg) => console.log(`${colors.magenta}${msg}${colors.reset}`)
};

async function checkMongoDBService() {
  return new Promise((resolve) => {
    exec('sc query MongoDB', (error, stdout, stderr) => {
      if (error) {
        resolve({ running: false, error: error.message });
        return;
      }
      
      const isRunning = stdout.includes('RUNNING');
      resolve({ running: isRunning, output: stdout });
    });
  });
}

async function checkMongoDBVersion() {
  return new Promise((resolve) => {
    exec('mongod --version', (error, stdout, stderr) => {
      if (error) {
        resolve({ installed: false, error: error.message });
        return;
      }
      
      const versionMatch = stdout.match(/db version v([\d\.]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      resolve({ installed: true, version, output: stdout });
    });
  });
}

async function checkMongoDBConnection(uri) {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    const db = mongoose.connection.db;
    const admin = db.admin();
    const status = await admin.serverStatus();
    
    await mongoose.disconnect();
    
    return {
      connected: true,
      host: status.host,
      version: status.version,
      uptime: status.uptime
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  const envExists = fs.existsSync(envPath);
  const envExampleExists = fs.existsSync(envExamplePath);
  
  let mongoUri = null;
  if (envExists) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
    mongoUri = uriMatch ? uriMatch[1].trim() : null;
  }
  
  return {
    envExists,
    envExampleExists,
    mongoUri
  };
}

function checkPortAvailability(port = 27017) {
  return new Promise((resolve) => {
    exec(`netstat -an | findstr :${port}`, (error, stdout, stderr) => {
      if (error) {
        resolve({ available: true, error: null });
        return;
      }
      
      const isListening = stdout.includes('LISTENING');
      resolve({ available: !isListening, listening: isListening, output: stdout });
    });
  });
}

async function main() {
  log.title('🔍 VERIFICAÇÃO MONGODB LOCAL - SISTEMA ZARA QUALITY');
  
  // 1. Verificar se MongoDB está instalado
  log.subtitle('\n1. Verificando instalação do MongoDB...');
  const versionCheck = await checkMongoDBVersion();
  
  if (versionCheck.installed) {
    log.success(`MongoDB instalado - Versão: ${versionCheck.version}`);
  } else {
    log.error('MongoDB não está instalado ou não está no PATH');
    log.info('Siga o guia em MONGODB-LOCAL-SETUP.md para instalar');
    return;
  }
  
  // 2. Verificar serviço do MongoDB
  log.subtitle('\n2. Verificando serviço do MongoDB...');
  const serviceCheck = await checkMongoDBService();
  
  if (serviceCheck.running) {
    log.success('Serviço MongoDB está rodando');
  } else {
    log.error('Serviço MongoDB não está rodando');
    log.info('Execute: net start MongoDB (como administrador)');
  }
  
  // 3. Verificar porta 27017
  log.subtitle('\n3. Verificando porta 27017...');
  const portCheck = await checkPortAvailability();
  
  if (portCheck.listening) {
    log.success('Porta 27017 está sendo usada (MongoDB provavelmente rodando)');
  } else {
    log.warning('Porta 27017 não está sendo usada');
    log.info('MongoDB pode não estar rodando ou usando porta diferente');
  }
  
  // 4. Verificar arquivo .env
  log.subtitle('\n4. Verificando configuração .env...');
  const envCheck = checkEnvFile();
  
  if (envCheck.envExists) {
    log.success('Arquivo .env encontrado');
    if (envCheck.mongoUri) {
      log.info(`URI configurada: ${envCheck.mongoUri}`);
      
      // 5. Testar conexão
      log.subtitle('\n5. Testando conexão com MongoDB...');
      const connectionCheck = await checkMongoDBConnection(envCheck.mongoUri);
      
      if (connectionCheck.connected) {
        log.success('Conexão com MongoDB estabelecida com sucesso!');
        log.info(`Host: ${connectionCheck.host}`);
        log.info(`Versão: ${connectionCheck.version}`);
        log.info(`Uptime: ${Math.floor(connectionCheck.uptime / 60)} minutos`);
      } else {
        log.error('Falha na conexão com MongoDB');
        log.error(`Erro: ${connectionCheck.error}`);
      }
    } else {
      log.warning('MONGODB_URI não encontrada no arquivo .env');
    }
  } else {
    log.warning('Arquivo .env não encontrado');
    if (envCheck.envExampleExists) {
      log.info('Execute: cp .env.example .env');
    } else {
      log.error('Arquivo .env.example também não encontrado');
    }
  }
  
  // 6. Resumo e recomendações
  log.title('\n📋 RESUMO E PRÓXIMOS PASSOS');
  
  if (versionCheck.installed && serviceCheck.running && envCheck.envExists && envCheck.mongoUri) {
    log.success('✅ MongoDB local está configurado e pronto para uso!');
    log.info('\n🚀 Para iniciar o sistema:');
    log.info('   Backend: npm start');
    log.info('   Frontend: cd client && npm run dev');
  } else {
    log.warning('⚠️ Configuração incompleta. Siga os passos:');
    
    if (!versionCheck.installed) {
      log.info('1. Instalar MongoDB Community Server');
      log.info('   Guia: MONGODB-LOCAL-SETUP.md');
    }
    
    if (!serviceCheck.running) {
      log.info('2. Iniciar serviço MongoDB');
      log.info('   Comando: net start MongoDB (como admin)');
    }
    
    if (!envCheck.envExists) {
      log.info('3. Criar arquivo .env');
      log.info('   Comando: cp .env.example .env');
    }
    
    if (!envCheck.mongoUri) {
      log.info('4. Configurar MONGODB_URI no .env');
      log.info('   Exemplo: MONGODB_URI=mongodb://localhost:27017/zaraqualitysystem');
    }
  }
  
  log.title('\n📚 DOCUMENTAÇÃO DISPONÍVEL');
  log.info('• MONGODB-LOCAL-SETUP.md - Guia completo de instalação');
  log.info('• MONGODB-ATLAS-SETUP.md - Alternativa cloud');
  log.info('• DEPLOY-SUMMARY.md - Guia de deploy completo');
  
  console.log('\n');
}

// Executar verificação
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkMongoDBService,
  checkMongoDBVersion,
  checkMongoDBConnection,
  checkEnvFile,
  checkPortAvailability
};