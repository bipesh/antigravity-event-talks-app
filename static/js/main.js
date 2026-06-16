// State management
let releases = [];
let filteredReleases = [];
let currentFilter = 'all';
let searchQuery = '';
let currentSort = 'newest';
let selectedRelease = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const exportBtn = document.getElementById('export-btn');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const categoryPills = document.getElementById('category-pills');
const sortSelect = document.getElementById('sort-select');
const loadingSkeleton = document.getElementById('loading-skeleton');
const releasesGrid = document.getElementById('releases-grid');
const emptyState = document.getElementById('empty-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const statusText = document.getElementById('status-text');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const sendTweetBtn = document.getElementById('send-tweet-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const charProgressBar = document.getElementById('character-progress-bar');
const warningMsg = document.getElementById('warning-msg');
const previewBadge = document.getElementById('preview-badge');
const previewDate = document.getElementById('preview-date');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Refresh Button
    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    // Search Input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        toggleClearButton();
        filterAndRender();
    });

    // Clear Search Button
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        toggleClearButton();
        searchInput.focus();
        filterAndRender();
    });

    // Category Filter Pills
    categoryPills.addEventListener('click', (e) => {
        if (e.target.classList.contains('pill')) {
            // Update active state
            document.querySelectorAll('.pill').forEach(pill => pill.classList.remove('active'));
            e.target.classList.add('active');
            
            currentFilter = e.target.getAttribute('data-type').toLowerCase();
            filterAndRender();
        }
    });

    // Sort Dropdown
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterAndRender();
    });

    // Reset Filters in Empty State
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        toggleClearButton();
        
        document.querySelectorAll('.pill').forEach(pill => pill.classList.remove('active'));
        document.querySelector('.pill[data-type="all"]').classList.add('active');
        currentFilter = 'all';
        
        sortSelect.value = 'newest';
        currentSort = 'newest';
        
        filterAndRender();
    });

    // Modal Close
    closeModalBtn.addEventListener('click', closeModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeModal();
        }
    });

    // Live character counter
    tweetTextarea.addEventListener('input', updateCharCount);

    // Copy Tweet Button
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);

    // Send Tweet Button
    sendTweetBtn.addEventListener('click', sendTweetToX);

    // Export to CSV Button
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }
}

// Show/Hide Search Clear Button
function toggleClearButton() {
    if (searchQuery.length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
}

// Fetch Release Notes from API
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    statusText.textContent = forceRefresh ? "Fetching latest feed..." : "Checking feed...";
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            releases = data.releases;
            
            // Update status text
            if (data.source === 'cached') {
                statusText.textContent = "Updates loaded (cached)";
            } else if (data.source === 'fresh') {
                statusText.textContent = "Updates synchronized successfully";
                showToast("Fetched latest release notes!");
            } else {
                statusText.textContent = "Updates loaded";
            }
            
            filterAndRender();
        } else {
            throw new Error(data.message || "Failed to retrieve releases");
        }
    } catch (error) {
        console.error("Fetch releases error:", error);
        statusText.textContent = "Error updating feed";
        showToast("Failed to fetch latest release notes", "error");
        
        // Show empty state if no releases loaded
        if (releases.length === 0) {
            showEmptyState(true);
        }
    } finally {
        showLoading(false);
    }
}

// Loading Spinner Toggle
function showLoading(isLoading) {
    if (isLoading) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
        releasesGrid.style.display = 'none';
        emptyState.style.display = 'none';
        loadingSkeleton.style.display = 'grid';
    } else {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
        loadingSkeleton.style.display = 'none';
    }
}

// Filter and Render the Updates List
function filterAndRender() {
    if (releases.length === 0) {
        showEmptyState(true);
        return;
    }
    
    // 1. Filter by category and search string
    filteredReleases = releases.filter(release => {
        // Category Filter
        const typeMatch = currentFilter === 'all' || release.type.toLowerCase() === currentFilter;
        
        // Search Filter
        const searchMatch = !searchQuery || 
            release.date.toLowerCase().includes(searchQuery) ||
            release.type.toLowerCase().includes(searchQuery) ||
            release.body_text.toLowerCase().includes(searchQuery);
            
        return typeMatch && searchMatch;
    });
    
    // 2. Sort by date
    filteredReleases.sort((a, b) => {
        // Since API returns entries in standard feed order (newest first),
        // we can compare raw timestamps or indices
        const dateA = new Date(a.updated_raw);
        const dateB = new Date(b.updated_raw);
        
        if (currentSort === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
    
    // 3. Render
    renderGrid();
}

// Render the grid of cards
function renderGrid() {
    releasesGrid.innerHTML = '';
    
    if (filteredReleases.length === 0) {
        showEmptyState(true);
        return;
    }
    
    showEmptyState(false);
    
    filteredReleases.forEach(release => {
        const typeLower = release.type.toLowerCase();
        
        // Safe check for type classes
        const typeClass = ['feature', 'change', 'issue', 'deprecated', 'general'].includes(typeLower) 
            ? `type-${typeLower}` 
            : 'type-general';
            
        const badgeClass = ['feature', 'change', 'issue', 'deprecated', 'general'].includes(typeLower) 
            ? `badge-${typeLower}` 
            : 'badge-general';
            
        const card = document.createElement('article');
        card.className = `release-card ${typeClass}`;
        
        card.innerHTML = `
            <div class="card-header">
                <span class="badge ${badgeClass}">${release.type}</span>
                <span class="card-date">${release.date}</span>
            </div>
            <div class="card-body">
                ${release.body_html}
            </div>
            <div class="card-footer">
                <a href="${release.link}" target="_blank" rel="noopener" class="read-notes-link" title="Open source documentation">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    <span>View Docs</span>
                </a>
                <div class="card-actions-group">
                    <button class="btn-copy-action" data-id="${release.id}" title="Copy description to clipboard">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Copy</span>
                    </button>
                    <button class="btn-tweet-action" data-id="${release.id}" title="Share this specific update on X/Twitter">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet</span>
                    </button>
                </div>
            </div>
        `;
        
        // Attach listener for the Tweet button
        const tweetBtn = card.querySelector('.btn-tweet-action');
        tweetBtn.addEventListener('click', () => {
            openTweetModal(release);
        });

        // Attach listener for the Copy button
        const copyBtn = card.querySelector('.btn-copy-action');
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(release.body_text);
                showToast("Update copied to clipboard!");
            } catch (err) {
                console.error("Clipboard copy failed:", err);
                showToast("Failed to copy text", "error");
            }
        });
        
        releasesGrid.appendChild(card);
    });
    
    releasesGrid.style.display = 'grid';
}

