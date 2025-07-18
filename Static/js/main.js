// FastMac JavaScript - Simplified for production reliability

document.addEventListener('DOMContentLoaded', function() {
    console.log('FastMac: Initializing...');
    
    // Initialize core components only
    initializeToolSelection();
    initializeSearch();
    initializeButtons();
    initializeModals();
    initializeDependencyManagement();
    
    // Update initial counts
    updateCounts();
    
    console.log('FastMac: Initialization complete');
});

// Tool Selection Management - Simplified
function initializeToolSelection() {
    const toolItems = document.querySelectorAll('.tool-item');
    console.log('FastMac: Found', toolItems.length, 'tool items');
    
    toolItems.forEach((item) => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const checkboxVisual = item.querySelector('.w-5.h-5');
        const checkmark = item.querySelector('svg');
        
        if (!checkbox) {
            console.error('FastMac: No checkbox found for tool item');
            return;
        }
        
        // Simple click handler
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle checkbox
            checkbox.checked = !checkbox.checked;
            
            // Update visual state
            updateCheckboxVisual(checkbox, checkboxVisual, checkmark);
            
            // Update counts and buttons
            updateCounts();
            updateButtonStates();
            
            // Handle dependencies
            handleDependencies(checkbox.name, checkbox.checked);
        });
        
        // Set tabindex for accessibility
        item.setAttribute('tabindex', '0');
    });
}

function updateCheckboxVisual(checkbox, checkboxVisual, checkmark) {
    if (checkbox.checked) {
        checkboxVisual.classList.add('bg-blue-600', 'border-blue-600');
        checkmark.classList.remove('hidden');
    } else {
        checkboxVisual.classList.remove('bg-blue-600', 'border-blue-600');
        checkmark.classList.add('hidden');
    }
}

// Dependency Management - Simplified
function initializeDependencyManagement() {
    window.dependencyMap = new Map();
    
    const toolItems = document.querySelectorAll('.tool-item');
    toolItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const toolId = checkbox.name;
        
        const requiresAttr = item.getAttribute('data-requires');
        if (requiresAttr) {
            const dependencies = requiresAttr.split(',').map(d => d.trim()).map(depId => {
                const depItem = document.querySelector(`[data-tool-id="${depId}"]`);
                if (depItem) {
                    const depCategory = depItem.getAttribute('data-category');
                    return `${depCategory}-${depId}`;
                }
                return depId;
            });
            window.dependencyMap.set(toolId, dependencies);
        }
    });
}

function handleDependencies(toolId, isSelected) {
    if (!window.dependencyMap) return;
    
    if (isSelected) {
        // Select dependencies
        const dependencies = window.dependencyMap.get(toolId);
        if (dependencies) {
            dependencies.forEach(depId => {
                const depCheckbox = document.querySelector(`input[name="${depId}"]`);
                if (depCheckbox && !depCheckbox.checked) {
                    depCheckbox.checked = true;
                    const depItem = depCheckbox.closest('.tool-item');
                    const depVisual = depItem.querySelector('.w-5.h-5');
                    const depCheckmark = depItem.querySelector('svg');
                    updateCheckboxVisual(depCheckbox, depVisual, depCheckmark);
                }
            });
        }
    } else {
        // Deselect dependent tools
        const dependentTools = Array.from(window.dependencyMap.entries())
            .filter(([id, deps]) => deps.includes(toolId))
            .map(([id]) => id);
        
        dependentTools.forEach(depToolId => {
            const depCheckbox = document.querySelector(`input[name="${depToolId}"]`);
            if (depCheckbox && depCheckbox.checked) {
                depCheckbox.checked = false;
                const depItem = depCheckbox.closest('.tool-item');
                const depVisual = depItem.querySelector('.w-5.h-5');
                const depCheckmark = depItem.querySelector('svg');
                updateCheckboxVisual(depCheckbox, depVisual, depCheckmark);
            }
        });
    }
}

// Search Functionality - Simplified
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
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
        
        updateCounts();
    });
}

