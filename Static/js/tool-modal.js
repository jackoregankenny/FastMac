// Tool Modal Manager
// This class handles all functionality for the multi-step tool form modal
class ToolModal {
    constructor() {
        // Initialize core modal elements
        this.modal = document.getElementById('tool-modal');
        this.backdrop = document.getElementById('tool-backdrop');
        this.content = document.getElementById('tool-content');
        this.form = document.getElementById('tool-form');
        this.titleEl = document.getElementById('tool-modal-title');
        this.progressBar = document.getElementById('progress-bar');
        this.autosaveIndicator = document.getElementById('autosave-indicator');

        // Navigation buttons
        this.prevBtn = document.getElementById('prev-step');
        this.nextBtn = document.getElementById('next-step');
        
        // Dynamic field containers
        this.dependenciesContainer = document.getElementById('dependencies-container');
        this.preInstallContainer = document.getElementById('pre-install-container');
        this.postInstallContainer = document.getElementById('post-install-container');
        
        // Add buttons for dynamic fields
        this.addDependencyBtn = document.getElementById('add-dependency');
        this.addPreInstallBtn = document.getElementById('add-pre-install');
        this.addPostInstallBtn = document.getElementById('add-post-install');

        // Initialize state
        this.currentStep = 1;
        this.totalSteps = 4;
        this.autoSaveTimeout = null;
        this.isOpen = false;

        // Bind event handlers
        this.bindEvents();
        
        // Set up autosave
        this.setupAutosave();
    }

