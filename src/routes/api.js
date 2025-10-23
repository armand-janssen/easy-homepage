const DataService = require('../services/dataService');

/**
 * Register API routes
 * @param {Object} fastify - Fastify instance
 * @param {Object} config - Configuration object
 */
async function registerApiRoutes(fastify, config) {
  const dataService = new DataService(config);

  // Initialize data service on startup
  try {
    await dataService.loadData();
    fastify.log.info('Data service initialized successfully');
  } catch (error) {
    fastify.log.error('Failed to initialize data service:', error.message);
  }

  // GET /api/links - Returns enriched JSON with logo paths
  fastify.get('/api/links', {
    schema: {
      description: 'Get all links with enriched logo data',
      response: {
        200: {
          type: 'object',
          properties: {
            tabs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tab: { type: 'string' },
                  categories: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: { type: 'string' },
                        links: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              url: { type: 'string' },
                              iconHint: { type: 'string' },
                              logoPath: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            source: { type: 'string' },
            lastUpdated: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const data = dataService.getCachedData();
      
      if (!data) {
        reply.code(503).send({
          error: 'Service Unavailable',
          message: 'Data not loaded yet'
        });
        return;
      }

      const sourceInfo = dataService.getDataSourceInfo();
      
      reply.send({
        ...data,
        source: sourceInfo.source,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      fastify.log.error('Error in /api/links:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve links data'
      });
    }
  });

  // POST /api/refresh - Triggers data refresh
  fastify.post('/api/refresh', {
    schema: {
      description: 'Refresh data from source and re-download logos',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            stats: { type: 'object' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      fastify.log.info('Data refresh requested');
      
      const refreshedData = await dataService.refreshData();
      const stats = await dataService.getCacheStats();
      
      fastify.log.info('Data refresh completed successfully');
      
      reply.send({
        success: true,
        message: 'Data refreshed successfully',
        stats: {
          totalLogos: stats.totalLogos,
          cacheAgeHours: stats.cacheAgeHours,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      fastify.log.error('Error in /api/refresh:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to refresh data',
        details: error.message
      });
    }
  });

  // GET /api/health - Health check endpoint
  fastify.get('/api/health', {
    schema: {
      description: 'Health check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            data: {
              type: 'object',
              properties: {
                loaded: { type: 'boolean' },
                source: { type: 'string' },
                cacheValid: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const data = dataService.getCachedData();
      const sourceInfo = dataService.getDataSourceInfo();
      const cacheValid = await dataService.cacheManager.isCacheValid();
      
      reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        data: {
          loaded: !!data,
          source: sourceInfo.source,
          cacheValid: cacheValid
        }
      });
    } catch (error) {
      fastify.log.error('Error in /api/health:', error);
      reply.code(500).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  // GET /api/stats - Get cache and logo statistics
  fastify.get('/api/stats', {
    schema: {
      description: 'Get cache and logo statistics',
      response: {
        200: {
          type: 'object',
          properties: {
            cache: { type: 'object' },
            logos: { type: 'object' },
            source: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const cacheStats = await dataService.getCacheStats();
      const sourceInfo = dataService.getDataSourceInfo();
      
      reply.send({
        cache: {
          ageHours: cacheStats.cacheAgeHours,
          valid: cacheStats.cacheValid,
          file: cacheStats.cacheFile
        },
        logos: {
          total: cacheStats.totalLogos,
          directory: cacheStats.logosDir,
          files: cacheStats.files
        },
        source: sourceInfo
      });
    } catch (error) {
      fastify.log.error('Error in /api/stats:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve statistics'
      });
    }
  });
}

module.exports = registerApiRoutes;
