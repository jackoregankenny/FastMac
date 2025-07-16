// FastMac JavaScript - Enhanced with dependency management and instructions

document.addEventListener('DOMContentLoaded', function() {
    console.log('FastMac: DOM loaded, initializing...');
    
    // Initialize all components
    initializeToolSelection();
    initializeSearch();
    initializeCategoryToggles();
    initializeButtons();
    initializeModals();
    initializeKeyboardNavigation();
    initializeHapticFeedback();
    initializeDependencyManagement();
    initializeQuickFilters();
    initializeInstallationTime();
    
    // Update initial counts
    updateCounts();
    
    // Show welcome instructions
    showWelcomeInstructions();
    
    console.log('FastMac: Initialization complete');
});

// Tool Selection Management
function initializeToolSelection() {
    const toolItems = document.querySelectorAll('.tool-item');
    console.log('FastMac: Found', toolItems.length, 'tool items');
    
    toolItems.forEach((item, index) => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        
        if (!checkbox) {
            console.error('FastMac: No checkbox found for tool item', index);
            return;
        }
        
        console.log('FastMac: Setting up tool', checkbox.name, 'with ID', checkbox.id);
        
        // SINGLE EVENT HANDLER - Handle all clicks on the item
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('FastMac: Item clicked:', checkbox.name, 'Current state:', checkbox.checked);
            
            // Toggle the checkbox state
            checkbox.checked = !checkbox.checked;
            
            // Update visual state immediately
            item.setAttribute('data-selected', checkbox.checked.toString());
            
            // Update counts and button states
            updateCounts();
            updateButtonStates();
            
            // Add visual feedback
            addSelectionFeedback(item, checkbox.checked);
            
            // Handle dependencies
            handleDependencies(checkbox.name, checkbox.checked);
            
            console.log('FastMac: New state after click:', checkbox.checked);
        });
        
        // Keyboard support
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                checkbox.checked = !checkbox.checked;
                item.setAttribute('data-selected', checkbox.checked.toString());
                updateCounts();
                updateButtonStates();
                addSelectionFeedback(item, checkbox.checked);
                handleDependencies(checkbox.name, checkbox.checked);
            }
        });
        
        // Set tabindex for keyboard navigation
        item.setAttribute('tabindex', '0');
    });
    
    console.log('FastMac: Tool selection initialization complete');
}

// Dependency Management
function initializeDependencyManagement() {
    // Create a dependency map from the tools data
    window.dependencyMap = new Map();
    
    // Parse dependencies from the page data
    const toolItems = document.querySelectorAll('.tool-item');
    toolItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const toolId = checkbox.name;
        const categoryId = item.getAttribute('data-category');
        const baseToolId = item.getAttribute('data-tool-id');
        
        // Check if this tool has dependencies (requires attribute on the tool-item itself)
        const requiresAttr = item.getAttribute('data-requires');
        if (requiresAttr) {
            // Convert base tool IDs to full unique IDs
            const dependencies = requiresAttr.split(',').map(d => d.trim()).map(depId => {
                // Find the category that contains this dependency
                const depItem = document.querySelector(`[data-tool-id="${depId}"]`);
                if (depItem) {
                    const depCategory = depItem.getAttribute('data-category');
                    return `${depCategory}-${depId}`;
                }
                return depId; // Fallback to original if not found
            });
            window.dependencyMap.set(toolId, dependencies);
        }
    });
}

function handleDependencies(toolId, isSelected) {
    if (!window.dependencyMap) return;
    
    if (isSelected) {
        // When selecting a tool, also select its dependencies
        const dependencies = window.dependencyMap.get(toolId);
        if (dependencies) {
            dependencies.forEach(depId => {
                const depCheckbox = document.querySelector(`input[name="${depId}"]`);
                if (depCheckbox && !depCheckbox.checked) {
                    depCheckbox.checked = true;
                    depCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Show dependency notification
                    showDependencyNotification(depId, toolId);
                }
            });
        }
    } else {
        // When deselecting a tool, check if any other selected tools depend on it
        const dependentTools = Array.from(window.dependencyMap.entries())
            .filter(([id, deps]) => deps.includes(toolId))
            .map(([id]) => id);
        
        dependentTools.forEach(depToolId => {
            const depCheckbox = document.querySelector(`input[name="${depToolId}"]`);
            if (depCheckbox && depCheckbox.checked) {
                depCheckbox.checked = false;
                depCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Show dependency notification
                showDependencyNotification(toolId, depToolId, false);
            }
        });
    }
}

