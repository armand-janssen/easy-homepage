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
const __logo_dev_api_key = "sk_GvAzcQWTS-SNkEru9pfQqw";

const app = Fastify({ logger: true });

app.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
});

const HOME_JSON_PATH = process.env.SITES_JSON_PATH;
const TMP_JSON_PATH = path.join(__dirname, 'tmp-sites.json');
const DEFAULT_ICON_SRC = path.join(__dirname, 'templates', 'default.png');
const ICONS_DIR = path.join(__dirname, 'public', 'icons');

// Helper to hash home.json for change detection
async function hashFile(filePath) {
  try {
    const data = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch {
    return '';
  }
}

// Load home.json
async function loadSites() {
  if (!HOME_JSON_PATH) {
    app.log.warn('No SITES_JSON_PATH provided, returning empty tabs.');
    return { tabs: [] };
  }
  try {
    const data = await fs.readFile(HOME_JSON_PATH, 'utf8');
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
          'Authorization': `Bearer ${__logo_dev_api_key}`,
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

  try {
    homeHash = await hashFile(HOME_JSON_PATH);
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
  const sites = await loadTmpSitesJson();
  if (sites._homeHash) delete sites._homeHash;

  try {
    const templatePath = path.join(__dirname, 'templates', 'index.html');
    let html = await fs.readFile(templatePath, 'utf8');
    html = html.replace('<!--SITES_PLACEHOLDER-->', JSON.stringify(sites));
    reply.type('text/html').send(html);
  } catch (err) {
    app.log.error('Failed to load HTML template:', err.message);
    reply.status(500).send('Internal Server Error');
  }
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
