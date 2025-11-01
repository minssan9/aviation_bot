# Aviation Bot 배포 가이드

## 📁 서버 디렉토리 구조

배포 서버에 다음 구조로 디렉토리를 설정해주세요:

```
/opt/aviation-bot/
├── .env                        # 환경변수 설정 파일
├── docker-compose.prod.yml     # 프로덕션 Docker Compose 설정
├── init.sql                    # 데이터베이스 초기화 스크립트
├── deploy.sh                   # 배포 스크립트
└── data/                       # 데이터 볼륨 (자동 생성)
    └── db_data/               # MySQL 데이터
```

## 🚀 초기 서버 설정

### 1. 배포 디렉토리 생성

```bash
sudo mkdir -p /opt/aviation-bot
sudo chown $USER:$USER /opt/aviation-bot
cd /opt/aviation-bot
```

### 2. 배포 파일 복사

**GitHub에서 배포 폴더 다운로드:**

```bash
# 방법 1: 개별 파일 다운로드
curl -O https://raw.githubusercontent.com/your-username/aviation-bot/main/deployment/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/your-username/aviation-bot/main/deployment/init.sql
curl -O https://raw.githubusercontent.com/your-username/aviation-bot/main/deployment/deploy.sh
curl -O https://raw.githubusercontent.com/your-username/aviation-bot/main/deployment/.env.example

# 방법 2: Git 사용 (권장)
git clone https://github.com/your-username/aviation-bot.git temp
cp -r temp/deployment/* /opt/aviation-bot/
rm -rf temp

chmod +x deploy.sh
```

### 3. .env 파일 생성

```bash
# .env.example을 복사하여 수정
cp .env.example .env
nano .env  # 실제 값으로 수정
```

또는 직접 생성:

```bash
cat > .env << EOF
# Bot Configuration
NODE_ENV=production
BOT_TOKEN=your_telegram_bot_token_here
GEMINI_API_KEY=your_gemini_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here

# Database Configuration
DB_HOST=db
DB_PORT=3306
DB_USER=aviation
DB_PASSWORD=your_secure_password_here
DB_NAME=aviation_bot

# GitHub Container Registry
GITHUB_REPOSITORY=your_username/aviation-bot
GITHUB_TOKEN=your_github_token_here
GITHUB_USERNAME=your_github_username
EOF
```

### 4. Docker 및 Docker Compose 설치

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose 설치 (최신 버전)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 5. 방화벽 설정 (선택사항)

```bash
# UFW 사용 시
sudo ufw allow 3010/tcp
sudo ufw allow 3306/tcp
```

## 🔧 GitHub Actions 자동 배포

### 필요한 GitHub Secrets

Repository > Settings > Secrets and variables > Actions에서 다음 secrets을 설정:

```
HOST=your_server_ip_or_domain
USERNAME=your_server_username
PRIVATE_KEY=your_ssh_private_key

BOT_TOKEN=your_telegram_bot_token
GEMINI_API_KEY=your_gemini_api_key
CLAUDE_API_KEY=your_claude_api_key

DB_USER=aviation
DB_PASSWORD=your_secure_password
DB_NAME=aviation_bot
```

### 자동 배포 과정

1. `main` 브랜치에 코드 푸시
2. GitHub Actions에서 테스트 실행
3. Docker 이미지 빌드 → GitHub Container Registry에 푸시
4. 서버에 배포 파일 복사
5. 서버에서 자동 배포 실행

## 🛠️ 수동 배포

### 1. 배포 파일 업데이트

```bash
cd /opt/aviation-bot

# GitHub에서 최신 배포 파일 다운로드
curl -O https://raw.githubusercontent.com/your-username/aviation-bot/main/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/your-username/aviation-bot/main/init.sql
curl -O https://raw.githubusercontent.com/your-username/aviation-bot/main/deploy.sh

chmod +x deploy.sh
```

### 2. 배포 실행

```bash
./deploy.sh
```

## 📊 모니터링 및 관리

### 서비스 상태 확인

```bash
cd /opt/aviation-bot
docker-compose -f docker-compose.prod.yml ps
```

### 로그 확인

```bash
# 전체 로그
docker-compose -f docker-compose.prod.yml logs

# 실시간 로그 팔로우
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs app
docker-compose -f docker-compose.prod.yml logs db
```

### 서비스 재시작

```bash
# 전체 재시작
docker-compose -f docker-compose.prod.yml restart

# 특정 서비스만 재시작
docker-compose -f docker-compose.prod.yml restart app
```

### 백업

```bash
# 데이터베이스 백업
docker-compose -f docker-compose.prod.yml exec db mysqldump -u aviation -p aviation_bot > backup_$(date +%Y%m%d_%H%M%S).sql

# 환경설정 백업
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
```

## 🔧 트러블슈팅

### 일반적인 문제 해결

1. **컨테이너가 시작되지 않는 경우**
   ```bash
   docker-compose -f docker-compose.prod.yml logs
   ```

2. **데이터베이스 연결 실패**
   ```bash
   # 데이터베이스 헬스체크 확인
   docker-compose -f docker-compose.prod.yml exec db mysqladmin ping -h localhost -u root -p
   ```

3. **디스크 공간 부족**
   ```bash
   # 사용하지 않는 이미지 정리
   docker system prune -a
   ```

4. **권한 문제**
   ```bash
   sudo chown -R $USER:$USER /opt/aviation-bot
   ```

### 로그 레벨 조정

`.env` 파일에서 로그 레벨 설정:
```bash
LOG_LEVEL=debug  # debug, info, warn, error
```

## 🌐 접속 정보

- **Admin Interface**: http://your-server:3010
- **Database**: your-server:3306
- **Bot**: Telegram에서 직접 접속

## 📈 성능 모니터링

```bash
# 리소스 사용량 확인
docker stats

# 시스템 리소스 확인
htop
df -h
free -h
```