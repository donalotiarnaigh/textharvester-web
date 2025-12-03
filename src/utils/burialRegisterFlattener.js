/**
 * Burial register flattener utilities
 *
 * Converts validated burial register page JSON into flat entry objects with
 * generated identifiers and injected metadata.
 */
/**
 * Generate a human-readable entry identifier for a burial register row.
 * @param {string} volumeId Volume identifier
 * @param {number} pageNumber Page number within the volume
 * @param {number} rowIndex Row index on the page (1-based)
 * @returns {string} Entry identifier formatted as {volume_id}_p{page}_r{row}
 */
function generateEntryId(volumeId, pageNumber, rowIndex) {
  const page = String(pageNumber).padStart(3, '0');
  const row = String(rowIndex).padStart(3, '0');

  return `${volumeId}_p${page}_r${row}`;
}

/**
 * Inject page-level and processing metadata into an entry.
 * @param {Object} entry Raw entry object from provider output
 * @param {Object} pageData Validated page-level data
 * @param {Object} metadata Processing metadata (provider, model, filePath)
 * @returns {Object} Entry with metadata applied
 */
function injectPageMetadata(entry, pageData, metadata = {}) {
  const safeEntry = entry && typeof entry === 'object' ? { ...entry } : {};
  const { volume_id: volumeId, page_number: pageNumber } = pageData || {};

  return {
    ...safeEntry,
    volume_id: volumeId,
    page_number: pageNumber,
    parish_header_raw: pageData?.parish_header_raw ?? null,
    county_header_raw: pageData?.county_header_raw ?? null,
    year_header_raw: pageData?.year_header_raw ?? null,
    provider: metadata.provider || null,
    model: metadata.model || null,
    filePath: metadata.filePath || null
  };
}

/**
 * Flatten validated page JSON into flat entry objects with generated IDs.
 * @param {Object} pageData Validated page-level data containing entries
 * @param {Object} metadata Processing metadata (provider, model, filePath)
 * @returns {Array<Object>} Array of flat entries
 */
function flattenPageToEntries(pageData, metadata = {}) {
  if (!pageData || typeof pageData !== 'object') {
    throw new Error('pageData must be an object with entries');
  }

  const entries = Array.isArray(pageData.entries) ? pageData.entries : [];

  return entries.map((entryRaw, index) => {
    const entry = entryRaw && typeof entryRaw === 'object' ? { ...entryRaw } : {};
    const parsedRowIndex = Number.parseInt(entry.row_index_on_page, 10);
    const rowIndex = Number.isInteger(entry.row_index_on_page)
      ? entry.row_index_on_page
      : Number.isInteger(parsedRowIndex) && !Number.isNaN(parsedRowIndex)
        ? parsedRowIndex
        : index + 1;

    entry.row_index_on_page = rowIndex;
    entry.entry_id = generateEntryId(pageData.volume_id, pageData.page_number, rowIndex);

    return injectPageMetadata(entry, pageData, metadata);
  });
}

module.exports = {
  flattenPageToEntries,
  generateEntryId,
  injectPageMetadata
};
