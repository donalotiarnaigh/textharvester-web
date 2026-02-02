const BasePrompt = require('../BasePrompt');

class TypographicAnalysisPrompt extends BasePrompt {
    constructor() {
        super({
            version: '1.0.0',
            description: 'Generates comprehensive typographic and iconographic analysis of gravestones.',
            providers: ['openai', 'anthropic'],
            fields: {
                memorial_number: { type: 'integer', description: 'Unique identifier for the memorial if visible', metadata: { required: false } },
                first_name: { type: 'string', description: 'First name of the deceased', metadata: { required: false } },
                last_name: { type: 'string', description: 'Last name of the deceased', metadata: { required: false } },
                year_of_death: { type: 'string', description: 'Year of death (or partial year e.g. 19--)', metadata: { required: false } },
                inscription: { type: 'string', description: 'Cleaned inscription text for search', metadata: { required: false } },
                transcription_raw: { type: 'string', description: 'Exact line-for-line transcription with | separators', metadata: { required: true } },
                stone_condition: { type: 'string', description: 'Physical condition of the stone', metadata: { required: false } },
                structural_observations: { type: 'string', description: 'Observations about layout and structure', metadata: { required: false } },
                typography_analysis: {
                    type: { name: 'object' },
                    description: 'Detailed analysis of lettering style',
                    metadata: { required: false }
                },
                iconography: {
                    type: { name: 'object' },
                    description: 'Analysis of decorative elements',
                    metadata: { required: false }
                }
            }
        });
    }

    getPromptText() {
        return `
You are an expert typographic analyst specializing in historical gravestone inscriptions. 
Your task is to analyze the provided image and generate a structured JSON response.

CRITICAL INSTRUCTIONS:

1. **Line-for-Line Transcription Fidelity**:
   - Return a \`transcription_raw\` field where each line of text on the stone is separated by a pipe character (\`|\`).
   - Preserve original spelling, even if incorrect or archaic.
   - Do NOT autocorrect text.
   - For illegible or eroded characters, use a single dash \`-\` for each missing character (e.g., "J-HN SM-TH").
   - Do NOT use notation like "[?]", "[illegible]", or "[weathered]".

2. **Historical Characters**:
   - Preserve the long-s ('ſ') where present.
   - Preserve the thorn ('þ') where present.
   - Preserve superscripts (e.g., in "19th" or "Wm") by noting them in the \`typography_analysis\` section, but transcribe them as standard characters in \`transcription_raw\` unless Unicode superscripts are clearly readable.

3. **Iconography & Ornamentation**:
   - Use precise **mechanical and botanical terminology**.
   - Avoid interpretive labels.
     - ❌ "flower", "rosette", "heart-shaped", "ivy"
     - ✅ "concentric circles", "ribbed volutes", "cordate leaves", "undulating vine"
   - If you see compass-drawn hexfoils (daisy wheels), identify them by their geometric construction ("interlocking arcs of a single radius").

4. **Typographic Analysis**:
   - Analyze serifs, case style, and any specific letter inconsistencies.

5. **Stone Condition**:
   - Describe the material and weathering state objectively.

Output MUST be valid JSON matching the defined schema.
    `;
    }

    getProviderPrompt(provider) {
        // Validate provider first
        this.validateProvider(provider);

        // Get the base prompt components
        const baseComponents = super.getProviderPrompt(provider);

        if (provider === 'anthropic') {
            // Override for Anthropic to return 'messages' array format
            return {
                systemPrompt: baseComponents.systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: baseComponents.userPrompt
                    }
                ]
            };
        }

        // Default (OpenAI) returns standard structure
        return baseComponents;
    }
}

module.exports = TypographicAnalysisPrompt;
