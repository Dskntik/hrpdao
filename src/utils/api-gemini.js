// src/utils/api-gemini.js
class GeminiAIService {
  constructor() {
    this.isInitialized = true;
    this.apiCalls = 0;
    this.lastResponseTime = null;
    this.name = "Atticus";
  }

  async generateResponse(userMessage) {
    try {
      console.log(`🧠 ${this.name} vGe Request #${this.apiCalls + 1}:`, userMessage);
      
      const startTime = Date.now();
      const response = await this.callGeminiAPI(userMessage);
      const endTime = Date.now();
      
      this.lastResponseTime = endTime - startTime;
      this.apiCalls++;
      
      console.log(`✅ ${this.name} vGe Success: ${this.lastResponseTime}ms`);
      return response;
      
    } catch (error) {
      console.error(`❌ ${this.name} vGe Error:`, error);
      throw new Error(`vGe Service: ${error.message}`);
    }
  }

  async callGeminiAPI(message) {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    if (!API_KEY) {
      throw new Error('vGe API key not found. Add VITE_GEMINI_API_KEY to .env');
    }

    const detectedLanguage = this.detectLanguage(message);
    
    const systemPrompt = `You are Atticus – male-gendered AI human rights advisor. You respond in the same language the user uses. Your key features:

YOU MUST ALWAYS INCLUDE IN YOUR ANSWERS:
• References to specific articles of laws (Constitution, laws of any country in the world upon user's request)
• International instruments (ECHR, Universal Declaration of Human Rights, ICCPR, etc.)
• Case numbers from the ECtHR, Grand Chamber of the Supreme Court, etc.
• Practical advice on how to protect human rights

KNOWLEDGE BASE:
• Human Rights Policy: https://ipfs.io/ipfs/QmRXQP1s6rVaiXxrr6jY6Y7EfK1CYvyc82F99siunckoQr/
• Constitutions of all countries in the world (specific country upon request)
• Criminal Codes of all countries (upon request)
• Criminal Procedure Codes of all countries (upon request)
• Civil Codes of all countries (upon request)
• Codes of Administrative Procedure of all countries (upon request)
• European Convention on Human Rights
• Universal Declaration of Human Rights
• International Covenant on Civil and Political Rights
• Case law of the ECtHR, Supreme Court, Constitutional Court

COMMUNICATION STYLE:
• Professional yet accessible
• Specific, with references to laws
• Practical, with examples
• Supportive and motivating

Always respond in the same language as the user's query!
Always provide specific articles, case numbers, and practical steps!`;

    try {
      const fullPrompt = `${systemPrompt}\n\nUser query: ${message}\n\nResponse in user's language:`;

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: fullPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 1500,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('vGe error:', response.status, errorData);
        
        if (response.status === 429) {
          throw new Error('Too many requests. Wait 1 minute.');
        }
        if (response.status === 403) {
          throw new Error('Invalid API key or access denied. Check VITE_GEMINI_API_KEY in .env');
        }
        if (response.status === 404) {
          throw new Error('Model endpoint not found. Please verify API key and model availability.');
        }
        if (response.status === 400) {
          throw new Error(`Bad request: ${errorData.error?.message || 'Check your query format'}`);
        }
        throw new Error(`vGe API: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]) {
        console.error('Invalid response structure:', data);
        throw new Error('No response from vGe model');
      }

      const candidate = data.candidates[0];
      
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
        throw new Error('Response blocked by safety filters. Try a different question.');
      }

      if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
        console.error('Invalid content structure:', data);
        throw new Error('Invalid response format from vGe');
      }

      const generatedText = candidate.content.parts[0].text;
      
      if (!generatedText || generatedText.trim() === '') {
        throw new Error('Empty response from vGe');
      }

      return this.enhanceResponse(generatedText, detectedLanguage);

    } catch (error) {
      console.error('Fetch error vGe:', error);
      if (error.message.includes('fetch') || error.message.includes('Network')) {
        throw new Error('Internet connection problem. Check your connection.');
      }
      throw error;
    }
  }

  detectLanguage(text) {
    const ukrainianChars = /[і—"']/i;
    const russianChars = /[ы]/i;
    
    if (ukrainianChars.test(text)) return 'ukrainian';
    if (russianChars.test(text)) return 'russian';
    
    return 'english';
  }

  enhanceResponse(response, language) {
    const signature = `\n\n---\nFrom Atticus, AI Advisor for Human Rights\nNote: Artificial intelligence may make mistakes. Verify information in official sources.`;

    return response + signature;
  }

  async testAPI() {
    console.log(`🧪 Testing ${this.name} vGe AI...`);
    const testMessage = "What to do if police detained illegally? Provide law references.";
    
    try {
      const result = await this.generateResponse(testMessage);
      
      return {
        success: true,
        advisor: this.name,
        service: 'vGe API',
        model: 'gemini-2.0-flash',
        testMessage,
        response: result,
        responseTime: this.lastResponseTime,
        apiCalls: this.apiCalls,
        features: [
          'Multilingual responses',
          'Law article references',
          'ECHR case citations', 
          'Practical legal advice',
          'Constitutional references'
        ],
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        advisor: this.name, 
        service: 'vGe API',
        model: 'gemini-2.0-flash',
        testMessage,
        error: error.message,
        apiCalls: this.apiCalls,
        timestamp: new Date().toISOString()
      };
    }
  }

  getStatus() {
    return {
      isInitialized: true,
      advisor: this.name,
      service: 'vGe API - Human Rights Advisor',
      model: 'gemini-2.0-flash',
      apiCalls: this.apiCalls,
      lastResponseTime: this.lastResponseTime,
      status: 'ready',
      features: [
        'Multilingual support (responds in user language)',
        'Constitutional law references',
        'International human rights law', 
        'ECHR case law citations',
        'Practical legal guidance',
        'Specific article references'
      ],
      note: 'Atticus - your assistant in human rights protection with vGe'
    };
  }

  async getLawReference(lawName, article) {
    const query = `Provide accurate information about ${lawName} article ${article} with references to related norms`;
    return await this.generateResponse(query);
  }
}

export const geminiAIService = new GeminiAIService();

if (typeof window !== 'undefined') {
  window.geminiAIService = geminiAIService;
  console.log(`🧠 ${geminiAIService.name} vGe AI Advisor ready!`);
}