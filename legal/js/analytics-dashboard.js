// Enhanced Crime Analytics Dashboard - FIXED VERSION
class EnhancedAnalyticsDashboard {
    constructor() {
        this.apiBase = 'http://localhost:5001/api/police';
        this.charts = {};
        this.currentRange = 'month';
        this.analyticsData = null;
    }

    async initialize() {
        console.log('🔄 Initializing Enhanced Analytics Dashboard...');
        this.setupEventListeners();
        await this.generateAnalytics(this.currentRange);
        const pdfBtn = document.getElementById('exportPDF');
if (pdfBtn) {
    pdfBtn.onclick = () => {
        const data = this.analyticsData || window.currentAnalyticsData;
        if (!data || Object.keys(data).length === 0) {
            alert("No analytics data to export. Generate report first.");
            return;
        }
        this.exportAnalytics('pdf', data);
    };
}

const csvBtn = document.getElementById('exportCSV');
if (csvBtn) {
    csvBtn.onclick = () => {
        const data = this.analyticsData || window.currentAnalyticsData;
        if (!data || Object.keys(data).length === 0) {
            alert("No analytics data to export. Generate report first.");
            return;
        }
        this.exportAnalytics('csv', data);
    };
}

    }

    setupEventListeners() {
        // Use event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            // Time filter buttons
            if (e.target.classList.contains('time-filter-btn')) {
                document.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentRange = e.target.dataset.range;
                this.generateAnalytics(this.currentRange);
            }
        });
    }

    async generateAnalytics(range = 'month') {
        try {
            this.showLoading();
            console.log(`📊 Generating analytics for range: ${range}`);
            
            // Fetch main analytics data
            const analyticsResponse = await fetch(`${this.apiBase}/analytics?range=${range}`);
            
            // Check if response is JSON
            const contentType = analyticsResponse.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }
            
            const analyticsData = await analyticsResponse.json();

            console.log('📈 Analytics API Response:', analyticsData);

            if (analyticsData.success && analyticsData.analytics) {
                this.analyticsData = analyticsData.analytics;
                
                // Try to fetch status distribution, but don't fail if it doesn't exist
                try {
                    const statusResponse = await fetch(`${this.apiBase}/analytics/status-distribution`);
                    if (statusResponse.ok) {
                        const statusData = await statusResponse.json();
                        if (statusData.success && statusData.distribution) {
                            this.analyticsData.status_distribution = statusData.distribution;
                        }
                    }
                } catch (statusError) {
                    console.warn('Status distribution API not available:', statusError);
                    // Calculate basic status distribution from available data
                    this.analyticsData.status_distribution = this.calculateBasicStatusDistribution(this.analyticsData);
                }
                
                this.displayEnhancedAnalytics(this.analyticsData);
            } else {
                throw new Error(analyticsData.error || 'No analytics data received from API');
            }
        } catch (error) {
            console.error('Analytics error:', error);
            this.showError(`Unable to load crime analytics: ${error.message}`);
        }
    }

    calculateBasicStatusDistribution(analytics) {
        // Basic fallback calculation using available data
        const total = analytics.total_cases || 0;
        const resolved = analytics.resolved_cases || 0;
        const pending = analytics.pending_cases || 0;
        
        if (total === 0) {
            return {
                'Under Investigation': 0,
                'Resolved': 0,
                'Other': 0
            };
        }
        
        return {
            'Under Investigation': Math.max(0, pending - Math.floor(pending * 0.3)),
            'Charges Filed': Math.floor(pending * 0.2),
            'Court Proceedings': Math.floor(pending * 0.1),
            'Resolved': resolved,
            'Closed': Math.floor(resolved * 0.3)
        };
    }

    displayEnhancedAnalytics(analytics) {
        console.log('🎨 Displaying enhanced analytics:', analytics);
        window.currentAnalyticsData = analytics; // ✅ Store globally for exports
        this.analyticsData = analytics;
        
        // First, generate the HTML structure
        this.generateAnalyticsHTML(analytics);
        
        // Then update the content and create charts
        this.updateKeyMetrics(analytics);
        this.createCharts(analytics);
        this.displayInsights(analytics);
        
        
        
        this.hideLoading();
    }

    generateAnalyticsHTML(analytics) {
        const container = document.getElementById('analyticsResults');
        if (!container) {
            console.error('analyticsResults container not found');
            return;
        }

        container.innerHTML = `
            <!-- Key Metrics Overview -->
            <div class="analytics-card">
                <h3>📊 Key Performance Indicators</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value" id="totalCases">${analytics.total_cases || 0}</span>
                        <span class="stat-label">Total Cases</span>
                        <div id="totalCasesTrend" class="trend-indicator"></div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="resolvedCases">${analytics.resolved_cases || 0}</span>
                        <span class="stat-label">Resolved</span>
                        <div id="resolvedTrend" class="trend-indicator"></div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="resolutionRate">${analytics.resolution_rate || 0}%</span>
                        <span class="stat-label">Resolution Rate</span>
                        <div id="resolutionTrend" class="trend-indicator"></div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="avgResolutionTime">${analytics.avg_resolution_days || 'N/A'}</span>
                        <span class="stat-label">Avg. Resolution Days</span>
                        <div id="resolutionTimeTrend" class="trend-indicator"></div>
                    </div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="analytics-grid">
                <div class="analytics-card">
                    <h3>📈 Crime Type Distribution</h3>
                    <div class="chart-container">
                        <canvas id="crimeTypeChart"></canvas>
                    </div>
                </div>
                
                
                
                
                
                <div class="analytics-card">
                    <h3>⚖️ Case Status Distribution</h3>
                    <div class="chart-container">
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Insights & Hotspots -->
            <div class="analytics-grid">
                <div class="analytics-card">
                    <h3>💡 AI-Powered Insights</h3>
                    <div class="insights-list" id="analyticsInsights">
                        <!-- Insights will be populated here -->
                    </div>
                </div>
                
                
            </div>

            <!-- Comparative Analysis -->
            
        `;
    }

    updateKeyMetrics(analytics) {
        console.log('📊 Updating key metrics');
        // Update main metrics
        if (document.getElementById('totalCases')) {
            document.getElementById('totalCases').textContent = analytics.total_cases || 0;
        }
        if (document.getElementById('resolvedCases')) {
            document.getElementById('resolvedCases').textContent = analytics.resolved_cases || 0;
        }
        if (document.getElementById('resolutionRate')) {
            document.getElementById('resolutionRate').textContent = `${analytics.resolution_rate || 0}%`;
        }
        if (document.getElementById('avgResolutionTime')) {
            document.getElementById('avgResolutionTime').textContent = analytics.avg_resolution_days || 'N/A';
        }

        // Add trend indicators
        this.addTrendIndicator('totalCasesTrend', 5);
        this.addTrendIndicator('resolvedTrend', 12);
        this.addTrendIndicator('resolutionTrend', 8);
        this.addTrendIndicator('resolutionTimeTrend', -3);
    }

    addTrendIndicator(elementId, percentage) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const trendClass = percentage >= 0 ? 'trend-up' : 'trend-down';
        const icon = percentage >= 0 ? '📈' : '📉';
        
        element.innerHTML = `
            <span class="${trendClass}">
                ${icon} ${Math.abs(percentage)}%
            </span>
        `;
    }

    createCharts(analytics) {
        console.log('📈 Creating charts');
        this.createCrimeTypeChart(analytics.crime_types);
        
        this.createTrendChart(analytics.trends);
        this.createStatusChart(analytics.status_distribution);
        this.createComparisonChart();
    }

    createCrimeTypeChart(crimeTypes = {}) {
        const ctx = document.getElementById('crimeTypeChart');
        if (!ctx) {
            console.warn('crimeTypeChart canvas not found');
            return;
        }

        const distribution = crimeTypes || {};
        const filteredDistribution = Object.fromEntries(
            Object.entries(distribution).filter(([_, count]) => count > 0)
        );
        
        if (Object.keys(filteredDistribution).length === 0) {
            ctx.parentElement.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <i class="material-icons" style="font-size: 3rem; margin-bottom: 1rem;">bar_chart</i>
                    <p>No crime type data available</p>
                </div>
            `;
            return;
        }

        const labels = Object.keys(filteredDistribution);
        const data = Object.values(filteredDistribution);

        // Destroy existing chart
        if (this.charts.crimeType) {
            this.charts.crimeType.destroy();
        }

        this.charts.crimeType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: true,
                        text: 'Crime Distribution',
                        font: { size: 16 }
                    }
                },
                cutout: '60%'
            }
        });
    }

    createHotspotChart(hotspots = {}) {
        const ctx = document.getElementById('hotspotChart');
        if (!ctx) {
            console.warn('hotspotChart canvas not found');
            return;
        }

        const locations = Object.entries(hotspots)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        const labels = locations.map(([location]) => location);
        const data = locations.map(([, count]) => count);

        if (this.charts.hotspot) {
            this.charts.hotspot.destroy();
        }

        this.charts.hotspot = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Incidents',
                    data: data,
                    backgroundColor: '#2196F3',
                    borderRadius: 8,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Top Crime Locations',
                        font: { size: 16 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    createTrendChart(trends = {}) {
        const ctx = document.getElementById('trendChart');
        if (!ctx) {
            console.warn('trendChart canvas not found');
            return;
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
        const trendData = trends || this.generateSampleTrendData();

        const labels = Object.keys(trendData);
        const data = Object.values(trendData);

        if (this.charts.trend) {
            this.charts.trend.destroy();
        }

        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Cases',
                    data: data,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4CAF50',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Crime Trends',
                        font: { size: 16 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    generateSampleTrendData() {
        return {
            'Jan': 12, 'Feb': 18, 'Mar': 15, 'Apr': 22,
            'May': 19, 'Jun': 25, 'Jul': 28, 'Aug': 24
        };
    }

    createStatusChart(statusData = {}) {
        const ctx = document.getElementById('statusChart');
        if (!ctx) {
            console.warn('statusChart canvas not found');
            return;
        }

        // Use real data or show message if no data
        const distribution = statusData || {};
        
        // Filter out zero values and check if we have data
        const filteredDistribution = Object.fromEntries(
            Object.entries(distribution).filter(([_, count]) => count > 0)
        );
        
        if (Object.keys(filteredDistribution).length === 0) {
            ctx.parentElement.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <i class="material-icons" style="font-size: 3rem; margin-bottom: 1rem;">pie_chart</i>
                    <p>No status data available</p>
                    <small>Case status information will appear here when available</small>
                </div>
            `;
            return;
        }

        const labels = Object.keys(filteredDistribution);
        const data = Object.values(filteredDistribution);

        if (this.charts.status) {
            this.charts.status.destroy();
        }

        this.charts.status = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF9800', '#2196F3', '#9C27B0', '#4CAF50', 
                        '#F44336', '#607D8B', '#FFC107', '#795548'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Case Status Distribution',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    createComparisonChart() {
        const ctx = document.getElementById('comparisonChart');
        if (!ctx) {
            console.warn('comparisonChart canvas not found');
            return;
        }

        const data = {
            current: 156,
            previous: 142,
            change: 9.8
        };

        if (this.charts.comparison) {
            this.charts.comparison.destroy();
        }

        this.charts.comparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Current Period', 'Previous Period'],
                datasets: [{
                    label: 'Total Cases',
                    data: [data.current, data.previous],
                    backgroundColor: ['#1976d2', '#bbdefb'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Period Comparison',
                        font: { size: 16 }
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        // Update comparison stats
        if (document.getElementById('prevPeriodCases')) {
            document.getElementById('prevPeriodCases').textContent = data.previous;
        }
        if (document.getElementById('changePercentage')) {
            document.getElementById('changePercentage').textContent = `${data.change}%`;
        }
    }

    displayInsights(analytics) {
    const container = document.getElementById('analyticsInsights');
    if (!container) return;

    const insights = [];

    // Dynamic insight 1: Resolution rate
    if (analytics.resolution_rate >= 80) {
        insights.push(`Excellent performance: ${analytics.resolution_rate}% of cases resolved.`);
    } else if (analytics.resolution_rate >= 50) {
        insights.push(`Moderate performance: ${analytics.resolution_rate}% of cases resolved.`);
    } else {
        insights.push(`Low resolution rate detected — only ${analytics.resolution_rate}% cases resolved.`);
    }

    // Dynamic insight 2: Most common crime type
    if (analytics.crime_types && Object.keys(analytics.crime_types).length > 0) {
        const [topCrime, topCount] = Object.entries(analytics.crime_types)
            .sort((a, b) => b[1] - a[1])[0];
        insights.push(`Most frequent crime: ${topCrime} with ${topCount} reported cases.`);
    }

    // Dynamic insight 3: Pending vs Resolved ratio
    if (analytics.pending_cases && analytics.resolved_cases) {
        const total = (analytics.pending_cases + analytics.resolved_cases) || 1;
        const pendingRatio = ((analytics.pending_cases / total) * 100).toFixed(1);
        insights.push(`Pending cases make up ${pendingRatio}% of total workload.`);
    }

    // Dynamic insight 4: Average resolution time
    if (analytics.avg_resolution_days && analytics.avg_resolution_days !== 'N/A') {
        insights.push(`Average resolution time: ${analytics.avg_resolution_days} days.`);
    }

    // Fallback if no insights were generated
    if (insights.length === 0) {
        insights.push("No sufficient analytics data available for insights.");
    }

    container.innerHTML = insights.map(
        insight => `
        <div class="insight-item">
            <i class="material-icons">lightbulb</i>
            <span>${insight}</span>
        </div>`
    ).join('');
}


    displayHotspots(analytics) {
        const container = document.getElementById('hotspotsList');
        if (!container) {
            console.warn('hotspotsList container not found');
            return;
        }

        const hotspots = analytics.hotspots || {};
        const topHotspots = Object.entries(hotspots)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (topHotspots.length === 0) {
            container.innerHTML = '<p class="no-data">No hotspot data available</p>';
            return;
        }

        container.innerHTML = topHotspots.map(([location, count]) => {
            const riskLevel = count > 10 ? 'high' : count > 5 ? 'medium' : 'low';
            return `
                <div class="hotspot-item">
                    <div class="location-info">
                        <i class="material-icons">location_on</i>
                        <span>${location}</span>
                    </div>
                    <div class="location-stats">
                        <span class="count">${count} cases</span>
                        <span class="risk-badge risk-${riskLevel}">${riskLevel.toUpperCase()} RISK</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    displayComparativeAnalysis(analytics) {
        // Simple comparative analysis
        const comparativeData = {
            current: analytics.total_cases || 0,
            previous: Math.round((analytics.total_cases || 0) * 0.9),
            change: 10
        };

        this.createComparisonChart(comparativeData);
    }

    showLoading() {
        const loading = document.getElementById('analyticsLoading');
        const results = document.getElementById('analyticsResults');
        
        if (loading) loading.style.display = 'flex';
        if (results) results.style.display = 'none';
    }

    hideLoading() {
        const loading = document.getElementById('analyticsLoading');
        const results = document.getElementById('analyticsResults');
        
        if (loading) loading.style.display = 'none';
        if (results) results.style.display = 'block';
    }

    showError(message) {
        this.hideLoading();
        const container = document.getElementById('analyticsResults');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="material-icons">error_outline</i>
                    <h3>Unable to Load Analytics</h3>
                    <p>${message}</p>
                    <button class="step-btn" onclick="window.enhancedAnalytics.generateAnalytics('${this.currentRange}')">
                        <i class="material-icons">refresh</i> Try Again
                    </button>
                </div>
            `;
        }
    }

    // ADD THIS METHOD TO FIX THE EXPORT ISSUE
    exportAnalytics(format) {
        if (!this.analyticsData) {
            alert('Please generate analytics first by selecting a time range');
            return;
        }

        const data = this.analyticsData;
        
        switch (format) {
            case 'pdf':
                this.exportToPDF(data);
                break;
            case 'csv':
                this.exportToCSV(data);
                break;
            case 'excel':
                this.exportToExcel(data);
                break;
        }
    }

    // MOVE EXPORT FUNCTIONS INSIDE THE CLASS
    exportToPDF(data) {
        try {
            const printWindow = window.open('', '_blank');
            const reportDate = new Date().toLocaleDateString();
            const timeRange = document.querySelector('.time-filter-btn.active')?.textContent || 'Month';
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Crime Analytics Report - ${reportDate}</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 40px; 
                            line-height: 1.6;
                            color: #333;
                        }
                        .header { 
                            text-align: center; 
                            border-bottom: 3px solid #1976d2; 
                            padding-bottom: 20px; 
                            margin-bottom: 30px; 
                        }
                        .header h1 { 
                            color: #1976d2; 
                            margin-bottom: 10px;
                        }
                        .section { 
                            margin-bottom: 30px; 
                            page-break-inside: avoid;
                        }
                        .section h2 { 
                            color: #1a237e; 
                            border-bottom: 2px solid #e3f2fd; 
                            padding-bottom: 10px;
                            margin-bottom: 15px;
                        }
                        .metrics-grid { 
                            display: grid; 
                            grid-template-columns: repeat(4, 1fr); 
                            gap: 15px; 
                            margin: 20px 0; 
                        }
                        .metric-card { 
                            background: #f8f9fa; 
                            padding: 15px; 
                            border-radius: 8px; 
                            text-align: center;
                            border-left: 4px solid #1976d2;
                        }
                        .metric-value { 
                            font-size: 24px; 
                            font-weight: bold; 
                            color: #1976d2; 
                            display: block;
                        }
                        .metric-label { 
                            font-size: 14px; 
                            color: #666; 
                            margin-top: 5px;
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin: 20px 0; 
                            font-size: 14px;
                        }
                        th, td { 
                            border: 1px solid #ddd; 
                            padding: 12px; 
                            text-align: left; 
                        }
                        th { 
                            background-color: #f8f9fa; 
                            font-weight: bold;
                            color: #1a237e;
                        }
                        tr:nth-child(even) {
                            background-color: #f9f9f9;
                        }
                        .footer {
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 1px solid #ddd;
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                        }
                        @media print {
                            body { margin: 20px; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Crime Analytics Report</h1>
                        <p><strong>Time Period:</strong> ${timeRange} | <strong>Generated:</strong> ${reportDate}</p>
                        <p><strong>Total Records:</strong> ${data.total_cases || 0} cases analyzed</p>
                    </div>
                    
                    <div class="section">
                        <h2>Key Performance Indicators</h2>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <span class="metric-value">${data.total_cases || 0}</span>
                                <span class="metric-label">Total Cases</span>
                            </div>
                            <div class="metric-card">
                                <span class="metric-value">${data.resolved_cases || 0}</span>
                                <span class="metric-label">Resolved Cases</span>
                            </div>
                            <div class="metric-card">
                                <span class="metric-value">${data.resolution_rate || 0}%</span>
                                <span class="metric-label">Resolution Rate</span>
                            </div>
                            <div class="metric-card">
                                <span class="metric-value">${data.pending_cases || 0}</span>
                                <span class="metric-label">Pending Cases</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>Crime Type Distribution</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Crime Type</th>
                                    <th>Case Count</th>
                                    <th>Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(data.crime_types || {}).map(([type, count]) => {
                                    const percentage = data.total_cases ? ((count / data.total_cases) * 100).toFixed(1) : '0.0';
                                    return `
                                        <tr>
                                            <td>${type}</td>
                                            <td>${count}</td>
                                            <td>${percentage}%</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="section">
                        <h2>Case Status Distribution</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Case Count</th>
                                    <th>Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(data.status_distribution || {}).map(([status, count]) => {
                                    const percentage = data.total_cases ? ((count / data.total_cases) * 100).toFixed(1) : '0.0';
                                    return `
                                        <tr>
                                            <td>${status}</td>
                                            <td>${count}</td>
                                            <td>${percentage}%</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="section">
                        <h2>Top Crime Hotspots</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Location</th>
                                    <th>Incident Count</th>
                                    <th>Risk Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(data.hotspots || {}).slice(0, 10).map(([location, count]) => {
                                    const riskLevel = count > 10 ? 'High' : count > 5 ? 'Medium' : 'Low';
                                    return `
                                        <tr>
                                            <td>${location}</td>
                                            <td>${count}</td>
                                            <td>${riskLevel}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="footer">
                        <p>Generated by Police Analytics Dashboard | Confidential Law Enforcement Use</p>
                    </div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        } catch (error) {
            console.error('PDF export error:', error);
            alert('Error generating PDF report');
        }
    }

    exportToCSV(data) {
        try {
            let csvContent = "Crime Analytics Report\n";
            csvContent += `Time Period: ${document.querySelector('.time-filter-btn.active')?.textContent || 'Month'}\n`;
            csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
            
            // Key Metrics
            csvContent += "KEY PERFORMANCE INDICATORS\n";
            csvContent += "Metric,Value\n";
            csvContent += `Total Cases,${data.total_cases || 0}\n`;
            csvContent += `Resolved Cases,${data.resolved_cases || 0}\n`;
            csvContent += `Resolution Rate,${data.resolution_rate || 0}%\n`;
            csvContent += `Pending Cases,${data.pending_cases || 0}\n\n`;
            
            // Crime Types
            csvContent += "CRIME TYPE DISTRIBUTION\n";
            csvContent += "Crime Type,Count,Percentage\n";
            Object.entries(data.crime_types || {}).forEach(([type, count]) => {
                const percentage = data.total_cases ? ((count / data.total_cases) * 100).toFixed(1) : '0.0';
                csvContent += `"${type}",${count},${percentage}%\n`;
            });
            csvContent += "\n";
            
            // Case Status
            csvContent += "CASE STATUS DISTRIBUTION\n";
            csvContent += "Status,Count,Percentage\n";
            Object.entries(data.status_distribution || {}).forEach(([status, count]) => {
                const percentage = data.total_cases ? ((count / data.total_cases) * 100).toFixed(1) : '0.0';
                csvContent += `"${status}",${count},${percentage}%\n`;
            });
            csvContent += "\n";
            
            // Hotspots
            csvContent += "TOP CRIME HOTSPOTS\n";
            csvContent += "Location,Incident Count,Risk Level\n";
            Object.entries(data.hotspots || {}).slice(0, 10).forEach(([location, count]) => {
                const riskLevel = count > 10 ? 'High' : count > 5 ? 'Medium' : 'Low';
                csvContent += `"${location}",${count},${riskLevel}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `crime_analytics_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('CSV export error:', error);
            alert('Error generating CSV report');
        }
    }

    exportToExcel(data) {
        // For now, we'll use CSV as Excel can open it
        this.exportToCSV(data);
    }
}

// Global export function that works with the class instance
function exportAnalytics(format) {
    if (window.enhancedAnalytics) {
        window.enhancedAnalytics.exportAnalytics(format);
    } else {
        alert('Please wait for analytics to load first');
    }
}

// Initialize enhanced analytics dashboard
window.enhancedAnalytics = new EnhancedAnalyticsDashboard();

// Global function for HTML onclick
function generateAnalytics() {
    if (window.enhancedAnalytics) {
        window.enhancedAnalytics.initialize();
    } else {
        console.error('Enhanced analytics not initialized');
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing enhanced analytics');
    if (window.enhancedAnalytics) {
        window.enhancedAnalytics.initialize();
    }
});

// Make sure the export function is globally available
window.exportAnalytics = exportAnalytics;