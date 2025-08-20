# Easy Homepage

A simple Node.js application to serve your personal homepage with categorized links.  
You can run it **directly with Node.js** or **using Docker**.

---

## ✅ Features
- Serve a customizable homepage with tabs and categories.
- Supports **local configuration (JSON file)** or **remote GitHub configuration**.
- Fetch icons dynamically from [Logo.dev](https://logo.dev).
- Supports **Docker** for containerized deployments.

---

## 📦 Requirements
- [Node.js](https://nodejs.org/) (>=18.x)
- [pnpm](https://pnpm.io/) or `npm`
- [Docker](https://www.docker.com/) (for containerized run)
- (Optional) **GitHub Personal Access Token** if fetching config from GitHub.

---

## 🚀 Run with Node.js

### 1. Clone the repository
```bash
git clone https://github.com/armand-janssen/easy-homepage.git
cd easy-homepage
```

### 2. Install dependencies
```bash
pnpm install
```
(or `npm install` if you prefer)

### 3. Start the app
#### **Option A: Use a local `home.json` file**
Place your configuration in `home.json` and run:
```bash
pnpm start
```
This runs:
```bash
pnpm run clean && SITES_JSON_PATH=./home.json node server.js
```

#### **Option B: Fetch config from GitHub**
Set environment variables and run:
```bash
pnpm run start-github
```
This runs:
```bash
pnpm run clean && GITHUB_TOKEN=$GITHUB_MY_CONFIG_READER_TOKEN \
GITHUB_OWNER=armand-janssen \
GITHUB_REPO_NAME=my-config \
GITHUB_FILE_PATH=homepage/private.json \
node server.js
```

The app will be available at:  
**http://localhost:3000**

---

## 🐳 Run with Docker

You can build and run the image manually or use the npm scripts.

### **Option 1: Build & run manually**
Build the Docker image:
```bash
docker build -t easy-homepage .
```

Run the container:
```bash
docker run -d -p 3000:3000 \
  -e SITES_JSON_PATH=/app/home.json \
  -v $(pwd)/home.json:/app/home.json \
  --name easy-homepage easy-homepage
```

---

### **Option 2: Use provided scripts**
Build image:
```bash
pnpm run create-docker
```

Start container with Docker Compose:
```bash
pnpm run start-docker
```

Stop container:
```bash
pnpm run stop-docker
```

---

## ⚙️ Configuration

### Environment Variables
| Variable           | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `SITES_JSON_PATH`  | Path to local JSON file (e.g., `./home.json`)             |
| `GITHUB_OWNER`     | GitHub repository owner                                   |
| `GITHUB_REPO_NAME` | GitHub repository name                                    |
| `GITHUB_FILE_PATH` | Path to JSON file in repo                                 |
| `GITHUB_TOKEN`     | GitHub Personal Access Token (optional if repo is public) |
| `LOGO_DEV_API_KEY` | API key for [Logo.dev](https://logo.dev) (optional)       |

---

## 📄 Example Docker with GitHub Config
If you want to fetch configuration from GitHub inside Docker:
```bash
docker run -d -p 3000:3000 \
  -e GITHUB_OWNER=armand-janssen \
  -e GITHUB_REPO_NAME=my-config \
  -e GITHUB_FILE_PATH=homepage/private.json \
  -e GITHUB_TOKEN=$GITHUB_MY_CONFIG_READER_TOKEN \
  easy-homepage
```

---

## 🗂 Custom JSON Example
Your `home.json` should look like:
```json
{
  "tabs": [
    {
      "tab": "Home",
      "categories": [
        {
          "category": "Development",
          "links": [
            { "name": "GitHub", "url": "https://github.com" }
          ]
        }
      ]
    }
  ]
}
```

---

## ✅ Available Scripts
| Command                  | Description                              |
| ------------------------ | ---------------------------------------- |
| `pnpm run clean`         | Remove generated icons & temporary files |
| `pnpm start`             | Clean and Start with local `home.json`   |
| `pnpm run start-github`  | Start using GitHub config                |
| `pnpm run create-docker` | Build Docker image                       |
| `pnpm run start-docker`  | Start Docker Compose                     |
| `pnpm run stop-docker`   | Stop Docker Compose                      |