class LinkHomepage {
    constructor() {
        this.data = null;
        this.activeTab = null;
        this.themeToggle = document.getElementById('theme-toggle');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.retryBtn = document.getElementById('retry-btn');
        this.appTitle = document.getElementById('app-title');
        this.loadingState = document.getElementById('loading-state');
        this.errorState = document.getElementById('error-state');
        this.contentArea = document.getElementById('content-area');
        this.tabNavigation = document.getElementById('tab-navigation');
        this.tabContent = document.getElementById('tab-content');
        
        this.init();
    }

    async init() {
        this.setupThemeToggle();
        this.setupRefreshButton();
        this.setupRetryButton();
        await this.loadData();
    }

    setupThemeToggle() {
        // Load saved theme or default to light
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');

        this.themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    setupRefreshButton() {
        this.refreshBtn.addEventListener('click', async () => {
            await this.refreshData();
        });
    }

    setupRetryButton() {
        this.retryBtn.addEventListener('click', async () => {
            await this.loadData();
        });
    }

    async loadData() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/links');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            this.data = result;
            
            // Update app title if provided
            if (result.appTitle) {
                this.appTitle.textContent = result.appTitle;
                document.title = result.appTitle;
            }
            
            this.renderTabs();
            this.showContent();
            
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError(error.message);
        }
    }

    async refreshData() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Refresh result:', result);
            
            // Reload data after refresh
            await this.loadData();
            
        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.showError(error.message);
        }
    }

    renderTabs() {
        if (!this.data || !this.data.tabs) {
            return;
        }

        this.tabNavigation.innerHTML = '';
        
        this.data.tabs.forEach((tab, index) => {
            const tabButton = document.createElement('button');
            tabButton.className = `tab-button px-3 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600 ${index === 0 ? 'active' : ''}`;
            tabButton.textContent = tab.tab;
            tabButton.addEventListener('click', () => this.switchTab(index));
            
            this.tabNavigation.appendChild(tabButton);
        });

        // Set first tab as active
        this.activeTab = 0;
        this.renderTabContent();
    }

    switchTab(tabIndex) {
        // Update active tab button
        const tabButtons = this.tabNavigation.querySelectorAll('.tab-button');
        tabButtons.forEach((btn, index) => {
            btn.classList.toggle('active', index === tabIndex);
        });

        this.activeTab = tabIndex;
        this.renderTabContent();
    }

    renderTabContent() {
        if (!this.data || !this.data.tabs || this.activeTab === null) {
            return;
        }

        const activeTabData = this.data.tabs[this.activeTab];
        this.tabContent.innerHTML = '';

        activeTabData.categories.forEach(category => {
            const categorySection = this.createCategorySection(category);
            this.tabContent.appendChild(categorySection);
        });
    }

    createCategorySection(category) {
        const section = document.createElement('div');
        section.className = 'mb-8 animate-fade-in';

        const title = document.createElement('h2');
        title.className = 'text-xl font-semibold text-gray-900 dark:text-white mb-4';
        title.textContent = category.category;

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

        category.links.forEach(link => {
            const linkCard = this.createLinkCard(link);
            grid.appendChild(linkCard);
        });

        section.appendChild(title);
        section.appendChild(grid);

        return section;
    }

    createLinkCard(link) {
        const card = document.createElement('a');
        card.href = link.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.className = 'link-card bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg p-4 flex items-center space-x-3 border border-gray-200 dark:border-gray-700 animate-slide-up';

        // Logo
        const logoContainer = document.createElement('div');
        logoContainer.className = 'flex-shrink-0';

        if (link.logoPath) {
            const logo = document.createElement('img');
            logo.src = link.logoPath;
            logo.alt = `${link.name} logo`;
            logo.className = 'logo-img';
            logo.onerror = () => {
                // Fallback to icon hint or default icon
                logoContainer.innerHTML = this.createFallbackIcon(link.iconHint || 'link');
            };
            logoContainer.appendChild(logo);
        } else {
            logoContainer.innerHTML = this.createFallbackIcon(link.iconHint || 'link');
        }

        // Content
        const content = document.createElement('div');
        content.className = 'flex-1 min-w-0';

        const name = document.createElement('h3');
        name.className = 'text-sm font-medium text-gray-900 dark:text-white truncate';
        name.textContent = link.name;

        const url = document.createElement('p');
        url.className = 'text-xs text-gray-500 dark:text-gray-400 truncate';
        url.textContent = this.extractDomain(link.url);

        content.appendChild(name);
        content.appendChild(url);

        card.appendChild(logoContainer);
        card.appendChild(content);

        return card;
    }

    createFallbackIcon(iconHint) {
        // Simple fallback icons based on icon hint
        const iconMap = {
            github: '<svg class="logo-img text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clip-rule="evenodd"></path></svg>',
            docker: '<svg class="logo-img text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V8.774a.186.186 0 00-.186-.186h-2.119a.186.186 0 00-.186.185v2.119c0 .102.084.185.186.185zm-4.93 0h2.119a.186.186 0 00.186-.185V8.774a.186.186 0 00-.186-.186H9.053a.186.186 0 00-.186.185v2.119c0 .102.084.185.186.185zm-4.93 0h2.119a.186.186 0 00.186-.185V8.774a.186.186 0 00-.186-.186H4.123a.186.186 0 00-.186.185v2.119c0 .102.084.185.186.185z"/></svg>',
            vscode: '<svg class="logo-img text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861l-8.716-7.95 8.716-7.95v15.9z"/></svg>',
            default: '<svg class="logo-img text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>'
        };

        return iconMap[iconHint] || iconMap.default;
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch (error) {
            return url;
        }
    }

    showLoading() {
        this.loadingState.classList.remove('hidden');
        this.errorState.classList.add('hidden');
        this.contentArea.classList.add('hidden');
    }

    showError(message) {
        this.loadingState.classList.add('hidden');
        this.errorState.classList.remove('hidden');
        this.contentArea.classList.add('hidden');
        
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = message;
    }

    showContent() {
        this.loadingState.classList.add('hidden');
        this.errorState.classList.add('hidden');
        this.contentArea.classList.remove('hidden');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LinkHomepage();
});
