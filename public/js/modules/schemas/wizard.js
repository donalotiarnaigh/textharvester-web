export function initWizard() {
  // Dropzone init would go here
}

/**
 * Uploads example files for analysis
 */
export async function handleUpload(files) {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  try {
    const response = await fetch('/api/schemas/propose', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

/**
 * Renders the schema editor form with the proposed schema
 */
export function renderEditor(proposal) {
  const nameInput = document.getElementById('schemaName');
  const tbody = document.getElementById('fieldsTableBody');

  if (nameInput) nameInput.value = proposal.recommendedName;
  if (tbody) {
    tbody.innerHTML = '';
    if (proposal.fields) {
      proposal.fields.forEach(field => {
        const tr = document.createElement('tr');
        tr.className = 'field-row';
        tr.innerHTML = `
                    <td><input type="text" class="form-control field-name" value="${escapeHtml(field.name)}" required></td>
                    <td>
                        <select class="form-control field-type">
                            <option value="string" ${field.type === 'string' ? 'selected' : ''}>String</option>
                            <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
                            <option value="date" ${field.type === 'date' ? 'selected' : ''}>Date</option>
                            <option value="boolean" ${field.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                        </select>
                    </td>
                    <td><input type="text" class="form-control field-desc" value="${escapeHtml(field.description || '')}"></td>
                    <td>
                        <button type="button" class="btn btn-sm btn-danger remove-field" onclick="this.closest('tr').remove()">&times;</button>
                    </td>
                `;
        tbody.appendChild(tr);
      });
    }
  }

  // Switch views
  document.getElementById('step-upload')?.classList.add('d-none');
  document.getElementById('step-loading')?.classList.add('d-none');
  document.getElementById('step-editor')?.classList.remove('d-none');
}

/**
 * Collects form data and saves the schema
 */
export async function saveSchema() {
  const name = document.getElementById('schemaName').value;
  const rows = document.querySelectorAll('.field-row');

  // Construct JSON schema from table rows
  const properties = {};
  const required = [];

  rows.forEach(row => {
    const fieldName = row.querySelector('.field-name').value;
    const fieldType = row.querySelector('.field-type').value;
    const fieldDesc = row.querySelector('.field-desc').value;

    if (fieldName) {
      properties[fieldName] = {
        type: fieldType,
        description: fieldDesc
      };
      // Assume all detected fields are required for simplicity in MVP, or add a checkbox
      required.push(fieldName);
    }
  });

  const schemaDefinition = {
    name: name,
    jsonSchema: {
      type: 'object',
      properties: properties,
      required: required
    }
  };

  try {
    const response = await fetch('/api/schemas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(schemaDefinition)
    });

    if (!response.ok) {
      // Try to get error message from response body
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Ignore JSON parse error, use statusText
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Save failed:', error);
    throw error;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
