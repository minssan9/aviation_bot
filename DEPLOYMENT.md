# Aviation Bot 배포 가이드

## 개요

이 프로젝트는 Digital Ocean에 배포되며, nginx를 리버스 프록시 게이트웨이로 사용하여 여러 도메인을 처리합니다.

## 아키텍처

```
Internet
    │
    ├── aviation-bott.com (HTTPS)
    │   └── Nginx Gateway (Port 443)
    │       └── Aviation Bot App (Port 3010)
    │           ├── Telegram Bot Service
    │           ├── Admin Server (Port 3011)
    │           └── Scheduler
    │
    ├── en9door.com (HTTPS)
    │   └── Nginx Gateway (Port 443)
    │       └── En9door App (Port TBD)
    │
    └── workschd.com (HTTPS)
        └── Nginx Gateway (Port 443)
            └── Work Schedule App (Port TBD)
```

## 사전 요구사항

### 1. Digital Ocean 설정

- Droplet 생성 (Ubuntu 22.04 LTS 권장)
- 최소 2GB RAM, 2 vCPU
- 도메인 DNS 설정:
  - `aviation-bott.com` → Droplet IP
  - `en9door.com` → Droplet IP
  - `workschd.com` → Droplet IP

### 2. GitHub Secrets 설정

Repository Settings → Secrets에 다음 값 추가:

```
DROPLET_HOST: Digital Ocean Droplet IP 주소
DROPLET_USERNAME: SSH 사용자명 (일반적으로 'root')
DROPLET_KEY: SSH 개인키
BOT_TOKEN: Telegram Bot Token
GEMINI_API_KEY: Google Gemini API Key
CLAUDE_API_KEY: Anthropic Claude API Key
DB_HOST: 데이터베이스 호스트
DB_USER: 데이터베이스 사용자
DB_PASSWORD: 데이터베이스 비밀번호
DB_NAME: 데이터베이스 이름
```

### 3. 서버 초기 설정

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose 설치
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 프로젝트 디렉토리 생성
sudo mkdir -p /data/devops
cd /data/devops

# Git 저장소 클론
git clone https://github.com/YOUR_USERNAME/aviation_bot.git
cd aviation_bot

# .env 파일 생성
cp .env.example /data/devops/.env
# .env 파일 편집하여 환경 변수 설정
```

## SSL 인증서 설정

### Let's Encrypt 인증서 발급

```bash
# Certbot 설치
sudo apt-get install certbot

# 인증서 발급 (aviation-bott.com)
sudo certbot certonly --standalone \
  -d aviation-bott.com \
  -d www.aviation-bott.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# 인증서 발급 (en9door.com)
sudo certbot certonly --standalone \
  -d en9door.com \
  -d www.en9door.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# 인증서 발급 (workschd.com)
sudo certbot certonly --standalone \
  -d workschd.com \
  -d www.workschd.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# 자동 갱신 설정
sudo certbot renew --dry-run
```

인증서는 `/etc/letsencrypt/live/` 디렉토리에 저장됩니다.

## 배포 방법

### 자동 배포 (GitHub Actions)

main 브랜치에 푸시하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "feat: update application"
git push origin main
```

GitHub Actions 워크플로우가:
1. 코드 테스트
2. Docker 이미지 빌드
3. GitHub Container Registry에 푸시
4. Digital Ocean 서버에 배포

### 수동 배포

서버에 SSH 접속 후:

```bash
cd /data/devops/aviation_bot

# 최신 코드 가져오기
git pull origin main

# 최신 이미지 가져오기
docker pull ghcr.io/YOUR_USERNAME/aviation_bot:latest

# 배포
cd deployment
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build nginx-gateway
docker-compose -f docker-compose.prod.yml up -d

# 상태 확인
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

## 배치 관리

관리자 페이지 (https://aviation-bott.com/batch)에서 다음 배치 작업을 제어할 수 있습니다:

- **아침 알림** (9:00 AM KST): 항공 지식 발송
- **오후 알림** (2:00 PM KST): 항공 지식 발송
- **저녁 알림** (8:00 PM KST): 항공 지식 발송
- **날씨 이미지 수집** (10분마다): 위성 이미지 자동 수집
- **날씨 이미지 정리** (매일 3:00 AM KST): 7일 이상 된 이미지 삭제

## 모니터링

### 로그 확인

```bash
# 전체 로그
docker-compose -f deployment/docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f deployment/docker-compose.prod.yml logs -f app
docker-compose -f deployment/docker-compose.prod.yml logs -f nginx-gateway

# Nginx 액세스 로그
docker exec -it aviation-bot-nginx-gateway-1 tail -f /var/log/nginx/access.log

# Nginx 에러 로그
docker exec -it aviation-bot-nginx-gateway-1 tail -f /var/log/nginx/error.log
```

### 헬스 체크

```bash
# 서비스 상태 확인
docker-compose -f deployment/docker-compose.prod.yml ps

# 애플리케이션 헬스 체크
curl http://localhost:3010/health

# Nginx 상태 확인
curl -I http://localhost:80
```

## 트러블슈팅

### 서비스가 시작되지 않는 경우

```bash
# 컨테이너 상태 확인
docker ps -a

# 로그 확인
docker-compose -f deployment/docker-compose.prod.yml logs

# 재시작
docker-compose -f deployment/docker-compose.prod.yml restart
```

### SSL 인증서 오류

```bash
# 인증서 확인
sudo certbot certificates

# 수동 갱신
sudo certbot renew

# Nginx 재시작
docker-compose -f deployment/docker-compose.prod.yml restart nginx-gateway
```

### 데이터베이스 연결 오류

```bash
# 환경 변수 확인
cat /data/devops/.env

# 데이터베이스 연결 테스트
docker exec -it aviation-bot-app-1 sh
# 컨테이너 내부에서
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME
```

## 백업

### 데이터베이스 백업

관리자 페이지 (https://aviation-bott.com/backups)에서 백업 생성 및 복원 가능

### 수동 백업

```bash
# 데이터베이스 백업
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > backup-$(date +%Y%m%d).sql

# 날씨 이미지 백업
tar -czf weather-images-$(date +%Y%m%d).tar.gz /data/backend/data/weather-images/
```

## 롤백

```bash
# 이전 버전으로 롤백
docker pull ghcr.io/YOUR_USERNAME/aviation_bot:PREVIOUS_SHA
docker tag ghcr.io/YOUR_USERNAME/aviation_bot:PREVIOUS_SHA ghcr.io/YOUR_USERNAME/aviation_bot:latest

# 재배포
cd /data/devops/aviation_bot/deployment
docker-compose -f docker-compose.prod.yml up -d
```

## 보안

- 모든 HTTP 트래픽은 HTTPS로 리다이렉트
- TLS 1.2 이상만 허용
- Rate limiting 적용 (일반: 10req/s, API: 30req/s)
- Security headers 적용 (HSTS, X-Frame-Options, etc.)
- 민감한 정보는 환경 변수로 관리

## 성능 최적화

- Gzip 압축 활성화
- Docker 이미지 레이어 캐싱
- Nginx 프록시 캐싱 (필요시 설정)
- 로그 rotation 설정 (최대 10MB, 3개 파일)

## 참고 자료

- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Let's Encrypt 문서](https://letsencrypt.org/docs/)
- [Digital Ocean 가이드](https://www.digitalocean.com/community/tutorials)