// Button Management - Simplified
function initializeButtons() {
    // Select All
    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            const visibleToolItems = document.querySelectorAll('.tool-item:not([style*="display: none"])');
            visibleToolItems.forEach(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                const checkboxVisual = item.querySelector('.w-5.h-5');
                const checkmark = item.querySelector('svg');
                
                if (!checkbox.checked) {
                    checkbox.checked = true;
                    updateCheckboxVisual(checkbox, checkboxVisual, checkmark);
                    handleDependencies(checkbox.name, true);
                }
            });
            updateCounts();
            updateButtonStates();
        });
    }
    
    // Clear All
    const clearAllBtn = document.getElementById('clear-all-btn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function() {
            const toolItems = document.querySelectorAll('.tool-item');
            toolItems.forEach(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                const checkboxVisual = item.querySelector('.w-5.h-5');
                const checkmark = item.querySelector('svg');
                
                if (checkbox.checked) {
                    checkbox.checked = false;
                    updateCheckboxVisual(checkbox, checkboxVisual, checkmark);
                }
            });
            updateCounts();
            updateButtonStates();
        });
    }
    
    // Form submission
    const form = document.getElementById('setup-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            generateScript();
        });
    }
    
    // Preview button
    const previewBtn = document.getElementById('preview-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', function() {
            showPreviewModal();
        });
    }
}

// Modal Management - Simplified
function initializeModals() {
    const previewModal = document.getElementById('preview-modal');
    const closePreview = document.getElementById('close-preview');
    const downloadPreview = document.getElementById('download-preview');
    
    if (closePreview) {
        closePreview.addEventListener('click', function() {
            previewModal.close();
        });
    }
    
    if (downloadPreview) {
        downloadPreview.addEventListener('click', function() {
            const scriptContent = document.getElementById('script-preview').textContent;
            downloadScript(scriptContent);
        });
    }
    
    // Close modal on backdrop click
    if (previewModal) {
        previewModal.addEventListener('click', function(e) {
            if (e.target === previewModal) {
                previewModal.close();
            }
        });
    }
}

// Utility Functions
function updateCounts() {
    const selectedCheckboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    const totalSelected = selectedCheckboxes.length;
    
    // Update main count
    const selectedCount = document.getElementById('selected-count');
    if (selectedCount) {
        if (totalSelected === 0) {
            selectedCount.textContent = 'No tools selected';
        } else if (totalSelected === 1) {
            selectedCount.textContent = '1 tool selected';
        } else {
            selectedCount.textContent = `${totalSelected} tools selected`;
        }
    }
    
    // Update category counts
    const categories = document.querySelectorAll('[data-category]');
    categories.forEach(category => {
        const categoryId = category.getAttribute('data-category');
        const categoryCount = category.querySelectorAll('input[type="checkbox"]:checked').length;
        const countElement = document.getElementById(`count-${categoryId}`);
        if (countElement) {
            countElement.textContent = `${categoryCount} selected`;
        }
    });
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

function showPreviewModal() {
    const selectedTools = getSelectedTools();
    const scriptContent = generateScriptContent(selectedTools);
    
    const scriptPreview = document.getElementById('script-preview');
    if (scriptPreview) {
        scriptPreview.textContent = scriptContent;
    }
    
    const previewModal = document.getElementById('preview-modal');
    if (previewModal) {
        previewModal.showModal();
    }
}

function generateScript() {
    const selectedTools = getSelectedTools();
    const scriptContent = generateScriptContent(selectedTools);
    downloadScript(scriptContent);
}

function getSelectedTools() {
    const selectedCheckboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(selectedCheckboxes).map(cb => cb.name);
}

function generateScriptContent(selectedTools) {
    // This would be replaced with actual script generation logic
    return `#!/bin/bash
# FastMac Generated Script
# Selected tools: ${selectedTools.join(', ')}

echo "Installing selected tools..."

# Add your installation logic here
# This is a placeholder - replace with actual tool installation commands

echo "Installation complete!"
`;
}

function downloadScript(script) {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fastmac-setup.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
