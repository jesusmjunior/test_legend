# main.py - JESUS IA Backend Python Real
# Scraping direto + IA + API consolidada

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import asyncio
import aiohttp
import requests
from bs4 import BeautifulSoup
import re
import time
import random
import json
import hashlib
from datetime import datetime, timedelta
import sqlite3
import logging
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import google.generativeai as genai
from urllib.parse import quote, urljoin
import warnings
warnings.filterwarnings("ignore")

# === CONFIGURAÇÕES ===
class Config:
    # API Settings
    API_HOST = "0.0.0.0"
    API_PORT = 8000
    DEBUG = True
    
    # Gemini AI
    GEMINI_API_KEY = "AIzaSyACH3eDK2fKaEDE4odCVqWvwniU0csyfE8"
    
    # Scraping Settings
    MAX_CONCURRENT_SCRAPES = 5
    REQUEST_TIMEOUT = 20
    SCRAPING_DELAY = (2, 5)  # Random delay between requests
    MAX_RETRIES = 3
    
    # Cache Settings
    CACHE_DURATION_HOURS = 6
    MAX_CACHE_ITEMS = 1000
    
    # Database
    DB_PATH = "jesus_ia_cache.db"

# === MODELS ===
class SearchRequest(BaseModel):
    query: str
    mode: str = "scraping"  # scraping, ai-organize, memory
    max_sites: int = 5
    use_ai: bool = True

class TorrentResult(BaseModel):
    title: str
    size: str
    seeds: int
    leeches: int
    source: str
    type: str
    quality: str
    magnet_link: Optional[str] = None
    download_url: Optional[str] = None
    ai_score: float = 0.0
    real_data: bool = True
    scraped_at: int

class SearchResponse(BaseModel):
    results: List[TorrentResult]
    metadata: Dict[str, Any]
    query: str
    processing_time: float

# === TORRENT SITES CONFIGURATION ===
TORRENT_SITES = {
    "1337x": {
        "name": "1337x",
        "base_url": "https://1337x.to",
        "search_url": "https://1337x.to/search/{query}/1/",
        "selectors": {
            "results": "tbody tr",
            "title": ".name a:last-child",
            "size": ".size",
            "seeds": ".seeds",
            "leeches": ".leeches",
            "category": ".coll-1 a"
        },
        "active": True,
        "reliability": 0.95,
        "requires_js": False
    },
    "yts": {
        "name": "YTS",
        "api_url": "https://yts.mx/api/v2/list_movies.json",
        "search_params": {"query_term": "{query}", "limit": 20},
        "active": True,
        "reliability": 0.90,
        "is_api": True
    },
    "rarbg": {
        "name": "RARBG",
        "base_url": "https://rarbgprx.org",
        "search_url": "https://rarbgprx.org/torrents.php?search={query}",
        "selectors": {
            "results": ".lista2 tr",
            "title": "td:nth-child(2) a",
            "size": "td:nth-child(4)",
            "seeds": "td:nth-child(5)",
            "leeches": "td:nth-child(6)"
        },
        "active": True,
        "reliability": 0.85,
        "requires_js": False
    },
    "torrentgalaxy": {
        "name": "TorrentGalaxy", 
        "base_url": "https://torrentgalaxy.to",
        "search_url": "https://torrentgalaxy.to/torrents.php?search={query}",
        "selectors": {
            "results": "#tor tr",
            "title": ".txlight a",
            "size": "span.badge-secondary",
            "seeds": "font[color='green']",
            "leeches": "font[color='#ff0000']"
        },
        "active": True,
        "reliability": 0.87,
        "requires_js": True
    },
    "limetorrents": {
        "name": "LimeTorrents",
        "base_url": "https://www.limetorrents.lol",
        "search_url": "https://www.limetorrents.lol/search/all/{query}/",
        "selectors": {
            "results": ".table2 tr",
            "title": ".tt-name a",
            "size": ".tdnormal:nth-child(3)",
            "seeds": ".tdseed",
            "leeches": ".tdleech"
        },
        "active": True,
        "reliability": 0.82,
        "requires_js": False
    }
}

