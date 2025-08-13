const SimpleWeatherService = require('./src/services/simpleWeatherService');

async function testSimpleWeatherService() {
  console.log('🧪 SimpleWeatherService 테스트 시작\n');
  
  const weatherService = new SimpleWeatherService();
  
  try {
    // 1. 서비스 초기화
    console.log('1️⃣ 서비스 초기화...');
    await weatherService.initialize();
    console.log('✅ 초기화 완료\n');
    
    // 2. API 상태 확인
    console.log('2️⃣ API 상태 확인...');
    const status = await weatherService.getStatus();
    console.log('📊 상태 정보:', JSON.stringify(status, null, 2));
    console.log('✅ 상태 확인 완료\n');
    
    // 3. 최신 이미지 URL 가져오기
    console.log('3️⃣ 최신 이미지 URL 조회...');
    const imageInfo = await weatherService.getLatestImageUrl();
    console.log('📸 이미지 정보:', JSON.stringify(imageInfo, null, 2));
    console.log('✅ URL 조회 완료\n');
    
    // 4. 이미지 다운로드
    if (imageInfo.success) {
      console.log('4️⃣ 이미지 다운로드...');
      const result = await weatherService.downloadImage();
      console.log('📥 다운로드 결과:', JSON.stringify(result, null, 2));
      console.log('✅ 다운로드 완료\n');
    } else {
      console.log('❌ 이미지 URL 조회 실패로 다운로드 건너뜀\n');
    }
    
    // 5. 저장된 이미지 목록
    console.log('5️⃣ 저장된 이미지 목록...');
    const images = await weatherService.getStoredImages(5);
    console.log('📁 저장된 이미지들:');
    images.forEach((img, index) => {
      const sizeKB = (img.size / 1024).toFixed(1);
      console.log(`  ${index + 1}. ${img.filename} (${sizeKB}KB)`);
    });
    console.log('✅ 목록 조회 완료\n');
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
  
  console.log('🏁 테스트 완료');
}

// 테스트 실행
testSimpleWeatherService().catch(console.error); 