const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

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
   * @param {string} domain - Domain name
   * @param {string} filename - Local filename to save as
   * @returns {Promise<boolean>} true if successful
   */
  async downloadLogo(domain, filename) {
    try {
      let logoUrl = `${this.logoDevBaseUrl}/${domain}?format=${this.logoDevFormat}`;
      
      if (this.logoDevToken) {
        logoUrl += `&token=${this.logoDevToken}`;
      }

      console.log(`Fetching logo for ${domain}...`);
      const response = await fetch(logoUrl);
      
      if (!response.ok) {
        console.warn(`Failed to fetch logo for ${domain}: ${response.status} ${response.statusText}`);
        return false;
      }

      const buffer = await response.buffer();
      const filepath = path.join(this.logosDir, filename);
      await fs.writeFile(filepath, buffer);
      
      console.log(`Logo saved: ${filename}`);
      return true;
    } catch (error) {
      console.warn(`Error downloading logo for ${domain}:`, error.message);
      return false;
    }
  }

  /**
   * Process a single link and get its logo
   * @param {Object} link - Link object with name, url, category
   * @returns {Promise<string|null>} logo path or null if failed
   */
  async processLink(link) {
    const { name, url, category } = link;
    const domain = this.extractDomain(url);
    
    if (!domain) {
      return null;
    }

    const filename = this.generateLogoFilename(category, name);
    
    // Check if logo already exists
    if (await this.logoExists(filename)) {
      return `/logos/${filename}`;
    }

    // Download new logo
    const success = await this.downloadLogo(domain, filename);
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
            category: category.category
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
