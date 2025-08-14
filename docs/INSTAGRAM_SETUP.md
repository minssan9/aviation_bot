# Instagram API 설정 가이드

Instagram Graph API를 사용하여 Reels 자동화를 설정하는 방법을 안내합니다.

## 개요

Instagram Graph API를 통해 Reels를 자동으로 게시하기 위해서는 다음이 필요합니다:
1. **Facebook 개발자 계정**
2. **Facebook 앱 생성**
3. **Instagram 비즈니스 계정**
4. **Facebook 페이지와 Instagram 계정 연결**
5. **Access Token 및 Page ID 획득**

## 1단계: Facebook 개발자 계정 생성

### 1.1 Facebook for Developers 접속
1. [Facebook for Developers](https://developers.facebook.com/) 웹사이트 접속
2. 개인 Facebook 계정으로 로그인
3. 우상단 "내 앱" 클릭

### 1.2 개발자 계정 등록
1. 처음 접속 시 개발자 등록 절차 진행
2. 이메일 주소 확인
3. 개발자 정책 동의

## 2단계: Facebook 앱 생성

### 2.1 새 앱 만들기
1. "앱 만들기" 버튼 클릭
2. **앱 유형 선택**: "기타" 선택
3. **앱 이름 입력**: 예) "English Learning Bot"
4. **앱 목적**: "개인용" 또는 "비즈니스용" 선택
5. 앱 생성 완료

### 2.2 필요한 제품 추가
앱 대시보드에서 다음 제품들을 추가:

#### Instagram Graph API
1. 좌측 메뉴에서 "제품 추가" 클릭
2. **Instagram Graph API** 찾기
3. "설정" 버튼 클릭
4. 기본 설정 완료

#### Facebook 로그인
1. **Facebook 로그인** 제품도 추가
2. 설정에서 다음 권한 활성화:
   - `pages_show_list`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_content_publish`

## 3단계: Instagram 비즈니스 계정 설정

### 3.1 Instagram 계정을 비즈니스 계정으로 전환
1. Instagram 앱에서 설정 → 계정 → 전문 계정으로 전환
2. **비즈니스** 계정 선택
3. 카테고리 선택 (예: 교육)
4. 연락처 정보 입력

### 3.2 Facebook 페이지 생성 (없는 경우)
1. [Facebook](https://facebook.com) 접속
2. 좌측 메뉴에서 "페이지" 클릭
3. "새 페이지 만들기" 클릭
4. 페이지 이름 입력 (예: "English Learning with Bot")
5. 카테고리: "교육 웹사이트" 선택

### 3.3 Instagram과 Facebook 페이지 연결
1. Facebook 페이지 → 설정 → Instagram
2. "계정 연결" 클릭
3. Instagram 계정 정보 입력
4. 연결 확인

## 4단계: Access Token 생성

### 4.1 Graph API Explorer 사용
1. [Graph API Explorer](https://developers.facebook.com/tools/explorer/) 접속
2. 생성한 앱 선택
3. "Generate Access Token" 클릭

### 4.2 권한 설정
다음 권한들을 선택:
- `pages_show_list`
- `pages_read_engagement` 
- `instagram_basic`
- `instagram_content_publish`

### 4.3 장기 토큰 생성
```bash
# 단기 토큰을 장기 토큰으로 교환
curl -X GET "https://graph.facebook.com/v21.0/oauth/access_token" \
  -d "grant_type=fb_exchange_token" \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_APP_SECRET" \
  -d "fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

응답 예시:
```json
{
  "access_token": "장기_액세스_토큰",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

## 5단계: Page ID 확인

### 5.1 연결된 페이지 조회
```bash
curl -X GET "https://graph.facebook.com/v21.0/me/accounts" \
  -d "access_token=YOUR_LONG_LIVED_TOKEN"
```

응답에서 `id` 값이 Page ID입니다:
```json
{
  "data": [
    {
      "access_token": "페이지_액세스_토큰",
      "category": "Education Website",
      "category_list": [...],
      "name": "English Learning with Bot",
      "id": "YOUR_PAGE_ID",
      "tasks": ["ANALYZE", "ADVERTISE", "MODERATE", "CREATE_CONTENT", "MANAGE"]
    }
  ]
}
```

### 5.2 Instagram Business Account ID 확인
```bash
curl -X GET "https://graph.facebook.com/v21.0/YOUR_PAGE_ID" \
  -d "fields=instagram_business_account" \
  -d "access_token=YOUR_LONG_LIVED_TOKEN"
```

## 6단계: 환경 변수 설정

### 6.1 .env 파일 업데이트
```bash
# Instagram Reels Configuration
INSTAGRAM_ACCESS_TOKEN=YOUR_LONG_LIVED_PAGE_ACCESS_TOKEN
INSTAGRAM_PAGE_ID=YOUR_PAGE_ID

