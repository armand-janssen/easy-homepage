const fastify = require('fastify')({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    prettyPrint: process.env.NODE_ENV === 'development'
  }
});

const path = require('path');
const config = require('./config/env');
const registerApiRoutes = require('./routes/api');

async function buildApp() {
  try {
    // Register plugins
    await fastify.register(require('@fastify/static'), {
      root: path.join(__dirname, '../public'),
      prefix: '/'
    });

    await fastify.register(require('@fastify/cors'), {
      origin: true,
      credentials: true
    });

    // Register API routes
    await fastify.register(registerApiRoutes, { prefix: '', config });

    // Error handler
    fastify.setErrorHandler((error, request, reply) => {
      fastify.log.error(error);
      
      if (error.validation) {
        reply.status(400).send({
          error: 'Validation Error',
          details: error.validation
        });
      } else {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: config.isDevelopment ? error.message : 'Something went wrong'
        });
      }
    });

    // 404 handler for SPA
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        reply.status(404).send({
          error: 'Not Found',
          message: `API endpoint ${request.url} not found`
        });
      } else {
        // Serve index.html for all non-API routes (SPA)
        reply.sendFile('index.html');
      }
    });

    return fastify;
  } catch (error) {
    fastify.log.error('Failed to build app:', error);
    throw error;
  }
}

async function start() {
  try {
    const app = await buildApp();
    
    // Start the server
    await app.listen({
      port: config.port,
      host: config.host
    });

    console.log(`🚀 Server running at http://${config.host}:${config.port}`);
    console.log(`📊 Environment: ${config.nodeEnv}`);
    console.log(`📁 Data source: ${config.githubUrl ? 'GitHub' : (config.localJsonPath ? 'Local' : 'Default')}`);
    
    if (config.githubUrl) {
      console.log(`🔗 GitHub URL: ${config.githubUrl}`);
    }
    
    if (config.localJsonPath) {
      console.log(`📄 Local JSON: ${config.localJsonPath}`);
    }

    console.log(`🎨 App Title: ${config.appTitle}`);
    console.log(`⏰ Cache Duration: ${config.cacheDurationHours} hours`);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start the application
if (require.main === module) {
  start();
}

module.exports = { buildApp, start };
