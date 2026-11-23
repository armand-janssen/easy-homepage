class LinkHomepage {
    constructor() {
        this.data = null;
        this.activeTab = null;
        this.currentLayout = 'default';
        this.logoPollingInterval = null;
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
        this.setupLayoutSelector();
        this.setupColorSelector();
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
        this.createPicker('layout-picker', 'Layout', 'layout', [
            { value: 'default', label: 'Cards' },
            { value: 'masonry', label: 'Masonry' },
            { value: 'columns', label: 'Columns' },
            { value: 'columns-vertical', label: 'Columns Vertical' },
            { value: 'creative', label: 'Creative' },
            { value: 'launcher', label: 'Launcher' },
            { value: 'terminal', label: 'Terminal' },
            { value: 'matrix', label: 'Matrix' },
            { value: 'matrix-icons', label: 'Matrix Icons' },
            { value: 'matrix-rain', label: 'Matrix Rain' },
            { value: 'lcars', label: 'LCARS' },
            { value: 'lcars-icons', label: 'LCARS Icons' },
            { value: 'player', label: 'Retro Player' },
            { value: 'sonar', label: 'Red October' },
            { value: 'redalert', label: 'Red Alert' },
            { value: 'robot', label: 'Mr. Robot' },
            { value: 'gta5', label: 'GTA V' },
            { value: 'gta6', label: 'GTA VI' },
            { value: 'kart', label: 'Mario Kart' },
            { value: 'kong', label: 'Donkey Kong' },
            { value: 'f1', label: 'F1' },
            { value: 'f1-redbull', label: 'F1 Red Bull' },
            { value: 'f1-ferrari', label: 'F1 Ferrari' },
            { value: 'cycling', label: 'Road Cycling' },
            { value: 'starwars', label: 'Star Wars' },
            { value: 'lotr', label: 'Lord of the Rings' }
        ], (layout) => {
            this.currentLayout = layout;
            // Signature layouts bring their own palette (so the colour picker is switched off) and are
            // composed from building-block classes styled in /css/themes.css
            const signature = {
                'matrix': ['terminal', 'matrix'],
                'matrix-icons': ['terminal', 'matrix', 'icons'],
                'matrix-rain': ['matrix', 'streams'],
                'lcars': ['lcars'],
                'lcars-icons': ['lcars', 'icons'],
                'player': ['player'],
                'sonar': ['sonar'],
                'redalert': ['redalert'],
                'robot': ['terminal', 'robot'],
                'gta5': ['reset', 'gta5'],
                'gta6': ['reset', 'gta6'],
                'kart': ['reset', 'kart'],
                'kong': ['reset', 'kong'],
                'f1': ['reset', 'f1'],
                'f1-redbull': ['reset', 'f1', 'f1-redbull'],
                'f1-ferrari': ['reset', 'f1', 'f1-ferrari'],
                'cycling': ['reset', 'cycling'],
                'starwars': ['reset', 'starwars'],
                'lotr': ['reset', 'lotr']
            };
            const parts = signature[layout] ? [...signature[layout], 'signature'] : [layout];
            document.body.classList.remove(...[...document.body.classList].filter(c => c.startsWith('layout-')));
            document.body.classList.add(...parts.map(name => `layout-${name}`));
            document.getElementById('color-picker').inert = layout in signature;
            this.toggleMatrixRain(parts.includes('matrix'));
            if (this.data) {
                this.renderTabContent();
            }
        });
    }

    setupColorSelector() {
        // Colour themes are CSS variables keyed on <html data-color>; light/dark comes from the theme toggle
        const colors = ['Default', 'Slate', 'Nord', 'Mocha', 'Ocean', 'Mint', 'Green', 'Amber', 'Sunset', 'Rose', 'Purple', 'Neon'];
        this.createPicker('color-picker', 'Colour theme', 'color',
            colors.map(label => ({ value: label.toLowerCase(), label, swatch: true })),
            (color) => { document.documentElement.dataset.color = color; });
    }

    // Matrix layout: glyphs falling on a canvas behind the content
    toggleMatrixRain(on) {
        cancelAnimationFrame(this.rainFrame);
        this.rainCanvas?.remove();
        this.rainCanvas = null;
        if (!on || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const canvas = this.rainCanvas = document.createElement('canvas');
        canvas.className = 'matrix-rain';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.prepend(canvas);

        const ctx = canvas.getContext('2d');
        const size = 16;
        let drops = [];
        let last = 0;
        const draw = (time) => {
            this.rainFrame = requestAnimationFrame(draw);
            if (time - last < 60) return; // ~16 fps is plenty and keeps the CPU idle
            last = time;
            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                drops = Array.from({ length: Math.ceil(canvas.width / size) }, () => Math.random() * -60);
            }
            ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; // fade the previous frame into trails
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = `${size}px monospace`;
            drops.forEach((y, i) => {
                ctx.fillStyle = Math.random() > 0.975 ? '#d8ffe0' : '#00ff41';
                ctx.fillText(String.fromCharCode(0x30A0 + Math.random() * 96), i * size, y * size);
                drops[i] = y * size > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
            });
        };
        this.rainFrame = requestAnimationFrame(draw);
    }

    // Custom dropdown: the native <select> popup opens on top of the control and gets clipped at the window edge
    createPicker(id, label, storageKey, options, onChange) {
        const root = document.getElementById(id);
        const stored = localStorage.getItem(storageKey);
        const fallback = options.find(option => option.value === 'default');
        options = [...options].sort((a, b) => a.label.localeCompare(b.label));
        let current = options.find(option => option.value === stored) || fallback;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'picker-button';
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-label', label);

        const menu = document.createElement('div');
        menu.className = options.length > 8 ? 'picker-menu picker-menu-wide' : 'picker-menu';
        menu.setAttribute('role', 'listbox');
        menu.setAttribute('aria-label', label);

        const setOpen = (open) => {
            menu.hidden = !open;
            button.setAttribute('aria-expanded', String(open));
        };
        const swatch = (option) => {
            const dot = document.createElement('span');
            dot.className = 'picker-swatch';
            dot.dataset.color = option.value;
            return dot;
        };
        const render = () => {
            button.replaceChildren(...(current.swatch ? [swatch(current)] : []), current.label);
            items.forEach((item, index) => item.setAttribute('aria-selected', String(options[index] === current)));
        };
        const items = options.map(option => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'picker-option';
            item.setAttribute('role', 'option');
            item.append(...(option.swatch ? [swatch(option)] : []), option.label);
            item.addEventListener('click', () => {
                current = option;
                localStorage.setItem(storageKey, option.value);
                setOpen(false);
                render();
                onChange(option.value);
                button.focus();
            });
            menu.appendChild(item);
            return item;
        });

        button.addEventListener('click', () => setOpen(menu.hidden));
        document.addEventListener('click', (event) => {
            if (!root.contains(event.target)) setOpen(false);
        });
        root.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                button.focus();
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setOpen(true);
                const step = event.key === 'ArrowDown' ? 1 : -1;
                const from = items.includes(document.activeElement) ? items.indexOf(document.activeElement) : options.indexOf(current) - step;
                items[(from + step + items.length) % items.length].focus();
            }
        });

        root.append(button, menu);
        setOpen(false);
        render();
        onChange(current.value);
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
            
            if (result.buildDate) {
                const footer = document.getElementById('build-date');
                footer.textContent = `Build: ${result.buildDate}`;
                footer.classList.remove('hidden');
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
        if (document.getElementById('logo-loading-banner')) return;
        // Create a loading message banner
        const loadingBanner = document.createElement('div');
        loadingBanner.id = 'logo-loading-banner';
        loadingBanner.className = 'logo-banner px-4 py-2 text-sm';
        loadingBanner.innerHTML = `
            <div class="flex items-center">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-3"></div>
                <span>Logos are being processed in the background. The page will update automatically when ready.</span>
            </div>
        `;
        
        // Insert the banner at the top of the content
        const content = document.getElementById('content-area');
        if (content && content.firstChild) {
            content.insertBefore(loadingBanner, content.firstChild);
        }
    }

    startLogoPolling() {
        // Poll every 2 seconds to check if logos are ready
        this.stopLogoPolling();
        this.logoPollingInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/links');
                if (response.ok) {
                    const result = await response.json();
                    
                    // If loading is no longer true, logos are ready
                    if (!result.loading) {
                        this.stopLogoPolling();
                        this.data = result;
                        const tab = this.activeTab;
                        this.renderTabs();
                        if (tab > 0 && tab < result.tabs.length) this.switchTab(tab); // keep the user's tab
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
            tabButton.className = `tab-button px-3 py-4 text-sm font-medium border-b-2 border-transparent ${index === 0 ? 'active' : ''}`;
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

        if (this.currentLayout === 'default') {
            this.renderDefaultLayout(activeTabData);
        } else if (this.currentLayout === 'creative') {
            this.renderCreativeLayout(activeTabData);
        } else {
            // columns, columns-vertical, masonry, launcher, terminal: same markup, styled per layout in themes.css
            this.renderColumnsLayout(activeTabData);
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
        title.className = 'section-title text-xl font-semibold mb-4';
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
        card.href = this.safeUrl(link.url);
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.className = 'link-card rounded-lg shadow-md hover:shadow-lg p-4 flex items-center space-x-3 animate-slide-up';

        // Logo
        const logoContainer = document.createElement('div');
        logoContainer.className = 'flex-shrink-0';

        if (String(link.logoPath).startsWith('/logos/')) { // only server-generated paths
            const logo = document.createElement('img');
            logo.src = link.logoPath;
            logo.alt = `${link.name} logo`;
            logo.className = 'logo-img';
            logo.onerror = () => {
                // Fallback to icon hint or default icon
                logoContainer.innerHTML = this.createFallbackIcon(link['icon-hint'] || link.iconHint);
            };
            logoContainer.appendChild(logo);
        } else {
            logoContainer.innerHTML = this.createFallbackIcon(link['icon-hint'] || link.iconHint);
        }

        // Content
        const content = document.createElement('div');
        content.className = 'flex-1 min-w-0';

        const name = document.createElement('h3');
        name.className = 'text-sm font-medium truncate';
        name.textContent = link.name;

        const url = document.createElement('p');
        url.className = 'link-url text-xs truncate';
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
        linkElement.href = this.safeUrl(link.url);
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';

        // Logo
        const logoContainer = document.createElement('div');
        logoContainer.className = 'flex-shrink-0';

        if (String(link.logoPath).startsWith('/logos/')) { // only server-generated paths
            const logo = document.createElement('img');
            logo.src = link.logoPath;
            logo.alt = `${link.name} logo`;
            logo.className = 'logo-img';
            logo.onerror = () => {
                logoContainer.innerHTML = this.createFallbackIcon(link['icon-hint'] || link.iconHint);
            };
            logoContainer.appendChild(logo);
        } else {
            logoContainer.innerHTML = this.createFallbackIcon(link['icon-hint'] || link.iconHint);
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
        linkElement.href = this.safeUrl(link.url);
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';

        // Logo
        const logoContainer = document.createElement('div');
        logoContainer.className = 'flex-shrink-0';

        if (String(link.logoPath).startsWith('/logos/')) { // only server-generated paths
            const logo = document.createElement('img');
            logo.src = link.logoPath;
            logo.alt = `${link.name} logo`;
            logo.className = 'logo-img';
            logo.onerror = () => {
                logoContainer.innerHTML = this.createFallbackIcon(link['icon-hint'] || link.iconHint);
            };
            logoContainer.appendChild(logo);
        } else {
            logoContainer.innerHTML = this.createFallbackIcon(link['icon-hint'] || link.iconHint);
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

        return Object.hasOwn(iconMap, iconHint) ? iconMap[iconHint] : iconMap.default;
    }

    // Only http(s) links are clickable: blocks javascript:/data: URLs from the data source
    safeUrl(url) {
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '#';
        } catch (error) {
            return '#';
        }
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
