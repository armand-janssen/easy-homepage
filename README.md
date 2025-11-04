# Easy Homepage

A modern, responsive link homepage application built with Node.js, Fastify, and Tailwind CSS. Features automatic logo fetching, GitHub integration, and a clean tabbed interface with dark/light mode toggle.

## 🌟 What It Does

Easy Homepage is a lightweight, customizable link dashboard that provides:

- **Link Dashboard**: Display your personal links organized in tabs and categories
- **Automatic Logo Fetching**: Automatically downloads logos from logo.dev for each link
- **GitHub Integration**: Load your links configuration from a GitHub repository
- **Smart Caching**: Caches data and logos locally with automatic refresh
- **Dark/Light Mode**: Toggle between themes with smooth transitions
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Fast Performance**: Built with Fastify for high-speed API responses
- **Modern UI**: Clean, modern interface using Tailwind CSS
- **Easy Setup**: Simple local development and Docker deployment

### Example Use Cases

- **Personal Link Hub**: Organize your bookmarks, tools, and resources
- **Team Dashboard**: Share important links and tools with your team
- **Project Resources**: Centralize links for specific projects or hobbies
- **Portfolio Links**: Showcase your work and social media profiles

## 🚀 Quick Start

### Prerequisites

- [mise](https://mise.jdx.dev/) for tool version management
- Docker (optional, for containerized deployment)

**Note**: mise will automatically install and manage Node.js and pnpm versions specified in `.mise.toml`

## 📋 Local Development Setup

### Step 1: Clone and Setup with mise

```bash
# Clone the repository
git clone <your-repo-url>
cd easy-homepage

# Install mise (if not already installed)
curl https://mise.jdx.dev/install.sh | sh

# Install project tools (Node.js, pnpm) using mise
mise install

# Install dependencies using pnpm
pnpm install
```

**What mise does:**
- Automatically installs Node.js 20.11.0 and pnpm 8.15.0
- Sets up consistent development environment
- Manages tool versions across team members
- Activates tools when entering project directory

### Step 2: Environment Configuration

Create a `.env` file in the root directory:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Application Settings
APP_TITLE=My Links
CACHE_DURATION_HOURS=1

# Data Source Configuration
# Option 1: Use local JSON file
LOCAL_JSON_PATH=./data/private.json

# Option 2: Use GitHub repository (overrides LOCAL_JSON_PATH)
# GITHUB_URL=https://raw.githubusercontent.com/username/repo/main/data/private.json
# GITHUB_TOKEN=your_github_token_here

# Optional: Logo.dev API token for higher rate limits
# LOGO_DEV_TOKEN=your_logo_dev_token_here
```

### Step 3: Prepare Your Links Data

Create a JSON file with your links structure:

```json
{
  "tabs": [
    {
      "tab": "Home",
      "categories": [
        {
          "category": "Links",
          "links": [
            {
              "name": "GitHub",
              "url": "https://github.com",
              "icon-hint": "github"
            }
          ]
        },
        {
          "category": "Tools",
          "links": [
            {
              "name": "Visual Studio Code",
              "url": "https://code.visualstudio.com",
              "icon-hint": "vscode"
            },
            {
              "name": "Docker",
              "url": "https://docker.com",
              "icon-hint": "docker"
            }
          ]
        }
      ]
    },
    {
      "tab": "Hobby",
      "categories": [
        {
          "category": "Radio Control",
          "links": [
            {
              "name": "Hobbyking",
              "url": "https://hobbyking.com",
              "icon-hint": "hobbyking"
            }
          ]
        }
      ]
    }
  ]
}
```

### Step 4: Start Development Server

```bash
# Start the development server using mise
mise exec pnpm dev

# Or directly (mise auto-activates tools)
pnpm dev
```

The application will be available at `http://localhost:3000`

**mise Commands:**
```bash
# Check installed tools and versions
mise list

# Update tools to latest versions
mise update

# Run commands with specific tool versions
mise exec node --version
mise exec pnpm --version

# Show current environment
mise env
```

### Step 5: Development Commands

```bash
# Start development server with hot reload
mise exec pnpm dev

# Start production server
mise exec pnpm start

# Or use mise exec for any command
mise exec -- pnpm run any-script
```

## 🐳 Docker Setup

### Option 1: Docker Compose (Recommended)

Create a `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Application Settings
APP_TITLE=My Links
CACHE_DURATION_HOURS=1

# Data Source Configuration
# Option 1: Use local JSON file
LOCAL_JSON_PATH=./data/private.json

# Option 2: Use GitHub repository (overrides LOCAL_JSON_PATH)
GITHUB_URL=https://raw.githubusercontent.com/username/repo/main/data/private.json
GITHUB_TOKEN=your_github_token_here

# Optional: Logo.dev API token for higher rate limits
LOGO_DEV_TOKEN=your_logo_dev_token_here
```

Start the application:

```bash
# Using Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Dockerfile

Build and run the Docker image:

```bash
# Build the Docker image
docker build -t easy-homepage .

# Run the container
docker run -p 3000:3000 \
  -e PORT=3000 \
  -e APP_TITLE="My Links" \
  -e LOCAL_JSON_PATH="./data/private.json" \
  easy-homepage
```

### Docker Commands

```bash
# Build the Docker image
docker build -t easy-homepage .

# Run the container
docker run -p 3000:3000 easy-homepage

# Using Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🎨 Features

### Automatic Logo Fetching

The application automatically downloads logos from logo.dev for each link:

- Extracts domain from each link URL
- Downloads logos and saves them locally as `{category}_{linkname}.png`
- Caches logos to avoid re-downloading
- Provides fallback icons for missing logos
- Respects logo.dev API rate limits

### GitHub Integration

Load your links configuration from a GitHub repository:

- Supports both public and private repositories
- Automatic caching with configurable refresh intervals
- Fallback to cached data if GitHub is unavailable
- Manual refresh via API endpoint or frontend button

### Dark/Light Mode Toggle

Built-in theme switching with smooth transitions:

- Toggle button in the top-right corner
- Theme preference saved in localStorage
- Smooth transitions between themes
- Tailwind CSS dark mode classes

### Responsive Design

Mobile-first responsive layout:

- 1 column on mobile devices
- 2-3 columns on tablets
- 3-4 columns on desktop
- Scrollable content container
- Touch-friendly interface

## 🔧 API Documentation

### Endpoints

#### GET /api/links
Returns enriched JSON data with logo paths for all links.

**Response:**
```json
{
  "tabs": [
    {
      "tab": "Home",
      "categories": [
        {
          "category": "Links",
          "links": [
            {
              "name": "GitHub",
              "url": "https://github.com",
              "icon-hint": "github",
              "logoPath": "/logos/links_github.png"
            }
          ]
        }
      ]
    }
  ],
  "source": "local",
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

#### POST /api/refresh
Triggers a data refresh from the source and re-downloads logos.

**Response:**
```json
{
  "success": true,
  "message": "Data refreshed successfully",
  "stats": {
    "totalLogos": 15,
    "cacheAgeHours": 0,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /api/health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "data": {
    "loaded": true,
    "source": "github",
    "cacheValid": true
  }
}
```

#### GET /api/stats
Get cache and logo statistics.

**Response:**
```json
{
  "cache": {
    "ageHours": 0.5,
    "valid": true,
    "file": "./tmp-sites.json"
  },
  "logos": {
    "total": 15,
    "directory": "./logos",
    "files": ["links_github.png", "tools_docker.png"]
  },
  "source": {
    "source": "github",
    "githubUrl": "https://raw.githubusercontent.com/...",
    "localPath": null,
    "cacheFile": "./tmp-sites.json",
    "cacheValid": true
  }
}
```

## 📁 Project Structure

```
easy-homepage/
├── src/
│   ├── config/
│   │   └── env.js              # Environment configuration
│   ├── routes/
│   │   └── api.js              # API route handlers
│   ├── services/
│   │   ├── dataService.js      # Data loading and caching
│   │   └── logoService.js      # Logo fetching from logo.dev
│   ├── utils/
│   │   └── cache.js            # Cache management utilities
│   └── app.js                  # Main Fastify application
├── public/
│   ├── js/
│   │   └── main.js             # Frontend JavaScript
│   └── index.html              # Main HTML page
├── data/
│   └── private.json            # Example links configuration
├── logos/                      # Downloaded logos (auto-created)
├── .env.example                # Environment variables template
├── .mise.toml                  # Tool version management
├── docker-compose.yml          # Docker Compose configuration
├── Dockerfile                  # Docker build configuration
├── package.json                # Node.js dependencies
└── README.md                   # This file
```

## 🛠️ Customization

### Environment Variables

Configure the application using environment variables:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Server port | `3000` | `8080` |
| `HOST` | Server host | `0.0.0.0` | `localhost` |
| `APP_TITLE` | Application title | `My Links` | `Team Dashboard` |
| `LOCAL_JSON_PATH` | Path to local JSON file | - | `./data/links.json` |
| `GITHUB_URL` | GitHub raw URL for JSON | - | `https://raw.githubusercontent.com/...` |
| `GITHUB_TOKEN` | GitHub token for private repos | - | `ghp_...` |
| `LOGO_DEV_TOKEN` | Logo.dev API token | - | `your_token` |
| `CACHE_DURATION_HOURS` | Cache refresh interval | `1` | `6` |

### Data Structure

Customize your links by modifying the JSON structure:

```json
{
  "tabs": [
    {
      "tab": "Tab Name",
      "categories": [
        {
          "category": "Category Name",
          "links": [
            {
              "name": "Link Name",
              "url": "https://example.com",
              "icon-hint": "optional_hint"
            }
          ]
        }
      ]
    }
  ]
}
```

### Styling

The application uses Tailwind CSS for styling:

- Modify `public/index.html` for layout changes
- Update `public/js/main.js` for functionality changes
- Use Tailwind utility classes for styling
- Dark mode is handled automatically with `dark:` prefixes

## 🐛 Troubleshooting

### Common Issues

**Logo downloads failing:**
- Check internet connection
- Verify logo.dev API is accessible
- Consider adding `LOGO_DEV_TOKEN` for higher rate limits
- Check logs for specific error messages

**GitHub integration not working:**
- Verify `GITHUB_URL` is a raw GitHub URL
- Check `GITHUB_TOKEN` has repository access
- Ensure repository is accessible (public or token has access)
- Check GitHub API rate limits

**Cache not refreshing:**
- Check `CACHE_DURATION_HOURS` setting
- Use refresh button in frontend or `/api/refresh` endpoint
- Clear cache manually by deleting `tmp-sites.json`

**Port already in use:**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 pnpm dev
```

**Docker build fails:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t easy-homepage .
```

**Theme not persisting:**
- Check browser localStorage permissions
- Ensure JavaScript is enabled
- Clear browser cache and try again

### Getting Help

1. Check the [Issues](https://github.com/your-username/easy-homepage/issues) page
2. Review the troubleshooting section above
3. Check browser console for JavaScript errors
4. Verify all environment variables are set correctly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting section

---

**Happy coding! 🚀**