function showDependencyNotification(dependencyId, dependentId, isAdding = true) {
    const dependencyName = getToolName(dependencyId);
    const dependentName = getToolName(dependentId);
    
    const message = isAdding 
        ? `Auto-selected ${dependencyName} (required by ${dependentName})`
        : `Deselected ${dependentName} (requires ${dependencyName})`;
    
    showNotification(message, 'info');
}

function getToolName(toolId) {
    const toolItem = document.querySelector(`input[name="${toolId}"]`);
    if (toolItem) {
        return toolItem.closest('.tool-item').querySelector('h3').textContent;
    }
    // Fallback: try to find by base tool ID
    const baseToolId = toolId.split('-').pop();
    const fallbackItem = document.querySelector(`[data-tool-id="${baseToolId}"]`);
    if (fallbackItem) {
        return fallbackItem.querySelector('h3').textContent;
    }
    return toolId; // Return the ID if no name found
}

// Search Functionality
function initializeSearch() {
    const searchInput = document.getElementById('tool-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const toolItems = document.querySelectorAll('.tool-item');
        
        toolItems.forEach(item => {
            const toolName = item.getAttribute('data-tool-name') || '';
            const toolDescription = item.getAttribute('data-tool-description') || '';
            
            const matches = toolName.includes(searchTerm) || toolDescription.includes(searchTerm);
            
            if (searchTerm === '' || matches) {
                item.classList.remove('hidden');
                item.style.display = '';
            } else {
                item.classList.add('hidden');
                item.style.display = 'none';
            }
        });
        
        // Update category counts after search
        updateCounts();
    });
    
    // Clear search on Escape
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            this.value = '';
            this.dispatchEvent(new Event('input'));
            this.blur();
        }
    });
}

// Category Toggle Management
function initializeCategoryToggles() {
    const categoryToggles = document.querySelectorAll('.category-toggle');
    
    categoryToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-category');
            const categoryContent = document.querySelector(`[data-category="${categoryId}"] .category-content`);
            const isCollapsed = categoryContent.classList.contains('collapsed');
            
            if (isCollapsed) {
                categoryContent.classList.remove('collapsed');
                this.textContent = 'Collapse';
            } else {
                categoryContent.classList.add('collapsed');
                this.textContent = 'Expand';
            }
        });
    });
}

// Button Management
function initializeButtons() {
    // Select All Button
    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            const visibleToolItems = document.querySelectorAll('.tool-item:not(.hidden)');
            const allChecked = Array.from(visibleToolItems).every(item => 
                item.querySelector('input[type="checkbox"]').checked
            );
            
            visibleToolItems.forEach(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                checkbox.checked = !allChecked;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
    }
    
    // Clear All Button
    const clearAllBtn = document.getElementById('clear-all-btn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
    }
    
    // Preview Button
    const previewBtn = document.getElementById('preview-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', function() {
            showPreviewModal();
        });
    }
    
    // Generate Button
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            generateScript();
        });
    }
}

// Modal Management
function initializeModals() {
    // Help Modal
    const helpButton = document.getElementById('help-button');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');
    
    if (helpButton && helpModal) {
        helpButton.addEventListener('click', () => {
            helpModal.showModal();
        });
        
        closeHelp.addEventListener('click', () => {
            helpModal.close();
        });
        
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.close();
            }
        });
    }
    
    // Preview Modal
    const previewModal = document.getElementById('preview-modal');
    const closePreview = document.getElementById('close-preview');
    
    if (previewModal && closePreview) {
        closePreview.addEventListener('click', () => {
            previewModal.close();
        });
        
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                previewModal.close();
            }
        });
    }
}

