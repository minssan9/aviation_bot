const Anthropic = require('@anthropic-ai/sdk');

class AnthropicProvider {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
  }

  async generateQuiz(topic, knowledgeArea, messageGenerator = null) {
    try {
      let prompt;
      
      if (messageGenerator && typeof messageGenerator.generateQuizPrompt === 'function') {
        prompt = messageGenerator.generateQuizPrompt(knowledgeArea);
      } else {
        // Fallback prompt if MessageGenerator is not available
        prompt = `항공 전문가로서 "${knowledgeArea}" 주제에 대한 상세한 4지 선다 문제를 1개 만들어 주세요.

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
      }

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Anthropic API 호출 오류:', error);
      throw error;
    }
  }

  async isAvailable() {
    try {
      await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
      return true;
    } catch (error) {
      console.error('Anthropic API 연결 실패:', error);
      return false;
    }
  }
}

module.exports = AnthropicProvider;