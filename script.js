// === UTILITY FUNCTIONS ===
function generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getDeviceId() {
    const info = navigator.userAgent + navigator.platform + navigator.language;
    let hash = 0;
    for (let i = 0; i < info.length; i++) {
        hash = (hash << 5) - hash + info.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function truncateText(text, maxLength = 20) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// === REDIRECT PAGE HANDLER ===
if (window.location.pathname.includes('redirect.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const targetName = urlParams.get('target');
        const trackingId = urlParams.get('id');

        if (!targetName || !trackingId) {
            window.location.href = 'lacak.html';
            return;
        }

        const trackingData = {
            id: trackingId,
            target: targetName,
            timestamp: new Date().toISOString(),
            referrer: document.referrer || 'Direct',
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            language: navigator.language,
            deviceId: getDeviceId()
        };

        // Try to get IP and location data
        fetch('https://ipapi.co/json/')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(ipData => {
                trackingData.ip = ipData.ip;
                trackingData.country = ipData.country_name;
                trackingData.region = ipData.region;
                trackingData.city = ipData.city;
                saveAndRedirect(trackingData, targetName);
            })
            .catch(error => {
                console.error('Error fetching IP data:', error);
                trackingData.ip = 'Unknown';
                saveAndRedirect(trackingData, targetName);
            });

        function saveAndRedirect(data, target) {
            const logs = JSON.parse(localStorage.getItem('trackingLogs') || '[]');
            logs.unshift(data);
            localStorage.setItem('trackingLogs', JSON.stringify(logs));
            
            setTimeout(() => {
                window.location.href = `https://google.com/search?q=${encodeURIComponent(target)}`;
            }, 2000);
        }
    });
}

// === LACAK PAGE HANDLER ===
if (window.location.pathname.includes('lacak.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const linkInput = document.getElementById('linkInput');
        const addButton = document.getElementById('addButton');
        const linkList = document.getElementById('linkList');

        // Load and display existing links
        function loadLinks() {
            const links = JSON.parse(localStorage.getItem('trackingLinks') || '[]');
            
            if (links.length === 0) {
                linkList.innerHTML = '<div class="empty-state">No tracking links yet. Add one above.</div>';
                return;
            }

            linkList.innerHTML = '';
            links.forEach(link => {
                const linkItem = document.createElement('div');
                linkItem.className = 'link-item';
                linkItem.innerHTML = `
                    <div>
                        <div class="link-name">${link.name}</div>
                        <div class="link-url">${link.url}</div>
                    </div>
                    <div class="link-actions">
                        <button class="action-btn copy-btn" data-url="${link.url}">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button class="action-btn delete-btn" data-id="${link.id}">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                `;
                linkList.appendChild(linkItem);
            });

            // Add event listeners for copy buttons
            document.querySelectorAll('.copy-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const url = btn.getAttribute('data-url');
                    navigator.clipboard.writeText(url)
                        .then(() => {
                            const originalText = btn.innerHTML;
                            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                            setTimeout(() => {
                                btn.innerHTML = originalText;
                            }, 2000);
                        })
                        .catch(err => {
                            console.error('Failed to copy:', err);
                        });
                });
            });

            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this tracking link?')) {
                        const links = JSON.parse(localStorage.getItem('trackingLinks') || '[]');
                        const updatedLinks = links.filter(link => link.id !== id);
                        localStorage.setItem('trackingLinks', JSON.stringify(updatedLinks));
                        loadLinks();
                    }
                });
            });
        }

        // Add new tracking link
        function addLink() {
            const linkName = linkInput.value.trim();
            if (!linkName) return;

            const trackingId = generateId();
            const trackingUrl = `${window.location.origin}/redirect.html?target=${encodeURIComponent(linkName)}&id=${trackingId}`;

            const links = JSON.parse(localStorage.getItem('trackingLinks') || '[]');
            links.push({
                id: trackingId,
                name: linkName,
                url: trackingUrl,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('trackingLinks', JSON.stringify(links));

            linkInput.value = '';
            loadLinks();
        }

        // Event listeners
        addButton.addEventListener('click', addLink);
        linkInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addLink();
        });

        // Initial load
        loadLinks();
    });
}

