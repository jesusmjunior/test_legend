// data.js - Sistema de Persistência e IA Multi-Agente JESUS IA
// Sistema completo de dados, cache e agentes inteligentes

(function(window) {
    'use strict';

    // === CONFIGURAÇÃO GLOBAL ===
    let CONFIG = null;
    
    // Carregar configuração do backend.json
    async function loadConfig() {
        try {
            const response = await fetch('backend.json');
            CONFIG = (await response.json()).jesus_ia_system;
            console.log('✅ Configuração carregada:', CONFIG.version);
        } catch (error) {
            console.warn('⚠️ Usando configuração padrão');
            CONFIG = getDefaultConfig();
        }
    }

    function getDefaultConfig() {
        return {
            version: "3.0.0",
            api_keys: {
                gemini: {
                    primary: "AIzaSyACH3eDK2fKaEDE4odCVqWvwniU0csyfE8",
                    model: "gemini-2.0-flash-exp"
                }
            },
            data_persistence: {
                cache_settings: {
                    search_results: { duration: 3600, max_entries: 100 },
                    ai_responses: { duration: 7200, max_entries: 50 },
                    user_history: { duration: 2592000, max_entries: 1000 }
                }
            }
        };
    }

    // === SISTEMA DE PERSISTÊNCIA ===
    class DataPersistence {
        constructor() {
            this.storagePrefix = 'jesusIA_';
            this.isAvailable = this.checkStorageAvailability();
        }

        checkStorageAvailability() {
            try {
                const test = 'test';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                console.warn('LocalStorage não disponível, usando memória');
                this.memoryStorage = {};
                return false;
            }
        }

        set(key, value, ttl = null) {
            const item = {
                value: value,
                timestamp: Date.now(),
                ttl: ttl
            };

            if (this.isAvailable) {
                try {
                    localStorage.setItem(this.storagePrefix + key, JSON.stringify(item));
                } catch (e) {
                    console.warn('Erro ao salvar no localStorage:', e);
                    this.memoryStorage[key] = item;
                }
            } else {
                this.memoryStorage[key] = item;
            }
        }

        get(key) {
            let item = null;

            if (this.isAvailable) {
                try {
                    const stored = localStorage.getItem(this.storagePrefix + key);
                    item = stored ? JSON.parse(stored) : null;
                } catch (e) {
                    item = this.memoryStorage[key] || null;
                }
            } else {
                item = this.memoryStorage[key] || null;
            }

            if (!item) return null;

            // Verificar TTL
            if (item.ttl && (Date.now() - item.timestamp > item.ttl * 1000)) {
                this.remove(key);
                return null;
            }

            return item.value;
        }

        remove(key) {
            if (this.isAvailable) {
                localStorage.removeItem(this.storagePrefix + key);
            }
            if (this.memoryStorage) {
                delete this.memoryStorage[key];
            }
        }

        clear() {
            if (this.isAvailable) {
                const keys = Object.keys(localStorage).filter(key => 
                    key.startsWith(this.storagePrefix));
                keys.forEach(key => localStorage.removeItem(key));
            }
            if (this.memoryStorage) {
                this.memoryStorage = {};
            }
        }

        getStorageSize() {
            if (!this.isAvailable) return 0;
            
            let size = 0;
            for (const key in localStorage) {
                if (key.startsWith(this.storagePrefix)) {
                    size += localStorage[key].length;
                }
            }
            return size;
        }

        cleanup() {
            console.log('🧹 Executando limpeza automática...');
            
            const maxSize = 10 * 1024 * 1024; // 10MB
            const currentSize = this.getStorageSize();
            
            if (currentSize > maxSize) {
                console.log(`📊 Tamanho atual: ${(currentSize / 1024 / 1024).toFixed(2)}MB`);
                
                // Remover itens mais antigos
                const items = [];
                for (const key in localStorage) {
                    if (key.startsWith(this.storagePrefix)) {
                        try {
                            const item = JSON.parse(localStorage[key]);
                            items.push({ key, timestamp: item.timestamp });
                        } catch (e) {
                            localStorage.removeItem(key);
                        }
                    }
                }
                
                items.sort((a, b) => a.timestamp - b.timestamp);
                const toRemove = Math.floor(items.length * 0.3); // Remove 30% mais antigos
                
                for (let i = 0; i < toRemove; i++) {
                    localStorage.removeItem(items[i].key);
                }
                
                console.log(`🗑️ ${toRemove} itens removidos`);
            }
        }
    }

    // === SISTEMA MULTI-AGENTE ===
    class MultiAgentSystem {
        constructor(persistence) {
            this.persistence = persistence;
            this.agents = {};
            this.messageQueue = [];
            this.isProcessing = false;
            this.initializeAgents();
        }

        initializeAgents() {
            // Agente Coordenador de Busca
            this.agents.searchCoordinator = new SearchCoordinator(this);
            
            // Agente de Scraping
            this.agents.scrapingAgent = new ScrapingAgent(this);
            
            // Assistente IA
            this.agents.aiAssistant = new AIAssistant(this);
            
            // Tagificador Semântico
            this.agents.semanticTagger = new SemanticTagger(this);
            
            // Agregador de Resultados
            this.agents.resultAggregator = new ResultAggregator(this);
            
            console.log('🤖 Sistema multi-agente inicializado');
        }

        async sendMessage(agentName, message) {
            return new Promise((resolve, reject) => {
                this.messageQueue.push({
                    agent: agentName,
                    message: message,
                    resolve: resolve,
                    reject: reject,
                    timestamp: Date.now()
                });
                
                this.processMessageQueue();
            });
        }

        async processMessageQueue() {
            if (this.isProcessing || this.messageQueue.length === 0) return;
            
            this.isProcessing = true;
            
            while (this.messageQueue.length > 0) {
                const { agent, message, resolve, reject } = this.messageQueue.shift();
                
                try {
                    if (this.agents[agent]) {
                        const result = await this.agents[agent].processMessage(message);
                        resolve(result);
                    } else {
                        reject(new Error(`Agente ${agent} não encontrado`));
                    }
                } catch (error) {
                    reject(error);
                }
                
                // Pequeno delay entre processamentos
                await this.delay(100);
            }
            
            this.isProcessing = false;
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // === AGENTE COORDENADOR DE BUSCA ===
    class SearchCoordinator {
        constructor(system) {
            this.system = system;
            this.activeSearches = new Map();
        }

        async processMessage(message) {
            const { type, data } = message;
            
            switch (type) {
                case 'SEARCH_REQUEST':
                    return await this.handleSearchRequest(data);
                case 'GET_SEARCH_STATUS':
                    return this.getSearchStatus(data.searchId);
                default:
                    throw new Error(`Tipo de mensagem não suportado: ${type}`);
            }
        }

        async handleSearchRequest(data) {
            const { query, mode, options = {} } = data;
            const searchId = this.generateSearchId();
            
            this.activeSearches.set(searchId, {
                query,
                mode,
                status: 'processing',
                startTime: Date.now(),
                results: []
            });

            try {
                let results = [];
                
                switch (mode) {
                    case 'mechanical':
                        results = await this.system.sendMessage('scrapingAgent', {
                            type: 'SCRAPE_SITES',
                            data: { query, options }
                        });
                        break;
                        
                    case 'ai-assistant':
                        results = await this.system.sendMessage('aiAssistant', {
                            type: 'MEMORY_SEARCH',
                            data: { query, options }
                        });
                        break;
                        
                    case 'hybrid':
                        results = await this.handleHybridSearch(query, options);
                        break;
                        
                    default:
                        throw new Error(`Modo de busca não suportado: ${mode}`);
                }

                // Processar resultados finais
                const finalResults = await this.system.sendMessage('resultAggregator', {
                    type: 'PROCESS_RESULTS',
                    data: { results, query, mode }
                });

                this.activeSearches.set(searchId, {
                    ...this.activeSearches.get(searchId),
                    status: 'completed',
                    results: finalResults,
                    endTime: Date.now()
                });

                return {
                    searchId,
                    results: finalResults,
                    metadata: {
                        query,
                        mode,
                        totalResults: finalResults.length,
                        processingTime: Date.now() - this.activeSearches.get(searchId).startTime
                    }
                };

            } catch (error) {
                this.activeSearches.set(searchId, {
                    ...this.activeSearches.get(searchId),
                    status: 'error',
                    error: error.message
                });
                
                throw error;
            }
        }

        async handleHybridSearch(query, options) {
            // 1. Otimizar query com IA
            const optimizedQueries = await this.system.sendMessage('semanticTagger', {
                type: 'OPTIMIZE_QUERY',
                data: { query }
            });

            // 2. Buscar com queries otimizadas
            const allResults = [];
            const queries = [query, ...optimizedQueries.slice(0, 2)];

            for (const q of queries) {
                try {
                    const results = await this.system.sendMessage('scrapingAgent', {
                        type: 'SCRAPE_SITES',
                        data: { query: q, options: { ...options, maxSites: 2 } }
                    });
                    allResults.push(...results);
                } catch (error) {
                    console.warn(`Erro na busca híbrida para "${q}":`, error);
                }
            }

            return allResults;
        }

        generateSearchId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }

        getSearchStatus(searchId) {
            return this.activeSearches.get(searchId) || null;
        }
    }

    // === AGENTE DE SCRAPING ===
    class ScrapingAgent {
        constructor(system) {
            this.system = system;
            this.rateLimiter = new Map();
        }

        async processMessage(message) {
            const { type, data } = message;
            
            switch (type) {
                case 'SCRAPE_SITES':
                    return await this.scrapeSites(data);
                default:
                    throw new Error(`Tipo de mensagem não suportado: ${type}`);
            }
        }

        async scrapeSites(data) {
            const { query, options = {} } = data;
            const maxSites = options.maxSites || 3;
            
            // Simular scraping (em produção seria scraping real via proxy)
            const sites = this.getActiveSites().slice(0, maxSites);
            const results = [];

            for (const site of sites) {
                try {
                    // Rate limiting
                    await this.checkRateLimit(site.id);
                    
                    const siteResults = await this.scrapeFromSite(site, query);
                    results.push(...siteResults);
                    
                    // Cache dos resultados
                    this.system.persistence.set(
                        `scrape_${site.id}_${query}`,
                        siteResults,
                        3600 // 1 hora
                    );
                    
                } catch (error) {
                    console.warn(`Erro ao buscar em ${site.name}:`, error);
                }
            }

            return results;
        }

        async scrapeFromSite(site, query) {
            // Verificar cache primeiro
            const cached = this.system.persistence.get(`scrape_${site.id}_${query}`);
            if (cached) {
                console.log(`📦 Cache hit para ${site.name}`);
                return cached;
            }

            console.log(`🔍 Buscando em ${site.name}: ${query}`);
            
            // Simular scraping real
            const numResults = Math.floor(Math.random() * 10) + 5;
            const results = [];
            
            for (let i = 0; i < numResults; i++) {
                results.push({
                    title: `${query} ${this.getRandomQuality()} [${site.name}] ${i + 1}`,
                    type: this.getRandomType(),
                    size: `${(Math.random() * 4 + 0.5).toFixed(1)}GB`,
                    quality: this.getRandomQuality(),
                    seeds: Math.floor(Math.random() * 500 + 10),
                    leeches: Math.floor(Math.random() * 100 + 5),
                    magnet: this.generateMagnetLink(query, site.name, i),
                    source: site.name,
                    sourceReliability: site.reliability_score || 0.8,
                    scrapedAt: Date.now()
                });
            }

            // Simular delay de rede
            await this.delay(1000 + Math.random() * 2000);
            
            return results;
        }

        async checkRateLimit(siteId) {
            const now = Date.now();
            const lastRequest = this.rateLimiter.get(siteId) || 0;
            const minDelay = 2000; // 2 segundos entre requisições
            
            if (now - lastRequest < minDelay) {
                await this.delay(minDelay - (now - lastRequest));
            }
            
            this.rateLimiter.set(siteId, Date.now());
        }

        getActiveSites() {
            return [
                { id: '1337x', name: '1337x', reliability_score: 0.95 },
                { id: 'tpb', name: 'ThePirateBay', reliability_score: 0.90 },
                { id: 'yts', name: 'YTS', reliability_score: 0.88 },
                { id: 'rarbg', name: 'RARBG', reliability_score: 0.85 },
                { id: 'limetorrents', name: 'LimeTorrents', reliability_score: 0.82 }
            ];
        }

        getRandomType() {
            const types = ['Filme', 'Série', 'Documentário', 'Episódio', 'Anime'];
            return types[Math.floor(Math.random() * types.length)];
        }

        getRandomQuality() {
            const qualities = ['720p', '1080p', '4K', 'BluRay', 'WEB-DL', 'HDRip', 'CAM', 'TS'];
            return qualities[Math.floor(Math.random() * qualities.length)];
        }

        generateMagnetLink(query, source, index) {
            const hash = Array.from({length: 40}, () => 
                Math.floor(Math.random() * 16).toString(16)).join('');
            const name = encodeURIComponent(`${query} ${source} ${index}`);
            return `magnet:?xt=urn:btih:${hash}&dn=${name}&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.publicbt.com:80`;
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // === ASSISTENTE IA ===
    class AIAssistant {
        constructor(system) {
            this.system = system;
            this.apiKey = CONFIG?.api_keys?.gemini?.primary || 'AIzaSyACH3eDK2fKaEDE4odCVqWvwniU0csyfE8';
            this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
        }

        async processMessage(message) {
            const { type, data } = message;
            
            switch (type) {
                case 'MEMORY_SEARCH':
                    return await this.memorySearch(data);
                case 'ANALYZE_CONTENT':
                    return await this.analyzeContent(data);
                default:
                    throw new Error(`Tipo de mensagem não suportado: ${type}`);
            }
        }

        async memorySearch(data) {
            const { query } = data;
            
            // Verificar cache
            const cached = this.system.persistence.get(`ai_memory_${query}`);
            if (cached) {
                console.log('📦 AI cache hit');
                return cached;
            }

            const prompt = this.buildMemoryPrompt(query);
            
            try {
                const response = await this.callGeminiAPI(prompt);
                const suggestions = this.parseMemoryResponse(response);
                
                // Cache da resposta
                this.system.persistence.set(`ai_memory_${query}`, suggestions, 7200);
                
                return suggestions;
            } catch (error) {
                console.error('Erro na IA:', error);
                return this.getFallbackSuggestions(query);
            }
        }

        buildMemoryPrompt(query) {
            return `
Você é o JESUS IA, especialista em filmes e séries. O usuário está tentando lembrar de algo baseado na descrição:

"${query}"

Analise a descrição e sugira até 5 títulos que correspondam. Para cada sugestão, forneça:

IMPORTANTE: Responda APENAS com JSON válido no formato:

{
  "suggestions": [
    {
      "title": "Nome Exato do Filme/Série",
      "year": "2020",
      "description": "Descrição breve e precisa",
      "genre": "Gênero principal",
      "confidence": 0.9,
      "type": "Filme/Série/Documentário"
    }
  ]
}

Seja preciso e confiante nas sugestões. Use títulos reais e conhecidos.
            `;
        }

        async callGeminiAPI(prompt) {
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        }

        parseMemoryResponse(response) {
            try {
                // Extrair JSON da resposta
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return parsed.suggestions.map(suggestion => ({
                        title: suggestion.title,
                        type: 'Sugestão IA',
                        size: suggestion.genre,
                        quality: suggestion.year,
                        seeds: Math.floor(suggestion.confidence * 100),
                        magnet: '',
                        source: 'Gemini AI',
                        description: suggestion.description,
                        confidence: suggestion.confidence,
                        aiGenerated: true
                    }));
                }
            } catch (error) {
                console.error('Erro ao parsear resposta IA:', error);
            }
            
            return this.getFallbackSuggestions(response);
        }

        getFallbackSuggestions(query) {
            return [{
                title: `Busca por: ${query}`,
                type: 'Sugestão IA',
                size: 'Fallback',
                quality: 'N/A',
                seeds: 50,
                magnet: '',
                source: 'AI Fallback',
                description: 'Não foi possível processar com IA. Tente busca mecânica.',
                confidence: 0.3,
                aiGenerated: true
            }];
        }
    }

    // === TAGIFICADOR SEMÂNTICO ===
    class SemanticTagger {
        constructor(system) {
            this.system = system;
            this.apiKey = CONFIG?.api_keys?.gemini?.primary || 'AIzaSyACH3eDK2fKaEDE4odCVqWvwniU0csyfE8';
            this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
        }

        async processMessage(message) {
            const { type, data } = message;
            
            switch (type) {
                case 'OPTIMIZE_QUERY':
                    return await this.optimizeQuery(data);
                default:
                    throw new Error(`Tipo de mensagem não suportado: ${type}`);
            }
        }

        async optimizeQuery(data) {
            const { query } = data;
            
            // Cache check
            const cached = this.system.persistence.get(`optimize_${query}`);
            if (cached) {
                return cached;
            }

            try {
                const prompt = `
Otimize o termo de busca "${query}" para sites de torrent.
Gere 3 variações que maximizem os resultados.

Responda apenas com JSON:
{
  "optimized": ["termo1", "termo2", "termo3"]
}
                `;

                const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.5, maxOutputTokens: 512 }
                    })
                });

                const data = await response.json();
                const aiResponse = data.candidates[0].content.parts[0].text;
                
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const optimized = parsed.optimized || [];
                    
                    // Cache
                    this.system.persistence.set(`optimize_${query}`, optimized, 3600);
                    return optimized;
                }
            } catch (error) {
                console.error('Erro na otimização:', error);
            }

            // Fallback: gerar variações simples
            return this.generateSimpleVariations(query);
        }

        generateSimpleVariations(query) {
            const variations = [];
            const words = query.toLowerCase().split(' ');
            
            // Adicionar com qualidades comuns
            if (!query.includes('1080p') && !query.includes('720p')) {
                variations.push(`${query} 1080p`);
            }
            
            // Adicionar variações sem acentos
            const withoutAccents = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (withoutAccents !== query) {
                variations.push(withoutAccents);
            }
            
            // Se for só uma palavra, adicionar contexto
            if (words.length === 1) {
                variations.push(`${query} movie`);
            }
            
            return variations.slice(0, 3);
        }
    }

    // === AGREGADOR DE RESULTADOS ===
    class ResultAggregator {
        constructor(system) {
            this.system = system;
        }

        async processMessage(message) {
            const { type, data } = message;
            
            switch (type) {
                case 'PROCESS_RESULTS':
                    return await this.processResults(data);
                default:
                    throw new Error(`Tipo de mensagem não suportado: ${type}`);
            }
        }

        async processResults(data) {
            const { results, query, mode } = data;
            
            // 1. Remover duplicatas
            const unique = this.removeDuplicates(results);
            
            // 2. Calcular scores de qualidade
            const scored = this.calculateQualityScores(unique, query);
            
            // 3. Ordenar por relevância
            const sorted = this.sortByRelevance(scored, mode);
            
            // 4. Limitar resultados
            const limited = sorted.slice(0, 50);
            
            // 5. Enriquecer com metadados
            const enriched = this.enrichWithMetadata(limited);
            
            return enriched;
        }

        removeDuplicates(results) {
            const seen = new Set();
            return results.filter(item => {
                const key = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '')}_${item.size}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        calculateQualityScores(results, query) {
            return results.map(result => {
                let score = 0;
                
                // Score por seeds
                score += Math.min((result.seeds || 0) / 100, 1) * 0.4;
                
                // Score por confiabilidade da fonte
                score += (result.sourceReliability || 0.5) * 0.3;
                
                // Score por relevância do título
                const titleWords = result.title.toLowerCase().split(' ');
                const queryWords = query.toLowerCase().split(' ');
                const matchingWords = queryWords.filter(word => 
                    titleWords.some(titleWord => titleWord.includes(word))
                ).length;
                score += (matchingWords / queryWords.length) * 0.2;
                
                // Score por qualidade do formato
                const qualityBonus = this.getQualityBonus(result.quality);
                score += qualityBonus * 0.1;
                
                return { ...result, qualityScore: Math.min(score, 1) };
            });
        }

        getQualityBonus(quality) {
            const bonuses = {
                '4K': 1.0,
                '2160p': 1.0,
                '1080p': 0.8,
                'BluRay': 0.9,
                'WEB-DL': 0.7,
                '720p': 0.6,
                'HDRip': 0.5,
                'CAM': 0.1,
                'TS': 0.1
            };
            
            for (const [format, bonus] of Object.entries(bonuses)) {
                if (quality?.includes(format)) {
                    return bonus;
                }
            }
            
            return 0.5; // Default
        }

        sortByRelevance(results, mode) {
            if (mode === 'ai-assistant') {
                // Para IA, priorizar confiança
                return results.sort((a, b) => {
                    if (a.confidence && b.confidence) {
                        return b.confidence - a.confidence;
                    }
                    return (b.qualityScore || 0) - (a.qualityScore || 0);
                });
            } else {
                // Para busca mecânica/híbrida, priorizar qualidade geral
                return results.sort((a, b) => {
                    const scoreA = (a.qualityScore || 0) + (a.seeds || 0) / 1000;
                    const scoreB = (b.qualityScore || 0) + (b.seeds || 0) / 1000;
                    return scoreB - scoreA;
                });
            }
        }

        enrichWithMetadata(results) {
            return results.map((result, index) => ({
                ...result,
                rank: index + 1,
                processedAt: Date.now(),
                id: `result_${Date.now()}_${index}`
            }));
        }
    }

    // === MANAGER PRINCIPAL ===
    class DataManager {
        constructor() {
            this.persistence = new DataPersistence();
            this.multiAgent = new MultiAgentSystem(this.persistence);
            this.isInitialized = false;
            this.init();
        }

        async init() {
            await loadConfig();
            this.isInitialized = true;
            console.log('🚀 DataManager inicializado');
            
            // Limpeza automática
            this.scheduleCleanup();
        }

        async search(query, mode = 'mechanical', options = {}) {
            if (!this.isInitialized) {
                throw new Error('Sistema não inicializado');
            }

            return await this.multiAgent.sendMessage('searchCoordinator', {
                type: 'SEARCH_REQUEST',
                data: { query, mode, options }
            });
        }

        async saveSearch(searchData) {
            const key = `search_history_${Date.now()}`;
            this.persistence.set(key, searchData, CONFIG?.data_persistence?.cache_settings?.user_history?.duration || 2592000);
        }

        getSearchHistory(limit = 20) {
            const keys = Object.keys(localStorage).filter(key => 
                key.includes('search_history_'));
            
            const history = keys
                .map(key => {
                    try {
                        return JSON.parse(localStorage[key]);
                    } catch (e) {
                        return null;
                    }
                })
                .filter(item => item !== null)
                .sort((a, b) => (b.value?.timestamp || 0) - (a.value?.timestamp || 0))
                .slice(0, limit);
            
            return history.map(item => item.value);
        }

        clearCache() {
            this.persistence.clear();
            console.log('🗑️ Cache limpo');
        }

        getSystemStats() {
            return {
                storageSize: this.persistence.getStorageSize(),
                cacheEntries: Object.keys(localStorage).filter(key => 
                    key.includes('jesusIA_')).length,
                initialized: this.isInitialized,
                version: CONFIG?.version || '3.0.0'
            };
        }

        scheduleCleanup() {
            // Limpeza a cada 24 horas
            setInterval(() => {
                this.persistence.cleanup();
            }, 24 * 60 * 60 * 1000);
            
            // Primeira limpeza após 1 hora
            setTimeout(() => {
                this.persistence.cleanup();
            }, 60 * 60 * 1000);
        }
    }

    // === EXPOSIÇÃO GLOBAL ===
    window.DataManager = DataManager;
    window.JesusIAData = {
        DataManager,
        DataPersistence,
        MultiAgentSystem
    };

    console.log('📦 Sistema de dados JESUS IA carregado');

})(window);
