// Police Dashboard Main Controller - COMPLETE VERSION
class PoliceDashboard {
    constructor() {
        this.currentTab = 'draft-fir';
        this.apiBase = 'http://localhost:5001/api/police';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateSystemStatus();
        setInterval(() => this.updateSystemStatus(), 30000);
    }

    setupEventListeners() {
        // Sidebar tab switching
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.getAttribute('data-tab');
                this.showTab(tab);
            });
        });

        // Quick action buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.getAttribute('data-tab');
                if (tab) {
                    this.showTab(tab);
                }
            });
        });

        // Case filter
        const caseFilter = document.getElementById('caseFilter');
        if (caseFilter) {
            caseFilter.addEventListener('change', () => {
                this.loadPendingCases();
            });
        }

        // Legal search
        const legalSearch = document.getElementById('legalSearch');
        if (legalSearch) {
            legalSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchLegalResources();
                }
            });
        }

                // Case Management tab filter buttons
        document.querySelectorAll('.tab-filter').forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.dataset.filter;
                
                // update active button UI
                document.querySelectorAll('.tab-filter').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                
                // load data depending on filter
                if (filter === 'pending') {
                    this.loadPendingCases();
                } else if (filter === 'updates') {
                    this.loadCaseUpdates();
                } else if (filter === 'all') {
                    this.loadAllCases();
                }
            });
        });

    }

    showTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Map tab names to their corresponding content IDs
        const tabMap = {
            'draft-fir': 'draft-fir',
            'case-management': 'case-management-tab', 
            'crime-analytics': 'crime-analytics-tab',
            'criminal-matching': 'criminal-matching-tab',
            'legal-resources': 'legal-resources-tab'
        };
        
        const contentId = tabMap[tabName] || tabName;
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Deactivate all sidebar buttons
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const targetTab = document.getElementById(contentId);
        if (targetTab) {
            targetTab.classList.add('active');
            
            // Activate corresponding sidebar button
            const correspondingBtn = document.querySelector(`.sidebar-btn[data-tab="${tabName}"]`);
            if (correspondingBtn) {
                correspondingBtn.classList.add('active');
            }

            // Load tab-specific data
            this.loadTabData(tabName);
        }

        this.currentTab = tabName;
    }



    


    // add this method inside the PoliceDashboard class
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }


    async loadTabData(tabName) {
        try {
            switch(tabName) {
                case 'case-management':
                    await this.loadCaseManagement();
                    break;

                case 'crime-analytics':
                console.log('🔄 Loading crime analytics tab...');
                await this.loadEnhancedAnalytics();
                break;

                case 'analytics':
                    await this.loadAnalytics();
                    break;
                case 'criminal-matching':
                    await this.loadCriminalMatching();
                    break;
                case 'hotspots':
                    await this.loadHotspots();
                    break;
                case 'legal-resources':
                    await this.loadLegalResources();
                    break;
                case 'templates':
                    await this.loadTemplates();
                    break;
                case 'dashboard-overview':
                    await this.loadDashboardOverview();
                    break;
            }
        } catch (error) {
            console.error(`Error loading tab ${tabName}:`, error);
        }
    }










    async loadEnhancedAnalytics() {
    try {
        // Show loading state
        const loading = document.getElementById('analyticsLoading');
        const results = document.getElementById('analyticsResults');
        
        if (loading) loading.style.display = 'flex';
        if (results) results.style.display = 'none';

        // Try to use enhanced analytics if available
        if (window.enhancedAnalytics && typeof window.enhancedAnalytics.initialize === 'function') {
            console.log('✅ Using enhanced analytics');
            await window.enhancedAnalytics.initialize();
        } 
        // Fallback to basic analytics
        else if (window.analyticsDashboard && typeof window.analyticsDashboard.generateAnalytics === 'function') {
            console.log('🔄 Using basic analytics as fallback');
            await window.analyticsDashboard.generateAnalytics();
        }
        // Ultimate fallback - direct API call
        else {
            console.log('📊 Using direct API fallback');
            await this.loadAnalyticsDirect();
        }
    } catch (error) {
        console.error('Error in loadEnhancedAnalytics:', error);
        // Ultimate fallback - show sample data
        this.showSampleAnalytics();
    }
}

async loadAnalyticsDirect() {
    try {
        const response = await fetch('http://localhost:5001/api/police/analytics?range=month');
        const data = await response.json();
        
        if (data.success && data.analytics) {
            this.displayBasicAnalytics(data.analytics);
        } else {
            this.showSampleAnalytics();
        }
    } catch (error) {
        console.error('Direct API call failed:', error);
        this.showSampleAnalytics();
    }
}

displayBasicAnalytics(analytics) {
    const container = document.getElementById('analyticsResults');
    if (!container) return;

    container.innerHTML = `
        <div class="analytics-card">
            <h3>📊 Crime Analytics</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${analytics.total_cases || 0}</span>
                    <span class="stat-label">Total Cases</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${analytics.resolved_cases || 0}</span>
                    <span class="stat-label">Resolved</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${analytics.resolution_rate || 0}%</span>
                    <span class="stat-label">Resolution Rate</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${analytics.pending_cases || 0}</span>
                    <span class="stat-label">Pending</span>
                </div>
            </div>
        </div>

        <div class="analytics-grid">
            <div class="analytics-card">
                <h3>📈 Crime Types</h3>
                <div class="chart-container">
                    <canvas id="basicCrimeTypeChart"></canvas>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>📍 Top Locations</h3>
                <div class="hotspots-list">
                    ${Object.entries(analytics.hotspots || {}).slice(0, 5).map(([location, count]) => `
                        <div class="hotspot-item">
                            <div class="location-info">
                                <i class="material-icons">location_on</i>
                                <span>${location}</span>
                            </div>
                            <div class="location-stats">
                                <span class="count">${count} cases</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Create basic chart
    this.createBasicChart(analytics.crime_types);
    
    // Hide loading
    this.hideAnalyticsLoading();
}

