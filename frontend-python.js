// frontend-python.js - Configuração para Backend Python
// Substitui o sistema Node.js por Python FastAPI

(function() {
    'use strict';

    // === CONFIGURAÇÃO BACKEND PYTHON ===
    const PYTHON_CONFIG = {
        // Backend Python FastAPI
        apiUrl: 'http://localhost:8000/api',
        baseUrl: 'http://localhost:8000',
        
        // Features disponíveis
        features: {
            realScraping: true,
            aiProcessing: true,
            caching: true,
            multiSites: true,
            asyncScraping: true
        },
        
        // Sites suportados pelo backend Python
        supportedSites: [
            { name: '1337x', type: 'HTML', reliability: 0.95 },
            { name: 'YTS', type: 'API', reliability: 0.90 },
            { name: 'RARBG', type: 'HTML', reliability: 0.85 },
            { name: 'TorrentGalaxy', type: 'JS', reliability: 0.87 },
            { name: 'LimeTorrents', type: 'HTML', reliability: 0.82 }
        ],
        
        // Configurações de requisição
        request: {
            timeout: 30000,
            retries: 2,
            maxConcurrent: 5
        }
    };

    // === PYTHON API CLIENT ===
    class PythonAPIClient {
        constructor() {
            this.baseUrl = PYTHON_CONFIG.apiUrl;
            this.isConnected = false;
            this.backendInfo = null;
        }

        async checkConnection() {
            try {
                console.log('🔍 Verificando conexão com backend Python...');
                
                const response = await fetch(`${PYTHON_CONFIG.baseUrl}/api/health`, {
                    method: 'GET',
                    timeout: 5000
                });

                if (response.ok) {
                    this.backendInfo = await response.json();
                    this.isConnected = true;
                    
                    console.log('✅ Backend Python conectado:', this.backendInfo);
                    return true;
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                console.error('❌ Backend Python não encontrado:', error);
                this.isConnected = false;
                return false;
            }
        }

        async performSearch(query, mode = 'scraping', options = {}) {
            if (!this.isConnected) {
                throw new Error('Backend Python não está conectado');
            }

            console.log(`🔍 Busca Python: "${query}" (${mode})`);
            
            const requestBody = {
                query: query.trim(),
                mode: mode,
                max_sites: options.maxSites || 5,
                use_ai: options.useAI !== false
            };

            try {
                const response = await fetch(`${this.baseUrl}/search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody),
                    timeout: PYTHON_CONFIG.request.timeout
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `HTTP ${response.status}`);
                }

                const result = await response.json();
                console.log('✅ Resultado Python recebido:', result);
                
                return result;
                
            } catch (error) {
                console.error('❌ Erro na busca Python:', error);
                throw error;
            }
        }

        async getSites() {
            try {
                const response = await fetch(`${this.baseUrl}/sites`);
                if (response.ok) {
                    return await response.json();
                }
                return PYTHON_CONFIG.supportedSites;
            } catch (error) {
                console.error('Erro obtendo sites:', error);
                return PYTHON_CONFIG.supportedSites;
            }
        }

        getBackendInfo() {
            return this.backendInfo;
        }
    }

    // === PYTHON SEARCH ENGINE ===
    class PythonSearchEngine {
        constructor() {
            this.apiClient = new PythonAPIClient();
            this.isSearching = false;
            this.currentSearch = null;
        }

        async initialize() {
            console.log('🚀 Inicializando engine Python...');
            
            const connected = await this.apiClient.checkConnection();
            
            if (connected) {
                const info = this.apiClient.getBackendInfo();
                return {
                    success: true,
                    message: `Backend Python v${info.version} conectado`,
                    info: info
                };
            } else {
                return {
                    success: false,
                    message: 'Backend Python não encontrado. Verifique se está rodando na porta 8000.',
                    info: null
                };
            }
        }

        async search(query, mode, options = {}) {
            if (this.isSearching) {
                throw new Error('Busca já em andamento');
            }

            this.isSearching = true;
            this.currentSearch = {
                query,
                mode,
                startTime: Date.now()
            };

            try {
                // Realizar busca via Python backend
                const result = await this.apiClient.performSearch(query, mode, options);
                
                // Processar resultados para compatibilidade com frontend
                const processedResults = this.processResults(result);
                
                return processedResults;
                
            } finally {
                this.isSearching = false;
                this.currentSearch = null;
            }
        }

        processResults(pythonResult) {
            // Converter formato do Python para formato esperado pelo frontend
            const results = pythonResult.results.map(item => ({
                title: item.title,
                size: item.size,
                seeds: item.seeds,
                leeches: item.leeches,
                source: item.source,
                type: item.type,
                quality: item.quality,
                magnet: item.magnet_link || item.download_url,
                magnetLink: item.magnet_link || item.download_url,
                confidence: item.ai_score,
                qualityScore: item.ai_score,
                aiGenerated: item.ai_score > 0,
                realData: item.real_data,
                scrapedAt: item.scraped_at
            }));

            return {
                searchId: Date.now().toString(36),
                results: results,
                metadata: {
                    ...pythonResult.metadata,
                    processingTime: pythonResult.processing_time * 1000, // Convert to ms
                    avgQualityScore: Math.round(pythonResult.metadata.ai_processed ? 
                        results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length * 100 : 0),
                    query: pythonResult.query
                }
            };
        }

        async getSupportedSites() {
            return await this.apiClient.getSites();
        }

        isBackendConnected() {
            return this.apiClient.isConnected;
        }
    }

    // === ENHANCED SEARCH SYSTEM ===
    class EnhancedJesusIASystem {
        constructor() {
            this.pythonEngine = new PythonSearchEngine();
            this.searchMode = 'scraping';
            this.isSearching = false;
            this.searchResults = [];
            this.searchStartTime = null;
            this.backendType = 'python'; // python or fallback
        }

        async init() {
            console.log('🚀 Inicializando sistema enhanced...');
            
            this.updateLoadingStatus('Conectando ao backend Python...');
            
            const initResult = await this.pythonEngine.initialize();
            
            if (initResult.success) {
                this.backendType = 'python';
                this.updateLoadingStatus('Backend Python conectado!');
                
                // Atualizar UI com informações do backend
                this.updateBackendInfo(initResult.info);
                
                setTimeout(() => {
                    this.hideLoadingScreen();
                    this.showNotification(
                        `🐍 Backend Python ativo! ${initResult.info.sites} sites disponíveis`,
                        'success'
                    );
                }, 1000);
                
            } else {
                this.backendType = 'fallback';
                this.updateLoadingStatus('Usando modo fallback...');
                
                setTimeout(() => {
                    this.hideLoadingScreen();
                    this.showNotification(
                        '⚠️ Backend Python não encontrado. Execute: python main.py',
                        'warning'
                    );
                }, 1000);
            }
            
            this.setupEventListeners();
        }

        updateBackendInfo(info) {
            // Atualizar badge de ambiente
            const badge = document.querySelector('.environment-badge');
            if (badge) {
                badge.innerHTML = `
                    <span>🐍</span>
                    <span>Python v${info.version}</span>
                `;
            }

            // Atualizar status
            const status = document.querySelector('.status-indicator');
            if (status) {
                status.innerHTML = `
                    <div class="status-dot"></div>
                    <span>✅ Python Backend (${info.sites} sites)</span>
                `;
            }
        }

        setupEventListeners() {
            // Search form
            const searchForm = document.getElementById('searchForm');
            if (searchForm) {
                searchForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.performSearch();
                });
            }

            // Mode selection
            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.searchMode = btn.dataset.mode;
                    this.updateSearchPlaceholder();
                });
            });
        }

        updateSearchPlaceholder() {
            const input = document.getElementById('searchInput');
            const placeholders = {
                'scraping': 'Ex: Breaking Bad S01E01 1080p',
                'ai-organize': 'Ex: filme de ficção científica com robôs', 
                'memory': 'Ex: aquela série que busquei ontem'
            };
            if (input) {
                input.placeholder = placeholders[this.searchMode] || 'Digite sua busca...';
            }
        }

        async performSearch() {
            if (this.isSearching) return;

            const query = document.getElementById('searchInput')?.value?.trim();
            if (!query) {
                this.showNotification('❌ Digite um termo para buscar', 'error');
                return;
            }

            if (this.backendType !== 'python') {
                this.showNotification(
                    '⚠️ Backend Python necessário. Execute: python main.py',
                    'warning'
                );
                return;
            }

            this.isSearching = true;
            this.searchStartTime = Date.now();
            this.updateSearchButton(true);
            this.showSearchLoading(true);

            // Show enhanced time lapse
            this.showEnhancedTimeLapse(query);

            try {
                // Map frontend modes to backend modes
                const modeMap = {
                    'scraping': 'scraping',
                    'ai-organize': 'ai-organize', 
                    'memory': 'memory'
                };

                const backendMode = modeMap[this.searchMode] || 'scraping';
                
                // Simulate real-time updates
                this.simulateRealTimeUpdates(query);

                // Perform search
                const result = await this.pythonEngine.search(query, backendMode, {
                    maxSites: 5,
                    useAI: true
                });

                // Display results
                setTimeout(() => {
                    this.displayResults(result);
                    this.closeTimeLapse();
                    this.showNotification(
                        `✅ ${result.results.length} resultados encontrados!`,
                        'success'
                    );
                }, 1000);

            } catch (error) {
                console.error('❌ Erro na busca:', error);
                this.showNotification(`❌ Erro: ${error.message}`, 'error');
                this.addFeedItem('❌', `Erro: ${error.message}`, 'error');
                
                setTimeout(() => {
                    this.closeTimeLapse();
                }, 3000);
            } finally {
                this.isSearching = false;
                this.updateSearchButton(false);
                this.showSearchLoading(false);
            }
        }

        simulateRealTimeUpdates(query) {
            // Simulate the scraping process for visual feedback
            setTimeout(() => {
                this.updateProgress(20, 'Conectando aos sites...');
                this.activateAgent('agentCoordinator', 'Coordenando busca...');
            }, 500);

            setTimeout(() => {
                this.updateProgress(40, 'Scraping em andamento...');
                this.activateAgent('agentScraping', 'Extraindo dados...');
                this.addFeedItem('🕸️', '1337x: Conectado', 'info');
            }, 1500);

            setTimeout(() => {
                this.updateProgress(60, 'Processando com IA...');
                this.activateAgent('agentAI', 'IA organizando...');
                this.addFeedItem('🤖', 'IA processando resultados...', 'info');
            }, 3000);

            setTimeout(() => {
                this.updateProgress(80, 'Finalizando...');
                this.activateAgent('agentAggregator', 'Agregando resultados...');
                this.addFeedItem('📊', 'Organizando por relevância...', 'success');
            }, 4000);

            setTimeout(() => {
                this.updateProgress(100, 'Busca concluída!');
                this.addFeedItem('🎉', 'Busca Python concluída!', 'success');
            }, 4500);
        }

        displayResults(data) {
            const results = data.results || [];
            const metadata = data.metadata || {};
            
            this.searchResults = results;

            // Update stats
            this.updateStats(results, metadata);

            // Populate table
            this.populateResultsTable(results);

            // Show results section
            const resultsSection = document.getElementById('resultsSection');
            if (resultsSection) {
                resultsSection.classList.add('show');
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        updateStats(results, metadata) {
            const elements = {
                totalResults: document.getElementById('totalResults'),
                searchTime: document.getElementById('searchTime'),
                sourcesCount: document.getElementById('sourcesCount'),
                qualityScore: document.getElementById('qualityScore')
            };

            if (elements.totalResults) {
                elements.totalResults.textContent = results.length;
            }
            
            if (elements.searchTime) {
                const time = ((metadata.processingTime || 0) / 1000).toFixed(2);
                elements.searchTime.textContent = time + 's';
            }
            
            if (elements.sourcesCount) {
                elements.sourcesCount.textContent = metadata.sourcesUsed || 0;
            }
            
            if (elements.qualityScore) {
                elements.qualityScore.textContent = metadata.avgQualityScore || 0;
            }
        }

        populateResultsTable(results) {
            const tbody = document.getElementById('resultsTableBody');
            if (!tbody) return;

            tbody.innerHTML = '';

            if (results.length === 0) {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td colspan="7" style="text-align: center; padding: 40px; opacity: 0.7;">
                        😔 Nenhum resultado encontrado. Tente outro termo.
                    </td>
                `;
                return;
            }

            results.forEach((result, index) => {
                const row = this.createResultRow(result, index);
                tbody.appendChild(row);
            });
        }

        createResultRow(result, index) {
            const row = document.createElement('tr');
            
            // Badge class
            let badgeClass = 'real';
            if (result.type?.toLowerCase().includes('filme')) badgeClass = 'movie';
            if (result.type?.toLowerCase().includes('série')) badgeClass = 'series';
            if (result.aiGenerated) badgeClass = 'ai';

            // Score
            const score = (result.confidence || result.qualityScore || 0.5) * 100;
            const scorePercent = Math.round(score);

            // Status indicators  
            const realIndicator = result.realData ? '🔥' : '🤖';
            const statusText = result.realData ? 'Python Real' : 'Processado';

            row.innerHTML = `
                <td>
                    <div class="result-title">${this.escapeHtml(result.title)}</div>
                    <div class="result-subtitle">
                        ${realIndicator} ${result.source} • ${statusText}
                    </div>
                </td>
                <td>
                    <span class="type-badge ${badgeClass}">
                        🐍 ${result.type}
                    </span>
                </td>
                <td>${result.size}</td>
                <td>
                    <div class="quality-indicator">
                        <span class="quality-text">${result.quality}</span>
                    </div>
                </td>
                <td>
                    <span class="seeds-count">${result.seeds || 0}</span>
                    ${result.leeches ? ` / ${result.leeches}` : ''}
                </td>
                <td>
                    <div class="confidence-container">
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${scorePercent}%"></div>
                        </div>
                        <span class="confidence-text">${scorePercent}%</span>
                    </div>
                </td>
                <td>
                    <button class="download-btn" onclick="app.handleDownload('${this.escapeHtml(result.magnet || '')}', '${this.escapeHtml(result.title)}')">
                        ${result.magnet ? '⬇️ Download' : '🔍 Buscar'}
                    </button>
                </td>
            `;

            return row;
        }

        handleDownload(magnet, title) {
            if (magnet && (magnet.startsWith('magnet:') || magnet.startsWith('http'))) {
                this.copyToClipboard(magnet);
                this.showNotification(`📥 Link copiado: ${title}`, 'success');
            } else {
                this.showNotification('ℹ️ Link não disponível para este resultado', 'info');
            }
        }

        // Utility methods (similar to original)
        updateLoadingStatus(message) {
            const statusEl = document.getElementById('loadingStatus');
            if (statusEl) statusEl.textContent = message;
        }

        hideLoadingScreen() {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) loadingScreen.classList.add('hidden');
        }

        updateSearchButton(isLoading) {
            const btn = document.getElementById('searchBtn');
            const input = document.getElementById('searchInput');
            
            if (btn && input) {
                if (isLoading) {
                    btn.innerHTML = '🔄 Buscando...';
                    btn.disabled = true;
                    input.disabled = true;
                } else {
                    btn.innerHTML = '🔍 Buscar Python';
                    btn.disabled = false;
                    input.disabled = false;
                }
            }
        }

        showSearchLoading(show) {
            const loading = document.getElementById('searchLoading');
            if (loading) {
                if (show) {
                    loading.classList.add('active');
                } else {
                    loading.classList.remove('active');
                }
            }
        }

        showEnhancedTimeLapse(query) {
            const modal = document.getElementById('timeLapseModal');
            const queryDisplay = document.getElementById('timeLapseQuery');
            
            if (modal && queryDisplay) {
                queryDisplay.textContent = `"${query}" (Python Backend)`;
                modal.classList.add('show');
                this.updateProgress(0, 'Iniciando busca Python...');
                this.addFeedItem('🐍', 'Busca Python iniciada', 'info');
                this.resetAgents();
            }
        }

        closeTimeLapse() {
            const modal = document.getElementById('timeLapseModal');
            if (modal) {
                modal.classList.remove('show');
                this.resetAgents();
            }
        }

        updateProgress(percent, message) {
            const fill = document.getElementById('progressFill');
            const text = document.getElementById('progressText');
            
            if (fill) fill.style.width = `${percent}%`;
            if (text) text.textContent = message;
        }

        resetAgents() {
            document.querySelectorAll('.agent-card').forEach(card => {
                card.classList.remove('active');
                const status = card.querySelector('.agent-status');
                if (status) status.textContent = 'Aguardando';
            });
        }

        activateAgent(agentId, status) {
            const agent = document.getElementById(agentId);
            if (agent) {
                agent.classList.add('active');
                const statusEl = agent.querySelector('.agent-status');
                if (statusEl) statusEl.textContent = status;
            }
        }

        addFeedItem(icon, message, type = 'info') {
            const feedContent = document.getElementById('liveFeedContent');
            if (!feedContent) return;
            
            const time = new Date().toLocaleTimeString().substr(0, 5);
            
            const item = document.createElement('div');
            item.className = `feed-item ${type}`;
            item.innerHTML = `
                <span class="feed-time">${time}</span>
                <span class="feed-icon">${icon}</span>
                <span class="feed-message">${message}</span>
            `;
            
            feedContent.appendChild(item);
            feedContent.scrollTop = feedContent.scrollHeight;
            
            // Limit feed items
            if (feedContent.children.length > 20) {
                feedContent.removeChild(feedContent.firstChild);
            }
        }

        showNotification(message, type = 'info') {
            const container = document.getElementById('notificationContainer');
            if (!container) return;
            
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            `;
            
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            });
            
            container.appendChild(notification);
            
            setTimeout(() => notification.classList.add('show'), 100);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 5000);
        }

        copyToClipboard(text) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).catch(() => {
                    this.fallbackCopyToClipboard(text);
                });
            } else {
                this.fallbackCopyToClipboard(text);
            }
        }

        fallbackCopyToClipboard(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            document.body.removeChild(textArea);
        }

        escapeHtml(text) {
            if (!text) return '';
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, (m) => map[m]);
        }
    }

    // === GLOBAL INTERFACE ===
    window.JesusIAPythonConfig = {
        PythonAPIClient,
        PythonSearchEngine,
        EnhancedJesusIASystem,
        config: PYTHON_CONFIG
    };

    // Export for global access
    window.PYTHON_CONFIG = PYTHON_CONFIG;

    console.log('🐍 Frontend Python configurado e pronto!');

})();
