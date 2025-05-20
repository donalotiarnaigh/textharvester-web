/**
 * Type definitions for memorial data
 * @type {Object.<string, string>}
 */
const memorialTypes = {
  memorial_number: 'integer',
  first_name: 'string',
  last_name: 'string',
  year_of_death: 'integer',
  inscription: 'string',
  file_name: 'string',
  ai_provider: 'string',
  model_version: 'string',
  prompt_template: 'string',
  prompt_version: 'string'
};

module.exports = { memorialTypes }; 