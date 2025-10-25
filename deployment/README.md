# Aviation Bot Deployment Files

이 폴더는 Aviation Bot의 프로덕션 배포에 필요한 모든 파일을 포함합니다.

## 📁 파일 구조

```
deployment/
├── README.md              # 이 파일
├── DEPLOYMENT.md          # 상세 배포 가이드
├── .env.example           # 환경변수 설정 예시
├── docker-compose.prod.yml # 프로덕션 Docker Compose 설정
├── deploy.sh              # 배포 자동화 스크립트
└── init.sql               # 데이터베이스 초기화 스크립트
```

## 🚀 빠른 시작

### 1. 서버에 배포 디렉토리 생성
```bash
sudo mkdir -p /opt/aviation-bot
sudo chown $USER:$USER /opt/aviation-bot
```

### 2. 배포 파일 복사
```bash
# 이 폴더의 모든 파일을 서버로 복사
scp -r deployment/* user@server:/opt/aviation-bot/
```

### 3. 환경설정
```bash
cd /opt/aviation-bot
cp .env.example .env
# .env 파일을 실제 값으로 수정
nano .env
```

### 4. 배포 실행
```bash
chmod +x deploy.sh
./deploy.sh
```

## 📖 자세한 가이드

전체 배포 과정에 대한 자세한 내용은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참조하세요.

## 🔧 GitHub Actions 자동 배포

GitHub Actions는 이 폴더의 파일들을 자동으로 서버에 배포합니다:

1. `main` 브랜치에 푸시
2. Docker 이미지 빌드 및 푸시
3. 배포 파일을 서버로 복사
4. 자동 배포 실행

## 💡 주요 특징

- ✅ GitHub Container Registry 사용
- ✅ 환경변수 기반 설정
- ✅ MySQL 데이터베이스 자동 초기화
- ✅ Docker Compose 기반 오케스트레이션
- ✅ 헬스체크 및 자동 재시작
- ✅ 로그 관리 및 모니터링