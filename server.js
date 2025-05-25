// server.js - JESUS IA Backend Real
// Sistema completo com APIs reais, scraping e time lapse

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');
const Redis = require('redis');
const path = require('path');

// === CONFIGURAÇÃO ===
const CONFIG = {
    port: process.env.PORT || 3000,
    gemini_api_key: process.env.GEMINI_API_KEY || 'AIzaSyACH3eDK2fKaEDE4odCVqWvwniU0csyfE8',
    redis_url: process.env.REDIS_URL || 'redis://localhost:6379',
    scraping_timeout: 30000,
    max_concurrent_scrapes: 5,
    rate_limit_window: 15 * 60 * 1000, // 15 minutos
    rate_limit_max: 100 // requests por window
};

// === LOGGER ===
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// === APP SETUP ===
const app = express();
const server = http.createServer(app);
const io = socketIo(server,