# Facebook App Credentials (optional, for token refresh)
FACEBOOK_APP_ID=YOUR_APP_ID
FACEBOOK_APP_SECRET=YOUR_APP_SECRET
```

### 6.2 설정 검증
```bash
# 봇 실행 후 관리 인터페이스에서 검증
curl -X GET "http://localhost:3000/api/reels/validate"
```

## 7단계: 권한 및 검토

### 7.1 앱 검토 (프로덕션용)
개발 환경에서는 검토 없이 사용 가능하지만, 프로덕션에서는 Facebook 앱 검토가 필요합니다.

**필요한 권한:**
- `pages_show_list` - 기본 권한
- `pages_read_engagement` - 페이지 인사이트
- `instagram_basic` - 기본 Instagram 정보
- `instagram_content_publish` - 콘텐츠 게시

### 7.2 검토 신청 절차
1. Facebook 개발자 콘솔 → 앱 검토
2. 권한별 사용 사례 설명 작성
3. 스크린 레코딩 또는 스크린샷 제출
4. 검토 신청 (통상 3-7일 소요)

## 문제 해결

### 일반적인 오류

#### 1. 토큰 만료 오류
```json
{
  "error": {
    "message": "Error validating access token",
    "type": "OAuthException",
    "code": 190
  }
}
```
**해결**: 새로운 장기 토큰 생성

#### 2. 권한 부족 오류
```json
{
  "error": {
    "message": "Insufficient permissions",
    "type": "OAuthException", 
    "code": 200
  }
}
```
**해결**: 필요한 권한 추가 후 새 토큰 생성

#### 3. Instagram 계정 연결 오류
```json
{
  "error": {
    "message": "Instagram account not connected",
    "type": "OAuthException",
    "code": 100
  }
}
```
**해결**: Facebook 페이지와 Instagram 계정 재연결

### 토큰 갱신 자동화

#### 무한 토큰 (Never-expiring token)
특정 조건에서 무한 토큰 생성 가능:
1. 시스템 사용자 (System User) 생성
2. 비즈니스 매니저 계정 필요
3. 고급 설정 - 프로덕션 환경에서 권장

```bash
# 시스템 사용자 토큰 생성 예시
curl -X POST "https://graph.facebook.com/v21.0/YOUR_BUSINESS_ID/system_users" \
  -d "name=ReelsBot" \
  -d "role=ADMIN" \
  -d "access_token=YOUR_BUSINESS_TOKEN"
```

## 테스트 및 검증

### 기본 연결 테스트
```bash
# 1. 기본 계정 정보 확인
curl -X GET "https://graph.facebook.com/v21.0/me?access_token=YOUR_TOKEN"

# 2. 페이지 정보 확인  
curl -X GET "https://graph.facebook.com/v21.0/YOUR_PAGE_ID?access_token=YOUR_TOKEN"

# 3. Instagram 계정 확인
curl -X GET "https://graph.facebook.com/v21.0/YOUR_PAGE_ID/instagram_business_account?access_token=YOUR_TOKEN"
```

### 미디어 업로드 테스트
```bash
# 이미지 컨테이너 생성 테스트
curl -X POST "https://graph.facebook.com/v21.0/YOUR_PAGE_ID/media" \
  -F "image_url=https://example.com/test.jpg" \
  -F "caption=Test post" \
  -F "access_token=YOUR_TOKEN"
```

## 보안 모범 사례

### 1. Access Token 보안
- `.env` 파일을 버전 관리에서 제외
- 프로덕션에서는 환경 변수 또는 보안 저장소 사용
- 토큰 주기적 갱신 (60일마다 권장)

### 2. API 사용량 모니터링
- Graph API 호출 제한 모니터링
- 오류율 추적 및 알림 설정
- 사용량 통계 정기 검토

### 3. 계정 보안
- 2단계 인증 활성화
- 비즈니스 계정 액세스 권한 관리
- 정기적인 권한 검토

## 추가 리소스

### 공식 문서
- [Instagram Graph API 공식 문서](https://developers.facebook.com/docs/instagram-api/)
- [Facebook 로그인 가이드](https://developers.facebook.com/docs/facebook-login/)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)

### 유용한 도구
- [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
- [Facebook 앱 대시보드](https://developers.facebook.com/apps/)
- [비즈니스 설정](https://business.facebook.com/settings/)

### 지원 및 커뮤니티
- [Facebook 개발자 커뮤니티](https://developers.facebook.com/community/)
- [Facebook 개발자 지원](https://developers.facebook.com/support/)
- [Instagram 파트너 프로그램](https://business.instagram.com/partners/)

---

**주의사항**: 
- Instagram API는 비즈니스 계정에서만 사용 가능
- 일일 API 호출 제한 존재 (기본 200회/시간)
- 콘텐츠 정책 및 커뮤니티 가이드라인 준수 필수
- 개발 환경에서는 앱 소유자 및 테스터만 API 사용 가능

**업데이트**: 2025-01-27  
**API 버전**: Graph API v21.0