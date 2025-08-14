const GeminiProvider = require('../providers/gemini');

class EnglishContentService {
  constructor(config) {
    this.geminiProvider = new GeminiProvider(config.GEMINI_API_KEY);
    this.wordBank = this._initializeWordBank();
  }

  async generateDailyContent() {
    try {
      const todayWord = this._getTodayWord();
      const prompt = this._buildPrompt(todayWord);
      
      console.log('🎯 Generating content for word:', todayWord);
      
      const content = await this.geminiProvider.generateContent(prompt);
      
      // Validate content structure
      if (!this._validateContent(content)) {
        throw new Error('Generated content does not match required format');
      }
      
      console.log('✅ Content generated successfully');
      return {
        word: todayWord,
        content: content,
        generatedAt: new Date().toISOString(),
        hashtags: this._extractHashtags(content)
      };
    } catch (error) {
      console.error('❌ Failed to generate daily content:', error);
      throw error;
    }
  }

  async generateContent(word) {
    try {
      const prompt = this._buildPrompt(word);
      
      console.log('🎯 Generating content for custom word:', word);
      
      const content = await this.geminiProvider.generateContent(prompt);
      
      if (!this._validateContent(content)) {
        throw new Error('Generated content does not match required format');
      }
      
      console.log('✅ Custom content generated successfully');
      return {
        word: word,
        content: content,
        generatedAt: new Date().toISOString(),
        hashtags: this._extractHashtags(content)
      };
    } catch (error) {
      console.error('❌ Failed to generate custom content:', error);
      throw error;
    }
  }

  _getTodayWord() {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const wordIndex = dayOfYear % this.wordBank.length;
    return this.wordBank[wordIndex];
  }

  _buildPrompt(word) {
    return `너는 한국인 학생을 가르치는 영어교사야. 오늘의 단어는 "${word}"야. 이 단어의 정의를 간단하게 설명해줘. 그리고 이 단어를 일상생활에서 어떻게 쓰면 좋을지 영어 예문도 2개 만들어줘.

출력할때 아래 주의사항을 지켜줘.

#주의사항
- 마크다운 용법 제거할것 
- 단어의 발음기호 찾아서 넣어줘
- 제목과 설명은 문단을 분리할 것 
- 제목 앞에는 줄바꿈 한 줄 추가
- 제목은 단어만 표기해줘
- 문장끝마다 반드시 어울리는 이모지를 한개 이상 넣어 이해를 도울것
- 격식을 갖춰 신뢰할 수 있는 내용처럼 보일 것 
- 모든 영어는 cefr a2수준으로 영어를 배우는 초급단계인 한국인 학생이 90%이상 이해할 수준이어야 함 
- 오늘의 단어를 포함한 한글로 된 예문을 먼저 제공해주고 어떻게 말하면 될지 원어민이 쓸만한 영어 문장을 아래에 따로 알려줘, '어떻게 말하면 될까요?' 라는 문구 추가해줘

- 마지막에 이 문구를 추가해줘 '
https://en9door.com 
#영어문 #전화영어 #영어회화 #화상영어 #원어민 #여행
'

- 내용은 아래와 같은 포맷 맞춰줘
'
coruscate

[ˈkɔːrəskeɪt]

Coruscate는 밝게 빛나거나 반짝이는 것을 의미합니다. ✨

그의 옷은 파티에서 반짝였어요. 💃  
호수 위에 달빛이 반짝였어요. 🌙

어떻게 말하면 될까요?

His clothes coruscate at the party. 🎉  
The moonlight coruscates on the lake. 🌕✨

https://en9door.com 
#영어문 #전화영어 #영어회화 #화상영어 #원어민 #여행
'`;
  }

  _validateContent(content) {
    const requiredElements = [
      '어떻게 말하면 될까요?',
      'https://en9door.com',
      '#영어문',
      '#전화영어',
      '#영어회화'
    ];
    
    return requiredElements.every(element => content.includes(element));
  }

  _extractHashtags(content) {
    const hashtagRegex = /#[\w가-힣]+/g;
    const matches = content.match(hashtagRegex);
    return matches || [];
  }

  _initializeWordBank() {
    // Curated word bank for daily content generation
    return [
      // Level A2 vocabulary suitable for Korean learners
      'achieve', 'adventure', 'amazing', 'appreciate', 'brilliant',
      'celebrate', 'challenge', 'comfortable', 'confident', 'creative',
      'delicious', 'determine', 'discover', 'encourage', 'enthusiastic',
      'excellent', 'exciting', 'experience', 'explore', 'fantastic',
      'generous', 'grateful', 'happiness', 'imagine', 'important',
      'incredible', 'inspire', 'interesting', 'journey', 'knowledge',
      'laughter', 'magnificent', 'marvelous', 'opportunity', 'positive',
      'precious', 'recommend', 'remember', 'responsible', 'satisfied',
      'successful', 'talented', 'terrific', 'treasure', 'understand',
      'valuable', 'wonderful', 'accompany', 'accurate', 'balance',
      'benefit', 'breathe', 'capture', 'curious', 'develop',
      'efficient', 'emotion', 'enhance', 'establish', 'freedom',
      'genuine', 'grateful', 'harmony', 'influence', 'knowledge',
      'liberty', 'maintain', 'natural', 'observe', 'passion',
      'quality', 'reliable', 'serious', 'tradition', 'unique',
      'variety', 'wisdom', 'accomplish', 'attention', 'behavior',
      'complete', 'decision', 'element', 'familiar', 'general',
      'however', 'identify', 'justify', 'language', 'material',
      'necessary', 'obvious', 'pattern', 'question', 'require',
      'similar', 'typical', 'unusual', 'various', 'welcome',
      // Additional words for more variety
      'abundant', 'acquire', 'admire', 'analyze', 'announce',
      'approach', 'arrange', 'assist', 'attempt', 'attract',
      'avoid', 'aware', 'behalf', 'belong', 'benefit',
      'border', 'budget', 'capacity', 'career', 'casual',
      'category', 'cause', 'century', 'certain', 'choice',
      'citizen', 'climate', 'collect', 'combine', 'comment',
      'commit', 'common', 'compare', 'compete', 'complain',
      'complex', 'concept', 'concern', 'conduct', 'confirm',
      'connect', 'consider', 'consist', 'constant', 'contain',
      'content', 'contest', 'context', 'continue', 'contract',
      'control', 'convert', 'correct', 'create', 'culture',
      'current', 'custom', 'damage', 'debate', 'decline',
      'decrease', 'define', 'deliver', 'demand', 'depend',
      'describe', 'design', 'desire', 'detail', 'detect',
      'device', 'differ', 'direct', 'discuss', 'display',
      'divide', 'document', 'donate', 'download', 'drama'
    ];
  }
}

module.exports = EnglishContentService;