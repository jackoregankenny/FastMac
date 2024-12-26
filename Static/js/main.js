document.addEventListener("DOMContentLoaded", () => {
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

  // Load tools data
  async function loadToolsData() {
    try {
      const response = await fetch("/static/tools.json");
      toolsData = await response.json();
    } catch (error) {
      console.error("Error loading tools data:", error);
    }
  }

  // Dependency management functions
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

  // Handle tool selection
  function handleCheckboxChange(checkbox, isDirectSelection = true) {
    const toolId = checkbox.id;

    if (checkbox.checked) {
      // Handle direct selection
      if (isDirectSelection) {
        manualSelections.add(toolId);
      }

      // Handle dependencies
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

      // Handle dependents
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

  // Search functionality
  function filterTools(searchTerm) {
    const tools = document.querySelectorAll(".tool-item");
    const normalizedTerm = searchTerm.toLowerCase().trim();

    tools.forEach((tool) => {
      const toolName = tool
        .querySelector(".tool-name")
        .textContent.toLowerCase();
      const toolCategory =
        tool.closest("[data-category]")?.dataset.category?.toLowerCase() || "";
      const isVisible =
        toolName.includes(normalizedTerm) ||
        toolCategory.includes(normalizedTerm);
      tool.style.display = isVisible ? "" : "none";
    });

    document.querySelectorAll("[data-category]").forEach((category) => {
      const hasVisibleTools = Array.from(
        category.querySelectorAll(".tool-item"),
      ).some((tool) => tool.style.display !== "none");
      category.style.display = hasVisibleTools ? "" : "none";
    });
  }

  function updateSelectedState() {
    const checkedBoxes = setupForm.querySelectorAll(
      'input[type="checkbox"]:checked',
    );
    const count = checkedBoxes.length;
    selectedCount.textContent =
      count === 0
        ? "No tools selected"
        : `${count} tool${count === 1 ? "" : "s"} selected`;
    submitButton.disabled = count === 0;
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

      // Download the script
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
      document.getElementById("success-state")?.classList.remove("hidden");
      document.getElementById("generate-button")?.classList.add("hidden");
    } catch (error) {
      console.error("Error:", error);
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