showSampleAnalytics() {
    const sampleData = {
        total_cases: 167,
        resolved_cases: 94,
        pending_cases: 73,
        resolution_rate: 56.3,
        crime_types: {
            'Theft': 52,
            'Assault': 38,
            'Fraud': 31,
            'Cybercrime': 26,
            'Robbery': 15,
            'Other': 5
        },
        hotspots: {
            'Downtown Area': 42,
            'Shopping District': 35,
            'Residential Zone': 28,
            'Industrial Area': 22,
            'Park Area': 18
        }
    };
    
    this.displayBasicAnalytics(sampleData);
}

createBasicChart(crimeTypes = {}) {
    const ctx = document.getElementById('basicCrimeTypeChart');
    if (!ctx) return;

    const labels = Object.keys(crimeTypes);
    const data = Object.values(crimeTypes);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cases',
                data: data,
                backgroundColor: '#1976d2',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

hideAnalyticsLoading() {
    const loading = document.getElementById('analyticsLoading');
    const results = document.getElementById('analyticsResults');
    
    if (loading) loading.style.display = 'none';
    if (results) results.style.display = 'block';
}











    async loadCaseManagement() {
    // Load both pending cases and case updates together
        await Promise.all([
            this.loadPendingCases(),
            this.loadCaseUpdates()
        ]);

    // Optionally, preload all cases list
    // this.loadAllCases(1, 10);
    }

    async loadAllCases(page = 1, limit = 10) {
        try {
            // Ensure containers exist
            const loader = document.getElementById("casesLoading");
            const content = document.getElementById("casesContent");

            if (!loader || !content) {
                console.error("❌ Case container elements not found in DOM");
                return;
            }

            loader.style.display = "flex";
            content.style.display = "none";

            const response = await fetch(`http://localhost:5001/api/fir/list?page=${page}&limit=${limit}`);
            const data = await response.json();

            loader.style.display = "none";
            content.style.display = "block";

            if (!data.success || !data.records || data.records.length === 0) {
                content.innerHTML = `<p class="no-data">No FIR records found.</p>`;
                return;
            }

            content.innerHTML = data.records.map(r => `
                <div class="case-card all">
                    <h3>FIR #${r.fir_number}</h3>
                    <p><strong>Type:</strong> ${r.incident_type}</p>
                    <p><strong>Date:</strong> ${r.incident_date}</p>
                    <p><strong>Officer:</strong> ${r.investigating_officer || 'N/A'}</p>
                    <p><strong>Status:</strong> ${r.status || 'N/A'}</p>
                </div>
            `).join("");
        } catch (err) {
            console.error("💥 loadAllCases error:", err);
            const content = document.getElementById("casesContent");
            if (content) content.innerHTML = `<p class="error">Error loading all cases.</p>`;
        }
    }




    async loadDashboardOverview() {
        try {
            const response = await fetch(`${this.apiBase}/dashboard/overview`);
            const data = await response.json();

            if (data.success) {
                this.updateDashboardStats(data.overview);
            }
        } catch (error) {
            console.error('Failed to load dashboard overview:', error);
        }
    }

    updateDashboardStats(overview) {
        if (!overview) return;

        // Update statistics
        if (document.getElementById('todayCases')) {
            document.getElementById('todayCases').textContent = overview.today_cases || 0;
        }
        if (document.getElementById('pendingCases')) {
            document.getElementById('pendingCases').textContent = overview.pending_cases || 0;
        }
        
        // Update badge counts
        if (document.getElementById('pendingCount')) {
            document.getElementById('pendingCount').textContent = overview.pending_cases || 0;
        }
        if (document.getElementById('updatesCount')) {
            document.getElementById('updatesCount').textContent = overview.recent_activity?.length || 0;
        }

        // Update recent activity
        this.updateRecentActivity(overview.recent_activity);
    }

    updateRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        if (!container || !activities) return;

        if (activities.length === 0) {
            container.innerHTML = '<p class="no-activity">No recent activity</p>';
            return;
        }

        container.innerHTML = activities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="material-icons">update</i>
                </div>
                <div class="activity-details">
                    <strong>${activity.fir_number}</strong>
                    <span>${activity.incident_type} - ${this.formatTime(activity.last_updated)}</span>
                </div>
            </div>
        `).join('');
    }

    // -------------------------
// loadPendingCases (replacement)
// -------------------------
    async loadPendingCases() {
        try {
            const loader = document.getElementById("casesLoading");
            const content = document.getElementById("casesContent");

            if (!loader || !content) {
                console.error("❌ Case container elements not found in DOM");
                return;
            }

            loader.style.display = "flex";
            content.style.display = "none";

            // show last 6 months by default (server supports ?months=N)
            const response = await fetch(`${this.apiBase}/cases/pending?months=6`);
            const data = await response.json();

            loader.style.display = "none";
            content.style.display = "block";

            if (!data.success || !data.cases || data.cases.length === 0) {
                content.innerHTML = `<div class="no-data">No pending cases found</div>`;
                return;
            }

            // Render cards using data-fir attributes (no inline onclick)
            content.innerHTML = data.cases.map(c => {
                const firEsc = this.escapeHtml(c.fir_number || '');
                const priority = this.escapeHtml(c.analysis?.priority || 'medium');
                return `
                    <div class="case-card priority-${priority}">
                        <div class="case-header">
                            <h4>${this.escapeHtml(c.fir_number)} - ${this.escapeHtml(c.incident_type || '')}</h4>
                            <span class="case-days">${c.days_pending || 0} days pending</span>
                        </div>
                        <div class="case-details">
                            <p><strong>Location:</strong> ${this.escapeHtml(c.incident_location || 'N/A')}</p>
                            <p><strong>Victim:</strong> ${this.escapeHtml(c.victim_name || 'N/A')}</p>
                            <p><strong>Officer:</strong> ${this.escapeHtml(c.investigating_officer || 'N/A')}</p>
                        </div>
                        <div class="case-analysis">
                            <span class="priority-badge ${priority}">${priority} priority</span>
                            ${c.analysis?.action_items ? c.analysis.action_items.map(item => `<span class="action-item">${this.escapeHtml(item)}</span>`).join('') : ''}
                        </div>
                        <div class="case-actions">
                            <button class="btn-view" data-fir="${firEsc}">View</button>
                            <button class="btn-update" data-fir="${firEsc}">Update</button>
                        </div>
                    </div>
                `;
            }).join('');

            // attach click handlers (explicit after render to avoid duplicates)
            content.querySelectorAll('.btn-view').forEach(btn => {
                btn.onclick = (e) => {
                    const fir = btn.dataset.fir;
                    if (fir) viewCaseDetails(fir);
                };
            });

            content.querySelectorAll('.btn-update').forEach(btn => {
                btn.onclick = (e) => {
                    const fir = btn.dataset.fir;
                    if (fir) quickUpdateCase(fir); // quick update opens modal in edit mode
                };
            });

        } catch (error) {
            console.error("💥 Failed to load pending cases:", error);
            const content = document.getElementById("casesContent");
            if (content) content.innerHTML = `<p class="error">Error loading pending cases.</p>`;
        }
    }



    displayPendingCases(cases, filter = 'all') {
        // use the unified content container to render
        const container = document.getElementById('casesContent');
        if (!container) return;

        if (!cases || cases.length === 0) {
            container.innerHTML = '<div class="no-data">No pending cases requiring immediate attention</div>';
            return;
        }

        // Apply filter
        let filteredCases = cases;
        if (filter === 'high') {
            filteredCases = cases.filter(c => c.analysis?.priority === 'high');
        } else if (filter === 'medium') {
            filteredCases = cases.filter(c => c.analysis?.priority === 'medium');
        } else if (filter === 'old') {
            filteredCases = cases.filter(c => (c.days_pending || 0) > 7);
        }

        if (filteredCases.length === 0) {
            container.innerHTML = `<div class="no-data">No cases match the "${filter}" filter</div>`;
            return;
        }

        // Build HTML with data-fir attributes (no inline onclick)
        container.innerHTML = filteredCases.map(caseItem => {
            const firEsc = this.escapeHtml(caseItem.fir_number || '');
            const priority = caseItem.analysis?.priority || 'medium';
            return `
                <div class="case-card priority-${priority}">
                    <div class="case-header">
                        <h4>${this.escapeHtml(caseItem.fir_number)} - ${this.escapeHtml(caseItem.incident_type || '')}</h4>
                        <span class="case-days">${caseItem.days_pending || 0} days pending</span>
                    </div>
                    <div class="case-details">
                        <p><strong>Location:</strong> ${this.escapeHtml(caseItem.incident_location || 'N/A')}</p>
                        <p><strong>Victim:</strong> ${this.escapeHtml(caseItem.victim_name || 'N/A')}</p>
                        <p><strong>Officer:</strong> ${this.escapeHtml(caseItem.investigating_officer || 'N/A')}</p>
                    </div>
                    <div class="case-analysis">
                        <span class="priority-badge ${priority}">${priority} priority</span>
                        ${caseItem.analysis?.action_items ? 
                            caseItem.analysis.action_items.map(item => `<span class="action-item">${this.escapeHtml(item)}</span>`).join('') : ''
                        }
                    </div>
                    <div class="case-actions">
                        <button class="btn-view" data-fir="${firEsc}">View Details</button>
                        <button class="btn-update" data-fir="${firEsc}">Update Status</button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners (delegation alternative is fine — here we attach after render)
        container.querySelectorAll('.btn-view').forEach(btn => {
            btn.removeEventListener('click', btn._viewHandler); // safe remove if present
            const handler = (e) => {
                const fir = e.currentTarget.dataset.fir;
                if (fir) viewCaseDetails(fir);
            };
            btn.addEventListener('click', handler);
            btn._viewHandler = handler;
        });

        container.querySelectorAll('.btn-update').forEach(btn => {
            btn.removeEventListener('click', btn._updateHandler);
            const handler = (e) => {
                const fir = e.currentTarget.dataset.fir;
                if (fir) updateCaseStatus(fir);
            };
            btn.addEventListener('click', handler);
            btn._updateHandler = handler;
        });
    }


    async loadCaseUpdates() {
        try {
            const loader = document.getElementById("casesLoading");
            const content = document.getElementById("casesContent");

            if (!loader || !content) {
                console.error("❌ Case container elements not found in DOM");
                return;
            }

            loader.style.display = "flex";
            content.style.display = "none";

            const response = await fetch(`${this.apiBase}/cases/updates`);
            const data = await response.json();

            loader.style.display = "none";
            content.style.display = "block";

            if (!data.success || !data.updates || data.updates.length === 0) {
                content.innerHTML = `<div class="no-data">No recent updates available</div>`;
                return;
            }

            content.innerHTML = data.updates.map(update => `
                <div class="case-card update">

                    <h3>FIR #${update.fir_number}</h3>
                    <p><strong>Type:</strong> ${update.incident_type}</p>
                    <p><strong>Officer:</strong> ${update.officer || 'N/A'}</p>
                    <p><strong>Last Updated:</strong> ${this.formatTime(update.last_updated)}</p>
                    <span class="update-type">${update.update_type}</span>
                </div>
            `).join("");
        } catch (error) {
            console.error("💥 Failed to load case updates:", error);
            const content = document.getElementById("casesContent");
            if (content) content.innerHTML = `<p class="error">Error loading case updates.</p>`;
        }
    }


    displayCaseUpdates(updates) {
        const container = document.getElementById('casesContent');
        if (!container) return;

        if (!updates || updates.length === 0) {
            container.innerHTML = '<div class="no-data">No recent case updates</div>';
            return;
        }

        // Render updates in card-like layout (consistent with pending)
        container.innerHTML = updates.map(update => {
            const firEsc = this.escapeHtml(update.fir_number || '');
            return `
                <div class="case-card update">
                    <div class="case-header">
                        <h4>${this.escapeHtml(update.fir_number)} - ${this.escapeHtml(update.incident_type || '')}</h4>
                        <span class="update-type">${this.escapeHtml(update.update_type || 'Modified')}</span>
                    </div>
                    <div class="case-details">
                        <p><strong>Officer:</strong> ${this.escapeHtml(update.officer || 'N/A')}</p>
                        <p><strong>Last Updated:</strong> ${this.escapeHtml(update.last_updated || '')}</p>
                    </div>
                    <div class="case-actions">
                        <button class="btn-view" data-fir="${firEsc}">View Details</button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach view listeners
        container.querySelectorAll('.btn-view').forEach(btn => {
            btn.removeEventListener('click', btn._viewHandler);
            const handler = (e) => {
                const fir = e.currentTarget.dataset.fir;
                if (fir) viewCaseDetails(fir);
            };
            btn.addEventListener('click', handler);
            btn._viewHandler = handler;
        });
    }


    async loadAnalytics() {
        try {
            this.showLoading('analyticsResults', 'Fetching crime analytics...');

            const response = await fetch(`${this.apiBase}/analytics?range=month`);
            const data = await response.json();

            if (!data.success || !data.analytics) {
                this.showError('analyticsResults', 'No analytics data available');
                return;
            }

            const analytics = data.analytics;
            this.displayAnalytics(analytics);
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.showError('analyticsResults', 'Error loading analytics');
        }
    }


    displayAnalytics(analytics) {
        const container = document.getElementById('analyticsResults');
        if (!container) return;

        if (!analytics) {
            container.innerHTML = '<div class="no-data">No analytics data available</div>';
            return;
        }

        const crimeTypes = Object.entries(analytics.crime_types || {}).map(
            ([type, count]) => `<div class="crime-type-item"><span>${type}</span><span class="count">${count} cases</span></div>`
        ).join('') || '<p>No data</p>';

        const topLocations = Object.entries(analytics.hotspots || {}).map(
            ([loc, count]) => `<div class="crime-type-item"><span>${loc}</span><span class="count">${count} cases</span></div>`
        ).join('') || '<p>No data</p>';

        container.innerHTML = `
            <div class="analytics-grid">
                <div class="analytics-card">
                    <h3>Overall Statistics</h3>
                    <div class="stats-overview">
                        <div class="stat-item">
                            <span>Total Cases:</span>
                            <strong>${analytics.total_cases}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Resolution Rate:</span>
                            <strong>${analytics.resolution_rate}%</strong>
                        </div>
                        <div class="stat-item">
                            <span>Pending Cases:</span>
                            <strong>${analytics.pending_cases}</strong>
                        </div>
                    </div>
                </div>

                <div class="analytics-card">
                    <h3>Crime Types</h3>
                    ${crimeTypes}
                </div>

                <div class="analytics-card">
                    <h3>Top Locations</h3>
                    ${topLocations}
                </div>
            </div>
        `;
    }



    async loadCriminalMatching() {
        try {
            const container = document.getElementById('matchingResults');
            if (container) {
                container.innerHTML = `
                    <div class="matching-instructions">
                        <h4>🔍 Criminal Pattern Matching</h4>
                        <p>Enter case details above to find similar criminal patterns from our database.</p>
                        <div class="feature-list">
                            <div class="feature-item">
                                <i class="material-icons">fingerprint</i>
                                <span>Modus Operandi Analysis</span>
                            </div>
                            <div class="feature-item">
                                <i class="material-icons">compare</i>
                                <span>Pattern Recognition</span>
                            </div>
                            <div class="feature-item">
                                <i class="material-icons">warning</i>
                                <span>Risk Assessment</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load criminal matching:', error);
        }
    }

    async loadHotspots() {
        try {
            this.showLoading('hotspotsList', 'Loading crime hotspots...');
            
            const response = await fetch(`${this.apiBase}/analytics/hotspots`);
            const data = await response.json();

            if (data.success) {
                this.displayHotspots(data.hotspots);
            } else {
                this.showError('hotspotsList', 'Failed to load crime hotspots');
            }
        } catch (error) {
            console.error('Failed to load hotspots:', error);
            this.showError('hotspotsList', 'Error loading hotspots');
        }
    }

    displayHotspots(hotspots) {
        const container = document.getElementById('hotspotsList');
        if (!container) return;

        if (!hotspots || Object.keys(hotspots).length === 0) {
            container.innerHTML = '<div class="no-data">No hotspot data available</div>';
            return;
        }

        container.innerHTML = Object.entries(hotspots).slice(0, 8).map(([location, count]) => `
            <div class="hotspot-item">
                <div class="hotspot-location">
                    <i class="material-icons">location_on</i>
                    <span>${location}</span>
                </div>
                <div class="hotspot-stats">
                    <span class="count">${count} cases</span>
                    <span class="risk-level">${count > 5 ? 'High' : count > 2 ? 'Medium' : 'Low'} Risk</span>
                </div>
            </div>
        `).join('');
    }

    async loadLegalResources() {
        try {
            this.showLoading('legalResources', 'Loading legal resources...');
            
            const response = await fetch(`${this.apiBase}/legal/resources`);
            const data = await response.json();

            if (data.success) {
                this.displayLegalResources(data.resources);
            } else {
                this.displayLegalResources(this.getDefaultLegalResources());
            }
        } catch (error) {
            console.error('Failed to load legal resources:', error);
            this.displayLegalResources(this.getDefaultLegalResources());
        }
    }

    getDefaultLegalResources() {
        return {
            ipc_sections: [
                {section: '379', title: 'Theft', penalty: '3 years or fine'},
                {section: '420', title: 'Cheating', penalty: '7 years and fine'},
                {section: '302', title: 'Murder', penalty: 'Life imprisonment or death'},
                {section: '354', title: 'Assault', penalty: '2 years or fine'},
                {section: '376', title: 'Rape', penalty: '10 years to life'},
                {section: '395', title: 'Robbery', penalty: '10 years and fine'}
            ],
            procedures: [
                {title: 'FIR Registration', steps: ['Verify complainant', 'Record statement', 'Register FIR']},
                {title: 'Evidence Collection', steps: ['Secure scene', 'Collect evidence', 'Document chain']}
            ],
            templates: [
                {name: 'Charge Sheet', type: 'document'},
                {name: 'Search Warrant', type: 'request'}
            ]
        };
    }

    displayLegalResources(resources) {
        const container = document.getElementById('legalResources');
        if (!container) return;

        const ipcSections = resources.ipc_sections || [];
        
        container.innerHTML = `
            <div class="resources-tabs">
                <button class="resource-tab active" data-type="ipc">IPC Sections</button>
                <button class="resource-tab" data-type="procedures">Procedures</button>
                <button class="resource-tab" data-type="templates">Templates</button>
            </div>
            
            <div class="resources-content">
                <div class="resource-section active" id="ipc-section">
                    <div class="ipc-sections-grid">
                        ${ipcSections.map(section => `
                            <div class="ipc-card">
                                <div class="ipc-header">
                                    <h4>Section ${section.section}</h4>
                                    <span class="section-title">${section.title}</span>
                                </div>
                                <div class="ipc-penalty">
                                    <strong>Penalty:</strong> ${section.penalty}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="resource-section" id="procedures-section">
                    <div class="procedures-list">
                        ${resources.procedures ? resources.procedures.map(proc => `
                            <div class="procedure-card">
                                <h4>${proc.title}</h4>
                                <ol>
                                    ${proc.steps.map(step => `<li>${step}</li>`).join('')}
                                </ol>
                            </div>
                        `).join('') : '<p>No procedures available</p>'}
                    </div>
                </div>
                
                <div class="resource-section" id="templates-section">
                    <div class="templates-grid">
                        ${resources.templates ? resources.templates.map(template => `
                            <div class="template-card">
                                <i class="material-icons">description</i>
                                <h4>${template.name}</h4>
                                <p>${template.type} template</p>
                                <button class="btn-download" onclick="downloadTemplate('${template.name}')">Download</button>
                            </div>
                        `).join('') : '<p>No templates available</p>'}
                    </div>
                </div>
            </div>
        `;

        // Setup resource tab switching
        this.setupResourceTabs();
    }

    setupResourceTabs() {
        document.querySelectorAll('.resource-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remove active class from all tabs and sections
                document.querySelectorAll('.resource-tab, .resource-section').forEach(el => {
                    el.classList.remove('active');
                });
                
                // Add active class to clicked tab
                e.target.classList.add('active');
                
                // Show corresponding section
                const sectionId = e.target.getAttribute('data-type') + '-section';
                const section = document.getElementById(sectionId);
                if (section) {
                    section.classList.add('active');
                }
            });
        });
    }

    loadTemplates() {
        // Static templates content
        console.log('Templates loaded');
    }

    searchLegalResources() {
        const searchTerm = document.getElementById('legalSearch')?.value;
        if (searchTerm) {
            alert(`Searching for: "${searchTerm}" - Advanced search coming soon!`);
        } else {
            alert('Please enter a search term');
        }
    }

    showLoading(containerId, message = 'Loading...') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="material-icons">refresh</i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="material-icons">error</i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    async updateSystemStatus() {
        try {
            const response = await fetch('http://localhost:5001/api/fir/health');
            const data = await response.json();

            const dbStatus = document.getElementById('dbStatus');
            const aiStatus = document.getElementById('aiStatus');

            if (dbStatus && aiStatus) {
                if (data.status === 'healthy') {
                    dbStatus.textContent = '● Online';
                    dbStatus.className = 'status-indicator online';
                    aiStatus.textContent = '● Online';
                    aiStatus.className = 'status-indicator online';
                } else {
                    dbStatus.textContent = '● Offline';
                    dbStatus.className = 'status-indicator offline';
                    aiStatus.textContent = '● Degraded';
                    aiStatus.className = 'status-indicator degraded';
                }
            }
        } catch (error) {
            const dbStatus = document.getElementById('dbStatus');
            const aiStatus = document.getElementById('aiStatus');
            if (dbStatus && aiStatus) {
                dbStatus.textContent = '● Offline';
                dbStatus.className = 'status-indicator offline';
                aiStatus.textContent = '● Offline';
                aiStatus.className = 'status-indicator offline';
            }
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return 'Unknown';
        return new Date(timestamp).toLocaleString();
    }
}

// Global functions for HTML onclick handlers
function showTab(tabName) {
    if (window.policeDashboard) {
        window.policeDashboard.showTab(tabName);
    }
}

// ---------- Case modal helpers (replace old viewCaseDetails/updateCaseStatus) ----------
// -------------------------
// Global helpers (compatible, robust)
// -------------------------
function showTab(tabName) {
    if (window.policeDashboard) {
        window.policeDashboard.showTab(tabName);
    }
}

// fallback helper: use CaseManager if present (preferred)
async function viewCaseDetails(firNumber) {
    if (!firNumber) return alert('Missing FIR number');

    // If CaseManager exists and exposes viewCaseDetails, prefer it
    if (window.caseManager && typeof window.caseManager.viewCaseDetails === 'function') {
        return window.caseManager.viewCaseDetails(firNumber);
    }

    // Otherwise use legacy fetch (compat) but call canonical endpoint
    try {
        const modal = document.getElementById('caseModal');
        if (modal) modal.style.display = 'block';
        if (document.getElementById('modalFirTitle')) document.getElementById('modalFirTitle').textContent = `FIR #${firNumber}`;
        if (document.getElementById('modalCaseDetails')) document.getElementById('modalCaseDetails').innerHTML = `<p>Loading case.</p>`;
        if (document.getElementById('modalTimeline')) document.getElementById('modalTimeline').innerHTML = `<p>Loading timeline.</p>`;

        const resp = await fetch(`http://localhost:5001/api/police/cases/${encodeURIComponent(firNumber)}`);
        const data = await resp.json();

        if (!data.success) {
            if (document.getElementById('modalCaseDetails')) document.getElementById('modalCaseDetails').innerHTML = `<p class="error">${data.error || 'Case not found'}</p>`;
            return;
        }

        const rec = data.record || {};
        // populate fields if present
        if (document.getElementById('modalIncidentType')) document.getElementById('modalIncidentType').textContent = rec.incident_type || 'N/A';
        if (document.getElementById('modalLocation')) document.getElementById('modalLocation').textContent = rec.incident_location || 'N/A';
        if (document.getElementById('modalVictim')) document.getElementById('modalVictim').textContent = rec.victim_name || 'N/A';
        if (document.getElementById('modalOfficer')) document.getElementById('modalOfficer').textContent = rec.investigating_officer || 'N/A';
        if (document.getElementById('modalStatus')) document.getElementById('modalStatus').textContent = rec.status || 'N/A';
        if (document.getElementById('modalDescription')) document.getElementById('modalDescription').textContent = rec.incident_description || 'N/A';
        if (document.getElementById('modalInvestigationNotes')) document.getElementById('modalInvestigationNotes').textContent = rec.investigation_notes || '—';

        // set status select control if present
        const sel = document.getElementById('updateStatusSelect');
        if (sel) sel.value = rec.status || sel.options[0].value;

        // timeline
        const tContainer = document.getElementById('modalTimeline');
        const acts = data.activities || [];
        if (!tContainer) return;
        if (!acts.length) {
            tContainer.innerHTML = '<p class="no-data">No activities recorded yet.</p>';
        } else {
            tContainer.innerHTML = acts.map(act => {
                const whenRaw = act.activity_date || act.created_at || null;
                const when = whenRaw ? new Date(whenRaw).toLocaleString() : 'Unknown';
                return `
                    <div class="timeline-item">
                        <div style="font-weight:600;">${(act.title || act.activity_type || '')} <small style="color:#666">by ${act.officer_name || 'Unknown'}</small></div>
                        <div style="margin-top:6px;color:#444;">${act.description || ''}</div>
                        <div style="margin-top:6px;font-size:12px;color:#888;">${when}</div>
                    </div>`;
            }).join('');
        }

    } catch (err) {
        console.error('viewCaseDetails error', err);
        alert('Error loading case details');
    }
}

