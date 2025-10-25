const { GoogleGenAI } = require('@google/genai');

class GoogleAIStudioProvider {
  constructor(apiKey) {
    // 환경 변수에서 API 키를 자동으로 가져오거나 전달된 키 사용
    this.client = new GoogleGenAI({ apiKey });
    // Google AI Studio에서 사용 가능한 모델들 (최신 모델명)
    this.modelNames = [
      'gemini-2.5-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro'
    ];
    this.model = null;
    this.initialized = false;
  }

  async initializeModel() {
    if (this.initialized) {
      return;
    }

    // Google AI Studio에서 사용 가능한 모델들을 순차적으로 시도
    for (const modelName of this.modelNames) {
      try {
        console.log(`🔍 Trying Google AI Studio with model: ${modelName}...`);
        
        // 새로운 SDK 방식으로 모델 테스트
        const testResult = await this.client.models.generateContent({
          model: modelName,
          contents: 'Hello'
        });
        
        console.log(`✅ Successfully initialized Google AI Studio with model: ${modelName}`);
        this.model = modelName; // 모델명 저장
        this.initialized = true;
        return;
      } catch (error) {
        console.log(`⚠️ Model ${modelName} not available: ${error.message}`);
        continue;
      }
    }
    
    throw new Error('No available Google AI Studio models found. Please check your API key and model availability.');
  }

  async generateQuiz(topic, knowledgeArea) {
    try {
      // 모델이 초기화되지 않았다면 초기화
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

      const result = await this.client.models.generateContent({
        model: this.model,
        contents: prompt
      });
      return result.text;
    } catch (error) {
      console.error('Google AI Studio API 호출 오류:', error);
      throw error;
    }
  }

  async isAvailable() {
    try {
      // 모델이 초기화되지 않았다면 초기화
      if (!this.initialized) {
        await this.initializeModel();
      }
      const testResult = await this.client.models.generateContent({
        model: this.model,
        contents: 'test'
      });
      return true;
    } catch (error) {
      console.error('Google AI Studio API 연결 실패:', error.message);
      return false;
    }
  }

  async listAvailableModels() {
    try {
      // Google AI Studio에서는 listModels API가 없으므로 지원하는 모델 목록 반환
      console.log('Available Google AI Studio models:', this.modelNames);
      return this.modelNames;
    } catch (error) {
      console.error('Failed to list models:', error.message);
      return this.modelNames;
    }
  }
}

module.exports = GoogleAIStudioProvider;