# === SETUP LOGGING ===
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# === DATABASE SETUP ===
def init_database():
    """Initialize SQLite database for caching"""
    conn = sqlite3.connect(Config.DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS search_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query_hash TEXT UNIQUE,
            query TEXT,
            results TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT,
            results_count INTEGER,
            processing_time REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

# === AI PROCESSING ===
class AIProcessor:
    def __init__(self):
        if Config.GEMINI_API_KEY:
            genai.configure(api_key=Config.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            self.enabled = True
            logger.info("✅ Gemini AI inicializado")
        else:
            self.enabled = False
            logger.warning("⚠️ Gemini AI não configurado")
    
    async def enhance_search_query(self, query: str) -> List[str]:
        """Enhance search query with AI variations"""
        if not self.enabled:
            return [query]
        
        try:
            prompt = f"""
Otimize este termo de busca para encontrar torrents: "{query}"

Gere 3-5 variações que maximizem os resultados, incluindo:
- Variações de escrita
- Termos alternativos
- Formatos específicos (se aplicável)

Responda APENAS com JSON:
{{
  "variations": ["variação1", "variação2", "variação3"]
}}
            """
            
            response = await asyncio.to_thread(
                self.model.generate_content, prompt
            )
            
            # Extract JSON from response
            text = response.text
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                data = json.loads(json_match.group())
                return [query] + data.get('variations', [])
            
        except Exception as e:
            logger.error(f"Erro AI enhancement: {e}")
        
        return [query]
    
    async def score_and_organize_results(self, results: List[Dict], query: str) -> List[Dict]:
        """Score and organize results using AI"""
        if not self.enabled or not results:
            return results
        
        try:
            # Calculate AI scores for each result
            for result in results:
                result['ai_score'] = self._calculate_relevance_score(result, query)
            
            # Sort by AI score + seeds
            results.sort(key=lambda x: (x['ai_score'] * 0.7 + min(x['seeds']/100, 1) * 0.3), reverse=True)
            
            # Filter low quality results
            filtered = [r for r in results if r['ai_score'] > 0.3 or r['seeds'] > 10]
            
            logger.info(f"AI processou {len(results)} → {len(filtered)} resultados")
            return filtered
            
        except Exception as e:
            logger.error(f"Erro AI scoring: {e}")
            return results
    
    def _calculate_relevance_score(self, result: Dict, query: str) -> float:
        """Calculate relevance score for a result"""
        score = 0.0
        
        title = result['title'].lower()
        query_words = query.lower().split()
        
        # Title matching score
        for word in query_words:
            if word in title:
                score += 0.3
        
        # Quality score
        quality_scores = {
            '4k': 1.0, '2160p': 1.0,
            '1080p': 0.8, 'bluray': 0.9,
            '720p': 0.6, 'web-dl': 0.7,
            '480p': 0.4, 'hdtv': 0.5,
            'cam': 0.1, 'ts': 0.1
        }
        
        for quality, q_score in quality_scores.items():
            if quality in title:
                score += q_score * 0.2
                break
        
        # Seeds score
        seeds_score = min(result['seeds'] / 100, 1) * 0.3
        score += seeds_score
        
        # Source reliability
        source_reliability = TORRENT_SITES.get(result['source'], {}).get('reliability', 0.5)
        score += source_reliability * 0.2
        
        return min(score, 1.0)

# === SCRAPING ENGINE ===
class ScrapingEngine:
    def __init__(self):
        self.session = None
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        self.selenium_driver = None
    
    async def init_session(self):
        """Initialize aiohttp session"""
        if not self.session:
            connector = aiohttp.TCPConnector(limit=20, force_close=True, enable_cleanup_closed=True)
            timeout = aiohttp.ClientTimeout(total=Config.REQUEST_TIMEOUT)
            self.session = aiohttp.ClientSession(connector=connector, timeout=timeout)
    
    def get_selenium_driver(self):
        """Get Selenium driver for JS-heavy sites"""
        if not self.selenium_driver:
            options = Options()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument('--window-size=1920,1080')
            options.add_argument(f'--user-agent={random.choice(self.user_agents)}')
            
            try:
                self.selenium_driver = webdriver.Chrome(options=options)
                logger.info("✅ Selenium WebDriver inicializado")
            except Exception as e:
                logger.error(f"❌ Erro inicializando Selenium: {e}")
                self.selenium_driver = None
        
        return self.selenium_driver
    
    async def scrape_all_sites(self, query: str, max_sites: int = 5) -> List[Dict]:
        """Scrape all active torrent sites"""
        await self.init_session()
        
        active_sites = [
            (name, config) for name, config in TORRENT_SITES.items() 
            if config['active']
        ][:max_sites]
        
        logger.info(f"🕸️ Iniciando scraping em {len(active_sites)} sites para: {query}")
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(Config.MAX_CONCURRENT_SCRAPES)
        
        # Run scraping tasks concurrently
        tasks = [
            self._scrape_site_with_semaphore(semaphore, site_name, site_config, query)
            for site_name, site_config in active_sites
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Flatten results and filter exceptions
        all_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                site_name = active_sites[i][0]
                logger.error(f"❌ Erro em {site_name}: {result}")
            elif isinstance(result, list):
                all_results.extend(result)
        
        logger.info(f"✅ Scraping concluído: {len(all_results)} resultados totais")
        return all_results
    
    async def _scrape_site_with_semaphore(self, semaphore, site_name: str, site_config: Dict, query: str):
        """Scrape a single site with semaphore control"""
        async with semaphore:
            await asyncio.sleep(random.uniform(*Config.SCRAPING_DELAY))
            return await self._scrape_single_site(site_name, site_config, query)
    
    async def _scrape_single_site(self, site_name: str, site_config: Dict, query: str) -> List[Dict]:
        """Scrape a single torrent site"""
        try:
            logger.info(f"🌐 Scraping {site_name}...")
            
            if site_config.get('is_api'):
                return await self._scrape_api_site(site_name, site_config, query)
            elif site_config.get('requires_js'):
                return await self._scrape_js_site(site_name, site_config, query)
            else:
                return await self._scrape_html_site(site_name, site_config, query)
                
        except Exception as e:
            logger.error(f"❌ Erro scraping {site_name}: {e}")
            return []
    
    async def _scrape_api_site(self, site_name: str, site_config: Dict, query: str) -> List[Dict]:
        """Scrape API-based sites (like YTS)"""
        try:
            if site_name == "yts":
                params = {"query_term": query, "limit": 20, "sort_by": "seeds"}
                
                async with self.session.get(site_config['api_url'], params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_yts_response(data, site_name)
            
            return []
        except Exception as e:
            logger.error(f"Erro API {site_name}: {e}")
            return []
    
    async def _scrape_html_site(self, site_name: str, site_config: Dict, query: str) -> List[Dict]:
        """Scrape HTML-based sites"""
        try:
            search_url = site_config['search_url'].format(query=quote(query))
            headers = {
                'User-Agent': random.choice(self.user_agents),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
            }
            
            async with self.session.get(search_url, headers=headers) as response:
                if response.status == 200:
                    html = await response.text()
                    return self._parse_html_results(html, site_config, site_name)
                else:
                    logger.warning(f"{site_name} retornou status {response.status}")
            
            return []
        except Exception as e:
            logger.error(f"Erro HTML {site_name}: {e}")
            return []
    
    async def _scrape_js_site(self, site_name: str, site_config: Dict, query: str) -> List[Dict]:
        """Scrape JavaScript-heavy sites using Selenium"""
        driver = self.get_selenium_driver()
        if not driver:
            logger.warning(f"Selenium não disponível para {site_name}")
            return []
        
        try:
            search_url = site_config['search_url'].format(query=quote(query))
            
            # Execute in thread to avoid blocking
            return await asyncio.to_thread(self._selenium_scrape, driver, search_url, site_config, site_name)
            
        except Exception as e:
            logger.error(f"Erro Selenium {site_name}: {e}")
            return []
    
    def _selenium_scrape(self, driver, url: str, site_config: Dict, site_name: str) -> List[Dict]:
        """Execute Selenium scraping in thread"""
        try:
            driver.get(url)
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Wait for content to load
            time.sleep(3)
            
            html = driver.page_source
            return self._parse_html_results(html, site_config, site_name)
            
        except Exception as e:
            logger.error(f"Erro execução Selenium: {e}")
            return []
    
    def _parse_html_results(self, html: str, site_config: Dict, site_name: str) -> List[Dict]:
        """Parse HTML results using BeautifulSoup"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            selectors = site_config['selectors']
            results = []
            
            # Find result rows
            rows = soup.select(selectors['results'])
            
            for row in rows[:20]:  # Limit to 20 results per site
                try:
                    # Extract title
                    title_elem = row.select_one(selectors['title'])
                    if not title_elem:
                        continue
                    
                    title = title_elem.get_text(strip=True)
                    if not title or len(title) < 5:
                        continue
                    
                    # Extract other fields
                    size = self._extract_text(row, selectors.get('size', ''), 'N/A')
                    seeds = self._extract_number(row, selectors.get('seeds', ''), 0)
                    leeches = self._extract_number(row, selectors.get('leeches', ''), 0)
                    
                    # Create result
                    result = {
                        'title': title,
                        'size': size,
                        'seeds': seeds,
                        'leeches': leeches,
                        'source': site_name,
                        'type': self._detect_content_type(title),
                        'quality': self._extract_quality(title),
                        'magnet_link': self._extract_magnet_link(row),
                        'download_url': None,
                        'ai_score': 0.0,
                        'real_data': True,
                        'scraped_at': int(time.time())
                    }
                    
                    results.append(result)
                    
                except Exception as e:
                    logger.debug(f"Erro parsing row em {site_name}: {e}")
                    continue
            
            logger.info(f"✅ {site_name}: {len(results)} resultados extraídos")
            return results
            
        except Exception as e:
            logger.error(f"Erro parsing {site_name}: {e}")
            return []
    
    def _parse_yts_response(self, data: Dict, site_name: str) -> List[Dict]:
        """Parse YTS API response"""
        results = []
        
        if data.get('status') == 'ok' and data.get('data', {}).get('movies'):
            for movie in data['data']['movies']:
                torrents = movie.get('torrents', [])
                
                for torrent in torrents:
                    result = {
                        'title': f"{movie['title']} ({movie['year']}) [{torrent.get('quality', 'N/A')}]",
                        'size': torrent.get('size', 'N/A'),
                        'seeds': torrent.get('seeds', 0),
                        'leeches': torrent.get('peers', 0),
                        'source': site_name,
                        'type': 'Filme',
                        'quality': torrent.get('quality', 'N/A'),
                        'magnet_link': None,
                        'download_url': torrent.get('url'),
                        'ai_score': 0.0,
                        'real_data': True,
                        'scraped_at': int(time.time())
                    }
                    results.append(result)
        
        return results
    
    def _extract_text(self, element, selector: str, default: str = '') -> str:
        """Extract text from element using selector"""
        try:
            if selector:
                elem = element.select_one(selector)
                return elem.get_text(strip=True) if elem else default
            return default
        except:
            return default
    
    def _extract_number(self, element, selector: str, default: int = 0) -> int:
        """Extract number from element using selector"""
        try:
            text = self._extract_text(element, selector, '0')
            numbers = re.findall(r'\d+', text)
            return int(numbers[0]) if numbers else default
        except:
            return default
    
    def _extract_magnet_link(self, element) -> Optional[str]:
        """Extract magnet link from element"""
        try:
            magnet_link = element.select_one('a[href^="magnet:"]')
            return magnet_link['href'] if magnet_link else None
        except:
            return None
    
    def _detect_content_type(self, title: str) -> str:
        """Detect if content is movie or series"""
        title_lower = title.lower()
        series_indicators = ['s0', 'season', 'episode', 'ep', 'series', 'temporada']
        
        for indicator in series_indicators:
            if indicator in title_lower:
                return 'Série'
        
        return 'Filme'
    
    def _extract_quality(self, title: str) -> str:
        """Extract quality from title"""
        quality_patterns = [
            r'(4K|2160p)', r'(1080p)', r'(720p)', r'(480p)',
            r'(BluRay|Blu-ray)', r'(WEB-DL)', r'(HDTV)', r'(HDRip)',
            r'(CAM)', r'(TS)', r'(DVDRip)'
        ]
        
        for pattern in quality_patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return 'N/A'
    
    async def close(self):
        """Clean up resources"""
        if self.session:
            await self.session.close()
        
        if self.selenium_driver:
            self.selenium_driver.quit()

# === CACHE MANAGER ===
class CacheManager:
    @staticmethod
    def get_query_hash(query: str) -> str:
        """Generate hash for query"""
        return hashlib.md5(query.lower().strip().encode()).hexdigest()
    
    @staticmethod
    def get_cached_results(query: str) -> Optional[List[Dict]]:
        """Get cached results for query"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            query_hash = CacheManager.get_query_hash(query)
            now = datetime.now()
            
            cursor.execute("""
                SELECT results FROM search_cache 
                WHERE query_hash = ? AND expires_at > ?
            """, (query_hash, now))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                logger.info(f"📦 Cache hit para: {query}")
                return json.loads(result[0])
            
            return None
            
        except Exception as e:
            logger.error(f"Erro lendo cache: {e}")
            return None
    
    @staticmethod
    def cache_results(query: str, results: List[Dict]):
        """Cache search results"""
        try:
            conn = sqlite3.connect(Config.DB_PATH)
            cursor = conn.cursor()
            
            query_hash = CacheManager.get_query_hash(query)
            expires_at = datetime.now() + timedelta(hours=Config.CACHE_DURATION_HOURS)
            
            cursor.execute("""
                INSERT OR REPLACE INTO search_cache 
                (query_hash, query, results, expires_at)
                VALUES (?, ?, ?, ?)
            """, (query_hash, query, json.dumps(results), expires_at))
            
            # Clean old cache entries
            cursor.execute("""
                DELETE FROM search_cache 
                WHERE expires_at < ? OR id NOT IN (
                    SELECT id FROM search_cache 
                    ORDER BY created_at DESC 
                    LIMIT ?
                )
            """, (datetime.now(), Config.MAX_CACHE_ITEMS))
            
            conn.commit()
            conn.close()
            
            logger.info(f"💾 Resultados cacheados para: {query}")
            
        except Exception as e:
            logger.error(f"Erro salvando cache: {e}")

# === MAIN APPLICATION ===
app = FastAPI(
    title="JESUS IA Backend Python",
    description="Sistema real de scraping + IA para busca de torrents",
    version="3.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
scraper = ScrapingEngine()
ai_processor = AIProcessor()

@app.on_event("startup")
async def startup_event():
    """Initialize application"""
    init_database()
    logger.info("🚀 JESUS IA Backend Python iniciado")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources"""
    await scraper.close()
    logger.info("👋 JESUS IA Backend Python encerrado")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "JESUS IA Backend Python",
        "version": "3.0.0",
        "status": "running",
        "ai_enabled": ai_processor.enabled,
        "sites_available": len([s for s in TORRENT_SITES.values() if s['active']])
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": int(time.time()),
        "version": "3.0.0-python",
        "mode": "production",
        "services": {
            "database": "sqlite3",
            "ai": ai_processor.enabled,
            "scraping": "active",
            "cache": "active"
        },
        "sites": len(TORRENT_SITES)
    }

@app.post("/api/search", response_model=SearchResponse)
async def search_torrents(request: SearchRequest, background_tasks: BackgroundTasks):
    """Main search endpoint"""
    start_time = time.time()
    query = request.query.strip()
    
    if not query:
        raise HTTPException(status_code=400, detail="Query é obrigatória")
    
    logger.info(f"🔍 Nova busca: '{query}' (modo: {request.mode})")
    
    try:
        # Check cache first
        if request.mode != "memory":
            cached_results = CacheManager.get_cached_results(query)
            if cached_results:
                processing_time = time.time() - start_time
                return SearchResponse(
                    results=[TorrentResult(**r) for r in cached_results],
                    metadata={
                        "cached": True,
                        "total_results": len(cached_results),
                        "processing_time": processing_time,
                        "sources_used": len(set(r['source'] for r in cached_results)),
                        "ai_processed": any(r.get('ai_score', 0) > 0 for r in cached_results)
                    },
                    query=query,
                    processing_time=processing_time
                )
        
        # Enhance query with AI if enabled
        search_queries = [query]
        if request.use_ai and ai_processor.enabled:
            enhanced_queries = await ai_processor.enhance_search_query(query)
            search_queries = enhanced_queries[:3]  # Limit to 3 variations
        
        # Scrape all sites for all queries
        all_results = []
        for search_query in search_queries:
            results = await scraper.scrape_all_sites(search_query, request.max_sites)
            all_results.extend(results)
        
        # Remove duplicates
        unique_results = []
        seen_titles = set()
        for result in all_results:
            title_key = result['title'].lower().replace(' ', '')
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique_results.append(result)
        
        # Process with AI if enabled
        if request.use_ai and ai_processor.enabled:
            processed_results = await ai_processor.score_and_organize_results(unique_results, query)
        else:
            # Simple sorting by seeds
            processed_results = sorted(unique_results, key=lambda x: x['seeds'], reverse=True)
        
        # Limit results
        final_results = processed_results[:50]
        
        # Cache results
        background_tasks.add_task(CacheManager.cache_results, query, final_results)
        
        # Save to history
        background_tasks.add_task(save_search_history, query, len(final_results), time.time() - start_time)
        
        processing_time = time.time() - start_time
        
        response = SearchResponse(
            results=[TorrentResult(**r) for r in final_results],
            metadata={
                "cached": False,
                "total_results": len(final_results),
                "processing_time": processing_time,
                "sources_used": len(set(r['source'] for r in final_results)),
                "ai_processed": request.use_ai and ai_processor.enabled,
                "queries_used": len(search_queries)
            },
            query=query,
            processing_time=processing_time
        )
        
        logger.info(f"✅ Busca concluída: {len(final_results)} resultados em {processing_time:.2f}s")
        return response
        
    except Exception as e:
        logger.error(f"❌ Erro na busca: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.get("/api/sites")
async def get_sites():
    """Get available torrent sites"""
    sites = []
    for name, config in TORRENT_SITES.items():
        sites.append({
            "name": config["name"],
            "active": config["active"],
            "reliability": config["reliability"],
            "type": "API" if config.get("is_api") else ("JS" if config.get("requires_js") else "HTML")
        })
    return sites

async def save_search_history(query: str, results_count: int, processing_time: float):
    """Save search to history"""
    try:
        conn = sqlite3.connect(Config.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO search_history (query, results_count, processing_time)
            VALUES (?, ?, ?)
        """, (query, results_count, processing_time))
        
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Erro salvando histórico: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=Config.API_HOST, port=Config.API_PORT, log_level="info")
