const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiProvider {
  constructor(apiKey) {
    this.client = new GoogleGenerativeAI(apiKey);
    // Updated model names - using most stable and widely available models
    this.modelNames = [
      'gemini-pro',
      'gemini-1.0-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b'
    ];
    this.model = null;
    this.initialized = false;
  }

  async initializeModel() {
    if (this.initialized) {
      return;
    }

    // Try different API versions and model combinations
    const apiVersions = ['v1', 'v1beta'];
    const modelNames = this.modelNames;

    for (const apiVersion of apiVersions) {
      for (const modelName of modelNames) {
        try {
          console.log(`🔍 Trying ${modelName} with API version ${apiVersion}...`);
          this.model = this.client.getGenerativeModel(
            { model: modelName }, 
            { apiVersion: apiVersion }
          );
          // Test if the model works with a simple request
          const testResult = await this.model.generateContent('Hello');
          await testResult.response;
          console.log(`✅ Successfully initialized Gemini with model: ${modelName} (API: ${apiVersion})`);
          this.initialized = true;
          return;
        } catch (error) {
          console.log(`⚠️ Model ${modelName} with API ${apiVersion} not available: ${error.message}`);
          continue;
        }
      }
    }
    throw new Error('No available Gemini models found. Please check your API key and model availability.');
  }

  async generateQuiz(topic, knowledgeArea) {
    try {
      // Ensure model is initialized
      if (!this.initialized) {
        await this.initializeModel();
      }

      const prompt = `항공 전문가로서 "${knowledgeArea}" 주제에 대한 상세한 4지 선다 문제를 1개 만들어 주세요.

요구사항:
1. 문제는 사업용 조종사 수준의 전문적인 내용
2. 4개의 선택지 (A, B, C, D)와 명확한 정답 1개
3. 각 선택지는 현실적이고 그럴듯한 내용
4. 정답 해설도 포함
5. 실무에 적용 가능한 실용적 내용

다음 형식으로 답변해 주세요:
**문제:**
[문제 내용]

**선택지:**
A) [선택지 1]
B) [선택지 2] 
C) [선택지 3]
D) [선택지 4]

**정답:** [정답 번호]

**해설:**
[정답 해설 및 추가 설명]`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API 호출 오류:', error);
      throw error;
    }
  }

  async isAvailable() {
    try {
      // Ensure model is initialized
      if (!this.initialized) {
        await this.initializeModel();
      }
      const testResult = await this.model.generateContent('test');
      await testResult.response;
      return true;
    } catch (error) {
      console.error('Gemini API 연결 실패:', error.message);
      return false;
    }
  }

  async listAvailableModels() {
    try {
      const models = await this.client.listModels();
      console.log('Available Gemini models:', models);
      return models;
    } catch (error) {
      console.error('Failed to list models:', error.message);
      return [];
    }
  }
}

module.exports = GeminiProvider;