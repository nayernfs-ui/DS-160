/**
 * DS-160 Admin Control Panel Script
 * Manages form section visibility and configuration settings
 */

// Define all available sections that can be toggled
const AVAILABLE_SECTIONS = [
  {
    id: 'personalInfo',
    name: 'Personal Information',
    containerId: 'personalInfoSection',
    description: 'Full Name, Date of Birth, Gender, etc.',
  },
  {
    id: 'passportInfo',
    name: 'Passport Information',
    containerId: 'passportSection',
    description: 'Passport Number, Issuing Country, etc.',
  },
  {
    id: 'visaInfo',
    name: 'Visa Information',
    containerId: 'visaSection',
    description: 'Visa Type, Previous Visas, etc.',
  },
  {
    id: 'addressInfo',
    name: 'Address Information',
    containerId: 'addressSection',
    description: 'Current Address, Previous Addresses, etc.',
  },
  {
    id: 'contactInfo',
    name: 'Contact Information',
    containerId: 'contactSection',
    description: 'Email, Phone, Mailing Address, etc.',
  },
  {
    id: 'employmentInfo',
    name: 'Employment Information',
    containerId: 'employmentSection',
    description: 'Current & Previous Employment, etc.',
  },
  {
    id: 'educationInfo',
    name: 'Education Information',
    containerId: 'educationSection',
    description: 'Schools Attended, Degrees, etc.',
  },
  {
    id: 'familyInfo',
    name: 'Family Information',
    containerId: 'familySection',
    description: 'Parents, Siblings, Spouse, Children, etc.',
  },
  {
    id: 'relativesInfo',
    name: 'Relatives in US (Immediate)',
    containerId: 'US_ImmediateRelatives_Container',
    description: 'Immediate Relatives Container',
  },
  {
    id: 'otherInfo',
    name: 'Other Relatives Question',
    containerId: 'otherRelativesQuestion',
    description: 'Question: Do you have other relatives in US?',
  },
  {
    id: 'travelHistory',
    name: 'Travel History',
    containerId: 'travelSection',
    description: 'Previous Visits to US, etc.',
  },
  {
    id: 'securityInfo',
    name: 'Security & Background',
    containerId: 'securitySection',
    description: 'Security & Background Questions, etc.',
  },
];

const STORAGE_KEY = 'ds160_admin_settings';

/**
 * Initialize the admin panel on page load
 */
function initializeAdminPanel() {
  renderToggleList();
  loadSettings();
}

/**
 * Render the toggle list for all sections
 */
function renderToggleList() {
  const toggleList = document.getElementById('toggleList');
  if (!toggleList) return;

  toggleList.innerHTML = AVAILABLE_SECTIONS.map(
    (section) => `
    <div class="toggle-item">
      <input
        type="checkbox"
        id="toggle_${section.id}"
        class="section-toggle"
        data-section-id="${section.id}"
        data-container-id="${section.containerId}"
        checked
        onchange="updateSectionVisibility(this)"
      />
      <label for="toggle_${section.id}" class="toggle-label">
        <span class="section-name">${section.name}</span>
        <span class="section-id">${section.containerId}</span>
      </label>
    </div>
  `
  ).join('');
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
  try {
    const settings = localStorage.getItem(STORAGE_KEY);
    if (settings) {
      const config = JSON.parse(settings);
      Object.entries(config).forEach(([sectionId, enabled]) => {
        const toggle = document.getElementById(`toggle_${sectionId}`);
        if (toggle) {
          toggle.checked = enabled;
          updateSectionVisibility(toggle, false);
        }
      });
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Update section visibility based on toggle state
 */
function updateSectionVisibility(toggleElement, save = true) {
  const containerId = toggleElement.getAttribute('data-container-id');
  const isEnabled = toggleElement.checked;

  const container = document.getElementById(containerId);
  if (container) {
    if (isEnabled) {
      container.style.removeProperty('display');
      container.classList.remove('admin-hidden');
    } else {
      container.style.setProperty('display', 'none', 'important');
      container.classList.add('admin-hidden');
    }
  }

  if (save) {
    saveSettings();
  }
}

/**
 * Save all settings to localStorage
 */
function saveSettings() {
  try {
    const config = {};
    document.querySelectorAll('.section-toggle').forEach((toggle) => {
      const sectionId = toggle.getAttribute('data-section-id');
      config[sectionId] = toggle.checked;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    showStatusMessage('✓ Settings saved successfully', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatusMessage('✗ Error saving settings', 'error');
  }
}

/**
 * Reset all settings to defaults (all enabled)
 */
function resetSettings() {
  if (confirm('Reset all section toggles to default (all enabled)?')) {
    document.querySelectorAll('.section-toggle').forEach((toggle) => {
      toggle.checked = true;
      updateSectionVisibility(toggle, false);
    });
    saveSettings();
    showStatusMessage('✓ Settings reset to defaults', 'success');
  }
}

/**
 * Emergency: Force show all containers
 */
function emergencyShowAll() {
  const style = document.getElementById('admin-emergency-style');
  if (style) {
    style.remove();
    showStatusMessage('🔒 Emergency mode disabled', 'success');
  } else {
    const emergencyStyle = document.createElement('style');
    emergencyStyle.id = 'admin-emergency-style';
    emergencyStyle.textContent = `
      .conditional-fields { display: block !important; visibility: visible !important; opacity: 1 !important; max-height: 10000px !important; }
      .admin-hidden { display: block !important; visibility: visible !important; opacity: 1 !important; max-height: 10000px !important; }
      fieldset { display: block !important; visibility: visible !important; opacity: 1 !important; max-height: 10000px !important; }
      [style*='display: none'] { display: block !important; visibility: visible !important; opacity: 1 !important; max-height: 10000px !important; }
    `;
    document.head.appendChild(emergencyStyle);
    showStatusMessage(
      '🔓 Emergency Show All activated! All hidden sections are now visible.',
      'success'
    );
  }
}

/**
 * Export settings as JSON
 */
function exportSettings() {
  try {
    const config = {};
    document.querySelectorAll('.section-toggle').forEach((toggle) => {
      const sectionId = toggle.getAttribute('data-section-id');
      config[sectionId] = toggle.checked;
    });

    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ds160-admin-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showStatusMessage('✓ Settings exported as JSON', 'success');
  } catch (error) {
    console.error('Error exporting settings:', error);
    showStatusMessage('✗ Error exporting settings', 'error');
  }
}

/**
 * Clear all settings from localStorage
 */
function clearAllSettings() {
  if (confirm('Clear all admin settings from localStorage? This cannot be undone.')) {
    try {
      localStorage.removeItem(STORAGE_KEY);
      resetSettings();
      showStatusMessage('✓ All settings cleared', 'success');
    } catch (error) {
      console.error('Error clearing settings:', error);
      showStatusMessage('✗ Error clearing settings', 'error');
    }
  }
}

/**
 * Show status message to user
 */
function showStatusMessage(message, type) {
  const statusEl = document.getElementById('statusMessage');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAdminPanel);
} else {
  initializeAdminPanel();
}
