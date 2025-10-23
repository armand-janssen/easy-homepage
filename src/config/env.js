require('dotenv').config();

const config = {
  // Server configuration
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Application settings
  appTitle: process.env.APP_TITLE || 'My Links',
  cacheDurationHours: parseInt(process.env.CACHE_DURATION_HOURS) || 1,

  // Data source configuration
  localJsonPath: process.env.LOCAL_JSON_PATH,
  githubUrl: process.env.GITHUB_URL,
  githubToken: process.env.GITHUB_TOKEN,
  logoDevToken: process.env.LOGO_DEV_TOKEN,

  // Derived settings
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Cache settings
  cacheFile: './tmp-sites.json',
  logosDir: './logos',
  
  // Logo.dev API settings
  logoDevBaseUrl: 'https://api.logo.dev/search',
  logoDevFormat: 'png'
};

// Validation
if (!config.localJsonPath && !config.githubUrl) {
  console.warn('Warning: Neither LOCAL_JSON_PATH nor GITHUB_URL is set. Using default data.');
}

if (config.githubUrl && !config.githubToken) {
  console.warn('Warning: GITHUB_URL is set but GITHUB_TOKEN is not provided. This may fail for private repositories.');
}

module.exports = config;
