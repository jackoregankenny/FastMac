// Category Panel Management
class CategoryPanel {
    constructor() {
        // Get DOM elements
        this.panel = document.getElementById('category-panel');
        this.backdrop = document.getElementById('category-backdrop');
        this.slide = document.getElementById('category-slide');
        this.form = document.getElementById('category-form');
        this.titleEl = document.getElementById('category-panel-title');
        this.nameInput = document.getElementById('category-name');
        this.idInput = document.getElementById('category-id');
        
        // Buttons
        this.closeBtn = document.getElementById('close-category-panel');
        this.cancelBtn = document.getElementById('cancel-category');
        this.saveBtn = document.getElementById('save-category');
        
        // Bind event handlers
        this.closeBtn.addEventListener('click', () => this.close());
        this.cancelBtn.addEventListener('click', () => this.close());
        this.backdrop.addEventListener('click', () => this.close());
        this.saveBtn.addEventListener('click', () => this.save());
        
        // Initial state
        this.isOpen = false;
    }
    
    open(category = null) {
        // Set form data if editing existing category
        if (category) {
            this.titleEl.textContent = 'Edit Category';
            this.nameInput.value = category.name;
            this.idInput.value = category.id;
        } else {
            this.titleEl.textContent = 'New Category';
            this.form.reset();
            this.idInput.value = '';
        }
        
        // Show panel with animation
        this.panel.style.display = 'block';
        // Force a reflow to enable transition
        this.panel.offsetHeight;
        this.backdrop.classList.remove('opacity-0');
        this.slide.classList.remove('translate-x-full');
        
        this.isOpen = true;
        this.nameInput.focus();
    }
    
    close() {
        // Animate out
        this.backdrop.classList.add('opacity-0');
        this.slide.classList.add('translate-x-full');
        
        // Hide panel after animation
        setTimeout(() => {
            if (!this.isOpen) {
                this.panel.style.display = 'none';
            }
        }, 500); // Match transition duration
        
        this.isOpen = false;
    }
    
    async save() {
        if (!this.form.checkValidity()) {
            this.form.reportValidity();
            return;
        }
        
        const formData = {
            id: this.idInput.value,
            name: this.nameInput.value
        };
        
        try {
            const response = await fetch('/admin/categories/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) throw new Error('Failed to save category');
            
            // Refresh the categories list
            await loadCategories();
            this.close();
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Failed to save category. Please try again.');
        }
    }
}

// Initialize panel
const categoryPanel = new CategoryPanel();

// Add click handler to "Add Category" button
document.querySelector('[data-action="add-category"]').addEventListener('click', () => {
    categoryPanel.open();
});