// Show/Hide Empty State
function showEmptyState(show) {
    if (show) {
        releasesGrid.style.display = 'none';
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
    }
}

// Open Tweet Composer Modal
function openTweetModal(release) {
    selectedRelease = release;
    
    // Update modal details
    previewDate.textContent = release.date;
    previewBadge.textContent = release.type;
    
    // Remove old badge classes and add current one
    previewBadge.className = 'badge';
    const typeLower = release.type.toLowerCase();
    const badgeClass = ['feature', 'change', 'issue', 'deprecated', 'general'].includes(typeLower) 
        ? `badge-${typeLower}` 
        : 'badge-general';
    previewBadge.classList.add(badgeClass);
    
    // Generate pre-populated tweet text
    const defaultText = generateDefaultTweetText(release);
    tweetTextarea.value = defaultText;
    
    // Open Modal
    tweetModal.style.display = 'flex';
    tweetTextarea.focus();
    
    // Trigger count update
    updateCharCount();
}

// Close Tweet Modal
function closeModal() {
    tweetModal.style.display = 'none';
    selectedRelease = null;
}

// Format Default Tweet Text
function generateDefaultTweetText(release) {
    const typeHeader = `📢 BigQuery ${release.type} (${release.date}):\n\n`;
    const hashtags = `\n\nRead more: ${release.link} #BigQuery #GoogleCloud`;
    
    const maxBodyLength = 280 - typeHeader.length - hashtags.length;
    let body = release.body_text;
    
    if (body.length > maxBodyLength) {
        // Truncate cleanly at a word boundary if possible
        let truncated = body.substring(0, maxBodyLength - 3);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxBodyLength * 0.7) {
            truncated = truncated.substring(0, lastSpace);
        }
        body = truncated + '...';
    }
    
    return `${typeHeader}${body}${hashtags}`;
}

// Live Character Counter and Progress UI
function updateCharCount() {
    const text = tweetTextarea.value;
    const len = text.length;
    
    charCounter.textContent = `${len} / 280`;
    
    // Calculate progress percentage (clamped at 100%)
    const pct = Math.min((len / 280) * 100, 100);
    charProgressBar.style.width = `${pct}%`;
    
    // Update progress colors
    charProgressBar.className = 'progress-bar';
    if (len <= 240) {
        charProgressBar.classList.add('progress-green');
        charCounter.style.color = 'var(--text-muted)';
        warningMsg.style.display = 'none';
    } else if (len <= 280) {
        charProgressBar.classList.add('progress-orange');
        charCounter.style.color = 'var(--type-issue)';
        warningMsg.style.display = 'none';
    } else {
        charProgressBar.classList.add('progress-red');
        charCounter.style.color = 'var(--type-deprecated)';
        warningMsg.style.display = 'block';
    }
}

// Copy Tweet text to clipboard
async function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        showToast("Tweet copied to clipboard!");
    } catch (err) {
        console.error("Clipboard copy failed:", err);
        showToast("Failed to copy text", "error");
    }
}

// Send Tweet to X/Twitter Web Intent
function sendTweetToX() {
    const text = tweetTextarea.value;
    const xIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(xIntentUrl, '_blank', 'noopener,noreferrer');
    closeModal();
}

// Custom Premium Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // SVG Success/Error check icon
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
    } else {
        iconSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        `;
    }
    
    toast.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Automatically remove toast element after it completes the fadeout animation (4 seconds total)
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Export current filtered/sorted updates to CSV
function exportToCSV() {
    if (filteredReleases.length === 0) {
        showToast("No updates to export", "error");
        return;
    }
    
    // Define headers
    const headers = ["ID", "Date", "Type", "Link", "Raw Updated Time", "Description"];
    
    // Map rows
    const rows = filteredReleases.map(release => [
        release.id,
        release.date,
        release.type,
        release.link,
        release.updated_raw,
        release.body_text.replace(/"/g, '""')
    ]);
    
    // Combine headers and rows
    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${currentFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Successfully exported ${filteredReleases.length} updates to CSV!`);
}