    bindEvents() {
        // Modal controls
        document.getElementById('close-tool-modal').addEventListener('click', () => this.close());
        this.backdrop.addEventListener('click', () => this.close());
        
        // Step navigation
        this.prevBtn.addEventListener('click', () => this.previousStep());
        this.nextBtn.addEventListener('click', () => this.nextStep());
        
        // Step indicator clicks
        document.querySelectorAll('.step-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const step = parseInt(e.target.closest('.step-item').dataset.step);
                this.goToStep(step);
            });
        });

        // Dynamic field buttons
        this.addDependencyBtn.addEventListener('click', () => this.addDependencyField());
        this.addPreInstallBtn.addEventListener('click', () => this.addCommandField('pre-install'));
        this.addPostInstallBtn.addEventListener('click', () => this.addCommandField('post-install'));

        // Form changes trigger autosave
        this.form.addEventListener('input', () => this.triggerAutosave());
    }

    setupAutosave() {
        // Debounced autosave function
        this.triggerAutosave = () => {
            if (this.autoSaveTimeout) {
                clearTimeout(this.autoSaveTimeout);
            }
            
            this.autoSaveTimeout = setTimeout(() => {
                this.saveDraft();
            }, 1000);
        };
    }

    showAutosaveIndicator(message = 'Saving...', duration = 2000) {
        this.autosaveIndicator.textContent = message;
        this.autosaveIndicator.classList.add('show');
        
        setTimeout(() => {
            this.autosaveIndicator.classList.remove('show');
        }, duration);
    }

    async saveDraft() {
        try {
            const formData = new FormData(this.form);
            formData.append('step', this.currentStep.toString());
            
            const response = await fetch('/admin/tools/draft', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Failed to save draft');
            
            this.showAutosaveIndicator('Changes saved');
        } catch (error) {
            console.error('Error saving draft:', error);
            this.showAutosaveIndicator('Failed to save changes', 3000);
        }
    }

    open(tool = null) {
        // Show modal with animation
        this.modal.style.display = 'block';
        requestAnimationFrame(() => {
            this.backdrop.classList.remove('opacity-0');
            this.content.classList.remove('opacity-0', 'scale-95');
            this.content.classList.add('opacity-100', 'scale-100');
        });
        
        // Reset or populate form
        if (tool) {
            this.titleEl.textContent = 'Edit Tool';
            this.populateForm(tool);
        } else {
            this.titleEl.textContent = 'New Tool';
            this.form.reset();
            this.clearDynamicFields();
        }

        this.isOpen = true;
        this.goToStep(1);
        
        // Focus first input after animation
        setTimeout(() => {
            this.form.querySelector('input:not([type="hidden"])').focus();
        }, 300);
    }

    close() {
        // Animate out
        this.backdrop.classList.add('opacity-0');
        this.content.classList.remove('opacity-100', 'scale-100');
        this.content.classList.add('opacity-0', 'scale-95');
        
        // Hide after animation
        setTimeout(() => {
            if (!this.isOpen) {
                this.modal.style.display = 'none';
                this.form.reset();
                this.clearDynamicFields();
            }
        }, 300);
        
        this.isOpen = false;
    }

    populateForm(tool) {
        // Clear any existing dynamic fields
        this.clearDynamicFields();
        
        // Populate basic fields
        Object.entries(tool).forEach(([key, value]) => {
            const input = this.form.elements[key];
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = value;
                } else {
                    input.value = value;
                }
            }
        });

        // Populate dynamic fields
        if (tool.requires) {
            tool.requires.forEach(dep => this.addDependencyField(dep));
        }
        if (tool.pre_install) {
            tool.pre_install.forEach(cmd => this.addCommandField('pre-install', cmd));
        }
        if (tool.post_install) {
            tool.post_install.forEach(cmd => this.addCommandField('post-install', cmd));
        }
    }

    clearDynamicFields() {
        this.dependenciesContainer.innerHTML = '';
        this.preInstallContainer.innerHTML = '';
        this.postInstallContainer.innerHTML = '';
    }

    addDependencyField(value = '') {
        const field = document.createElement('div');
        field.className = 'flex items-center space-x-2 mt-2';
        field.innerHTML = `
            <input type="text" name="requires" value="${value}"
                class="flex-1 rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 dark:bg-gray-700 dark:text-white"
                placeholder="Enter dependency">
            <button type="button" class="text-red-500 hover:text-red-700">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;
        
        field.querySelector('button').addEventListener('click', () => field.remove());
        this.dependenciesContainer.appendChild(field);
    }

    addCommandField(type, value = '') {
        const container = type === 'pre-install' ? 
            this.preInstallContainer : this.postInstallContainer;
        
        const field = document.createElement('div');
        field.className = 'flex items-center space-x-2';
        field.innerHTML = `
            <input type="text" name="${type}" value="${value}"
                class="flex-1 rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 dark:bg-gray-700 dark:text-white"
                placeholder="Enter command">
            <button type="button" class="text-red-500 hover:text-red-700">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;
        
        field.querySelector('button').addEventListener('click', () => field.remove());
        container.appendChild(field);
    }

    updateStepIndicators() {
        // Update progress bar
        const progress = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
        this.progressBar.style.width = `${progress}%`;
        
        // Update step indicators
        document.querySelectorAll('.step-item').forEach((item, index) => {
            const stepNum = index + 1;
            item.classList.toggle('active', stepNum === this.currentStep);
            item.classList.toggle('completed', stepNum < this.currentStep);
        });
        
        // Update navigation buttons
        this.prevBtn.disabled = this.currentStep === 1;
        this.nextBtn.textContent = this.currentStep === this.totalSteps ? 'Save Tool' : 'Next';
    }

    validateCurrentStep() {
        // Get all form fields in the current step
        const currentStepEl = document.getElementById(`step-${this.currentStep}`);
        const requiredFields = currentStepEl.querySelectorAll('[required]');
        
        // Remove any existing error states
        currentStepEl.querySelectorAll('.form-field-error').forEach(field => {
            field.classList.remove('form-field-error');
        });
        
        // Check each required field
        let isValid = true;
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('form-field-error');
                isValid = false;
            }
        });
        
        return isValid;
    }

    showStep(step) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show current step
        document.getElementById(`step-${step}`).classList.remove('hidden');
        
        this.currentStep = step;
        this.updateStepIndicators();
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }

    async nextStep() {
        if (!this.validateCurrentStep()) {
            return;
        }
        
        if (this.currentStep < this.totalSteps) {
            this.showStep(this.currentStep + 1);
        } else {
            await this.saveTool();
        }
    }

    goToStep(step) {
        // Only allow going to completed steps or the next step
        if (step <= this.currentStep + 1 && step >= 1 && step <= this.totalSteps) {
            if (this.validateCurrentStep()) {
                this.showStep(step);
            }
        }
    }

    async saveTool() {
        try {
            const formData = new FormData(this.form);
            
            const response = await fetch('/admin/tools/save', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Failed to save tool');
            
            // Show success message
            this.showAutosaveIndicator('Tool saved successfully!', 2000);
            
            // Refresh the tools list and close modal
            await loadTools();
            setTimeout(() => this.close(), 1000);
            
        } catch (error) {
            console.error('Error saving tool:', error);
            alert('Failed to save tool. Please try again.');
        }
    }
}

// Initialize the tool modal
const toolModal = new ToolModal();

// Add click handler to "Add Tool" button in the dashboard
document.querySelector('[data-action="add-tool"]').addEventListener('click', () => {
    toolModal.open();
});