// Keyboard Navigation
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        // Help modal with 'h' key
        if (e.key === 'h' && !e.ctrlKey && !e.metaKey) {
            const helpButton = document.getElementById('help-button');
            if (helpButton) {
                helpButton.click();
            }
        }
        
        // Select all with Ctrl/Cmd + A
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            const selectAllBtn = document.getElementById('select-all-btn');
            if (selectAllBtn) {
                selectAllBtn.click();
            }
        }
        
        // Clear all with Ctrl/Cmd + Shift + A
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            const clearAllBtn = document.getElementById('clear-all-btn');
            if (clearAllBtn) {
                clearAllBtn.click();
            }
        }
    });
}

// Haptic Feedback
function initializeHapticFeedback() {
    // Add haptic feedback to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if ('vibrate' in navigator) {
                navigator.vibrate(20);
            }
        });
    });
}

// Welcome Instructions
function showWelcomeInstructions() {
    // Show a subtle welcome message
    setTimeout(() => {
        showNotification('Welcome to FastMac! Select your tools and dependencies will be auto-managed.', 'info');
    }, 1000);
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-lg backdrop-blur-xl border transition-all duration-300 animate-slide-up`;
    
    // Set colors based on type
    switch (type) {
        case 'success':
            notification.className += ' bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300 border-sage-200 dark:border-sage-700';
            break;
        case 'error':
            notification.className += ' bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/50';
            break;
        case 'warning':
            notification.className += ' bg-cream-100 dark:bg-cream-900/30 text-cream-800 dark:text-cream-200 border-cream-200 dark:border-cream-800/50';
            break;
        default:
            notification.className += ' bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 border-primary-200 dark:border-primary-800/50';
    }
    
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Utility Functions
function updateCounts() {
    const selectedCheckboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    const totalCount = selectedCheckboxes.length;
    
    console.log('FastMac: Update counts called, found', totalCount, 'selected checkboxes');
    
    // Update main count
    const selectedCountElement = document.getElementById('selected-count');
    if (selectedCountElement) {
        if (totalCount === 0) {
            selectedCountElement.textContent = 'No tools selected';
        } else if (totalCount === 1) {
            selectedCountElement.textContent = '1 tool selected';
        } else {
            selectedCountElement.textContent = `${totalCount} tools selected`;
        }
        console.log('FastMac: Updated count display to:', selectedCountElement.textContent);
    } else {
        console.error('FastMac: Could not find selected-count element');
    }
    
    // Update category counts
    const categories = document.querySelectorAll('[data-category]');
    categories.forEach(category => {
        const categoryId = category.getAttribute('data-category');
        const categoryCheckboxes = category.querySelectorAll('input[type="checkbox"]:checked');
        const categoryCount = categoryCheckboxes.length;
        
        const countElement = document.getElementById(`count-${categoryId}`);
        if (countElement) {
            countElement.textContent = `${categoryCount} selected`;
        }
    });
    
    // Update estimated time
    updateEstimatedTime(totalCount);
}

function updateEstimatedTime(count) {
    const estimatedTimeElement = document.getElementById('estimated-time');
    const timeValueElement = document.getElementById('time-value');
    
    if (estimatedTimeElement && timeValueElement) {
        if (count === 0) {
            estimatedTimeElement.classList.add('hidden');
        } else {
            const estimatedMinutes = Math.max(5, Math.ceil(count * 0.5));
            timeValueElement.textContent = `${estimatedMinutes} min`;
            estimatedTimeElement.classList.remove('hidden');
        }
    }
}

function updateButtonStates() {
    const selectedCheckboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    const hasSelection = selectedCheckboxes.length > 0;
    
    const previewBtn = document.getElementById('preview-btn');
    const generateBtn = document.getElementById('generate-btn');
    
    if (previewBtn) {
        previewBtn.disabled = !hasSelection;
    }
    
    if (generateBtn) {
        generateBtn.disabled = !hasSelection;
    }
}

function addSelectionFeedback(item, isSelected) {
    // Add a subtle animation
    item.style.transform = isSelected ? 'scale(1.02)' : 'scale(1)';
    
    setTimeout(() => {
        item.style.transform = '';
    }, 200);
}

// Preview Modal
function showPreviewModal() {
    const selectedTools = getSelectedTools();
    if (selectedTools.length === 0) return;
    
    const previewModal = document.getElementById('preview-modal');
    const scriptPreview = document.getElementById('script-preview');
    
    if (previewModal && scriptPreview) {
        const script = generateScriptContent(selectedTools);
        scriptPreview.textContent = script;
        previewModal.showModal();
    }
}

// Script Generation
function generateScript() {
    const selectedTools = getSelectedTools();
    if (selectedTools.length === 0) return;
    
    // Show loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
    
    // Simulate processing time
    setTimeout(() => {
        const script = generateScriptContent(selectedTools);
        downloadScript(script);
        
        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
        
        // Show success notification
        showNotification('Script generated successfully!', 'success');
    }, 1500);
}

function getSelectedTools() {
    const selectedCheckboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(selectedCheckboxes).map(checkbox => checkbox.name);
}

function generateScriptContent(selectedTools) {
    // This would typically be generated by the backend
    // For now, we'll create a simple script
    const timestamp = new Date().toISOString().split('T')[0];
    
    return `#!/bin/bash
# FastMac Setup Script
# Generated on ${timestamp}
# Selected tools: ${selectedTools.join(', ')}

echo "🚀 Starting FastMac setup..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "✅ Homebrew already installed"
fi

# Update Homebrew
echo "🔄 Updating Homebrew..."
brew update

# Install selected tools
echo "📥 Installing selected tools..."

${selectedTools.map(tool => `# Installing ${tool}
echo "Installing ${tool}..."
brew install ${tool}`).join('\n\n')}

echo "🎉 Setup complete! Your development environment is ready."
echo "💡 Don't forget to restart your terminal or run 'source ~/.zshrc'"
`;
}

function downloadScript(script) {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fastmac-setup-${new Date().toISOString().split('T')[0]}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Accessibility improvements
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Performance optimizations
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced search
const debouncedSearch = debounce(function(searchTerm) {
    // Search logic here
}, 300);

// Quick Filters for Popular Tools
function initializeQuickFilters() {
    const quickFiltersContainer = document.createElement('div');
    quickFiltersContainer.className = 'quick-filters mb-6 flex flex-wrap gap-3';
    quickFiltersContainer.innerHTML = `
        <span class="text-sm font-medium text-charcoal-600 dark:text-charcoal-400 mr-2">Quick select:</span>
        <button class="quick-filter-btn px-3 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800/50 transition-colors" data-filter="essential">Essential Dev</button>
        <button class="quick-filter-btn px-3 py-1 text-xs bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300 rounded-lg hover:bg-sage-200 dark:hover:bg-sage-800/50 transition-colors" data-filter="window-management">Window Mgmt</button>
        <button class="quick-filter-btn px-3 py-1 text-xs bg-cream-100 dark:bg-cream-900/30 text-cream-700 dark:text-cream-300 rounded-lg hover:bg-cream-200 dark:hover:bg-cream-800/50 transition-colors" data-filter="productivity">Productivity</button>
        <button class="quick-filter-btn px-3 py-1 text-xs bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300 rounded-lg hover:bg-charcoal-200 dark:hover:bg-charcoal-700/50 transition-colors" data-filter="browsers">Browsers</button>
    `;
    
    // Insert after the search bar
    const searchContainer = document.querySelector('.sticky.top-0');
    if (searchContainer) {
        searchContainer.parentNode.insertBefore(quickFiltersContainer, searchContainer.nextSibling);
    }
    
    // Add event listeners
    quickFiltersContainer.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            applyQuickFilter(filter);
            
            // Update active state
            quickFiltersContainer.querySelectorAll('.quick-filter-btn').forEach(b => b.classList.remove('ring-2', 'ring-primary-500'));
            this.classList.add('ring-2', 'ring-primary-500');
        });
    });
}

function applyQuickFilter(filter) {
    const toolItems = document.querySelectorAll('.tool-item');
    const essentialTools = ['git', 'gh', 'vscode', 'iterm2', 'rectangle', 'alfred'];
    const windowManagementTools = ['rectangle', 'yabai', 'skhd', 'amethyst', 'swish', 'contexts'];
    const productivityTools = ['alfred', 'raycast', 'obsidian', 'notion', '1password', 'bartender'];
    const browserTools = ['google-chrome', 'firefox', 'brave', 'arc'];
    
    let targetTools = [];
    switch(filter) {
        case 'essential':
            targetTools = essentialTools;
            break;
        case 'window-management':
            targetTools = windowManagementTools;
            break;
        case 'productivity':
            targetTools = productivityTools;
            break;
        case 'browsers':
            targetTools = browserTools;
            break;
    }
    
    // Clear all selections first
    toolItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            checkbox.checked = false;
            item.setAttribute('data-selected', 'false');
        }
    });
    
    // Select target tools
    targetTools.forEach(toolId => {
        const checkbox = document.querySelector(`input[name*="${toolId}"]`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.closest('.tool-item').setAttribute('data-selected', 'true');
        }
    });
    
    updateCounts();
    updateButtonStates();
    showNotification(`Selected ${targetTools.length} ${filter.replace('-', ' ')} tools`, 'success');
}

// Installation Time Estimation
function initializeInstallationTime() {
    const timeEstimate = document.getElementById('estimated-time');
    if (timeEstimate) {
        timeEstimate.classList.remove('hidden');
    }
}

function updateEstimatedTime(count) {
    const estimatedTimeElement = document.getElementById('estimated-time');
    const timeValueElement = document.getElementById('time-value');
    
    if (estimatedTimeElement && timeValueElement) {
        if (count === 0) {
            estimatedTimeElement.classList.add('hidden');
        } else {
            // More accurate time estimation based on tool types
            const selectedItems = document.querySelectorAll('input[type="checkbox"]:checked');
            let totalMinutes = 0;
            
            selectedItems.forEach(checkbox => {
                const toolItem = checkbox.closest('.tool-item');
                const isCask = toolItem.querySelector('[data-cask="true"]') !== null;
                const isCustom = toolItem.querySelector('[data-type="custom"]') !== null;
                
                if (isCustom) {
                    totalMinutes += 3; // Custom installations take longer
                } else if (isCask) {
                    totalMinutes += 1.5; // GUI apps take longer to download
                } else {
                    totalMinutes += 0.5; // CLI tools are faster
                }
            });
            
            // Add base time for Homebrew setup
            totalMinutes = Math.max(5, Math.ceil(totalMinutes + 2));
            
            timeValueElement.textContent = `${totalMinutes} min`;
            estimatedTimeElement.classList.remove('hidden');
        }
    }
}

// Enhanced Keyboard Navigation
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        // Help modal with 'h' key
        if (e.key === 'h' && !e.ctrlKey && !e.metaKey) {
            const helpButton = document.getElementById('help-button');
            if (helpButton) {
                helpButton.click();
            }
        }
        
        // Select all with Ctrl/Cmd + A
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            const selectAllBtn = document.getElementById('select-all-btn');
            if (selectAllBtn) {
                selectAllBtn.click();
            }
        }
        
        // Clear all with Ctrl/Cmd + Shift + A
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            const clearAllBtn = document.getElementById('clear-all-btn');
            if (clearAllBtn) {
                clearAllBtn.click();
            }
        }
        
        // Generate script with Ctrl/Cmd + Enter
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const generateBtn = document.getElementById('generate-btn');
            if (generateBtn && !generateBtn.disabled) {
                generateBtn.click();
            }
        }
        
        // Preview script with Ctrl/Cmd + P
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            const previewBtn = document.getElementById('preview-btn');
            if (previewBtn && !previewBtn.disabled) {
                previewBtn.click();
            }
        }
        
        // Focus search with Ctrl/Cmd + K
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('tool-search');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    });
}

// Export functions for potential external use
window.FastMac = {
    updateCounts,
    updateButtonStates,
    getSelectedTools,
    generateScript,
    showPreviewModal,
    handleDependencies,
    showNotification
};
