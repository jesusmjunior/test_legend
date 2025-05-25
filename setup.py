# setup.py - JESUS IA Setup e Configuração

import os
import sys
import subprocess
import sqlite3
import time
from pathlib import Path

def print_banner():
    """Print installation banner"""
    banner = """
╔══════════════════════════════════════════╗
║        🚀 JESUS IA PYTHON SETUP         ║
║       Backend Real de Scraping          ║
╚══════════════════════════════════════════╝
    """
    print(banner)

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ é necessário")
        print(f"   Versão atual: {version.major}.{version.minor}")
        sys.exit(1)
    print(f"✅ Python {version.major}.{version.minor} detectado")

def install_requirements():
    """Install Python requirements"""
    print("\n📦 Instalando dependências...")
    
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"], check=True)
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print("✅ Dependências instaladas com sucesso")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro instalando dependências: {e}")
        sys.exit(1)

def setup_chromedriver():
    """Setup ChromeDriver for Selenium"""
    print("\n🌐 Configurando ChromeDriver...")
    
    try:
        # Try to install chromium via pip
        subprocess.run([sys.executable, "-m", "pip", "install", "webdriver-manager"], check=True)
        
        # Test Chrome availability
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from webdriver_manager.chrome import ChromeDriverManager
        
        options = Options()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        
        driver = webdriver.Chrome(ChromeDriverManager().install(), options=options)
        driver.quit()
        
        print("✅ ChromeDriver configurado com sucesso")
        
    except Exception as e:
        print(f"⚠️ ChromeDriver não configurado: {e}")
        print("   Sites JS podem não funcionar, mas outros sites funcionarão normalmente")

def create_database():
    """Create and initialize database"""
    print("\n💾 Configurando banco de dados...")
    
    try:
        db_path = "jesus_ia_cache.db"
        
        # Remove existing database if exists
        if os.path.exists(db_path):
            os.remove(db_path)
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute("""
            CREATE TABLE search_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_hash TEXT UNIQUE,
                query TEXT,
                results TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT,
                results_count INTEGER,
                processing_time REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE INDEX idx_cache_query_hash ON search_cache(query_hash)
        """)
        
        cursor.execute("""
            CREATE INDEX idx_history_created ON search_history(created_at)
        """)
        
        conn.commit()
        conn.close()
        
        print("✅ Banco de dados configurado")
        
    except Exception as e:
        print(f"❌ Erro configurando banco: {e}")
        sys.exit(1)

def create_env_file():
    """Create .env file with configuration"""
    print("\n⚙️ Configurando arquivo de ambiente...")
    
    env_content = """# JESUS IA Configuration

# API Settings
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# Gemini AI (Opcional - mas recomendado para melhor qualidade)
GEMINI_API_KEY=AIzaSyACH3eDK2fKaEDE4odCVqWvwniU0csyfE8

# Scraping Settings
MAX_CONCURRENT_SCRAPES=5
REQUEST_TIMEOUT=20
SCRAPING_DELAY_MIN=2
SCRAPING_DELAY_MAX=5

# Cache Settings
CACHE_DURATION_HOURS=6
MAX_CACHE_ITEMS=1000

# Database
DB_PATH=jesus_ia_cache.db
"""
    
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("✅ Arquivo .env criado")
    print("   💡 Edite o arquivo .env para configurar sua API Key do Gemini")

def create_run_script():
    """Create run script"""
    print("\n🚀 Criando script de execução...")
    
    # Windows batch file
    bat_content = """@echo off
echo 🚀 Iniciando JESUS IA Backend Python...
python main.py
pause
"""
    
    with open('run.bat', 'w') as f:
        f.write(bat_content)
    
    # Unix shell script
    sh_content = """#!/bin/bash
echo "🚀 Iniciando JESUS IA Backend Python..."
python3 main.py
"""
    
    with open('run.sh', 'w') as f:
        f.write(sh_content)
    
    # Make shell script executable
    if os.name != 'nt':
        os.chmod('run.sh', 0o755)
    
    print("✅ Scripts de execução criados:")
    print("   Windows: run.bat")
    print("   Linux/Mac: ./run.sh")

def test_installation():
    """Test if installation is working"""
    print("\n🧪 Testando instalação...")
    
    try:
        # Test imports
        import fastapi
        import aiohttp
        import bs4
        import sqlite3
        
        print("✅ Imports básicos funcionando")
        
        # Test database
        conn = sqlite3.connect("jesus_ia_cache.db")
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM search_cache")
        conn.close()
        
        print("✅ Banco de dados funcionando")
        
        # Test Gemini AI (optional)
        try:
            import google.generativeai as genai
            print("✅ Gemini AI disponível")
        except ImportError:
            print("⚠️ Gemini AI não configurado (opcional)")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        return False

def main():
    """Main setup function"""
    print_banner()
    
    print("🔍 Verificando sistema...")
    check_python_version()
    
    install_requirements()
    setup_chromedriver()
    create_database()
    create_env_file()
    create_run_script()
    
    if test_installation():
        print("\n" + "="*50)
        print("🎉 SETUP CONCLUÍDO COM SUCESSO!")
        print("="*50)
        print("\n📋 PRÓXIMOS PASSOS:")
        print("1. Execute: python main.py")
        print("2. Ou use: run.bat (Windows) / ./run.sh (Linux/Mac)")
        print("3. Acesse: http://localhost:8000")
        print("4. Frontend: Atualize a configuração para usar Python backend")
        print("\n💡 DICAS:")
        print("- Configure GEMINI_API_KEY no arquivo .env para melhor IA")
        print("- Backend roda na porta 8000 por padrão")
        print("- Logs aparecem no terminal para debug")
        print("\n🔗 Endpoints disponíveis:")
        print("- GET  /api/health - Status do sistema")
        print("- POST /api/search - Busca principal")
        print("- GET  /api/sites  - Sites disponíveis")
        
    else:
        print("\n❌ Setup falhou. Verifique os erros acima.")
        sys.exit(1)

if __name__ == "__main__":
    main()
