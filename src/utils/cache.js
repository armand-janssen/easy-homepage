const fs = require('fs').promises;
const path = require('path');

class CacheManager {
  constructor(cacheFile, cacheDurationHours) {
    this.cacheFile = cacheFile;
    this.cacheDurationMs = cacheDurationHours * 60 * 60 * 1000;
  }

  /**
   * Check if cache file exists and is still valid
   * @returns {Promise<boolean>} true if cache is valid, false if expired or missing
   */
  async isCacheValid() {
    try {
      const stats = await fs.stat(this.cacheFile);
      const now = Date.now();
      const cacheAge = now - stats.mtime.getTime();
      
      return cacheAge < this.cacheDurationMs;
    } catch (error) {
      // Cache file doesn't exist or can't be read
      return false;
    }
  }

  /**
   * Get cached data if it exists and is valid
   * @returns {Promise<Object|null>} cached data or null if not available
   */
  async getCachedData() {
    try {
      if (await this.isCacheValid()) {
        const data = await fs.readFile(this.cacheFile, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.warn('Failed to read cache file:', error.message);
      return null;
    }
  }

  /**
   * Store data in cache file
   * @param {Object} data - Data to cache
   * @returns {Promise<void>}
   */
  async setCachedData(data) {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(this.cacheFile, jsonData, 'utf8');
      console.log(`Cache updated: ${this.cacheFile}`);
    } catch (error) {
      console.error('Failed to write cache file:', error.message);
      throw error;
    }
  }

  /**
   * Get cache file age in hours
   * @returns {Promise<number>} age in hours, or Infinity if file doesn't exist
   */
  async getCacheAgeHours() {
    try {
      const stats = await fs.stat(this.cacheFile);
      const now = Date.now();
      const cacheAge = now - stats.mtime.getTime();
      return cacheAge / (1000 * 60 * 60);
    } catch (error) {
      return Infinity;
    }
  }

  /**
   * Force cache invalidation by deleting the cache file
   * @returns {Promise<void>}
   */
  async invalidateCache() {
    try {
      await fs.unlink(this.cacheFile);
      console.log('Cache invalidated');
    } catch (error) {
      // File might not exist, which is fine
      if (error.code !== 'ENOENT') {
        console.error('Failed to invalidate cache:', error.message);
      }
    }
  }
}

module.exports = CacheManager;
