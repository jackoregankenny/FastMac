// Modern JavaScript for FastMac

class FastMacApp {
    constructor() {
        this.selectedTools = new Set();
        this.categories = {};
        this.searchTerm = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCategories();
        this.updateUI();
    }

    setupEventListeners() {
        // Form submission
        const form = document.getElementById('setup-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Search functionality
        const searchInput = document.getElementById('tool-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Select all button
        const selectAllBtn = document.getElementById('select-all-btn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAllTools());
        }

        // Clear all button
        const clearAllBtn = document.getElementById('clear-all-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllTools());
        }

        // Help modal
        const helpBtn = document.getElementById('help-button');
        const helpModal = document.getElementById('help-modal');
        const closeHelpBtn = document.getElementById('close-help');
        
        if (helpBtn && helpModal) {
            helpBtn.addEventListener('click', () => this.openModal(helpModal));
        }
        
        if (closeHelpBtn && helpModal) {
            closeHelpBtn.addEventListener('click', () => this.closeModal(helpModal));
        }

        // Preview functionality
        const previewBtn = document.getElementById('preview-btn');
        const previewModal = document.getElementById('preview-modal');
        const closePreviewBtn = document.getElementById('close-preview');
        const downloadPreviewBtn = document.getElementById('download-preview');
        
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.showPreview());
        }
        
        if (closePreviewBtn && previewModal) {
            closePreviewBtn.addEventListener('click', () => this.closeModal(previewModal));
        }
        
        if (downloadPreviewBtn) {
            downloadPreviewBtn.addEventListener('click', () => this.downloadScript());
        }

        // Category toggles
        document.querySelectorAll('.category-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleCategory(e.target.dataset.category));
        });

