const DataService = require('../services/dataService');

/**
 * Register API routes
 * @param {Object} fastify - Fastify instance
 * @param {Object} config - Configuration object
 */
async function registerApiRoutes(fastify, options) {
  const config = options.config;
  const dataService = new DataService(config);

  // Initialize data service on startup (async, non-blocking)
  dataService.loadData()
    .then(() => {
      fastify.log.info('Data service initialized successfully');
    })
    .catch((error) => {
      fastify.log.error(error, 'Failed to initialize data service');
    });

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
                              'icon-hint': { type: 'string' },
                              'logo-hint': { type: 'string' },
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
            appTitle: { type: 'string' },
            lastUpdated: { type: 'string' },
            loading: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Try to get enriched data first (with logos)
      let data = dataService.getCachedData();
      
      if (!data) {
        // If no enriched data available, try to get raw data and return it immediately
        // This allows the frontend to load while logos are being processed in the background
        try {
          const rawData = dataService.rawData || await dataService.loadRawData();
          const sourceInfo = dataService.getDataSourceInfo();
          
          reply.send({
            ...rawData,
            source: sourceInfo.source,
            appTitle: config.appTitle,
            lastUpdated: new Date().toISOString(),
            loading: true,
            message: 'Data loaded, logos are being processed in the background'
          });
          return;
        } catch (rawDataError) {
          reply.code(503).send({
            error: 'Service Unavailable',
            message: 'Data not loaded yet'
          });
          return;
        }
      }

      const sourceInfo = dataService.getDataSourceInfo();
      
      reply.send({
        ...data,
        source: sourceInfo.source,
        appTitle: config.appTitle,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      fastify.log.error(error, 'Error in /api/links');
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve links data'
      });
    }
  });

  // Unauthenticated endpoint that spends upstream API quota: share one
  // in-flight refresh and skip refreshes requested within the cooldown.
  const REFRESH_COOLDOWN_MS = 30 * 1000;
  let refreshInFlight = null;
  let lastRefreshAt = 0;

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
    // Browsers label cross-site requests: refuse them so other websites can't trigger refreshes (CSRF)
    const fetchSite = request.headers['sec-fetch-site'];
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
      return reply.code(403).send({ error: 'Forbidden', message: 'Cross-site requests are not allowed' });
    }

    try {
      fastify.log.info('Data refresh requested');
      
      if (!refreshInFlight) {
        if (Date.now() - lastRefreshAt < REFRESH_COOLDOWN_MS) {
          return reply.send({ success: true, message: 'Data was refreshed recently, skipped' });
        }
        lastRefreshAt = Date.now();
        refreshInFlight = dataService.refreshData().finally(() => { refreshInFlight = null; });
      }
      await refreshInFlight;
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
      fastify.log.error(error, 'Error in /api/refresh');
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to refresh data'
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
      fastify.log.error(error, 'Error in /api/health');
      reply.code(500).send({
        status: 'error',
        timestamp: new Date().toISOString()
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
            cache: {
              type: 'object',
              properties: { ageHours: { type: 'number', nullable: true }, valid: { type: 'boolean' } }
            },
            logos: { type: 'object', properties: { total: { type: 'number' } } },
            source: { type: 'object', properties: { source: { type: 'string' } } }
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
          valid: cacheStats.cacheValid
        },
        logos: {
          total: cacheStats.totalLogos
        },
        source: sourceInfo
      });
    } catch (error) {
      fastify.log.error(error, 'Error in /api/stats');
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve statistics'
      });
    }
  });
}

module.exports = registerApiRoutes;
