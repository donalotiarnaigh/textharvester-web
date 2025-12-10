/* eslint-disable quotes */
// sourceTypeSelection.js

const SOURCE_TYPES = [
  { value: "record_sheet", label: "Record Sheet" },
  { value: "monument_photo", label: "Monument Photo" },
  { value: "burial_register", label: "Burial Register" }
];

/**
 * Initialize the source type selection UI and interactions
 */
export const initSourceTypeSelection = () => {
  console.log("Initializing source type selection");

  const sourceTypeSelect = document.getElementById("sourceTypeSelect");
  const volumeIdGroup = document.getElementById("volumeIdGroup");

  if (!sourceTypeSelect || !volumeIdGroup) {
    console.error("Source type selection elements not found in DOM.");
    return;
  }

  // Populate select options
  sourceTypeSelect.innerHTML = SOURCE_TYPES.map((type) => {
    return `<option value="${type.value}">${type.label}</option>`;
  }).join("");

  const defaultValue = "record_sheet";
  sourceTypeSelect.value = defaultValue;
  toggleVolumeIdVisibility(defaultValue, volumeIdGroup);

  sourceTypeSelect.addEventListener("change", (event) => {
    const selectedType = event.target.value;
    toggleVolumeIdVisibility(selectedType, volumeIdGroup);
  });
};

/**
 * Show or hide the volume ID input based on source type
 * @param {string} sourceType - Selected source type
 * @param {HTMLElement} volumeIdGroup - Container for the volume ID field
 */
function toggleVolumeIdVisibility(sourceType, volumeIdGroup) {
  if (sourceType === "burial_register") {
    volumeIdGroup.classList.remove("d-none");
  } else {
    volumeIdGroup.classList.add("d-none");
  }
}

/**
 * Get the selected source type
 * @returns {string} Source type value
 */
export const getSelectedSourceType = () => {
  const selectElement = document.getElementById("sourceTypeSelect");
  return selectElement ? selectElement.value : "record_sheet";
};

/**
 * Get the volume ID input value
 * @returns {string} Volume ID or default "vol1"
 */
export const getVolumeId = () => {
  const inputElement = document.getElementById("volumeId");
  if (!inputElement) {
    return "vol1";
  }
  const trimmedValue = inputElement.value.trim();
  return trimmedValue || "vol1";
};
