// src/utils/api-ai.js — Atticus AI ADVISOR FOR HUMAN RIGHTS

class ApiAIService {
  constructor() {
    this.isInitialized = true;
    this.apiCalls = 0;
    this.lastResponseTime = null;
    this.name = "Atticus";
  }

  async generateResponse(userMessage) {
    try {
      console.log(`🧠 ${this.name} AI Request #${this.apiCalls + 1}:`, userMessage);
      
      const startTime = Date.now();
      const response = await this.callGroqAPI(userMessage);
      const endTime = Date.now();
      
      this.lastResponseTime = endTime - startTime;
      this.apiCalls++;
      
      console.log(`✅ ${this.name} Success: ${this.lastResponseTime}ms`);
      return response;
      
    } catch (error) {
      console.error(`❌ ${this.name} Error:`, error);
      throw new Error(`AI Service: ${error.message}`);
    }
  }

  async callGroqAPI(message) {
    const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      throw new Error('Groq API key not found. Add VITE_GROQ_API_KEY to .env');
    }

    // Detect query language
    const detectedLanguage = this.detectLanguage(message);
    
    const systemPrompt = `You are Atticus — male-gendered AI human rights advisor. You respond in the language the user uses. Your key features:

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

Always provide specific articles, case numbers, and practical steps!`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user', 
              content: message
            }
          ],
          max_tokens: 1500,
          temperature: 0.3,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq error:', response.status, errorText);
        if (response.status === 429) {
          throw new Error('Too many requests. Wait 1 minute (Groq free tier limit).');
        }
        if (response.status === 401) {
          throw new Error('Invalid API key. Check VITE_GROQ_API_KEY.');
        }
        throw new Error(`Server responded: ${response.status} - Please try again.`);
      }

      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || '';

      if (!generatedText) {
        throw new Error('Empty response from model');
      }

      return this.enhanceResponse(generatedText, detectedLanguage);

    } catch (error) {
      console.error('Fetch error:', error);
      if (error.message.includes('fetch')) {
        throw new Error('Connection problem. Check your internet.');
      }
      throw error;
    }
  }

  detectLanguage(text) {
    const englishChars = /[qwx]/i;
    
    if (englishChars.test(text)) return 'en';
    
    // Default to English if cannot detect
    return 'en';
  }

  enhanceResponse(response, language) {
    const signature = `\n\n---\nFrom Atticus, AI Advisor for Human Rights\nNote: Artificial intelligence may make mistakes`;

    // Add signature according to language
    return response + signature;
  }

  // Improved test function
  async testAPI() {
    console.log(`🧪 Testing ${this.name} AI Advisor...`);
    const testMessage = "What to do if police detained illegally? Provide law references.";
    
    try {
      const result = await this.generateResponse(testMessage);
      
      return {
        success: true,
        advisor: this.name,
        testMessage,
        response: result,
        responseTime: this.lastResponseTime,
        apiCalls: this.apiCalls,
        service: 'Groq API',
        model: 'llama-3.1-8b-instant',
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
        testMessage,
        error: error.message,
        apiCalls: this.apiCalls,
        service: 'Groq API',
        timestamp: new Date().toISOString()
      };
    }
  }

  getStatus() {
    return {
      isInitialized: true,
      advisor: this.name,
      service: 'Groq API - Powerful Human Rights Advisor',
      model: 'llama-3.1-8b-instant',
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
      note: 'Atticus - your assistant in human rights protection'
    };
  }

  // Additional method for getting information about specific laws
  async getLawReference(lawName, article) {
    const query = `Provide accurate information about ${lawName} article ${article} with references to related norms`;
    return await this.generateResponse(query);
  }
}

export const apiAIService = new ApiAIService();

// For debugging
if (typeof window !== 'undefined') {
  window.apiAIService = apiAIService;
  window.AtticusAI = apiAIService; // Alternative name for convenience
  console.log(`🧠 ${apiAIService.name} AI Advisor ready! Try:`);
  console.log('• window.AtticusAI.testAPI() - for testing');
  console.log('• window.AtticusAI.getLawReference("Criminal Code", "127") - to get article info');
  console.log('• window.AtticusAI.getStatus() - to view status');
}