const fs = require('fs').promises;
const path = require('path');

// Use native fetch (Node.js 18+) instead of node-fetch
async function fetchWithNativeFetch(url, options = {}) {
  return fetch(url, options);
}

class LogoService {
  constructor(config) {
    this.config = config;
    this.logosDir = config.logosDir;
    this.logoDevBaseUrl = config.logoDevBaseUrl;
    this.logoDevToken = config.logoDevToken;
    this.logoDevFormat = config.logoDevFormat;
  }

  /**
   * Ensure logos directory exists
   * @returns {Promise<void>}
   */
  async ensureLogosDir() {
    try {
      await fs.mkdir(this.logosDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create logos directory:', error.message);
      throw error;
    }
  }

  /**
   * Extract domain from URL
   * @param {string} url - Full URL
   * @returns {string} domain name
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (error) {
      console.warn(`Invalid URL: ${url}`);
      return null;
    }
  }

  /**
   * Extract separate words from a name/title for fallback logo searches
   * @param {string} name - The name/title to extract words from
   * @returns {Array<string>} array of individual words
   */
  extractWordsFromName(name) {
    // Split by common separators and clean up
    const words = name
      .split(/[\s\-_\.]+/) // Split by spaces, hyphens, underscores, dots
      .map(word => word.trim())
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase());
    
    // Remove duplicates while preserving order
    return [...new Set(words)];
  }

  /**
   * Generate logo filename
   * @param {string} category - Category name
   * @param {string} linkName - Link name
   * @returns {string} filename
   */
  generateLogoFilename(category, linkName) {
    const safeCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const safeLinkName = linkName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${safeCategory}_${safeLinkName}.${this.logoDevFormat}`;
  }

  /**
   * Check if logo file already exists
   * @param {string} filename - Logo filename
   * @returns {Promise<boolean>} true if file exists
   */
  async logoExists(filename) {
    try {
      const filepath = path.join(this.logosDir, filename);
      await fs.access(filepath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Download logo from logo.dev
   * @param {string} searchTerm - Search term (name, domain, or word)
   * @param {string} filename - Local filename to save as
   * @returns {Promise<boolean>} true if successful
   */
  async downloadLogo(searchTerm, filename) {
    try {
      // Use the search API with query parameter
      const logoUrl = `${this.logoDevBaseUrl}?q=${encodeURIComponent(searchTerm)}`;
      
      console.log(`Fetching logo for "${searchTerm}" from Logo.dev API: ${logoUrl}`);
      
      if (!this.logoDevToken) {
        console.warn(`No Logo.dev token available for ${searchTerm}`);
        return false;
      }

      const response = await fetchWithNativeFetch(logoUrl, {
        headers: {
          'Authorization': `Bearer ${this.logoDevToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`Failed to fetch logo for ${searchTerm}: ${response.status} ${response.statusText}`);
        return false;
      }

      const results = await response.json();
      console.log(`API response for ${searchTerm}:`, results);
      
      if (!Array.isArray(results) || results.length === 0) {
        console.warn(`No results found for ${searchTerm}`);
        return false;
      }

      const logoPngUrl = results[0].logo_url;
      if (!logoPngUrl) {
        console.warn(`No logo_url found in results for ${searchTerm}`);
        return false;
      }

      console.log(`Downloading logo image from: ${logoPngUrl}`);
      
      // Download the actual logo image
      const imageResponse = await fetchWithNativeFetch(logoPngUrl);
      if (!imageResponse.ok) {
        console.warn(`Failed to download logo image for ${searchTerm}: ${imageResponse.status} ${imageResponse.statusText}`);
        return false;
      }

      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      const filepath = path.join(this.logosDir, filename);
      await fs.writeFile(filepath, buffer);
      
      console.log(`Logo saved: ${filename}`);
      return true;
    } catch (error) {
      console.warn(`Error downloading logo for ${searchTerm}:`, error.message);
      return false;
    }
  }

  /**
   * Process a single link and get its logo
   * @param {Object} link - Link object with name, url, category, logoHint
   * @returns {Promise<string|null>} logo path or null if failed
   */
  async processLink(link) {
    const { name, url, category, logoHint } = link;
    const filename = this.generateLogoFilename(category, name);
    
    // Check if logo already exists
    if (await this.logoExists(filename)) {
      return `/logos/${filename}`;
    }

    let success = false;

    // Priority 1: Try logo-hint attribute if provided
    if (logoHint && logoHint.trim()) {
      console.log(`Trying logo-hint: "${logoHint}"`);
      success = await this.downloadLogo(logoHint.trim(), filename);
    }

    // Priority 2: Try using the link name
    if (!success) {
      console.log(`Trying link name: "${name}"`);
      success = await this.downloadLogo(name, filename);
    }
    
    // Priority 3: Try using separate words from the name
    if (!success) {
      const words = this.extractWordsFromName(name);
      for (const word of words) {
        if (word.length > 2) { // Only try words longer than 2 characters
          console.log(`Trying fallback search with word: "${word}"`);
          success = await this.downloadLogo(word, filename);
          if (success) {
            break;
          }
        }
      }
    }

    return success ? `/logos/${filename}` : null;
  }

  /**
   * Process all links and enrich with logo paths
   * @param {Object} data - JSON data with tabs and links
   * @returns {Promise<Object>} enriched data with logo paths
   */
  async enrichWithLogos(data) {
    await this.ensureLogosDir();
    
    const enrichedData = JSON.parse(JSON.stringify(data)); // Deep clone
    
    console.log('Starting logo enrichment process...');
    
    for (const tab of enrichedData.tabs) {
      for (const category of tab.categories) {
        console.log(`Processing category: ${category.category}`);
        
        for (const link of category.links) {
          const logoPath = await this.processLink({
            name: link.name,
            url: link.url,
            category: category.category,
            logoHint: link['logo-hint'] || link['icon-hint'] // Support both logo-hint and icon-hint
          });
          
          link.logoPath = logoPath;
          
          // Add a small delay to be respectful to logo.dev API
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    console.log('Logo enrichment completed');
    return enrichedData;
  }

  /**
   * Get logo statistics
   * @returns {Promise<Object>} stats about logos
   */
  async getLogoStats() {
    try {
      const files = await fs.readdir(this.logosDir);
      const logoFiles = files.filter(file => 
        file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
      );
      
      return {
        totalLogos: logoFiles.length,
        logosDir: this.logosDir,
        files: logoFiles
      };
    } catch (error) {
      return {
        totalLogos: 0,
        logosDir: this.logosDir,
        files: []
      };
    }
  }
}

module.exports = LogoService;
