class LinkHomepage {
    constructor() {
        this.data = null;
        this.activeTab = null;
        this.currentLayout = 'default';
        this.logoPollingInterval = null;
        this.themeToggle = document.getElementById('theme-toggle');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.retryBtn = document.getElementById('retry-btn');
        this.layoutSelector = document.getElementById('layout-selector');
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
        this.setupLayoutSelector();
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

    setupLayoutSelector() {
        // Load saved layout or default to default
        const savedLayout = localStorage.getItem('layout') || 'default';
        this.currentLayout = savedLayout;
        this.layoutSelector.value = savedLayout;
        
        // Apply initial layout
        this.applyLayout(savedLayout);

        this.layoutSelector.addEventListener('change', (e) => {
            const selectedLayout = e.target.value;
            this.currentLayout = selectedLayout;
            localStorage.setItem('layout', selectedLayout);
            this.applyLayout(selectedLayout);
            
            // Re-render content with new layout
            if (this.data) {
                this.renderTabContent();
            }
        });
    }

    applyLayout(layoutName) {
        // Remove all layout classes
        document.body.classList.remove('layout-default', 'layout-columns', 'layout-columns-vertical', 'layout-creative');
        
        // Add current layout class
        document.body.classList.add(`layout-${layoutName}`);
        
        // Inject layout-specific CSS
        this.injectLayoutCSS(layoutName);
    }

    injectLayoutCSS(layoutName) {
        // Remove existing layout styles
        const existingStyle = document.getElementById('layout-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'layout-styles';
        
        if (layoutName === 'columns') {
            style.textContent = `
                .layout-columns {
                    --primary-color: #8b5cf6;
                    --primary-hover: #7c3aed;
                    --primary-light: #a78bfa;
                    --primary-dark: #6d28d9;
                    --bg-primary: #faf5ff;
                    --bg-secondary: #f3e8ff;
                    --text-primary: #581c87;
                    --text-secondary: #7c2d12;
                    --border-color: #c4b5fd;
                }
                
                .layout-columns.dark {
                    --bg-primary: #1e1b4b;
                    --bg-secondary: #312e81;
                    --text-primary: #e0e7ff;
                    --text-secondary: #c7d2fe;
                    --border-color: #6366f1;
                }
                
                .layout-columns #tab-content {
                    display: flex !important;
                    flex-direction: row !important;
                    gap: 1.5rem !important;
                    flex-wrap: nowrap !important;
                    align-items: flex-start !important;
                    width: 100% !important;
                    overflow-x: auto !important;
                    max-width: none !important;
                }
                
                .layout-columns .max-w-7xl {
                    max-width: none !important;
                }
                
                .layout-columns .category-column {
                    flex: 0 0 auto;
                    width: 280px;
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    padding: 1.5rem;
                    border: 1px solid var(--border-color);
                }
                
                .layout-columns .category-title {
                    color: var(--text-primary);
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid var(--primary-color);
                }
                
                .layout-columns .links-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .layout-columns .link-item {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 0.75rem;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                
                .layout-columns .link-item:hover {
                    background: var(--primary-light);
                    transform: translateX(4px);
                    border-color: var(--primary-color);
                }
                
                .layout-columns .link-item a {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    text-decoration: none;
                    color: var(--text-primary);
                }
                
                .layout-columns .link-item .logo-img {
                    width: 24px;
                    height: 24px;
                }
                
                .layout-columns .link-item .link-name {
                    font-weight: 500;
                    font-size: 0.9rem;
                }
            `;
        } else if (layoutName === 'columns-vertical') {
            style.textContent = `
                .layout-columns-vertical {
                    --primary-color: #8b5cf6;
                    --primary-hover: #7c3aed;
                    --primary-light: #a78bfa;
                    --primary-dark: #6d28d9;
                    --bg-primary: #faf5ff;
                    --bg-secondary: #f3e8ff;
                    --text-primary: #581c87;
                    --text-secondary: #7c2d12;
                    --border-color: #c4b5fd;
                }
                
                .layout-columns-vertical.dark {
                    --bg-primary: #1e1b4b;
                    --bg-secondary: #312e81;
                    --text-primary: #e0e7ff;
                    --text-secondary: #c7d2fe;
                    --border-color: #6366f1;
                }
                
                .layout-columns-vertical #tab-content {
                    display: flex !important;
                    flex-direction: row !important;
                    gap: 1rem !important;
                    flex-wrap: wrap !important;
                    align-items: flex-start !important;
                    width: 100% !important;
                    overflow-y: auto !important;
                    max-width: none !important;
                    height: calc(100vh - 200px) !important;
                }
                
                .layout-columns-vertical .max-w-7xl {
                    max-width: none !important;
                }
                
                .layout-columns-vertical .category-column {
                    flex: 0 0 auto;
                    width: 300px;
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    padding: 1rem;
                    border: 1px solid var(--border-color);
                }
                
                .layout-columns-vertical .category-title {
                    color: var(--text-primary);
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid var(--primary-color);
                }
                
                .layout-columns-vertical .links-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .layout-columns-vertical .link-item {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 0.75rem;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                
                .layout-columns-vertical .link-item:hover {
                    background: var(--primary-light);
                    transform: translateX(4px);
                    border-color: var(--primary-color);
                }
                
                .layout-columns-vertical .link-item a {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    text-decoration: none;
                    color: var(--text-primary);
                }
                
                .layout-columns-vertical .link-item .logo-img {
                    width: 24px;
                    height: 24px;
                }
                
                .layout-columns-vertical .link-item .link-name {
                    font-weight: 500;
                    font-size: 0.9rem;
                }
            `;
        } else if (layoutName === 'creative') {
            style.textContent = `
                .layout-creative {
                    --primary-color: #059669;
                    --primary-hover: #047857;
                    --primary-light: #10b981;
                    --primary-dark: #065f46;
                    --accent-color: #0d9488;
                    --bg-primary: #ecfdf5;
                    --bg-secondary: #d1fae5;
                    --text-primary: #064e3b;
                    --text-secondary: #065f46;
                    --border-color: #6ee7b7;
                }
                
                .layout-creative.dark {
                    --bg-primary: #064e3b;
                    --bg-secondary: #065f46;
                    --text-primary: #a7f3d0;
                    --text-secondary: #6ee7b7;
                    --border-color: #10b981;
                }
                
                .layout-creative .tab-content {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 2rem;
                }
                
                .layout-creative .category-section {
                    background: linear-gradient(135deg, var(--bg-secondary), var(--bg-primary));
                    border-radius: 16px;
                    padding: 2rem;
                    border: 2px solid var(--border-color);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    position: relative;
                    overflow: hidden;
                }
                
                .layout-creative .category-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
                }
                
                .layout-creative .category-title {
                    color: var(--text-primary);
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 1.5rem;
                    text-align: center;
                    position: relative;
                }
                
                .layout-creative .links-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }
                
                .layout-creative .link-card {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1.25rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                }
                
                .layout-creative .link-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.1), transparent);
                    transition: left 0.5s ease;
                }
                
                .layout-creative .link-card:hover::before {
                    left: 100%;
                }
                
                .layout-creative .link-card:hover {
                    transform: translateY(-4px) scale(1.02);
                    box-shadow: 0 12px 24px rgba(16, 185, 129, 0.2);
                    border-color: var(--primary-color);
                }
                
                .layout-creative .link-card a {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    text-decoration: none;
                    color: var(--text-primary);
                    gap: 0.75rem;
                }
                
                .layout-creative .link-card .logo-img {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    background: var(--bg-secondary);
                    padding: 8px;
                }
                
                .layout-creative .link-card .link-name {
                    font-weight: 600;
                    font-size: 0.95rem;
                    line-height: 1.2;
                }
                
                .layout-creative .link-card .link-url {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    opacity: 0.8;
                }
            `;
        }
        
        document.head.appendChild(style);
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
            
            // If logos are still loading, show a message and poll for updates
            if (result.loading) {
                this.showLogoLoadingMessage();
                this.startLogoPolling();
            }
            
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError(error.message);
        }
    }

    async refreshData() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/refresh', {
                method: 'POST'
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

    showLogoLoadingMessage() {
        // Create a loading message banner
        const loadingBanner = document.createElement('div');
        loadingBanner.id = 'logo-loading-banner';
        loadingBanner.className = 'bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md mb-4 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200';
        loadingBanner.innerHTML = `
            <div class="flex items-center">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span>Logos are being processed in the background. The page will update automatically when ready.</span>
            </div>
        `;
        
        // Insert the banner at the top of the content
        const content = document.getElementById('content');
        if (content && content.firstChild) {
            content.insertBefore(loadingBanner, content.firstChild);
        }
    }

    startLogoPolling() {
        // Poll every 2 seconds to check if logos are ready
        this.logoPollingInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/links');
                if (response.ok) {
                    const result = await response.json();
                    
                    // If loading is no longer true, logos are ready
                    if (!result.loading) {
                        this.stopLogoPolling();
                        this.data = result;
                        this.renderTabs();
                        this.showContent();
                        
                        // Remove the loading banner
                        const loadingBanner = document.getElementById('logo-loading-banner');
                        if (loadingBanner) {
                            loadingBanner.remove();
                        }
                    }
                }
            } catch (error) {
                console.warn('Logo polling error:', error);
            }
        }, 2000);
    }

    stopLogoPolling() {
        if (this.logoPollingInterval) {
            clearInterval(this.logoPollingInterval);
            this.logoPollingInterval = null;
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

        if (this.currentLayout === 'columns') {
            this.renderColumnsLayout(activeTabData);
        } else if (this.currentLayout === 'columns-vertical') {
            this.renderColumnsLayout(activeTabData);
        } else if (this.currentLayout === 'creative') {
            this.renderCreativeLayout(activeTabData);
        } else {
            this.renderDefaultLayout(activeTabData);
        }
    }

    renderDefaultLayout(activeTabData) {
        activeTabData.categories.forEach(category => {
            const categorySection = this.createCategorySection(category);
            this.tabContent.appendChild(categorySection);
        });
    }

    renderColumnsLayout(activeTabData) {
        activeTabData.categories.forEach(category => {
            const categoryColumn = this.createCategoryColumn(category);
            this.tabContent.appendChild(categoryColumn);
        });
    }

    renderCreativeLayout(activeTabData) {
        activeTabData.categories.forEach(category => {
            const categorySection = this.createCreativeCategorySection(category);
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

    createCategoryColumn(category) {
        const column = document.createElement('div');
        column.className = 'category-column animate-fade-in';

        const title = document.createElement('h2');
        title.className = 'category-title';
        title.textContent = category.category;

        const linksList = document.createElement('div');
        linksList.className = 'links-list';

        category.links.forEach(link => {
            const linkItem = this.createColumnLinkItem(link);
            linksList.appendChild(linkItem);
        });

        column.appendChild(title);
        column.appendChild(linksList);

        return column;
    }

    createCreativeCategorySection(category) {
        const section = document.createElement('div');
        section.className = 'category-section animate-fade-in';

        const title = document.createElement('h2');
        title.className = 'category-title';
        title.textContent = category.category;

        const linksGrid = document.createElement('div');
        linksGrid.className = 'links-grid';

        category.links.forEach(link => {
            const linkCard = this.createCreativeLinkCard(link);
            linksGrid.appendChild(linkCard);
        });

        section.appendChild(title);
        section.appendChild(linksGrid);

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

    createColumnLinkItem(link) {
        const item = document.createElement('div');
        item.className = 'link-item';

        const linkElement = document.createElement('a');
        linkElement.href = link.url;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';

        // Logo
        const logoContainer = document.createElement('div');
        logoContainer.className = 'flex-shrink-0';

        if (link.logoPath) {
            const logo = document.createElement('img');
            logo.src = link.logoPath;
            logo.alt = `${link.name} logo`;
            logo.className = 'logo-img';
            logo.onerror = () => {
                logoContainer.innerHTML = this.createFallbackIcon(link.iconHint || 'link');
            };
            logoContainer.appendChild(logo);
        } else {
            logoContainer.innerHTML = this.createFallbackIcon(link.iconHint || 'link');
        }

        // Name only (no URL)
        const name = document.createElement('span');
        name.className = 'link-name';
        name.textContent = link.name;

        linkElement.appendChild(logoContainer);
        linkElement.appendChild(name);
        item.appendChild(linkElement);

        return item;
    }

    createCreativeLinkCard(link) {
        const card = document.createElement('div');
        card.className = 'link-card';

        const linkElement = document.createElement('a');
        linkElement.href = link.url;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';

        // Logo
        const logoContainer = document.createElement('div');
        logoContainer.className = 'flex-shrink-0';

        if (link.logoPath) {
            const logo = document.createElement('img');
            logo.src = link.logoPath;
            logo.alt = `${link.name} logo`;
            logo.className = 'logo-img';
            logo.onerror = () => {
                logoContainer.innerHTML = this.createFallbackIcon(link.iconHint || 'link');
            };
            logoContainer.appendChild(logo);
        } else {
            logoContainer.innerHTML = this.createFallbackIcon(link.iconHint || 'link');
        }

        // Content
        const name = document.createElement('div');
        name.className = 'link-name';
        name.textContent = link.name;

        const url = document.createElement('div');
        url.className = 'link-url';
        url.textContent = this.extractDomain(link.url);

        linkElement.appendChild(logoContainer);
        linkElement.appendChild(name);
        linkElement.appendChild(url);
        card.appendChild(linkElement);

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
