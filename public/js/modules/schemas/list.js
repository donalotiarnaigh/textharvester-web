/**
 * Fetches the list of custom schemas from the API.
 * @returns {Promise<Array>} List of schema objects.
 */
export async function fetchSchemas() {
  try {
    const response = await fetch('/api/schemas');
    if (!response.ok) {
      throw new Error('Failed to fetch schemas');
    }
    const schemas = await response.json();
    return schemas;
  } catch (error) {
    console.error('Error fetching schemas:', error);
    throw error;
  }
}

/**
 * Renders the list of schemas into the table.
 * @param {Array} schemas - List of schema objects.
 */
export function renderSchemas(schemas) {
  const tableBody = document.querySelector('#schemasTable tbody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  if (!schemas || schemas.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="4" class="text-center">No custom schemas found</td>';
    tableBody.appendChild(row);
    return;
  }

  schemas.forEach(schema => {
    const row = document.createElement('tr');
    // Format date nicely if possible, or just raw string
    const dateStr = schema.created_at ? new Date(schema.created_at).toLocaleDateString() : 'N/A';

    row.innerHTML = `
            <td>${escapeHtml(schema.name)}</td>
            <td><code>${escapeHtml(schema.table_name)}</code></td>
            <td>${dateStr}</td>
            <td>
                <!-- Actions could go here -->
                <button class="btn btn-sm btn-outline-info disabled" title="View details (Coming Soon)">View</button>
            </td>
        `;
    tableBody.appendChild(row);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Initialize the schema list page
 */
export async function initSchemaList() {
  try {
    const schemas = await fetchSchemas();
    renderSchemas(schemas);
  } catch (error) {
    const container = document.getElementById('alertContainer');
    if (container) {
      container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Failed to load schemas: ${error.message}
                </div>
            `;
    }
  }
}
