document.addEventListener("DOMContentLoaded", () => {
  // Initialize Firebase with configuration
  const firebaseConfig = {
    apiKey: "AIzaSyAwMnc6B_9IUn57XRm8BN696rknOeHe88w",
    authDomain: "fastmac-98ba2.firebaseapp.com",
    databaseURL: "https://fastmac-98ba2-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "fastmac-98ba2",
    storageBucket: "fastmac-98ba2.firebasestorage.app",
    messagingSenderId: "129477015226",
    appId: "1:129477015226:web:721d174e3780a563953483"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  const setupForm = document.getElementById("setup-form");
  const toolSearch = document.getElementById("tool-search");
  const selectedCount = document.getElementById("selected-count");
  const submitButton = setupForm.querySelector('button[type="submit"]');
  const helpButton = document.getElementById("help-button");
  const helpModal = document.getElementById("help-modal");
  const closeHelp = document.getElementById("close-help");

  // Track selection states
  const manualSelections = new Set(); // Tools directly selected by user
  const dependencySelections = new Map(); // toolId -> Set of tools that required it

  let toolsData = {};

  // Load tools data from Firebase
  async function loadToolsData() {
    try {
      // First, fetch all categories
      const categoriesSnapshot = await db.collection('categories').get();
      const categories = {};
      
      // Create the basic category structure
      categoriesSnapshot.forEach(doc => {
        categories[doc.id] = {
          name: doc.data().name,
          tools: {}
        };
      });

      // Then fetch all tools
      const toolsSnapshot = await db.collection('tools').get();
      
      // Organize tools into their categories
      toolsSnapshot.forEach(doc => {
        const toolData = doc.data();
        const categoryId = toolData.category;
        
        if (categories[categoryId]) {
          categories[categoryId].tools[doc.id] = {
            name: toolData.name,
            description: toolData.description,
            brew_package: toolData.brew_package,
            check_command: toolData.check_command,
            type: toolData.type,
            cask: toolData.cask,
            requires: toolData.requires,
            install_command: toolData.install_command,
            pre_install: toolData.pre_install,
            post_install: toolData.post_install
          };
        }
      });

      toolsData = categories;
      renderToolsUI(categories);
    } catch (error) {
      console.error("Error loading tools data:", error);
      showError("Failed to load tools. Please refresh the page.");
    }
  }

  // Function to render the tools UI
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
                       class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500">
                <span class="ml-3 flex-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 tool-name">
                    ${tool.name}
                  </span>
                  ${tool.requires ? `
                    <span class="ml-2 text-xs text-gray-500">
                      requires: ${tool.requires.join(', ')}
                    </span>
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

  // The rest of the functions remain largely the same
  function getDependencies(toolId) {
    for (const category of Object.values(toolsData)) {
      const tool = category.tools[toolId];
      if (tool?.requires) {
        return tool.requires;
      }
    }
    return [];
  }

  function getDependents(toolId) {
    const dependents = [];
    for (const category of Object.values(toolsData)) {
      for (const [id, tool] of Object.entries(category.tools)) {
        if (tool.requires?.includes(toolId)) {
          dependents.push(id);
        }
      }
    }
    return dependents;
  }

  // Handle tool selection - remains the same
  function handleCheckboxChange(checkbox, isDirectSelection = true) {
    const toolId = checkbox.id;

    if (checkbox.checked) {
      if (isDirectSelection) {
        manualSelections.add(toolId);
      }

      getDependencies(toolId).forEach((depId) => {
        const depCheckbox = document.getElementById(depId);
        if (depCheckbox) {
          depCheckbox.checked = true;
          if (!dependencySelections.has(depId)) {
            dependencySelections.set(depId, new Set());
          }
          dependencySelections.get(depId).add(toolId);
          handleCheckboxChange(depCheckbox, false);
        }
      });
    } else {
      if (isDirectSelection) {
        manualSelections.delete(toolId);
        const dependencies = getDependencies(toolId);
        dependencies.forEach((depId) => {
          const depCheckbox = document.getElementById(depId);
          if (depCheckbox) {
            dependencySelections.get(depId)?.delete(toolId);
            if (
              !manualSelections.has(depId) &&
              (!dependencySelections.has(depId) ||
                dependencySelections.get(depId).size === 0)
            ) {
              depCheckbox.checked = false;
              handleCheckboxChange(depCheckbox, false);
            }
          }
        });
      }

      getDependents(toolId).forEach((depId) => {
        const depCheckbox = document.getElementById(depId);
        if (depCheckbox?.checked) {
          depCheckbox.checked = false;
          manualSelections.delete(depId);
          handleCheckboxChange(depCheckbox, false);
        }
      });
    }
    updateSelectedState();
  }

  // Search functionality - remains the same
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
    const checkedBoxes = setupForm.querySelectorAll('input[type="checkbox"]:checked');
    const count = checkedBoxes.length;
    selectedCount.textContent = count === 0 ? "No tools selected" : 
      `${count} tool${count === 1 ? "" : "s"} selected`;
    submitButton.disabled = count === 0;
  }

  // Helper function to show errors
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

  // Event Listeners
  toolSearch?.addEventListener("input", (e) => filterTools(e.target.value));

  setupForm?.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
      handleCheckboxChange(e.target, true);
    }
  });

  helpButton?.addEventListener("click", () => helpModal?.showModal());
  closeHelp?.addEventListener("click", () => helpModal?.close());

  // Script generation and download
  setupForm?.addEventListener("submit", async (e) => {
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

      const blob = new Blob([data.script], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "install.sh";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      document.getElementById("success-state")?.classList.remove("hidden");
      document.getElementById("generate-button")?.classList.add("hidden");
    } catch (error) {
      console.error("Error:", error);
      showError("Failed to generate installation script. Please try again.");
    }
  });

  // Handle success state close
  document.getElementById("close-success")?.addEventListener("click", () => {
    document.getElementById("success-state")?.classList.add("hidden");
    document.getElementById("generate-button")?.classList.remove("hidden");
  });

  // Initialize
  loadToolsData();
  updateSelectedState();
});