        // Tool item clicks
        document.querySelectorAll('.tool-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox) {
                item.addEventListener('click', (e) => {
                    if (e.target !== checkbox) {
                        checkbox.checked = !checkbox.checked;
                        this.handleToolSelection(checkbox);
                    }
                });
                
                checkbox.addEventListener('change', (e) => this.handleToolSelection(e.target));
            }
        });

        // Modal backdrop clicks
        document.querySelectorAll('dialog').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    loadCategories() {
        // Load categories from the page
        const categoryElements = document.querySelectorAll('[data-category]');
        categoryElements.forEach(element => {
            const categoryId = element.dataset.category;
            this.categories[categoryId] = {
                element: element,
                tools: new Set()
            };
        });
    }

    handleSearch(term) {
        this.searchTerm = term.toLowerCase();
        this.filterTools();
    }

    filterTools() {
        const toolItems = document.querySelectorAll('.tool-item');
        
        toolItems.forEach(item => {
            const toolName = item.dataset.toolName || '';
            const toolDescription = item.dataset.toolDescription || '';
            const matches = toolName.includes(this.searchTerm) || 
                           toolDescription.includes(this.searchTerm);
            
            if (matches) {
                item.style.display = 'block';
                item.style.animation = 'fadeIn 0.3s ease-out';
            } else {
                item.style.display = 'none';
            }
        });

        // Show/hide categories based on visible tools
        this.updateCategoryVisibility();
    }

    updateCategoryVisibility() {
        Object.keys(this.categories).forEach(categoryId => {
            const categoryElement = this.categories[categoryId].element;
            const visibleTools = categoryElement.querySelectorAll('.tool-item[style*="display: block"]');
            
            if (visibleTools.length === 0 && this.searchTerm) {
                categoryElement.style.display = 'none';
            } else {
                categoryElement.style.display = 'block';
            }
        });
    }

    handleToolSelection(checkbox) {
        const toolId = checkbox.id;
        
        if (checkbox.checked) {
            this.selectedTools.add(toolId);
        } else {
            this.selectedTools.delete(toolId);
        }
        
        this.updateUI();
        this.updateCategoryCounts();
    }

    selectAllTools() {
        const visibleCheckboxes = document.querySelectorAll('.tool-item[style*="display: block"] input[type="checkbox"]');
        visibleCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedTools.add(checkbox.id);
        });
        this.updateUI();
        this.updateCategoryCounts();
    }

    clearAllTools() {
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.selectedTools.clear();
        this.updateUI();
        this.updateCategoryCounts();
    }

    updateCategoryCounts() {
        Object.keys(this.categories).forEach(categoryId => {
            const countElement = document.getElementById(`count-${categoryId}`);
            if (countElement) {
                const categoryTools = this.categories[categoryId].element.querySelectorAll('input[type="checkbox"]');
                const selectedCount = Array.from(categoryTools).filter(cb => cb.checked).length;
                countElement.textContent = `${selectedCount} selected`;
            }
        });
    }

    updateUI() {
        const selectedCount = this.selectedTools.size;
        const selectedCountElement = document.getElementById('selected-count');
        const generateBtn = document.getElementById('generate-btn');
        const previewBtn = document.getElementById('preview-btn');
        const estimatedTimeElement = document.getElementById('estimated-time');
        const timeValueElement = document.getElementById('time-value');

        // Update selected count
        if (selectedCountElement) {
            if (selectedCount === 0) {
                selectedCountElement.textContent = 'No tools selected';
            } else if (selectedCount === 1) {
                selectedCountElement.textContent = '1 tool selected';
            } else {
                selectedCountElement.textContent = `${selectedCount} tools selected`;
            }
        }

        // Update button states
        const hasSelection = selectedCount > 0;
        if (generateBtn) {
            generateBtn.disabled = !hasSelection;
        }
        if (previewBtn) {
            previewBtn.disabled = !hasSelection;
        }

        // Update estimated time
        if (estimatedTimeElement && timeValueElement) {
            const estimatedMinutes = Math.max(1, Math.ceil(selectedCount * 0.5));
            timeValueElement.textContent = `${estimatedMinutes} min`;
            estimatedTimeElement.classList.toggle('hidden', !hasSelection);
        }

        // Update category counts
        this.updateCategoryCounts();
    }

    toggleCategory(categoryId) {
        const categoryElement = this.categories[categoryId]?.element;
        if (!categoryElement) return;

        const content = categoryElement.querySelector('.category-content');
        const toggleBtn = categoryElement.querySelector('.category-toggle');
        
        if (content && toggleBtn) {
            const isCollapsed = content.classList.contains('collapsed');
            
            if (isCollapsed) {
                content.classList.remove('collapsed');
                toggleBtn.textContent = 'Collapse';
            } else {
                content.classList.add('collapsed');
                toggleBtn.textContent = 'Expand';
            }
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (this.selectedTools.size === 0) {
            this.showNotification('Please select at least one tool', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Array.from(this.selectedTools))
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.downloadScript(data.script);
            
        } catch (error) {
            console.error('Error generating script:', error);
            this.showNotification('Failed to generate script. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async showPreview() {
        if (this.selectedTools.size === 0) {
            this.showNotification('Please select at least one tool', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Array.from(this.selectedTools))
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            const previewModal = document.getElementById('preview-modal');
            const scriptPreview = document.getElementById('script-preview');
            
            if (scriptPreview) {
                scriptPreview.textContent = data.script;
            }
            
            if (previewModal) {
                this.openModal(previewModal);
            }
            
        } catch (error) {
            console.error('Error generating preview:', error);
            this.showNotification('Failed to generate preview. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    downloadScript(script = null) {
        if (!script) {
            // Get script from preview modal
            const scriptPreview = document.getElementById('script-preview');
            if (scriptPreview) {
                script = scriptPreview.textContent;
            }
        }

        if (!script) {
            this.showNotification('No script to download', 'error');
            return;
        }

        const blob = new Blob([script], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fastmac-setup.sh';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Script downloaded successfully!', 'success');
        
        // Close preview modal if open
        const previewModal = document.getElementById('preview-modal');
        if (previewModal && previewModal.open) {
            this.closeModal(previewModal);
        }
    }

    openModal(modal) {
        if (modal) {
            modal.showModal();
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.close();
        }
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.toggle('hidden', !show);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'success' ? 'bg-green-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translate(-50%, 0) scale(1)';
            notification.style.opacity = '1';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translate(-50%, -100%) scale(0.95)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('tool-search');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            const openModal = document.querySelector('dialog[open]');
            if (openModal) {
                this.closeModal(openModal);
            }
        }

        // Ctrl/Cmd + Enter to generate script
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const generateBtn = document.getElementById('generate-btn');
            if (generateBtn && !generateBtn.disabled) {
                generateBtn.click();
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FastMacApp();
});

// Add some utility functions
window.FastMacUtils = {
    // Debounce function for search
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function for scroll events
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};
