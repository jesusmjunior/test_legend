// config.js - Configuração REAL JESUS IA
// SEM MODO DEMO - Apenas Backend Real

(function() {
    'use strict';

    // === DETECÇÃO DE AMBIENTE ===
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'file:';

    const isGitHub = window.location.hostname.includes('github.io') || 
                     window.location.hostname.includes('pages.dev');

    // === CONFIGURAÇÕES REAIS ===
    const configs = {
        // Configuração local - Backend REAL
        local: {
            apiUrl: 'http://localhost:3000/api',
            socketUrl: 'http://localhost:3000',
            features: {
                realBackend: true,
                websocket: true,
                scraping: true,  // SCRAPING REAL
                geminiAI: true,  // GEMINI REAL
                authentication: true,
                cache: true
            },
            sites: [
                { name: '1337x', url: 'https://1337x.to', active: true },
                { name: 'YTS', url: 'https://yts.mx', active: true },
                { name: 'RARBG', url: 'https://rarbgmirror.org', active: true },
                { name: 'LimeTorrents', url: 'https://www.limetorrents.lol', active: true },
                { name: 'TorrentGalaxy', url: 'https://torrentgalaxy.to', active: true }
            ],
            fallback: false
        },

        // Configuração produção - Backend REAL
        production: {
            apiUrl: window.location.origin + '/api',
            socketUrl: window.location.origin,
            features: {
                realBackend: true,
                websocket: true,
                scraping: true,  // SCRAPING REAL
                geminiAI: true,  // GEMINI REAL
                authentication: true,
                cache: true
            },
            sites: [
                { name: '1337x', url: 'https://1337x.to', active: true },
                { name: 'YTS', url: 'https://yts.mx', active: true },
                { name: 'RARBG', url: 'https://rarbgmirror.org', active: true },
                { name: 'LimeTorrents', url: 'https://www.limetorrents.lol', active: true },
                { name: 'TorrentGalaxy', url: 'https://torrentgalaxy.to', active: true }
            ],
            fallback: false
        },

        // Erro - GitHub Pages não suportado para backend real
        github: {
            error: true,
            message: 'GitHub Pages não suporta backend real. Use um servidor para funcionalidades completas.',
            redirectUrl: 'https://github.com/[seu-usuario]/jesus-ia#deploy'
        }
    };

    // === SELEÇÃO DE CONFIGURAÇÃO ===
    let selectedConfig;
    let environment;
    
    if (isLocal) {
        selectedConfig = configs.local;
        environment = 'local';
        console.log('🏠 Ambiente: Local - Backend REAL');
    } else if (isGitHub) {
        selectedConfig = configs.github;
        environment = 'github';
        console.log('⚠️ Ambiente: GitHub Pages - Backend REAL requerido');
    } else {
        selectedConfig = configs.production;
        environment = 'production';
        console.log('🚀 Ambiente: Produção - Backend REAL');
    }

    // === VERIFICAÇÃO DE BACKEND REAL ===
    class BackendChecker {
        constructor() {
            this.isBackendAlive = false;
            this.backendVersion = null;
            this.lastCheck = null;
        }

        async checkBackend() {
            if (selectedConfig.error) {
                return false;
            }

            try {
                console.log('🔍 Verificando backend real...');
                
                const response = await fetch(`${selectedConfig.apiUrl}/health`, {
                    method: 'GET',
                    timeout: 5000
                });

                if (response.ok) {
                    const data = await response.json();
                    this.isBackendAlive = true;
                    this.backendVersion = data.version;
                    this.lastCheck = Date.now();
                    
                    console.log('✅ Backend REAL conectado:', data);
                    return true;
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                console.error('❌ Backend REAL não encontrado:', error.message);
                this.isBackendAlive = false;
                return false;
            }
        }

        async waitForBackend(maxWait = 30000) {
            const startTime = Date.now();
            
            while (Date.now() - startTime < maxWait) {
                if (await this.checkBackend()) {
                    return true;
                }
                await this.delay(2000);
                console.log('⏳ Aguardando backend real...');
            }
            
            return false;
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // === AUTHENTICATION MANAGER ===
    class AuthManager {
        constructor() {
            this.token = localStorage.getItem('jesus_ia_token');
            this.user = null;
            this.isAuthenticated = false;
        }

        setToken(token) {
            this.token = token;
            localStorage.setItem('jesus_ia_token', token);
        }

        clearToken() {
            this.token = null;
            localStorage.removeItem('jesus_ia_token');
        }

        getAuthHeaders() {
            return this.token ? {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            } : {
                'Content-Type': 'application/json'
            };
        }

        async login(username, password) {
            try {
                const response = await fetch(`${selectedConfig.apiUrl}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    this.setToken(data.token);
                    this.user = data.user;
                    this.isAuthenticated = true;
                    console.log('✅ Login realizado:', this.user.username);
                    return { success: true, user: this.user };
                } else {
                    throw new Error(data.error || 'Erro no login');
                }
            } catch (error) {
                console.error('❌ Erro login:', error);
                return { success: false, error: error.message };
            }
        }

        logout() {
            this.clearToken();
            this.user = null;
            this.isAuthenticated = false;
            console.log('👋 Logout realizado');
        }

        async checkAuth() {
            if (!this.token) return false;

            try {
                const response = await fetch(`${selectedConfig.apiUrl}/stats`, {
                    headers: this.getAuthHeaders()
                });

                if (response.ok) {
                    this.isAuthenticated = true;
                    return true;
                } else {
                    this.logout();
                    return false;
                }
            } catch (error) {
                this.logout();
                return false;
            }
        }
    }

    // === REAL API CLIENT ===
    class RealAPIClient {
        constructor() {
            this.baseUrl = selectedConfig.apiUrl;
            this.auth = new AuthManager();
        }

        async makeRequest(endpoint, options = {}) {
            const url = `${this.baseUrl}${endpoint}`;
            const headers = this.auth.getAuthHeaders();

            const config = {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            };

            try {
                const response = await fetch(url, config);
                
                if (response.status === 401) {
                    this.auth.logout();
                    throw new Error('Sessão expirada. Faça login novamente.');
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error(`❌ Erro API ${endpoint}:`, error);
                throw error;
            }
        }

        async search(query, mode, options = {}) {
            console.log(`🔍 Busca REAL: "${query}" (${mode})`);
            
            return await this.makeRequest('/search', {
                method: 'POST',
                body: JSON.stringify({ query, mode, options })
            });
        }

        async getHistory() {
            return await this.makeRequest('/history');
        }

        async getSites() {
            return await this.makeRequest('/sites');
        }

        async getStats() {
            return await this.makeRequest('/stats');
        }
    }

    // === ERROR HANDLER ===
    class ErrorHandler {
        static showBackendError() {
            if (selectedConfig.error) {
                // GitHub Pages - mostrar erro
                setTimeout(() => {
                    alert(`❌ ERRO: ${selectedConfig.message}\n\nPara usar o sistema completo, você precisa de um servidor rodando o backend.\n\nVisite: ${selectedConfig.redirectUrl}`);
                }, 1000);
                return;
            }

            // Backend local/produção não encontrado
            setTimeout(() => {
                const message = `
❌ BACKEND REAL NÃO ENCONTRADO!

O JESUS IA precisa do backend rodando para funcionar.

🔧 Para iniciar o backend:
1. Abra o terminal na pasta do projeto
2. Execute: npm install
3. Execute: npm start
4. Aguarde: "Backend REAL rodando na porta 3000"
5. Recarregue esta página

📍 URL esperada: ${selectedConfig.apiUrl}

🆘 Precisa de ajuda? Verifique o README.md
                `.trim();
                
                alert(message);
            }, 2000);
        }
    }

    // === INICIALIZAÇÃO ===
    window.JesusIAConfig = {
        current: selectedConfig,
        environment: environment,
        
        // Serviços
        backendChecker: new BackendChecker(),
        auth: new AuthManager(),
        api: selectedConfig.error ? null : new RealAPIClient(),
        
        // Métodos úteis
        isLocal: () => isLocal,
        isGitHub: () => isGitHub,
        hasRealBackend: () => !selectedConfig.error && selectedConfig.features.realBackend,
        hasWebSocket: () => !selectedConfig.error && selectedConfig.features.websocket,
        requiresAuth: () => !selectedConfig.error && selectedConfig.features.authentication,
        
        // Status
        isReady: false,
        error: selectedConfig.error || false
    };

    // Verificar backend se não for erro
    if (!selectedConfig.error) {
        window.JesusIAConfig.backendChecker.checkBackend().then(isAlive => {
            if (isAlive) {
                window.JesusIAConfig.isReady = true;
                console.log('🚀 JESUS IA Config REAL inicializado');
                
                // Dispará evento personalizado
                window.dispatchEvent(new CustomEvent('jesusIAReady', {
                    detail: { config: window.JesusIAConfig }
                }));
            } else {
                ErrorHandler.showBackendError();
            }
        });
    } else {
        // Mostrar erro do GitHub Pages
        ErrorHandler.showBackendError();
    }

    // Log de configuração
    console.log('⚙️ JESUS IA Config (REAL):', {
        environment: environment,
        hasRealBackend: !selectedConfig.error,
        apiUrl: selectedConfig.apiUrl,
        socketUrl: selectedConfig.socketUrl,
        sites: selectedConfig.sites?.length || 0,
        error: selectedConfig.error || false
    });

})();
