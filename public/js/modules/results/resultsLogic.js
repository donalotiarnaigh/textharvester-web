/**
 * Logic module for results page data processing
 * Separated for testability
 */

/**
 * Calculate summary statistics for a set of memorials/cards
 * @param {Array} memorials 
 * @returns {Object} { totalCards, totalInterments, occupied, vacant }
 */
export function calculateSummaryStats(memorials) {
  if (!memorials || !Array.isArray(memorials)) {
    return { totalCards: 0, totalInterments: 0, occupied: 0, vacant: 0 };
  }

  let totalInterments = 0;
  let occupiedCount = 0;

  memorials.forEach(item => {
    let interments = [];

    // Handle different data structures
    if (item.source_type === 'grave_record_card' && item.data_json) {
      // Grave Card Structure
      interments = item.data_json.interments || [];
    } else if (item.grave_list && item.grave_list.interments) {
      // Traditional Memorial Structure
      interments = item.grave_list.interments;
    }

    const count = interments.length;
    totalInterments += count;

    if (count > 0) {
      occupiedCount++;
    }
  });

  return {
    totalCards: memorials.length,
    totalInterments,
    occupied: occupiedCount,
    vacant: memorials.length - occupiedCount
  };
}

/**
 * Extract unique, sorted section names from a set of memorials
 * @param {Array} memorials 
 * @returns {Array<string>} Sorted array of unique section names
 */
export function getUniqueSections(memorials) {
  if (!memorials) return [];

  const sections = new Set();

  memorials.forEach(item => {
    let section = null;

    if (item.source_type === 'grave_record_card' && item.data_json && item.data_json.card_metadata) {
      section = item.data_json.card_metadata.location_section;
    } else {
      section = item.section;
    }

    if (section) {
      sections.add(section.trim());
    }
  });

  return Array.from(sections).sort();
}

/**
 * Filter memorials based on criteria
 * @param {Array} memorials 
 * @param {Object} filters { section, graveNumber }
 * @returns {Array} Filtered memorials
 */
export function filterMemorials(memorials, { section, graveNumber }) {
  if (!memorials) return [];

  return memorials.filter(item => {
    // 1. Check Section
    let itemSection = '';
    if (item.source_type === 'grave_record_card' && item.data_json && item.data_json.card_metadata) {
      itemSection = item.data_json.card_metadata.location_section || '';
    } else {
      itemSection = item.section || '';
    }

    if (section && itemSection.toLowerCase() !== section.toLowerCase()) {
      return false;
    }

    // 2. Check Grave Number
    let itemGraveNum = '';
    if (item.source_type === 'grave_record_card' && item.data_json && item.data_json.card_metadata) {
      itemGraveNum = item.data_json.card_metadata.grave_number || '';
    } else {
      itemGraveNum = item.grave_number || '';
    }

    if (graveNumber && !itemGraveNum.toLowerCase().includes(graveNumber.toLowerCase())) {
      return false;
    }

    return true;
  });
}