/**
 * quickUpdateCase(fir) - user clicks the "Update" button for a fast status change.
 * Behaviour: prompt for new status (simple) and call API. If CaseManager.updateCaseStatus exists,
 * delegate to it so modal flows remain consistent.
 */
async function quickUpdateCase(firNumber) {
    if (!firNumber) return alert('Missing FIR number');

    // Ask for a new status quickly
    const newStatus = prompt(`Quick update status for ${firNumber}:`, 'under_investigation');
    if (!newStatus) return;

    // If CaseManager exists, use it
    if (window.caseManager && typeof window.caseManager.updateCaseStatus === 'function') {
        const res = await window.caseManager.updateCaseStatus(firNumber, newStatus, 'Quick update via Update button');
        if (res && res.success) {
            alert('Status updated successfully');
            if (window.policeDashboard) {
                window.policeDashboard.loadPendingCases();
                window.policeDashboard.loadCaseUpdates();
            }
            // if modal open, refresh it
            const modalOpen = document.getElementById('caseModal') && document.getElementById('caseModal').style.display === 'block'; 
            if (modalOpen) {
                const modal = document.getElementById('caseModal');
                modal.style.display = 'none'; // just close after update
            }

        } else {
            alert('Failed to update status: ' + (res.error || 'unknown'));
        }
        return;
    }

    // fallback: direct PUT to API
    try {
        const resp = await fetch(`http://localhost:5001/api/police/cases/${encodeURIComponent(firNumber)}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, notes: 'Quick update via Update button' })
        });
        const data = await resp.json();
        if (data.success) {
            alert('Status updated successfully');
            if (window.policeDashboard) {
                window.policeDashboard.loadPendingCases();
                window.policeDashboard.loadCaseUpdates();
            }
            const modalOpen = document.getElementById('caseModal') && document.getElementById('caseModal').style.display === 'block';
            if (modalOpen) viewCaseDetails(firNumber);
        } else {
            alert('Error updating status: ' + data.error);
        }
    } catch (err) {
        console.error('quickUpdateCase error', err);
        alert('Error updating status');
    }
}


// Install listeners for modal action buttons
document.addEventListener('click', function(e){
    const target = e.target;
    if (target && target.id === 'modalSaveStatusBtn') {
        // Save status
        const fir = document.getElementById('modalFirTitle').textContent.replace('FIR #','').trim();
        const newStatus = document.getElementById('updateStatusSelect').value;
        const notes = document.getElementById('updateNotes').value || '';
        if (!fir) return alert('Missing FIR number');

        (async () => {
            try {
                const resp = await fetch(`http://localhost:5001/api/police/cases/${encodeURIComponent(fir)}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus, notes: notes })
                });
                const data = await resp.json();
                if (data.success) {
                    alert('Status updated successfully');
                    // refresh lists
                    if (window.policeDashboard) {
                        // slight delay prevents "Server disconnected" when Supabase still closing
                        setTimeout(() => {
                            window.policeDashboard.loadPendingCases();
                            window.policeDashboard.loadCaseUpdates();
                        }, 500);
                    }

                    // refresh modal details & timeline
                    viewCaseDetails(fir);
                } else {
                    alert('Update failed: ' + (data.error || 'unknown'));
                }
            } catch (err) {
                console.error('save status failed', err);
                alert('Error updating status');
            }
        })();
    }

    if (target && target.id === 'modalAddNoteBtn') {
        // Add an activity/note
        const fir = document.getElementById('modalFirTitle').textContent.replace('FIR #','').trim();
        const note = document.getElementById('updateNotes').value || '';
        if (!note) return alert('Enter a note/description to add');
        if (!fir) return alert('Missing FIR number');

        (async () => {
            try {
                const resp = await fetch(`http://localhost:5001/api/police/cases/${encodeURIComponent(fir)}/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: 'Note added via dashboard',
                        description: note,
                        activity_type: 'note_added',
                        officer_name: 'Dashboard User'
                    })
                });
                const data = await resp.json();
                if (data.success) {
                    alert('Activity added');
                    // clear note field and refresh timeline
                    document.getElementById('updateNotes').value = '';
                    viewCaseDetails(fir);
                } else {
                    alert('Failed to add activity: ' + (data.error || 'unknown'));
                }
            } catch (err) {
                console.error('add note failed', err);
                alert('Error adding activity');
            }
        })();
    }
});





// 🔍 Criminal Pattern Matching Function
// ===== Replace existing findCriminalMatches() with this code =====
// === Criminal Matching Tab ===
// --- Criminal Matching Tab Logic ---
async function findCriminalMatches() {
    const descriptionInput = document.getElementById("caseDescription");
    const resultsDiv = document.getElementById("matchingResults");
    const query = descriptionInput.value.trim();

    if (!query) {
        resultsDiv.innerHTML = `
            <div class="info-state">
                <i class="material-icons">info</i>
                <p>Please enter a case description to search for similar patterns.</p>
            </div>`;
        return;
    }

    resultsDiv.innerHTML = `
        <div class="loading-state">
            <i class="material-icons rotating">sync</i>
            <p>Analyzing case patterns...</p>
        </div>`;

    try {
        const response = await fetch("http://localhost:5001/api/police/criminal-matching", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: query })
        });

        const data = await response.json();
        resultsDiv.innerHTML = "";

        if (!data.success || !data.matches || data.matches.length === 0) {
            resultsDiv.innerHTML = `
                <div class="info-state">
                    <i class="material-icons">sentiment_dissatisfied</i>
                    <p>No similar FIR records found.</p>
                </div>`;
            return;
        }

        // Render result cards
        data.matches.forEach(match => {
            const card = document.createElement("div");
            card.className = "match-card";
            card.innerHTML = `
                <h4>FIR #${match.fir_number || "N/A"}</h4>
                <p><strong>Type:</strong> ${match.incident_type || "Unknown"}</p>
                <p><strong>Location:</strong> ${match.incident_location || "Unknown"}</p>
                <p><strong>Status:</strong> ${match.status || "Unknown"}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${match.similarity}%;"></div>
                </div>
                <p class="confidence-text">Confidence: ${match.similarity}%</p>
            `;
            resultsDiv.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching matches:", error);
        resultsDiv.innerHTML = `
            <div class="info-state error">
                <i class="material-icons">error</i>
                <p>Unable to fetch matches. Please try again.</p>
            </div>`;
    }
}



// helper: render matches
function displayCriminalMatches(matches = []) {
    const container = document.getElementById('matchingResults');
    if (!container) return;

    if (!matches || matches.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="material-icons">fingerprint</i>
                <p>No similar patterns found.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = matches.map(m => {
        const name = escapeHtml(m.name || 'Unknown');
        const confidence = typeof m.match_confidence !== 'undefined' ? `${m.match_confidence}%` : 'N/A';
        const moScore = m.matched_elements?.modus_operandi ? `${m.matched_elements.modus_operandi}%` : 'N/A';
        const crimeTypeMatch = m.matched_elements?.crime_type_match ? 'Yes' : 'No';
        const locationMatch = m.matched_elements?.location_match ? 'Yes' : 'No';
        const desc = escapeHtml(m.modus_operandi || '');
        return `
            <div class="match-card">
                <div class="match-header">
                    <h4>${name}</h4>
                    <span class="confidence">${confidence}</span>
                </div>
                <div class="match-body">
                    <p><strong>Modus operandi:</strong> ${desc}</p>
                    <p><strong>MO similarity:</strong> ${moScore} | <strong>Crime type:</strong> ${crimeTypeMatch} | <strong>Location:</strong> ${locationMatch}</p>
                    <p><strong>Crime types:</strong> ${(m.crime_types || []).join(', ')}</p>
                </div>
                <div class="match-actions">
                    <button class="btn-view-profile" data-id="${m.id || ''}">View Profile</button>
                </div>
            </div>
        `;
    }).join('');

    // attach a delegated click handler for "View Profile" buttons
    container.querySelectorAll('.btn-view-profile').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (!id) return alert('No profile id available');
            // simple profile fetch — uses backend /api/police/criminal/profiles if available
            try {
                const resp = await fetch(`/api/police/criminal/profiles`);
                const body = await resp.json();
                if (body && body.success) {
                    const profile = (body.profiles || []).find(p => String(p.id) === String(id));
                    if (profile) {
                        alert(`Profile: ${profile.name}\nMO: ${profile.modus_operandi}\nCrime types: ${profile.crime_types?.join(', ')}`);
                    } else {
                        alert('Profile not found');
                    }
                } else {
                    alert('Failed to fetch profiles');
                }
            } catch (err) {
                console.error('Profile fetch error', err);
                alert('Error fetching profile');
            }
        });
    });
}




// === LEGAL RESOURCES (AI-Powered) ===
async function searchLegalResources() {
    const query = document.getElementById("legalSearch").value.trim();
    const container = document.getElementById("legalResourcesGrid");
    container.innerHTML = "";

    if (!query) {
        container.innerHTML = `
          <div class="info-state">
            <i class="material-icons">info</i>
            <p>Please enter a legal query to search.</p>
          </div>`;
        return;
    }

    // Show loading spinner
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Fetching legal information...</p>
      </div>`;

    try {
        const res = await fetch("http://localhost:5000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: query })
        });

        const data = await res.json();
        container.innerHTML = "";

        if (data.success && data.response) {
            const card = document.createElement("div");
            card.className = "resource-card";

            card.innerHTML = `
              <div class="resource-header">
                <i class="material-icons">description</i>
                <h3>Query Result</h3>
              </div>
              <div class="resource-body">
                <p>${data.response.replace(/\n/g, "<br>")}</p>
              </div>
            `;
            container.appendChild(card);
        } else {
            container.innerHTML = `
              <div class="info-state">
                <i class="material-icons">error_outline</i>
                <p>No relevant information found.</p>
              </div>`;
        }
    } catch (err) {
        console.error("Legal resource error:", err);
        container.innerHTML = `
          <div class="info-state">
            <i class="material-icons">warning</i>
            <p>Unable to fetch legal resources. Check chatbot service (port 5000).</p>
          </div>`;
    }
}


function downloadTemplate(templateName) {
    alert(`Downloading ${templateName} template - Feature coming soon!`);
}








// === 🎤 Voice-to-Text for Incident Description ===
let recognition;
let isRecording = false;

window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (window.SpeechRecognition) {
    recognition = new window.SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const textarea = document.getElementById('incidentDescription');
        if (textarea) textarea.value += (textarea.value ? ' ' : '') + transcript;
    };

    recognition.onstart = () => {
        document.getElementById('voiceStatus').innerText = '🎙 Listening...';
        document.getElementById('startVoiceBtn').innerText = '⏹ Stop';
        document.getElementById('startVoiceBtn').classList.add('recording');
    };

    recognition.onend = () => {
        document.getElementById('voiceStatus').innerText = '';
        document.getElementById('startVoiceBtn').innerText = '🎤';
        document.getElementById('startVoiceBtn').classList.remove('recording');
        isRecording = false;
    };

    recognition.onerror = (e) => {
        console.error('Speech recognition error:', e);
        alert('Microphone error: ' + e.error);
        document.getElementById('voiceStatus').innerText = '';
        document.getElementById('startVoiceBtn').innerText = '🎤';
        isRecording = false;
    };

    document.getElementById('startVoiceBtn').addEventListener('click', () => {
        if (!isRecording) {
            try {
                recognition.start();
                isRecording = true;
            } catch (err) {
                console.error('Recognition start failed:', err);
            }
        } else {
            recognition.stop();
        }
    });
} else {
    document.getElementById('voiceStatus').innerText = '❌ Voice input not supported in this browser.';
}


// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.policeDashboard = new PoliceDashboard();
});

