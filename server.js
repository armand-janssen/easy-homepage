import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = Fastify({ logger: true });

app.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
});

const HOME_JSON_PATH = process.env.SITES_JSON_PATH;
const TMP_JSON_PATH = path.join(__dirname, 'tmp-sites.json');
const DEFAULT_ICON_SRC = path.join(__dirname, 'templates', 'default.png');
const ICONS_DIR = path.join(__dirname, 'public', 'icons');
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const LOGO_DEV_API_KEY = process.env.LOGO_DEV_API_KEY;

// Helper to hash home.json for change detection
async function hashFile(filePath) {
  try {
    const data = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch {
    return '';
  }
}

// Helper to hash a string (for GitHub content)
function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Helper to download JSON from GitHub
async function fetchGithubJson() {
  if (!GITHUB_OWNER || !GITHUB_REPO_NAME || !GITHUB_FILE_PATH) {
    throw new Error('Missing GitHub environment variables');
  }
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}`;
  const headers = {
    'Accept': 'application/vnd.github.v3.raw'
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
   app.log.info('2');
     const res = await fetch(apiUrl, { headers });
  if (!res.ok) {
    const errorText = await res.text();
    app.log.error(`GitHub fetch error: status=${res.status} statusText=${res.statusText} url=${apiUrl} body=${errorText}`);
    throw new Error(`Failed to fetch from GitHub: ${res.status} ${res.statusText} - ${errorText}`);
  }
      app.log.info('223');
  return await res.text();
}

async function loadSites() {
  // If GitHub env vars are set, fetch from GitHub
      app.log.info(`GITHUB_OWNER: ${GITHUB_OWNER}`);
      app.log.info(`GITHUB_REPO_NAME: ${GITHUB_REPO_NAME}`);
      app.log.info(`GITHUB_FILE_PATH: ${GITHUB_FILE_PATH}`);
      app.log.info(`GITHUB_TOKEN: ${GITHUB_TOKEN ? GITHUB_TOKEN.slice(0, 6) + '...' : ''}`);
  if (GITHUB_OWNER && GITHUB_REPO_NAME && GITHUB_FILE_PATH) {
      app.log.info('33');
    try {
      const jsonText = await fetchGithubJson();
      app.log.info('1');
      app.log.info(jsonText)
      app.log.info('111');
      return JSON.parse(jsonText);
    } catch (err) {
      app.log.error('Failed to fetch/parse JSON from GitHub:', err.message);
      return { tabs: [] };
    }
  }
        app.log.info('33-33');

  // Otherwise, load from local file
  if (!HOME_JSON_PATH) {
    app.log.warn('No SITES_JSON_PATH provided, returning empty tabs.');
    return { tabs: [] };
  }
        app.log.info('33-33-33');
  try {
    const data = await fs.readFile(HOME_JSON_PATH, 'utf8');
        app.log.info('33-33-33-33');
    return JSON.parse(data);
  } catch (err) {
    app.log.error('Failed to read/parse JSON:', err.message);
    return { tabs: [] };
  }
}

// Download icon and save as iconHint.png
async function getIcon(iconHint, name) {
  if (!iconHint && !name) return null;

  await fs.mkdir(ICONS_DIR, { recursive: true });

  // Always use iconHint (if present) as the filename, fallback to name
  const baseName = iconHint || name;
  const iconFilename = `${baseName}.png`;
  const iconPath = path.join(ICONS_DIR, iconFilename);

  // Return if already exists
  try {
    await fs.access(iconPath);
    return iconFilename;
  } catch { }

  async function fetchLogoDev(query) {
    if (!query) return false;
    try {
      const logoUrl = `https://api.logo.dev/search?q=${encodeURIComponent(query)}`;
      app.log.info(`Fetching logo for "${query}" from Logo.dev API: ${logoUrl}`);
      const res = await fetch(logoUrl, {
        headers: {
          'Authorization': `Bearer ${LOGO_DEV_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      if (!res.ok) return false;
      const results = await res.json();
      if (!Array.isArray(results) || results.length === 0) return false;
      const logoPngUrl = results[0].logo_url;
      if (!logoPngUrl) return false;
      const imgRes = await fetch(logoPngUrl);
      if (!imgRes.ok) return false;
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      await fs.writeFile(iconPath, buffer);
      return true;
    } catch {
      return false;
    }
  }

  // Try iconHint first, then name
  if (await fetchLogoDev(iconHint)) return iconFilename;
  if (iconHint !== name && await fetchLogoDev(name)) return iconFilename;

  // Fallback to default.png from templates
  try {
    await fs.copyFile(DEFAULT_ICON_SRC, iconPath);
    return iconFilename;
  } catch {
    return null;
  }
}

// Generate tmp-sites.json with resolved icon-file fields
async function generateTmpSitesJson() {
  const sites = await loadSites();
  const tabs = sites.tabs || [];
  const limit = pLimit(5);
  const tasks = [];

  tabs.forEach(tab => {
    tab.categories.forEach(category => {
      category.links.forEach(link => {
        tasks.push(limit(async () => {
          const iconHint = link['icon-hint'];
          const iconFile = await getIcon(iconHint, link.name);
          link['icon-file'] = iconFile || 'default.png';
        }));
      });
    });
  });

  await Promise.all(tasks);

  // Save to tmp-sites.json
  await fs.writeFile(TMP_JSON_PATH, JSON.stringify(sites, null, 2));
  return sites;
}

// Load or regenerate tmp-sites.json if needed
async function loadTmpSitesJson() {
  let needRegen = false;
  let homeHash = '';
  let tmpHash = '';

  let githubMode = GITHUB_OWNER && GITHUB_REPO_NAME && GITHUB_FILE_PATH;

  try {
    if (githubMode) {
      // Fetch GitHub content and hash it
      const githubContent = await fetchGithubJson();
      homeHash = hashString(githubContent);
    } else {
      // Hash local file
      homeHash = await hashFile(HOME_JSON_PATH);
    }

    const tmpData = await fs.readFile(TMP_JSON_PATH, 'utf8');
    const tmpSites = JSON.parse(tmpData);
    tmpHash = tmpSites._homeHash || '';
    if (homeHash !== tmpHash) needRegen = true;
    else return tmpSites;
  } catch {
    needRegen = true;
  }

  if (needRegen) {
    const sites = await generateTmpSitesJson();
    // Add hash for change detection
    sites._homeHash = homeHash;
    await fs.writeFile(TMP_JSON_PATH, JSON.stringify(sites, null, 2));
    return sites;
  }
}

// API endpoint to get sites JSON
app.get('/api/sites', async () => {
  const sites = await loadTmpSitesJson();
  // Remove _homeHash before sending to client
  if (sites._homeHash) delete sites._homeHash;
  return sites;
});

app.get('/', async (req, reply) => {
  // Just serve the HTML, do not inject JSON
  const templatePath = path.join(__dirname, 'templates', 'index.html');
  let html = await fs.readFile(templatePath, 'utf8');
  reply.type('text/html').send(html);
});

async function start() {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    app.log.info('Server running on port 3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
