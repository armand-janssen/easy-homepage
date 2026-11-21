const fs = require('fs').promises;
const path = require('path');
const CacheManager = require('../utils/cache');
const LogoService = require('./logoService');

// Use native fetch (Node.js 18+) instead of node-fetch
async function fetchWithNativeFetch(url, options = {}) {
  return fetch(url, { signal: AbortSignal.timeout(10000), ...options });
}

// Upstream JSON is a trust boundary: reject shapes the server and frontend can't handle
function validateData(data) {
  const isStr = (v) => typeof v === 'string';
  const ok = data && Array.isArray(data.tabs) && data.tabs.every(tab =>
    tab && isStr(tab.tab) && Array.isArray(tab.categories) && tab.categories.every(cat =>
      cat && isStr(cat.category) && Array.isArray(cat.links) && cat.links.every(link =>
        link && isStr(link.name) && isStr(link.url) &&
        ['logo-hint', 'icon-hint'].every(hint => link[hint] === undefined || isStr(link[hint])))));
  if (!ok) {
    throw new Error('Invalid links data: expected tabs[].categories[].links[] with string name and url');
  }
  return data;
}

class DataService {
  constructor(config) {
    this.config = config;
    this.cacheManager = new CacheManager(config.cacheFile, config.cacheDurationHours);
    this.logoService = new LogoService(config);
    this.cachedData = null;
    this.rawData = null;
    this.rawLoad = null;
  }

  /**
   * Load JSON data from local file
   * @param {string} filePath - Path to JSON file
   * @returns {Promise<Object>} parsed JSON data
   */
  async loadFromLocalFile(filePath) {
    try {
      console.log(`Loading data from local file: ${filePath}`);
      const data = await fs.readFile(filePath, 'utf8');
      return validateData(JSON.parse(data));
    } catch (error) {
      console.error(`Failed to load local file ${filePath}:`, error.message);
      throw new Error(`Could not load local JSON file: ${error.message}`);
    }
  }

  /**
   * Load JSON data from GitHub URL
   * @param {string} githubUrl - GitHub raw URL
   * @param {string} token - Optional GitHub token
   * @returns {Promise<Object>} parsed JSON data
   */
  async loadFromGitHub(githubUrl, token = null) {
    try {
      console.log(`Loading data from GitHub: ${githubUrl}`);
      
      const headers = {
        'User-Agent': 'Easy-Homepage/1.0',
        'Accept': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `token ${token}`;
      }

      const response = await fetchWithNativeFetch(githubUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.text();
      return validateData(JSON.parse(data));
    } catch (error) {
      console.error(`Failed to load from GitHub ${githubUrl}:`, error.message);
      throw new Error(`Could not load JSON from GitHub: ${error.message}`);
    }
  }

  /**
   * Load data from the configured source
   * @returns {Promise<Object>} raw JSON data
   */
  loadRawData() {
    // Single-flight: concurrent callers share one upstream fetch
    this.rawLoad ??= this.fetchRawData()
      .then(data => (this.rawData = data))
      .finally(() => { this.rawLoad = null; });
    return this.rawLoad;
  }

  async fetchRawData() {
    // Priority: GitHub URL > Local file > Default data
    if (this.config.githubUrl) {
      try {
        const data = await this.loadFromGitHub(this.config.githubUrl, this.config.githubToken);
        // Cache the GitHub data
        await this.cacheManager.setCachedData(data);
        return data;
      } catch (error) {
        console.warn('GitHub load failed, trying cache...');
        const cachedData = await this.cacheManager.getCachedData(true); // stale beats nothing
        if (cachedData) {
          console.log('Using cached data as fallback');
          return cachedData;
        }
        throw error;
      }
    }

    if (this.config.localJsonPath) {
      return await this.loadFromLocalFile(this.config.localJsonPath);
    }

    // Fallback to default data
    console.warn('No data source configured, using default data');
    return this.getDefaultData();
  }

  /**
   * Get default data structure
   * @returns {Object} default JSON structure
   */
  getDefaultData() {
    return {
      tabs: [
        {
          tab: "Home",
          categories: [
            {
              category: "Links",
              links: [
                {
                  name: "GitHub",
                  url: "https://github.com",
                  'icon-hint': "github"
                }
              ]
            }
          ]
        }
      ]
    };
  }

  /**
   * Load and enrich data with logos
   * @param {boolean} forceRefresh - Force refresh even if cache is valid
   * @returns {Promise<Object>} enriched data with logos
   */
  async loadData(forceRefresh = false) {
    try {
      let rawData;

      if (forceRefresh) {
        // Keep the disk cache: it is overwritten on success and is the fallback if the source is down
        console.log('Force refresh requested');
        rawData = await this.loadRawData();
      } else {
        // Try cache first for GitHub sources
        if (this.config.githubUrl) {
          const cachedData = await this.cacheManager.getCachedData();
          if (cachedData) {
            console.log('Using cached data');
            rawData = cachedData;
          } else {
            rawData = await this.loadRawData();
          }
        } else {
          rawData = await this.loadRawData();
        }
      }

      this.rawData = rawData; // served by /api/links while logos are still processing

      // Enrich with logos
      const enrichedData = await this.logoService.enrichWithLogos(rawData);
      
      // Cache the enriched data
      await this.cacheManager.setCachedData(enrichedData);
      
      this.cachedData = enrichedData;
      return enrichedData;
    } catch (error) {
      console.error('Failed to load data:', error.message);
      
      // Try to return cached data as fallback
      const cachedData = await this.cacheManager.getCachedData(true); // stale beats nothing
      if (cachedData) {
        console.log('Using cached data as fallback');
        this.cachedData = cachedData;
        return cachedData;
      }

      // Enrichment failed but the links loaded: serve them without logos instead of "loading" forever
      if (!this.cachedData && this.rawData) {
        this.cachedData = this.rawData;
        return this.rawData;
      }
      
      throw error;
    }
  }

  /**
   * Get cached data if available
   * @returns {Object|null} cached data or null
   */
  getCachedData() {
    return this.cachedData;
  }

  /**
   * Refresh data from source
   * @returns {Promise<Object>} refreshed data
   */
  async refreshData() {
    console.log('Refreshing data...');
    return await this.loadData(true);
  }

  /**
   * Get data source information
   * @returns {Object} data source info
   */
  getDataSourceInfo() {
    return {
      source: this.config.githubUrl ? 'github' : (this.config.localJsonPath ? 'local' : 'default')
    };
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} cache stats
   */
  async getCacheStats() {
    const ageHours = await this.cacheManager.getCacheAgeHours();
    const logoStats = await this.logoService.getLogoStats();
    
    return {
      cacheAgeHours: ageHours,
      cacheValid: await this.cacheManager.isCacheValid(),
      totalLogos: logoStats.totalLogos
    };
  }
}

module.exports = DataService;
module.exports.validateData = validateData;