// === ADMIN PAGE HANDLER ===
if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const deviceId = getDeviceId();
        let currentPage = 1;
        const rowsPerPage = 10;
        let viewMode = 'my'; // 'my' or 'all'

        // DOM elements
        const viewMyBtn = document.getElementById('viewMyDevice');
        const viewAllBtn = document.getElementById('viewAllDevices');
        const refreshBtn = document.getElementById('refreshBtn');
        const themeToggle = document.getElementById('themeToggle');
        const tbody = document.getElementById('trackingTableBody');
        const pagination = document.getElementById('pagination');

        // Initialize dark mode
        function initDarkMode() {
            const isDarkMode = localStorage.getItem('darkMode') === 'true';
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        }

        // Update statistics
        function updateStats() {
            const links = JSON.parse(localStorage.getItem('trackingLinks') || '[]');
            const logs = JSON.parse(localStorage.getItem('trackingLogs') || '[]');
            
            const filteredLogs = viewMode === 'my' ? 
                logs.filter(log => log.deviceId === deviceId) : 
                logs;
            
            const uniqueIPs = new Set(filteredLogs.map(log => log.ip)).size;
            const uniqueCountries = new Set(filteredLogs.map(log => log.country).filter(Boolean)).size;
            
            document.getElementById('totalLinks').textContent = links.length;
            document.getElementById('totalVisits').textContent = filteredLogs.length;
            document.getElementById('uniqueIPs').textContent = uniqueIPs;
            document.getElementById('uniqueCountries').textContent = uniqueCountries;
        }

        // Render table with pagination
        function renderTable(page = 1) {
            const logs = JSON.parse(localStorage.getItem('trackingLogs') || '[]');
            const links = JSON.parse(localStorage.getItem('trackingLinks') || '[]');
            
            const filteredLogs = viewMode === 'my' ? 
                logs.filter(log => log.deviceId === deviceId) : 
                logs;
            
            const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
            currentPage = Math.min(Math.max(page, 1), totalPages);
            const startIdx = (currentPage - 1) * rowsPerPage;
            const endIdx = startIdx + rowsPerPage;
            const paginatedLogs = filteredLogs.slice(startIdx, endIdx);
            
            // Clear existing content
            tbody.innerHTML = '';
            pagination.innerHTML = '';
            
            if (filteredLogs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="no-data">No tracking data available</td></tr>';
                return;
            }
            
            // Render table rows
            paginatedLogs.forEach(log => {
                const link = links.find(l => l.id === log.id);
                const row = document.createElement('tr');
                
                const locationText = log.city && log.country ? 
                    `${log.city}, ${log.country}` : 
                    (log.country || log.ip || 'Unknown');
                
                row.innerHTML = `
                    <td>${log.id.substring(0, 8)}...</td>
                    <td>${link ? link.name : 'Unknown'}</td>
                    <td>${log.ip || 'N/A'}</td>
                    <td>${locationText}</td>
                    <td class="tooltip">${truncateText(log.referrer)}
                        <span class="tooltiptext">${log.referrer}</span>
                    </td>
                    <td>${formatDate(log.timestamp)}</td>
                    <td>
                        <button class="action-btn btn-delete" data-id="${log.id}">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            
            // Render pagination
            if (totalPages > 1) {
                // Previous button
                const prevBtn = document.createElement('button');
                prevBtn.className = `page-btn ${currentPage === 1 ? 'disabled' : ''}`;
                prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
                prevBtn.onclick = () => renderTable(currentPage - 1);
                pagination.appendChild(prevBtn);
                
                // Page buttons
                for (let i = 1; i <= totalPages; i++) {
                    const pageBtn = document.createElement('button');
                    pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
                    pageBtn.textContent = i;
                    pageBtn.onclick = () => renderTable(i);
                    pagination.appendChild(pageBtn);
                }
                
                // Next button
                const nextBtn = document.createElement('button');
                nextBtn.className = `page-btn ${currentPage === totalPages ? 'disabled' : ''}`;
                nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                nextBtn.onclick = () => renderTable(currentPage + 1);
                pagination.appendChild(nextBtn);
            }
            
            // Add event listeners to delete buttons
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', function() {
                    const logId = this.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this log entry?')) {
                        const logs = JSON.parse(localStorage.getItem('trackingLogs') || '[]');
                        const updatedLogs = logs.filter(log => log.id !== logId);
                        localStorage.setItem('trackingLogs', JSON.stringify(updatedLogs));
                        updateStats();
                        renderTable(currentPage);
                    }
                });
            });
        }

        // Event listeners
        viewMyBtn.addEventListener('click', () => {
            viewMode = 'my';
            viewMyBtn.classList.add('active');
            viewAllBtn.classList.remove('active');
            updateStats();
            renderTable(1);
        });

        viewAllBtn.addEventListener('click', () => {
            viewMode = 'all';
            viewAllBtn.classList.add('active');
            viewMyBtn.classList.remove('active');
            updateStats();
            renderTable(1);
        });

        refreshBtn.addEventListener('click', () => {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
            setTimeout(() => {
                updateStats();
                renderTable(currentPage);
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            }, 500);
        });

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
            
            themeToggle.innerHTML = isDarkMode ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        });

        // Initialize
        initDarkMode();
        updateStats();
        renderTable();
    });
}