// Manual trigger for analytics report generation
// -------------------- CRIME ANALYTICS --------------------
// -------------------- CRIME ANALYTICS --------------------
// -------------------- ENHANCED CRIME ANALYTICS --------------------
let crimeTypeChart = null;
let hotspotChart = null;
let trendChart = null;

async function generateAnalytics() {
    const range = document.getElementById("timeRange")?.value || "month";
    const loadingDiv = document.getElementById("analyticsLoading");
    const resultDiv = document.getElementById("analyticsResults");

    loadingDiv.style.display = "block";
    resultDiv.style.display = "none";

    try {
        const response = await fetch(`http://localhost:5001/api/police/analytics?range=${range}`);
        const data = await response.json();

        if (!data.success || !data.analytics) {
            loadingDiv.querySelector("p").innerText = "No analytics data found.";
            return;
        }

        const a = data.analytics;

        // Update stat cards
        document.getElementById("totalCasesCard").querySelector(".stat-value").innerText = a.total_cases;
        document.getElementById("resolvedCard").querySelector(".stat-value").innerText = a.resolved_cases;
        document.getElementById("pendingCard").querySelector(".stat-value").innerText = a.pending_cases;
        document.getElementById("resolutionCard").querySelector(".stat-value").innerText = `${a.resolution_rate}%`;

        // Chart Data
        const crimeTypeLabels = Object.keys(a.crime_types || {});
        const crimeTypeValues = Object.values(a.crime_types || {});
        const hotspotLabels = Object.keys(a.hotspots || {});
        const hotspotValues = Object.values(a.hotspots || {});
        const trendLabels = Object.keys(a.trend || {});
        const trendValues = Object.values(a.trend || {});

        // Destroy old charts if they exist
        [crimeTypeChart, hotspotChart, trendChart].forEach(c => c && c.destroy());

        // Pie chart: Crime Type Distribution
        crimeTypeChart = new Chart(document.getElementById("crimeTypeChart"), {
            type: "pie",
            data: {
                labels: crimeTypeLabels,
                datasets: [{
                    data: crimeTypeValues,
                    backgroundColor: ["#1976D2", "#43A047", "#FBC02D", "#E53935", "#8E24AA"],
                }],
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: "Crime Type Distribution",
                        font: { size: 16 }
                    },
                    legend: { position: "bottom" },
                },
            },
        });

        // Bar chart: Top Hotspots
        hotspotChart = new Chart(document.getElementById("hotspotChart"), {
            type: "bar",
            data: {
                labels: hotspotLabels,
                datasets: [{
                    label: "Incidents",
                    data: hotspotValues,
                    backgroundColor: "#2196F3",
                    borderRadius: 8,
                }],
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: "Top Crime Hotspots",
                        font: { size: 16 }
                    },
                },
                scales: { y: { beginAtZero: true } },
            },
        });

        

        loadingDiv.style.display = "none";
        resultDiv.style.display = "block";

        // Save analytics data for export
        window.latestAnalyticsData = a;

    } catch (err) {
        console.error("Error loading analytics:", err);
        loadingDiv.querySelector("p").innerText = "Failed to load analytics.";
    }
}

