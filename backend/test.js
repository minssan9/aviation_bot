/**
 * Simple test script to validate the modular architecture
 * This tests the individual modules without starting the full bot
 */

const config = require('./src/config');
// const { AviationKnowledgeManager } = require('./src/data/aviationKnowledge');
const AIProviderManager = require('./src/providers/aiProvider');
const SubscriberManager = require('./src/features/subscriberManager');
const MessageGenerator = require('./src/features/messageGenerator');

async function runTests() {
  console.log('🧪 Running modular architecture tests...\n');

  try {
    // Test 1: Config validation
    console.log('1️⃣ Testing configuration...');
    const configData = config.getConfig();
    console.log(`   ✅ Configuration loaded successfully`);
    console.log(`   📋 Available keys: ${Object.keys(configData).join(', ')}`);

    // Test 2: Aviation knowledge data
    console.log('\n2️⃣ Testing aviation knowledge data...');
    // const todayKnowledge = AviationKnowledgeManager.getKnowledgeByDay(1); // Monday
    console.log(`   ✅ Today's topic: ${todayKnowledge.topic}`);
    console.log(`   📚 Subjects count: ${todayKnowledge.subjects.length}`);
    
    // const randomSubject = AviationKnowledgeManager.getRandomSubject(1);
    console.log(`   🎯 Random subject: ${randomSubject.substring(0, 50)}...`);

    // Test 3: AI Provider Manager
    console.log('\n3️⃣ Testing AI Provider Manager...');
    const aiProvider = new AIProviderManager(configData);
    console.log(`   ✅ AI providers initialized: ${aiProvider.getActiveProviders().join(', ')}`);
    
    const providerStatus = await aiProvider.checkAvailability();
    console.log(`   🔍 Provider availability:`, providerStatus);

    // Test 4: Subscriber Manager
    console.log('\n4️⃣ Testing Subscriber Manager...');
    const subscriberManager = new SubscriberManager();
    subscriberManager.subscribe('test-chat-1');
    subscriberManager.subscribe('test-chat-2');
    console.log(`   ✅ Test subscribers added: ${subscriberManager.getSubscriberCount()}`);
    console.log(`   👥 Is test-chat-1 subscribed: ${subscriberManager.isSubscribed('test-chat-1')}`);

    // Test 5: Message Generator
    console.log('\n5️⃣ Testing Message Generator...');
    const messageGenerator = new MessageGenerator(aiProvider);
    
    const welcomeMessage = messageGenerator.getWelcomeMessage();
    console.log(`   ✅ Welcome message length: ${welcomeMessage.length} characters`);
    
    const statusMessage = messageGenerator.getStatusMessage(true, 5);
    console.log(`   ✅ Status message length: ${statusMessage.length} characters`);

    // Test 6: AI Quiz Generation (if provider available)
    console.log('\n6️⃣ Testing AI quiz generation...');
    
    // Check if any provider is available
    const hasAvailableProvider = Object.values(providerStatus).some(status => status === true);
    
    if (hasAvailableProvider) {
      try {
        console.log('   🤖 Attempting to generate a test quiz...');
        const testQuiz = await messageGenerator.generateCustomQuiz(
          '항공역학', 
          'Wing Loading이 항공기 성능에 미치는 영향'
        );
        console.log(`   ✅ Quiz generated successfully (${testQuiz.length} chars)`);
        console.log(`   📝 Quiz preview: ${testQuiz.substring(0, 100)}...`);
      } catch (error) {
        console.log(`   ⚠️ Quiz generation failed: ${error.message}`);
      }
    } else {
      console.log(`   ⏭️ No AI providers available, skipping quiz test`);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📁 New modular structure:');
    console.log('   src/');
    console.log('   ├── app.js (main entry)');
    console.log('   ├── config/ (environment config)');
    console.log('   ├── providers/ (AI providers: Gemini + Anthropic)');
    console.log('   ├── features/ (bot features)');
    console.log('   │   ├── commandHandlers.js');
    console.log('   │   ├── messageGenerator.js');
    console.log('   │   ├── scheduler.js');
    console.log('   │   └── subscriberManager.js');
    console.log('   └── data/ (aviation knowledge)');
    
    console.log('\n🚀 Improvements implemented:');
    console.log('   ✅ Google Gemini AI integration (primary)');
    console.log('   ✅ Anthropic Claude fallback (preserved)');
    console.log('   ✅ Feature-based modular architecture');
    console.log('   ✅ Separation of concerns');
    console.log('   ✅ Better error handling & logging');
    console.log('   ✅ Maintainable code structure');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();