document.addEventListener("DOMContentLoaded", () => {
  // Get elements with null checks
  const setupForm = document.getElementById("setup-form");
  const toolSearch = document.getElementById("tool-search");
  const selectedCount = document.getElementById("selected-count");
  const submitButton = setupForm?.querySelector('button[type="submit"]');
  const helpButton = document.getElementById("help-button");
  const helpModal = document.getElementById("help-modal");
  const closeHelp = document.getElementById("close-help");
  const helpContent = document.getElementById("help-content");
  const instructionsContent = document.getElementById("instructions-content");
  const successState = document.getElementById("success-state");

  if (!setupForm || !submitButton) {
    console.error("Required form elements not found");
    return;
  }

  // Track selection states
  const manualSelections = new Set(); // Tools directly selected by user
  const dependencySelections = new Map(); // toolId -> Set of tools that required it

  let toolsData = {};

  // Modal Control Functions
  function showHelpContent() {
    if (helpContent && instructionsContent) {
      helpContent.classList.remove('hidden');
      instructionsContent.classList.add('hidden');
    }
    helpModal?.showModal();
  }

  function showInstructionsContent() {
    if (helpContent && instructionsContent) {
      helpContent.classList.add('hidden');
      instructionsContent.classList.remove('hidden');
    }
    helpModal?.showModal();
  }

  function closeModal() {
    helpModal?.close();
    // Reset to help content when closing
    setTimeout(() => {
      if (helpContent && instructionsContent) {
        helpContent.classList.remove('hidden');
        instructionsContent.classList.add('hidden');
      }
    }, 300);
  }

  // Load tools data from Firebase
  async function loadToolsData() {
    try {
      console.log("Starting to load tools data...");
      const categoriesSnapshot = await window.db.collection('categories').get();
      const categories = {};
      
      categoriesSnapshot.forEach(doc => {
        categories[doc.id] = {
          name: doc.data().name,
          tools: {}
        };
      });

      const toolsSnapshot = await window.db.collection('tools').get();
      
      toolsSnapshot.forEach(doc => {
        const toolData = doc.data();
        console.log(`Loading tool: ${doc.id}`, toolData);
        const categoryId = toolData.category;
        
        if (categories[categoryId]) {
          categories[categoryId].tools[doc.id] = {
            name: toolData.name,
            description: toolData.description,
            brew_package: toolData.brew_package,
            check_command: toolData.check_command,
            type: toolData.type,
            cask: toolData.cask,
            requires: toolData.requires || [],
            install_command: toolData.install_command,
            pre_install: toolData.pre_install,
            post_install: toolData.post_install
          };
        }
      });

      console.log("Final toolsData:", categories);
      toolsData = categories;
      renderToolsUI(categories);
    } catch (error) {
      console.error("Error loading tools data:", error);
      showError("Failed to load tools. Please refresh the page.");
    }
  }

  function renderToolsUI(categories) {
    const container = document.getElementById("tools-container");
    if (!container) return;

    container.innerHTML = Object.entries(categories)
      .map(([categoryId, category]) => `
        <div class="mb-8" data-category="${categoryId}">
          <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            ${category.name}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            ${Object.entries(category.tools).map(([toolId, tool]) => `
              <label class="tool-item flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group">
                <input type="checkbox" 
                       id="${toolId}" 
                       name="${toolId}" 
                       data-requires="${(tool.requires || []).join(',')}"
                       class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500">
                <span class="ml-3 flex-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 tool-name">
                    ${tool.name}
                  </span>
                  ${tool.requires && tool.requires.length > 0 ? `
                    <span class="ml-2 text-xs text-gray-500">
                      requires: ${tool.requires.join(', ')}
                    </span>
                  ` : ''}
                  ${tool.description ? `
                    <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      ${tool.description}
                    </p>
                  ` : ''}
                </span>
                ${tool.cask ? `
                  <span class="ml-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                    GUI
                  </span>
                ` : ''}
              </label>
            `).join('')}
          </div>
        </div>
      `).join('');

    updateSelectedState();
  }

  function getDependencies(toolId) {
    let dependencies = [];
    for (const category of Object.values(toolsData)) {
      if (toolId in category.tools) {
        dependencies = category.tools[toolId].requires || [];
        console.log(`Dependencies for ${toolId}:`, dependencies);
        break;
      }
    }
    return dependencies;
  }

  function handleCheckboxChange(checkbox, isDirectSelection = true) {
    const toolId = checkbox.id;
    const isChecked = checkbox.checked;
    console.log(`Handling checkbox change for ${toolId}, checked: ${isChecked}, direct: ${isDirectSelection}`);

    if (isChecked) {
      if (isDirectSelection) {
        manualSelections.add(toolId);
        console.log(`Added ${toolId} to manual selections`);
      }

      const dependencies = checkbox.dataset.requires ? checkbox.dataset.requires.split(',').filter(Boolean) : [];
      console.log(`Tool ${toolId} requires:`, dependencies);

      dependencies.forEach(depId => {
        const depCheckbox = document.getElementById(depId);
        console.log(`Looking for dependency checkbox ${depId}:`, depCheckbox);
        
        if (depCheckbox) {
          if (!dependencySelections.has(depId)) {
            dependencySelections.set(depId, new Set());
          }
          dependencySelections.get(depId).add(toolId);
          
          if (!depCheckbox.checked) {
            depCheckbox.checked = true;
            handleCheckboxChange(depCheckbox, false);
          }
        } else {
          console.warn(`Dependency ${depId} checkbox not found`);
        }
      });
    } else {
      if (isDirectSelection) {
        manualSelections.delete(toolId);
        console.log(`Removed ${toolId} from manual selections`);
        
        const dependencies = checkbox.dataset.requires ? checkbox.dataset.requires.split(',').filter(Boolean) : [];
        
        dependencies.forEach(depId => {
          const depCheckbox = document.getElementById(depId);
          if (depCheckbox) {
            dependencySelections.get(depId)?.delete(toolId);
            
            if (!manualSelections.has(depId) && 
                (!dependencySelections.has(depId) || dependencySelections.get(depId).size === 0)) {
              depCheckbox.checked = false;
              handleCheckboxChange(depCheckbox, false);
            }
          }
        });
      }
    }

    updateSelectedState();
    logSelectionState();
  }

  function filterTools(searchTerm) {
    const tools = document.querySelectorAll(".tool-item");
    const normalizedTerm = searchTerm.toLowerCase().trim();

    tools.forEach((tool) => {
      const toolName = tool.querySelector(".tool-name").textContent.toLowerCase();
      const toolCategory = tool.closest("[data-category]")?.dataset.category?.toLowerCase() || "";
      const isVisible = toolName.includes(normalizedTerm) || toolCategory.includes(normalizedTerm);
      tool.style.display = isVisible ? "" : "none";
    });

    document.querySelectorAll("[data-category]").forEach((category) => {
      const hasVisibleTools = Array.from(category.querySelectorAll(".tool-item"))
        .some((tool) => tool.style.display !== "none");
      category.style.display = hasVisibleTools ? "" : "none";
    });
  }

  function updateSelectedState() {
    if (!selectedCount || !submitButton) return;
    
    const checkedBoxes = setupForm.querySelectorAll('input[type="checkbox"]:checked');
    const count = checkedBoxes.length;
    selectedCount.textContent = count === 0 ? "No tools selected" : 
      `${count} tool${count === 1 ? "" : "s"} selected`;
    submitButton.disabled = count === 0;
  }

  function showError(message) {
    const container = document.getElementById("tools-container");
    if (container) {
      container.innerHTML = `
        <div class="p-4 text-red-600 bg-red-50 rounded-lg">
          ${message}
        </div>
      `;
    }
  }

  function logSelectionState() {
    console.log('Current Selection State:');
    console.log('Manual Selections:', Array.from(manualSelections));
    console.log('Dependency Selections:', Object.fromEntries(
      Array.from(dependencySelections.entries()).map(([key, value]) => [
        key,
        Array.from(value)
      ])
    ));
  }

  // Event Listeners
  toolSearch?.addEventListener("input", (e) => filterTools(e.target.value));

  setupForm?.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
      handleCheckboxChange(e.target, true);
    }
  });

  // Modal event listeners
  helpButton?.addEventListener("click", showHelpContent);
  closeHelp?.addEventListener("click", closeModal);

  // Close modal on backdrop click
  helpModal?.addEventListener("click", (e) => {
    const modalContent = helpModal.querySelector(".modal-content");
    if (e.target === helpModal || !modalContent.contains(e.target)) {
      closeModal();
    }
  });

  // Script generation and download
  setupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const selectedTools = Array.from(new FormData(e.target).keys());
        if (selectedTools.length === 0) {
            alert("Please select at least one tool");
            return;
        }

        const response = await fetch("/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(selectedTools),
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        const blob = new Blob([data.script], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "install.sh";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Show success state
        if (successState) successState.classList.remove("hidden");
        const generateButton = document.getElementById("generate-button");
        if (generateButton) generateButton.classList.add("hidden");

        // Show help with instructions
        helpModal?.showModal();
    } catch (error) {
        console.error("Error:", error);
        showError("Failed to generate installation script. Please try again.");
    }
});

  // Handle success state close
  document.getElementById("close-success")?.addEventListener("click", () => {
    successState?.classList.add("hidden");
    document.getElementById("generate-button")?.classList.remove("hidden");
  });

  // Initialize
  if (!window.firebaseInitFailed) {
    loadToolsData();
  } else {
    showError("Failed to initialize Firebase. Please refresh the page.");
  }
});