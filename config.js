// config.js - Configuração Automática JESUS IA
// ARQUIVO OBRIGATÓRIO - Sem ele o frontend não funciona!

(function() {
    'use strict';

    // === DETECÇÃO DE AMBIENTE ===
    const isGitHub = window.location.hostname.includes('github.io') || 
                     window.location.hostname.includes('pages.dev') ||
                     window.location.hostname.includes('netlify.app') ||
                     window.location.hostname.includes('vercel.app');

    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'file:';

    // === CONFIGURAÇÕES POR AMBIENTE ===
    const configs = {
        // Configuração para desenvolvimento local
        local: {
            apiUrl: 'http://localhost:3000/api',
            socketUrl: 'http://localhost:3000',
            features: {
                realBackend: true,
                websocket: true,
                scraping: true,
                geminiAI: true
            },
            fallback: false
        },

        // Configuração para GitHub Pages (modo demo)
        github: {
            apiUrl: '/api', // Será interceptado
            socketUrl: null, // WebSocket desabilitado
            features: {
                realBackend: false,
                websocket: false,
                scraping: false, // Simulado
                geminiAI: false  // Simulado
            },
            fallback: true
        }
    };

    // === SELEÇÃO DE CONFIGURAÇÃO ===
    let selectedConfig;
    
    if (isLocal) {
        selectedConfig = configs.local;
        console.log('🏠 Ambiente: Desenvolvimento Local');
    } else {
        selectedConfig = configs.github;
        console.log('🌐 Ambiente: GitHub Pages (Demo)');
    }

    // === SIMULADOR PARA GITHUB PAGES ===
    class GitHubPagesSimulator {
        constructor() {
            this.isActive = selectedConfig.fallback;
        }

        // Simular API de busca
        async simulateSearch(query, mode) {
            console.log(`🎭 Simulando busca: "${query}" (${mode})`);
            
            // Simular delay de rede
            await this.delay(2000 + Math.random() * 3000);
            
            const results = this.generateMockResults(query, mode);
            
            return {
                searchId: 'sim_' + Date.now().toString(36),
                results: results,
                metadata: {
                    query: query,
                    mode: mode,
                    totalResults: results.length,
                    processingTime: 2000 + Math.random() * 3000,
                    sourcesUsed: 3,
                    avgQualityScore: Math.round(60 + Math.random() * 30)
                }
            };
        }

        generateMockResults(query, mode) {
            const baseResults = [
                {
                    title: `${query} [2024] 1080p BluRay`,
                    type: 'Filme',
                    size: '2.4GB',
                    quality: '1080p',
                    seeds: 156,
                    leeches: 23,
                    magnet: this.generateMagnet(query),
                    source: '1337x',
                    sourceReliability: 0.95,
                    qualityScore: 0.87,
                    confidence: 0.91
                },
                {
                    title: `${query} S01 Complete 720p WEB-DL`,
                    type: 'Série',
                    size: '8.2GB',
                    quality: '720p',
                    seeds: 89,
                    leeches: 12,
                    magnet: this.generateMagnet(query),
                    source: 'YTS',
                    sourceReliability: 0.88,
                    qualityScore: 0.76,
                    confidence: 0.83
                },
                {
                    title: `${query} Documentary 4K UHD`,
                    type: 'Documentário',
                    size: '12.8GB',
                    quality: '4K',
                    seeds: 234,
                    leeches: 45,
                    magnet: this.generateMagnet(query),
                    source: 'RARBG',
                    sourceReliability: 0.92,
                    qualityScore: 0.94,
                    confidence: 0.88
                }
            ];

            // Para modo IA, adicionar sugestões específicas
            if (mode === 'ai-assistant') {
                baseResults.push({
                    title: `Sugestão IA: ${query} - Versão Recomendada`,
                    type: 'Sugestão IA',
                    size: '3.1GB',
                    quality: 'Gemini AI',
                    seeds: 95,
                    leeches: 8,
                    magnet: this.generateMagnet(query),
                    source: 'Gemini AI',
                    description: 'Resultado otimizado baseado em análise semântica',
                    sourceReliability: 0.95,
                    qualityScore: 0.89,
                    confidence: 0.92,
                    aiGenerated: true
                });
            }

            // Randomizar resultados
            const numResults = 3 + Math.floor(Math.random() * 7);
            return baseResults.slice(0, numResults);
        }

        generateMagnet(query) {
            const hash = Array.from({length: 40}, () => 
                Math.floor(Math.random() * 16).toString(16)).join('');
            return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(query)}`;
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Simular WebSocket events
        simulateWebSocketEvents(app, query) {
            if (!app || typeof app.onSearchStarted !== 'function') return;

            const events = [
                { delay: 500, fn: () => app.onSearchStarted({ searchId: 'sim_123', query, mode: 'demo' }) },
                { delay: 1000, fn: () => app.onAgentStatus({ agent: 'coordinator', status: 'active', message: 'Coordenando busca...' }) },
                { delay: 1500, fn: () => app.onAgentStatus({ agent: 'scraping', status: 'active', message: 'Iniciando scraping...' }) },
                { delay: 2500, fn: () => app.onScrapingStatus({ phase: 'scraping', message: 'Buscando em 1337x...' }) },
                { delay: 3500, fn: () => app.onSiteScraping({ site: '1337x', message: 'Processando resultados...' }) },
                { delay: 4000, fn: () => app.onAgentStatus({ agent: 'aggregator', status: 'active', message: 'Agregando resultados...' }) },
                { delay: 4500, fn: () => app.onProcessingStatus({ phase: 'deduplication', before: 15, after: 8 }) }
            ];

            events.forEach(event => {
                setTimeout(event.fn, event.delay);
            });
        }
    }

    // === API INTERCEPTOR PARA GITHUB ===
    class APIInterceptor {
        constructor() {
            this.simulator = new GitHubPagesSimulator();
            this.setupInterceptor();
        }

        setupInterceptor() {
            if (!selectedConfig.fallback) return;

            // Interceptar fetch para APIs
            const originalFetch = window.fetch;
            window.fetch = async (url, options) => {
                // Se for uma chamada para API local, simular
                if (typeof url === 'string' && url.includes('/api/')) {
                    return this.handleAPICall(url, options);
                }
                
                // Caso contrário, usar fetch original
                return originalFetch(url, options);
            };

            console.log('🎭 Interceptor de API ativo para GitHub Pages');
        }

        async handleAPICall(url, options) {
            console.log('🎭 Interceptando API call:', url);

            if (url.includes('/api/health')) {
                return new Response(JSON.stringify({
                    status: 'ok',
                    version: '3.0.0-demo',
                    mode: 'github-pages',
                    services: {
                        redis: 'simulated',
                        gemini: 'simulated',
                        browser: 'simulated'
                    }
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (url.includes('/api/search')) {
                const body = JSON.parse(options.body || '{}');
                const result = await this.simulator.simulateSearch(body.query, body.mode);
                
                return new Response(JSON.stringify(result), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // API não suportada
            return new Response(JSON.stringify({
                error: 'API simulada - funcionalidade limitada no GitHub Pages'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // === INICIALIZAÇÃO ===
    window.JesusIAConfig = {
        current: selectedConfig,
        environment: isLocal ? 'local' : 'github',
        simulator: selectedConfig.fallback ? new GitHubPagesSimulator() : null,
        
        // Métodos úteis
        isLocal: () => isLocal,
        isGitHub: () => isGitHub,
        hasRealBackend: () => selectedConfig.features.realBackend,
        hasWebSocket: () => selectedConfig.features.websocket,
        
        // Override de configuração (para testes)
        override: (newConfig) => {
            Object.assign(selectedConfig, newConfig);
            console.log('⚙️ Configuração atualizada:', selectedConfig);
        }
    };

    // Inicializar interceptor se necessário
    if (selectedConfig.fallback) {
        window.JesusIAInterceptor = new APIInterceptor();
    }

    // Log de inicialização
    console.log('⚙️ JESUS IA Config inicializado:', {
        environment: window.JesusIAConfig.environment,
        hasRealBackend: selectedConfig.features.realBackend,
        apiUrl: selectedConfig.apiUrl,
        socketUrl: selectedConfig.socketUrl
    });

    // Notificar se estiver em modo demo
    if (selectedConfig.fallback) {
        setTimeout(() => {
            if (window.app && typeof window.app.showNotification === 'function') {
                window.app.showNotification(
                    '🎭 Modo Demo - Funcionalidades simuladas para GitHub Pages', 
                    'info'
                );
            }
        }, 2000);
    }

})();
