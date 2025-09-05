#!/usr/bin/env node

/**
 * Script de Verificação - Deploy Ready
 * Verifica se o sistema está pronto para deploy no Render
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeployVerifier {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.success = [];
        this.rootDir = path.join(__dirname, '..');
        this.clientDir = path.join(this.rootDir, 'client');
    }

    log(type, message) {
        const timestamp = new Date().toISOString();
        const prefix = {
            'error': '❌',
            'warning': '⚠️',
            'success': '✅',
            'info': 'ℹ️'
        }[type] || 'ℹ️';
        
        console.log(`${prefix} ${message}`);
        
        if (type === 'error') this.errors.push(message);
        if (type === 'warning') this.warnings.push(message);
        if (type === 'success') this.success.push(message);
    }

    checkFile(filePath, description) {
        if (fs.existsSync(filePath)) {
            this.log('success', `${description} existe`);
            return true;
        } else {
            this.log('error', `${description} não encontrado: ${filePath}`);
            return false;
        }
    }

    checkPackageJson() {
        this.log('info', '🔍 Verificando package.json...');
        
        // Backend package.json
        const backendPkg = path.join(this.rootDir, 'package.json');
        if (this.checkFile(backendPkg, 'Backend package.json')) {
            const pkg = JSON.parse(fs.readFileSync(backendPkg, 'utf8'));
            
            if (pkg.scripts && pkg.scripts.start) {
                this.log('success', 'Script "start" encontrado no backend');
            } else {
                this.log('error', 'Script "start" não encontrado no backend package.json');
            }
            
            if (pkg.engines && pkg.engines.node) {
                this.log('success', `Node.js version especificada: ${pkg.engines.node}`);
            } else {
                this.log('warning', 'Node.js version não especificada em engines');
            }
        }
        
        // Frontend package.json
        const frontendPkg = path.join(this.clientDir, 'package.json');
        if (this.checkFile(frontendPkg, 'Frontend package.json')) {
            const pkg = JSON.parse(fs.readFileSync(frontendPkg, 'utf8'));
            
            if (pkg.scripts && pkg.scripts.build) {
                this.log('success', 'Script "build" encontrado no frontend');
            } else {
                this.log('error', 'Script "build" não encontrado no frontend package.json');
            }
        }
    }

    checkRenderConfig() {
        this.log('info', '🔍 Verificando arquivos render.yaml...');
        
        // Backend render.yaml
        const backendRender = path.join(this.rootDir, 'render.yaml');
        if (this.checkFile(backendRender, 'Backend render.yaml')) {
            const content = fs.readFileSync(backendRender, 'utf8');
            
            if (content.includes('zara-quality-system-2.onrender.com')) {
                this.log('success', 'URL de produção correta no backend render.yaml');
            } else {
                this.log('error', 'URL de produção não encontrada no backend render.yaml');
            }
            
            if (content.includes('MONGODB_URI')) {
                this.log('success', 'MONGODB_URI configurado no render.yaml');
            } else {
                this.log('error', 'MONGODB_URI não encontrado no render.yaml');
            }
        }
        
        // Frontend render.yaml
        const frontendRender = path.join(this.clientDir, 'render.yaml');
        if (this.checkFile(frontendRender, 'Frontend render.yaml')) {
            const content = fs.readFileSync(frontendRender, 'utf8');
            
            if (content.includes('static')) {
                this.log('success', 'Tipo "static" configurado no frontend render.yaml');
            } else {
                this.log('warning', 'Tipo "static" não encontrado no frontend render.yaml');
            }
        }
    }

    checkEnvironmentFiles() {
        this.log('info', '🔍 Verificando arquivos de ambiente...');
        
        // Backend .env.production
        const backendEnvProd = path.join(this.rootDir, '.env.production');
        if (this.checkFile(backendEnvProd, 'Backend .env.production')) {
            const content = fs.readFileSync(backendEnvProd, 'utf8');
            
            if (content.includes('zara-quality-system-2.onrender.com')) {
                this.log('success', 'URLs de produção corretas no .env.production');
            } else {
                this.log('error', 'URLs de produção não encontradas no .env.production');
            }
        }
        
        // Frontend .env
        const frontendEnv = path.join(this.clientDir, '.env');
        if (this.checkFile(frontendEnv, 'Frontend .env')) {
            const content = fs.readFileSync(frontendEnv, 'utf8');
            
            if (content.includes('https://zara-quality-system-2.onrender.com')) {
                this.log('success', 'VITE_API_URL configurado corretamente');
            } else {
                this.log('error', 'VITE_API_URL não aponta para produção');
            }
        }
    }

    checkDependencies() {
        this.log('info', '🔍 Verificando dependências...');
        
        try {
            // Verificar se node_modules existe no backend
            const backendNodeModules = path.join(this.rootDir, 'node_modules');
            if (fs.existsSync(backendNodeModules)) {
                this.log('success', 'node_modules do backend existe');
            } else {
                this.log('warning', 'node_modules do backend não encontrado - execute npm install');
            }
            
            // Verificar se node_modules existe no frontend
            const frontendNodeModules = path.join(this.clientDir, 'node_modules');
            if (fs.existsSync(frontendNodeModules)) {
                this.log('success', 'node_modules do frontend existe');
            } else {
                this.log('warning', 'node_modules do frontend não encontrado - execute npm install');
            }
            
        } catch (error) {
            this.log('error', `Erro ao verificar dependências: ${error.message}`);
        }
    }

    checkGitStatus() {
        this.log('info', '🔍 Verificando status do Git...');
        
        try {
            const status = execSync('git status --porcelain', { encoding: 'utf8' });
            
            if (status.trim() === '') {
                this.log('success', 'Repositório Git limpo - todas as alterações commitadas');
            } else {
                this.log('warning', 'Existem alterações não commitadas:');
                console.log(status);
            }
            
            // Verificar se existe remote
            try {
                const remotes = execSync('git remote -v', { encoding: 'utf8' });
                if (remotes.trim()) {
                    this.log('success', 'Repositório remoto configurado');
                } else {
                    this.log('error', 'Nenhum repositório remoto configurado - necessário para Render');
                }
            } catch (error) {
                this.log('error', 'Erro ao verificar repositório remoto');
            }
            
        } catch (error) {
            this.log('error', `Erro ao verificar Git: ${error.message}`);
        }
    }

    checkDocumentation() {
        this.log('info', '🔍 Verificando documentação...');
        
        const docs = [
            { file: 'DEPLOY-INSTRUCTIONS.md', desc: 'Instruções de deploy' },
            { file: 'MONGODB-ATLAS-SETUP.md', desc: 'Setup do MongoDB Atlas' },
            { file: 'RENDER-DEPLOY-COMPLETE.md', desc: 'Deploy completo no Render' },
            { file: 'README.md', desc: 'README principal' }
        ];
        
        docs.forEach(doc => {
            const filePath = path.join(this.rootDir, doc.file);
            this.checkFile(filePath, doc.desc);
        });
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RELATÓRIO DE VERIFICAÇÃO - DEPLOY READY');
        console.log('='.repeat(60));
        
        console.log(`\n✅ Sucessos: ${this.success.length}`);
        console.log(`⚠️  Avisos: ${this.warnings.length}`);
        console.log(`❌ Erros: ${this.errors.length}`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ ERROS CRÍTICOS:');
            this.errors.forEach(error => console.log(`   • ${error}`));
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️  AVISOS:');
            this.warnings.forEach(warning => console.log(`   • ${warning}`));
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (this.errors.length === 0) {
            console.log('🎉 SISTEMA PRONTO PARA DEPLOY NO RENDER!');
            console.log('\n📋 Próximos passos:');
            console.log('1. Configure MongoDB Atlas (veja MONGODB-ATLAS-SETUP.md)');
            console.log('2. Crie repositório público no GitHub');
            console.log('3. Faça deploy no Render (veja RENDER-DEPLOY-COMPLETE.md)');
            return true;
        } else {
            console.log('🚨 CORRIJA OS ERROS ANTES DO DEPLOY!');
            return false;
        }
    }

    async run() {
        console.log('🚀 Iniciando verificação de deploy...');
        console.log('='.repeat(60));
        
        this.checkPackageJson();
        this.checkRenderConfig();
        this.checkEnvironmentFiles();
        this.checkDependencies();
        this.checkGitStatus();
        this.checkDocumentation();
        
        return this.generateReport();
    }
}

// Executar verificação
if (require.main === module) {
    const verifier = new DeployVerifier();
    verifier.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Erro durante verificação:', error);
        process.exit(1);
    });
}

module.exports = DeployVerifier;