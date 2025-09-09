/**
 * Intelligent Crop Toggle Module
 * Renders a checkbox to enable monument photo intelligent cropping
 * and persists the preference in localStorage.
 */

/**
 * Initialize intelligent crop toggle UI component
 */
export function initIntelligentCropToggle() {
  const container = document.getElementById('intelligent-crop-container');
  if (!container) {
    console.warn('Intelligent crop container not found');
    return;
  }

  container.innerHTML = `
    <div class="card mb-3">
      <div class="card-body py-3">
        <div class="custom-control custom-checkbox">
          <input type="checkbox" class="custom-control-input" id="intelligentCrop">
          <label class="custom-control-label" for="intelligentCrop">Enable Intelligent Crop</label>
        </div>
      </div>
    </div>`;

  let enabled = false;
  try {
    enabled = localStorage.getItem('intelligentCrop') === 'true';
  } catch (err) {
    console.warn('Failed to load intelligentCrop from localStorage:', err);
  }

  const checkbox = document.getElementById('intelligentCrop');
  if (checkbox) {
    checkbox.checked = enabled;
    const save = (e) => {
      try {
        localStorage.setItem('intelligentCrop', e.target.checked.toString());
      } catch (err) {
        console.warn('Failed to save intelligentCrop to localStorage:', err);
      }
    };
    checkbox.addEventListener('change', save);
    checkbox.addEventListener('click', save);
  }
}

/**
 * Determine if intelligent crop is enabled
 * @returns {boolean} true if enabled
 */
export function isIntelligentCropEnabled() {
  try {
    return localStorage.getItem('intelligentCrop') === 'true';
  } catch (err) {
    console.warn('Failed to get intelligentCrop from localStorage:', err);
    return false;
  }
}