// -------------------- EXPORT FUNCTIONS --------------------
function exportAnalytics(type) {
    const a = window.latestAnalyticsData;
    if (!a) return alert("No analytics data to export. Generate report first.");

    if (type === "csv") {
        const rows = [
            ["Metric", "Value"],
            ["Total Cases", a.total_cases],
            ["Resolved", a.resolved_cases],
            ["Pending", a.pending_cases],
            ["Resolution Rate", a.resolution_rate + "%"],
            [],
            ["Crime Type", "Count"],
            ...Object.entries(a.crime_types || {}),
            [],
            ["Hotspot", "Cases"],
            ...Object.entries(a.hotspots || {}),
        ];

        const csv = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "crime_analytics_report.csv";
        link.click();
    }

    if (type === "pdf") {
        const reportWindow = window.open("", "_blank");
        reportWindow.document.write(`<h1>Crime Analytics Report</h1>`);
        reportWindow.document.write(`<p>Date: ${new Date().toLocaleString()}</p>`);
        reportWindow.document.write(`<h3>Total Cases: ${a.total_cases}</h3>`);
        reportWindow.document.write(`<h3>Resolution Rate: ${a.resolution_rate}%</h3>`);
        reportWindow.document.write(`<hr><h3>Crime Types</h3>`);
        reportWindow.document.write(`<pre>${JSON.stringify(a.crime_types, null, 2)}</pre>`);
        reportWindow.document.write(`<h3>Top Locations</h3>`);
        reportWindow.document.write(`<pre>${JSON.stringify(a.hotspots, null, 2)}</pre>`);
        reportWindow.document.close();
        reportWindow.print();
    }
}

// === Modal Close Logic (Fix for stuck case view modal) ===
// ---------------- Modal Close Handler ----------------
document.addEventListener('click', function(e) {
    const target = e.target;

    // Close when clicking the × button
    if (target && (target.classList.contains('modal-close') || target.id === 'modalCloseBtn')) {
        const modal = document.getElementById('caseModal');
        if (modal) modal.style.display = 'none';
    }

    // Close when clicking outside the modal content
    const modal = document.getElementById('caseModal');
    if (modal && e.target === modal) {
        modal.style.display = 'none';
    }
});

// === Modal Close Handling (keeps your old UI, fixes stuck issue) ===
function closeCaseModal() {
    const modal = document.getElementById('caseModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Also handle Esc key to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCaseModal();
});






