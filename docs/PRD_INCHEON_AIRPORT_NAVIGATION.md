# PRD: Incheon Airport Indoor Navigation System

**Version:** 1.0
**Status:** Draft - Awaiting Review
**Author:** Claude
**Date:** 2025-11-05
**Target Release:** v2.1.0

---

## Executive Summary

### Problem Statement
국제선 이용객들은 인천공항에서 항공편 게이트를 찾기 어려워합니다. 특히:
- 공항 크기가 방대하여 방향 감각 상실
- 수속 카운터 → 출국장 → 탑승 게이트까지의 동선 혼란
- 현재 위치에서 목적지까지의 최적 경로를 파악하기 어려움
- 시간이 촉박한 상황에서 빠른 경로 안내 필요

### Proposed Solution
텔레그램 봇에 **실시간 인천공항 실내 내비게이션** 기능을 추가합니다:

**입력:**
- 항공편 편명 (예: KE123, OZ456)
- 사용자 현재 위치 (GPS 또는 수동 입력)

**출력:**
- 인천공항 플로어맵에 빨간색 경로 표시된 이미지
- 현위치 → 수속 카운터 → 출국장 → 탑승 게이트 단계별 안내
- 예상 소요 시간 및 거리 정보
- 텔레그램을 통한 턴바이턴 내비게이션

---

## Goals & Success Metrics

### Primary Goals
1. **사용자 경험 향상**: 공항 내 이동 시간 30% 단축
2. **길 찾기 불안 해소**: 게이트 찾기 관련 문의 80% 감소
3. **탑승 지연 방지**: 게이트 못 찾아서 발생하는 탑승 지연 제로화

### Success Metrics
| Metric | Baseline | Target (3 months) |
|--------|----------|-------------------|
| Navigation feature usage | 0 | 500+ users/month |
| Average time to gate | Unknown | < 15 minutes |
| User satisfaction (NPS) | N/A | 70+ |
| Navigation accuracy | N/A | 95%+ correct routes |

### Non-Goals (Out of Scope for v2.1.0)
- ❌ 김포공항, 제주공항 등 타 공항 지원 (v2.2 이후)
- ❌ 실시간 항공편 지연 정보 통합 (별도 feature)
- ❌ AR (증강현실) 내비게이션 (v3.0 고려)
- ❌ 음성 안내 (향후 검토)

---

## User Stories

### Primary User: 국제선 출국 여행객

**Story 1: 처음 방문하는 여행객**
```
AS a first-time Incheon Airport traveler
I WANT to get step-by-step directions from my current location to my departure gate
SO THAT I can avoid getting lost and missing my flight
```

**Acceptance Criteria:**
- [ ] 항공편 편명만 입력하면 자동으로 게이트 정보 조회
- [ ] 현재 위치를 GPS 또는 수동 선택 가능
- [ ] 맵에 빨간색 경로선이 명확히 표시
- [ ] 각 단계별 이동 안내 (카운터 → 출국심사 → 게이트)
- [ ] 예상 소요 시간 표시

**Story 2: 시간이 촉박한 여행객**
```
AS a traveler running late
I WANT to see the fastest route to my gate with time estimates
SO THAT I can make an informed decision about catching my flight
```

**Acceptance Criteria:**
- [ ] 최단 경로 계산 (거리 기준)
- [ ] 보행 속도 기반 시간 예측 (평균 4km/h)
- [ ] 우회로 옵션 제공 (엘리베이터 vs 에스컬레이터)
- [ ] 탑승 마감 시간까지 여유 시간 표시

**Story 3: 하차 위치를 모르는 여행객**
```
AS a traveler dropped off at the airport
I WANT to identify which terminal entrance I'm at
SO THAT I can get accurate directions from there
```

**Acceptance Criteria:**
- [ ] GPS 기반 자동 위치 인식 (터미널 1/2, 층수)
- [ ] 주요 랜드마크 기반 수동 위치 선택 UI
- [ ] 잘못된 터미널에 있을 경우 터미널 이동 안내

---

## Technical Requirements

### 1. Data Requirements

#### 1.1 Airport Facility Data
인천공항 시설물 데이터베이스 구축:

**Terminal Structure:**
```typescript
interface Terminal {
  id: string;                    // 'T1', 'T2', 'T1-Concourse'
  name_ko: string;               // '제1여객터미널'
  name_en: string;               // 'Terminal 1'
  floors: Floor[];               // 1F, 3F, 4F 등
  map_image_url: string;         // 플로어맵 이미지
}

interface Floor {
  terminal_id: string;
  floor_number: number;          // 1, 3, 4
  map_svg_path: string;          // SVG 벡터맵 경로
  waypoints: Waypoint[];         // 네비게이션 노드
}

interface Waypoint {
  id: string;                    // 'T1-3F-GATE-101'
  terminal_id: string;
  floor: number;
  type: WaypointType;            // 'COUNTER' | 'GATE' | 'IMMIGRATION' | 'ELEVATOR' | 'ENTRANCE'
  coordinates: {
    x: number;                   // 맵 상의 픽셀 좌표
    y: number;
  };
  gps?: {
    lat: number;
    lon: number;
  };
  name_ko: string;
  name_en: string;
  connected_waypoints: string[]; // 인접 노드 ID 리스트
  distance_to_next: {            // 거리 매핑 (meters)
    [waypoint_id: string]: number;
  };
}

type WaypointType =
  | 'COUNTER'      // 항공사 체크인 카운터
  | 'GATE'         // 탑승 게이트
  | 'IMMIGRATION'  // 출국심사대
  | 'SECURITY'     // 보안검색대
  | 'ELEVATOR'     // 엘리베이터
  | 'ESCALATOR'    // 에스컬레이터
  | 'ENTRANCE'     // 입구
  | 'INFO'         // 안내데스크
  | 'TRANSIT';     // 환승 통로
```

**Flight-Gate Mapping:**
```typescript
interface FlightGateInfo {
  flight_number: string;         // 'KE123'
  airline_code: string;          // 'KE'
  departure_time: Date;
  terminal: string;              // 'T1' | 'T2'
  counter_zone: string;          // 'A', 'B', 'C', etc.
  counter_numbers: string;       // '01-20'
  gate_number: string;           // '101', '250', etc.
  gate_waypoint_id: string;      // FK to Waypoint
  counter_waypoint_id: string;   // FK to Waypoint
  boarding_time: Date;           // 탑승 시작 시간
  last_call_time: Date;          // 마감 시간
}
```

#### 1.2 User Location Tracking
```typescript
interface UserLocation {
  user_id: string;
  terminal_id: string;
  floor: number;
  waypoint_id?: string;          // 가장 가까운 waypoint
  gps_coordinates?: {
    lat: number;
    lon: number;
    accuracy: number;            // meters
  };
  manual_selection?: boolean;    // GPS vs 수동 입력
  timestamp: Date;
}
```

#### 1.3 Navigation Route
```typescript
interface NavigationRoute {
  id: string;
  user_id: string;
  flight_number: string;
  start_waypoint: Waypoint;
  end_waypoint: Waypoint;
  path: Waypoint[];              // 순서대로 정렬된 경유지
  total_distance: number;        // meters
  estimated_time: number;        // minutes
  instructions: RouteInstruction[];
  map_image_url: string;         // 경로 오버레이된 맵
  created_at: Date;
}

interface RouteInstruction {
  step: number;
  waypoint: Waypoint;
  instruction_ko: string;        // '3층으로 올라가세요'
  instruction_en: string;        // 'Go up to 3rd floor'
  distance_from_previous: number;
  estimated_time: number;
}
```

### 2. API Requirements

#### 2.1 New REST Endpoints

**Airport Data APIs:**
```
GET  /api/airports/incheon/terminals
GET  /api/airports/incheon/terminals/:id/floors
GET  /api/airports/incheon/waypoints?type=GATE
GET  /api/airports/incheon/flights/:flightNumber/gate
POST /api/airports/incheon/location/detect
```

**Navigation APIs:**
```
POST /api/navigation/route
  Request: {
    flight_number: string,
    start_location: {
      waypoint_id?: string,
      gps?: { lat: number, lon: number },
      manual_input?: string  // '제1터미널 3층 입구'
    },
    options?: {
      avoid_stairs?: boolean,
      prefer_fastest?: boolean
    }
  }
  Response: NavigationRoute

GET  /api/navigation/route/:routeId
GET  /api/navigation/route/:routeId/image  (PNG with route overlay)
```

#### 2.2 Telegram Bot Commands

**New Commands:**
```
/navigate <flight_number>        - 항공편 게이트로 내비게이션 시작
/mylocation                      - 현재 위치 공유 요청
/gates <airline>                 - 항공사별 게이트 정보 조회
/terminal <T1|T2>                - 터미널 맵 보기
/facilities <facility_type>      - 시설물 찾기 (화장실, 환전소 등)
```

**Interactive Flow Example:**
```
User: /navigate KE123

Bot: ✈️ KE123편 내비게이션을 시작합니다.

     📍 현재 위치를 알려주세요:
     1️⃣ 위치 공유 (GPS)
     2️⃣ 수동 입력

User: [Shares location via Telegram]

Bot: 📍 제1터미널 3층 입구에 계시네요!

     ✈️ KE123 (서울 → 뉴욕)
     🕒 출발: 14:30 | 탑승: 13:50
     🚪 탑승구: 101번 게이트
     📋 수속: A 카운터 (01-20번)

     🗺️ 경로 안내:
     1. 현재 위치 (3F 입구)
     2. → A 체크인 카운터 (3F) - 50m, 1분
     3. → 출국심사대 (3F) - 100m, 2분
     4. → 101번 게이트 (3F) - 300m, 5분

     ⏱️ 총 소요시간: 약 8분
     📏 총 거리: 450m

     [지도 이미지 전송 - 빨간색 경로 표시]

     이동을 시작하시겠습니까?
     🟢 시작 | 🔄 경로 재탐색

User: 🟢 시작

Bot: 🚶 내비게이션 시작!

     👉 50m 직진 후 A 카운터로 이동하세요.

     [위치 업데이트 대기...]
```

### 3. Database Schema

#### 3.1 New Tables

```sql
-- 터미널 정보
CREATE TABLE terminals (
  id VARCHAR(10) PRIMARY KEY,
  name_ko VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  airport_code VARCHAR(3) DEFAULT 'ICN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 플로어 정보
CREATE TABLE floors (
  id VARCHAR(20) PRIMARY KEY,
  terminal_id VARCHAR(10) NOT NULL,
  floor_number INT NOT NULL,
  map_svg_path VARCHAR(500),
  map_image_path VARCHAR(500),
  FOREIGN KEY (terminal_id) REFERENCES terminals(id),
  INDEX idx_terminal_floor (terminal_id, floor_number)
);

-- 웨이포인트 (네비게이션 노드)
CREATE TABLE waypoints (
  id VARCHAR(50) PRIMARY KEY,
  terminal_id VARCHAR(10) NOT NULL,
  floor_number INT NOT NULL,
  type ENUM('COUNTER', 'GATE', 'IMMIGRATION', 'SECURITY', 'ELEVATOR', 'ESCALATOR', 'ENTRANCE', 'INFO', 'TRANSIT') NOT NULL,
  name_ko VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  map_x INT NOT NULL COMMENT 'X coordinate on floor map (pixels)',
  map_y INT NOT NULL COMMENT 'Y coordinate on floor map (pixels)',
  gps_lat DECIMAL(10, 8) COMMENT 'GPS latitude if available',
  gps_lon DECIMAL(11, 8) COMMENT 'GPS longitude if available',
  metadata JSON COMMENT 'Additional properties like gate number, counter range',
  FOREIGN KEY (terminal_id) REFERENCES terminals(id),
  INDEX idx_type (type),
  INDEX idx_location (terminal_id, floor_number),
  SPATIAL INDEX idx_gps (POINT(gps_lat, gps_lon)) -- MySQL 8.0+ spatial support
);

-- 웨이포인트 연결 (그래프 엣지)
CREATE TABLE waypoint_connections (
  from_waypoint_id VARCHAR(50) NOT NULL,
  to_waypoint_id VARCHAR(50) NOT NULL,
  distance_meters DECIMAL(6, 2) NOT NULL,
  walking_time_seconds INT NOT NULL,
  is_accessible BOOLEAN DEFAULT TRUE COMMENT 'Wheelchair accessible',
  connection_type ENUM('WALK', 'ELEVATOR', 'ESCALATOR', 'STAIRS') DEFAULT 'WALK',
  PRIMARY KEY (from_waypoint_id, to_waypoint_id),
  FOREIGN KEY (from_waypoint_id) REFERENCES waypoints(id),
  FOREIGN KEY (to_waypoint_id) REFERENCES waypoints(id),
  INDEX idx_from (from_waypoint_id),
  INDEX idx_to (to_waypoint_id)
);

-- 항공편-게이트 매핑
CREATE TABLE flight_gates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_number VARCHAR(10) NOT NULL,
  airline_code VARCHAR(3) NOT NULL,
  departure_time DATETIME NOT NULL,
  terminal_id VARCHAR(10) NOT NULL,
  counter_zone VARCHAR(5),
  counter_numbers VARCHAR(20),
  gate_number VARCHAR(10),
  gate_waypoint_id VARCHAR(50),
  counter_waypoint_id VARCHAR(50),
  boarding_time DATETIME,
  last_call_time DATETIME,
  status ENUM('SCHEDULED', 'BOARDING', 'DEPARTED', 'CANCELLED') DEFAULT 'SCHEDULED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (terminal_id) REFERENCES terminals(id),
  FOREIGN KEY (gate_waypoint_id) REFERENCES waypoints(id),
  FOREIGN KEY (counter_waypoint_id) REFERENCES waypoints(id),
  INDEX idx_flight (flight_number, departure_time),
  INDEX idx_airline (airline_code),
  INDEX idx_departure (departure_time)
);

-- 사용자 위치 추적
CREATE TABLE user_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  terminal_id VARCHAR(10),
  floor_number INT,
  nearest_waypoint_id VARCHAR(50),
  gps_lat DECIMAL(10, 8),
  gps_lon DECIMAL(11, 8),
  gps_accuracy_meters INT,
  location_source ENUM('GPS', 'MANUAL', 'WIFI', 'BEACON') DEFAULT 'MANUAL',
  timestamp DATETIME NOT NULL,
  FOREIGN KEY (terminal_id) REFERENCES terminals(id),
  FOREIGN KEY (nearest_waypoint_id) REFERENCES waypoints(id),
  INDEX idx_user (telegram_user_id),
  INDEX idx_timestamp (timestamp)
);

-- 네비게이션 히스토리
CREATE TABLE navigation_routes (
  id VARCHAR(36) PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  flight_number VARCHAR(10),
  start_waypoint_id VARCHAR(50) NOT NULL,
  end_waypoint_id VARCHAR(50) NOT NULL,
  route_waypoints JSON NOT NULL COMMENT 'Array of waypoint IDs in order',
  total_distance_meters DECIMAL(7, 2),
  estimated_time_minutes INT,
  map_image_path VARCHAR(500),
  status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'ACTIVE',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (start_waypoint_id) REFERENCES waypoints(id),
  FOREIGN KEY (end_waypoint_id) REFERENCES waypoints(id),
  INDEX idx_user_status (telegram_user_id, status),
  INDEX idx_flight (flight_number)
);
```

#### 3.2 Sample Data Requirements

인천공항 실제 데이터 수집 필요:
- Terminal 1: ~50 gates, ~200 waypoints
- Terminal 2: ~30 gates, ~150 waypoints
- 체크인 카운터 위치: 항공사별 카운터 존 매핑
- 출국심사대 위치: 여러 개의 immigration 레인
- 층간 이동 시설: 엘리베이터, 에스컬레이터 위치

**Data Collection Methods:**
1. 인천공항공사 공식 플로어맵 디지털화
2. Google Maps Indoor 데이터 참조
3. 직접 측정 (optional, GPS 좌표 수집)

### 4. Navigation Algorithm

#### 4.1 Pathfinding Algorithm: Dijkstra's Shortest Path

**Requirements:**
- 가중치 그래프 기반 (waypoint connections)
- 다층 건물 지원 (층간 이동 가중치 고려)
- 장애물 회피 (optional: 계단 vs 엘리베이터)

**Pseudocode:**
```typescript
function findRoute(
  startWaypointId: string,
  endWaypointId: string,
  options: NavigationOptions
): NavigationRoute {
  // 1. Initialize graph
  const graph = buildWaypointGraph();

  // 2. Apply options (avoid stairs, prefer fastest)
  if (options.avoid_stairs) {
    graph.removeEdgesByType('STAIRS');
  }

  // 3. Run Dijkstra
  const distances = new Map<string, number>();
  const previous = new Map<string, string>();
  const queue = new PriorityQueue();

  distances.set(startWaypointId, 0);
  queue.enqueue(startWaypointId, 0);

  while (!queue.isEmpty()) {
    const current = queue.dequeue();

    if (current === endWaypointId) {
      break; // Found shortest path
    }

    for (const neighbor of graph.getNeighbors(current)) {
      const newDistance = distances.get(current) + neighbor.distance;

      if (newDistance < (distances.get(neighbor.id) || Infinity)) {
        distances.set(neighbor.id, newDistance);
        previous.set(neighbor.id, current);
        queue.enqueue(neighbor.id, newDistance);
      }
    }
  }

  // 4. Reconstruct path
  const path = reconstructPath(previous, endWaypointId);

  // 5. Generate turn-by-turn instructions
  const instructions = generateInstructions(path);

  // 6. Create route object
  return {
    path,
    instructions,
    total_distance: distances.get(endWaypointId),
    estimated_time: calculateTime(distances.get(endWaypointId))
  };
}

function calculateTime(distanceMeters: number): number {
  const WALKING_SPEED_KMH = 4; // Average walking speed
  const WALKING_SPEED_MS = WALKING_SPEED_KMH * 1000 / 3600;
  return Math.ceil(distanceMeters / WALKING_SPEED_MS / 60); // minutes
}
```

#### 4.2 Instruction Generation

```typescript
function generateInstructions(path: Waypoint[]): RouteInstruction[] {
  const instructions: RouteInstruction[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    const connection = getConnection(current.id, next.id);

    let instruction_ko = '';
    let instruction_en = '';

    // Floor change detection
    if (current.floor !== next.floor) {
      const direction = next.floor > current.floor ? '올라가세요' : '내려가세요';
      instruction_ko = `${connection.connection_type === 'ELEVATOR' ? '엘리베이터' : '에스컬레이터'}를 타고 ${next.floor}층으로 ${direction}`;
      instruction_en = `Take ${connection.connection_type} to ${next.floor}F`;
    } else {
      instruction_ko = `${next.name_ko} 방향으로 ${connection.distance_meters}m 이동`;
      instruction_en = `Walk ${connection.distance_meters}m towards ${next.name_en}`;
    }

    instructions.push({
      step: i + 1,
      waypoint: next,
      instruction_ko,
      instruction_en,
      distance_from_previous: connection.distance_meters,
      estimated_time: connection.walking_time_seconds / 60
    });
  }

  return instructions;
}
```

### 5. Map Visualization

#### 5.1 Static Map Generation (Phase 1)

**Technology:** Canvas API (Node.js) or ImageMagick

**Process:**
1. Load base floor map image (PNG/SVG)
2. Draw red polyline for route path
3. Add markers for start, end, and key waypoints
4. Add labels with distances and times
5. Export as PNG
6. Upload to storage (local or cloud)
7. Send image via Telegram Bot API

**Example with node-canvas:**
```typescript
import { createCanvas, loadImage } from 'canvas';

async function generateRouteMap(
  floorMapPath: string,
  route: NavigationRoute
): Promise<Buffer> {
  const baseImage = await loadImage(floorMapPath);
  const canvas = createCanvas(baseImage.width, baseImage.height);
  const ctx = canvas.getContext('2d');

  // Draw base map
  ctx.drawImage(baseImage, 0, 0);

  // Draw route path (red line)
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  const firstPoint = route.path[0];
  ctx.moveTo(firstPoint.coordinates.x, firstPoint.coordinates.y);

  for (const waypoint of route.path.slice(1)) {
    ctx.lineTo(waypoint.coordinates.x, waypoint.coordinates.y);
  }
  ctx.stroke();

  // Draw start marker (green circle)
  const start = route.path[0];
  ctx.fillStyle = '#00FF00';
  ctx.beginPath();
  ctx.arc(start.coordinates.x, start.coordinates.y, 10, 0, 2 * Math.PI);
  ctx.fill();

  // Draw end marker (red circle)
  const end = route.path[route.path.length - 1];
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(end.coordinates.x, end.coordinates.y, 10, 0, 2 * Math.PI);
  ctx.fill();

  // Add distance label
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px Arial';
  ctx.fillText(
    `${route.total_distance}m (${route.estimated_time}분)`,
    20,
    30
  );

  return canvas.toBuffer('image/png');
}
```

#### 5.2 Interactive Map (Phase 2 - Future Enhancement)

**Technology:** Leaflet.js or Mapbox GL

**Features:**
- 확대/축소 가능
- 층별 맵 전환
- 실시간 위치 업데이트 (GPS 추적)
- 시설물 검색 및 필터링
- Web view 임베딩 또는 별도 웹앱

### 6. GPS & Location Services

#### 6.1 GPS Location Detection

**Telegram Bot API:** `sendLocation` / `sendVenue` listeners

```typescript
bot.on('location', async (msg) => {
  const chatId = msg.chat.id;
  const location = msg.location;

  // Save user location
  await saveUserLocation({
    telegram_user_id: msg.from.id,
    gps_lat: location.latitude,
    gps_lon: location.longitude,
    gps_accuracy_meters: location.horizontal_accuracy || 50,
    location_source: 'GPS',
    timestamp: new Date()
  });

  // Find nearest waypoint
  const nearestWaypoint = await findNearestWaypoint(
    location.latitude,
    location.longitude
  );

  // Determine terminal and floor
  const terminalInfo = determineTerminalFromWaypoint(nearestWaypoint);

  bot.sendMessage(
    chatId,
    `📍 위치 확인!\n` +
    `터미널: ${terminalInfo.name_ko}\n` +
    `층: ${nearestWaypoint.floor_number}층\n` +
    `가장 가까운 위치: ${nearestWaypoint.name_ko}`
  );
});
```

#### 6.2 Fallback: Manual Location Selection

GPS가 실내에서 작동하지 않는 경우 대비:

**Telegram Inline Keyboard:**
```typescript
const locationKeyboard = {
  inline_keyboard: [
    [
      { text: '제1터미널 3층 입구', callback_data: 'loc:T1:3F:ENTRANCE' },
      { text: '제1터미널 4층 입구', callback_data: 'loc:T1:4F:ENTRANCE' }
    ],
    [
      { text: '제2터미널 3층 입구', callback_data: 'loc:T2:3F:ENTRANCE' }
    ],
    [
      { text: 'A 체크인 카운터', callback_data: 'loc:T1:3F:COUNTER_A' },
      { text: 'B 체크인 카운터', callback_data: 'loc:T1:3F:COUNTER_B' }
    ]
  ]
};

bot.sendMessage(chatId, '현재 위치를 선택하세요:', {
  reply_markup: locationKeyboard
});
```

### 7. Flight Information Integration

#### 7.1 Flight Data Source Options

**Option 1: Static Database (MVP)**
- 관리자가 수동으로 항공편-게이트 정보 입력
- Admin dashboard에서 CRUD 관리
- 적합: 소규모 테스트, 특정 항공사만 지원

**Option 2: Public API Integration (Recommended)**
- 인천공항 Open API: https://www.airport.kr/ap/ko/dep/openApi.do
- Aviation Edge, AviationStack 등 써드파티 API
- 실시간 게이트 변경 자동 업데이트

**Option 3: Web Scraping (Fallback)**
- 인천공항 웹사이트 스크래핑
- 법적 검토 필요, rate limiting 고려

#### 7.2 API Integration Example

```typescript
import axios from 'axios';

interface IncheonAirportAPIResponse {
  response: {
    body: {
      items: {
        item: Array<{
          flightId: string;      // 'KE123'
          airline: string;       // '대한항공'
          terminalId: string;    // 'T1'
          gatenumber: string;    // '101'
          // ... other fields
        }>;
      };
    };
  };
}

async function fetchFlightGateInfo(flightNumber: string): Promise<FlightGateInfo | null> {
  try {
    const response = await axios.get<IncheonAirportAPIResponse>(
      'https://apis.data.go.kr/B551177/StatusOfPassengerFlightsDesCN/getPassengerDeparturesDesCN',
      {
        params: {
          serviceKey: process.env.INCHEON_AIRPORT_API_KEY,
          flight_id: flightNumber,
          // ... other params
        }
      }
    );

    const flight = response.data.response.body.items.item[0];

    if (!flight) {
      return null;
    }

    // Map API response to our data model
    return {
      flight_number: flight.flightId,
      airline_code: extractAirlineCode(flight.flightId),
      terminal: flight.terminalId,
      gate_number: flight.gatenumber,
      // ... map other fields
    };
  } catch (error) {
    console.error('Failed to fetch flight info:', error);
    return null;
  }
}
```

### 8. Architecture Integration

#### 8.1 New Components

**Directory Structure:**
```
src/
├── features/
│   ├── airport-navigation/        # 🆕 New feature module
│   │   ├── controllers/
│   │   │   ├── AirportController.ts
│   │   │   └── NavigationController.ts
│   │   ├── services/
│   │   │   ├── AirportService.ts
│   │   │   ├── NavigationService.ts
│   │   │   ├── PathfindingService.ts
│   │   │   ├── MapRenderingService.ts
│   │   │   └── FlightInfoService.ts
│   │   ├── repositories/
│   │   │   ├── TerminalRepository.ts
│   │   │   ├── WaypointRepository.ts
│   │   │   ├── FlightGateRepository.ts
│   │   │   └── NavigationHistoryRepository.ts
│   │   ├── models/
│   │   │   ├── Terminal.ts
│   │   │   ├── Waypoint.ts
│   │   │   ├── NavigationRoute.ts
│   │   │   └── UserLocation.ts
│   │   ├── handlers/
│   │   │   ├── NavigateCommandHandler.ts
│   │   │   ├── MyLocationCommandHandler.ts
│   │   │   └── GatesCommandHandler.ts
│   │   └── utils/
│   │       ├── dijkstra.ts
│   │       ├── gps-utils.ts
│   │       └── map-generator.ts
│   └── ... (existing features)
├── infrastructure/
│   └── database/
│       └── migrations/
│           └── 007_airport_navigation.sql  # 🆕 New migration
└── ...
```

#### 8.2 Dependency Injection Registration

**Update `src/infrastructure/di/DIContainer.ts`:**

```typescript
// Airport Navigation Services
container.register<IAirportService>(
  'AirportService',
  AirportService,
  ['TerminalRepository', 'WaypointRepository', 'Logger']
);

container.register<INavigationService>(
  'NavigationService',
  NavigationService,
  ['WaypointRepository', 'PathfindingService', 'MapRenderingService', 'Logger']
);

container.register<IPathfindingService>(
  'PathfindingService',
  PathfindingService,
  ['WaypointRepository', 'Logger']
);

container.register<IMapRenderingService>(
  'MapRenderingService',
  MapRenderingService,
  ['Config', 'Logger']
);

container.register<IFlightInfoService>(
  'FlightInfoService',
  FlightInfoService,
  ['FlightGateRepository', 'ExternalAPIClient', 'Logger']
);

// Repositories
container.register<ITerminalRepository>(
  'TerminalRepository',
  TerminalRepository,
  ['DatabaseConnection', 'Logger']
);

container.register<IWaypointRepository>(
  'WaypointRepository',
  WaypointRepository,
  ['DatabaseConnection', 'Logger']
);

container.register<IFlightGateRepository>(
  'FlightGateRepository',
  FlightGateRepository,
  ['DatabaseConnection', 'Logger']
);

// Telegram Handlers
container.register<ICommandHandler>(
  'NavigateCommandHandler',
  NavigateCommandHandler,
  ['NavigationService', 'FlightInfoService', 'TelegramBot', 'Logger']
);
```

#### 8.3 Router Integration

**Update `src/infrastructure/web/routes/apiRoutes.ts`:**

```typescript
import { AirportController } from '@features/airport-navigation/controllers/AirportController';
import { NavigationController } from '@features/airport-navigation/controllers/NavigationController';

export function setupAPIRoutes(app: Express, container: DIContainer): void {
  // Existing routes...

  // 🆕 Airport Navigation routes
  const airportController = container.resolve<AirportController>('AirportController');
  const navigationController = container.resolve<NavigationController>('NavigationController');

  app.get('/api/airports/incheon/terminals', (req, res) =>
    airportController.getTerminals(req, res));

  app.get('/api/airports/incheon/terminals/:id/floors', (req, res) =>
    airportController.getTerminalFloors(req, res));

  app.get('/api/airports/incheon/waypoints', (req, res) =>
    airportController.getWaypoints(req, res));

  app.get('/api/airports/incheon/flights/:flightNumber/gate', (req, res) =>
    airportController.getFlightGate(req, res));

  app.post('/api/navigation/route', (req, res) =>
    navigationController.createRoute(req, res));

  app.get('/api/navigation/route/:routeId', (req, res) =>
    navigationController.getRoute(req, res));

  app.get('/api/navigation/route/:routeId/image', (req, res) =>
    navigationController.getRouteImage(req, res));
}
```

### 9. Testing Strategy

#### 9.1 Unit Tests

**Coverage Target: 80%+**

```typescript
// Example: PathfindingService.test.ts
describe('PathfindingService', () => {
  let service: PathfindingService;
  let mockWaypointRepo: jest.Mocked<IWaypointRepository>;

  beforeEach(() => {
    mockWaypointRepo = createMockWaypointRepository();
    service = new PathfindingService(mockWaypointRepo, mockLogger);
  });

  it('should find shortest path between two waypoints on same floor', async () => {
    const route = await service.findRoute('T1-3F-ENTRANCE', 'T1-3F-GATE-101');

    expect(route.path).toHaveLength(5);
    expect(route.total_distance).toBeLessThan(500);
    expect(route.estimated_time).toBeLessThan(10);
  });

  it('should handle multi-floor navigation with elevator', async () => {
    const route = await service.findRoute('T1-1F-ENTRANCE', 'T1-3F-GATE-250');

    const elevatorStep = route.path.find(wp => wp.type === 'ELEVATOR');
    expect(elevatorStep).toBeDefined();
    expect(route.path[0].floor).not.toBe(route.path[route.path.length - 1].floor);
  });

  it('should avoid stairs when option is set', async () => {
    const route = await service.findRoute(
      'T1-1F-ENTRANCE',
      'T1-3F-GATE-101',
      { avoid_stairs: true }
    );

    const hasStairs = route.path.some(wp => wp.type === 'STAIRS');
    expect(hasStairs).toBe(false);
  });
});
```

#### 9.2 Integration Tests

```typescript
describe('Navigation API Integration', () => {
  let app: Express;
  let db: DatabaseConnection;

  beforeAll(async () => {
    db = await setupTestDatabase();
    await seedAirportData(db);
    app = setupTestApp();
  });

  it('should create navigation route via API', async () => {
    const response = await request(app)
      .post('/api/navigation/route')
      .send({
        flight_number: 'KE123',
        start_location: {
          waypoint_id: 'T1-3F-ENTRANCE-MAIN'
        }
      });

    expect(response.status).toBe(200);
    expect(response.body.route).toHaveProperty('path');
    expect(response.body.route).toHaveProperty('map_image_url');
  });
});
```

#### 9.3 E2E Tests (Telegram Bot)

```typescript
describe('Telegram Navigation Flow', () => {
  it('should complete full navigation flow', async () => {
    const bot = createTestTelegramBot();

    // User sends /navigate command
    await bot.simulateUserMessage('/navigate KE123');

    // Bot should ask for location
    expect(bot.lastMessage).toContain('현재 위치를 알려주세요');

    // User shares location
    await bot.simulateLocationShare(37.4602, 126.4407); // ICN coordinates

    // Bot should send route map
    expect(bot.lastMessage).toContain('경로 안내');
    expect(bot.lastSentPhoto).toBeDefined();

    // Verify route image contains red path
    const imageBuffer = bot.lastSentPhoto;
    const hasRedPath = await imageContainsRedPath(imageBuffer);
    expect(hasRedPath).toBe(true);
  });
});
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
**Goal:** Database schema and core data layer

- [ ] Create database migration (007_airport_navigation.sql)
- [ ] Implement repository layer (Terminal, Waypoint, FlightGate)
- [ ] Seed sample data (Terminal 1 basic layout, 10 waypoints)
- [ ] Unit tests for repositories (80% coverage)
- [ ] Admin UI for waypoint management

**Deliverables:**
- Working database with airport data
- CRUD operations for waypoints
- Basic admin interface

### Phase 2: Navigation Engine (Week 3-4)
**Goal:** Pathfinding algorithm and route generation

- [ ] Implement Dijkstra's algorithm (PathfindingService)
- [ ] Build graph from waypoint connections
- [ ] Generate turn-by-turn instructions
- [ ] Unit tests for pathfinding (edge cases: unreachable, multi-floor)
- [ ] Performance optimization (caching, indexing)

**Deliverables:**
- Working pathfinding service
- Route generation API
- Performance < 100ms for typical routes

### Phase 3: Map Visualization (Week 5)
**Goal:** Generate route overlay images

- [ ] Set up node-canvas or ImageMagick
- [ ] Implement MapRenderingService
- [ ] Load base floor maps (PNG/SVG)
- [ ] Draw route paths with markers
- [ ] Add labels and legends
- [ ] Store generated images (local filesystem or S3)

**Deliverables:**
- Route map image generation
- Sample maps for T1 gates
- Image storage system

### Phase 4: Telegram Bot Integration (Week 6-7)
**Goal:** User-facing bot commands

- [ ] Implement /navigate command handler
- [ ] GPS location parsing
- [ ] Manual location selection UI (inline keyboard)
- [ ] Flight number validation
- [ ] Send route maps via Telegram
- [ ] Turn-by-turn navigation messages
- [ ] Error handling (flight not found, invalid location)

**Deliverables:**
- Working /navigate command
- Location detection (GPS + manual)
- Telegram message formatting

### Phase 5: Flight Information (Week 8)
**Goal:** Integrate real-time flight data

- [ ] Incheon Airport API integration
- [ ] FlightInfoService implementation
- [ ] Cache flight data (Redis or in-memory)
- [ ] Fallback to manual database
- [ ] Schedule periodic updates (every 15 min)

**Deliverables:**
- Real-time gate information
- API rate limiting
- Data caching

### Phase 6: Testing & Polish (Week 9-10)
**Goal:** Quality assurance and user testing

- [ ] Integration tests (API + DB)
- [ ] E2E tests (Telegram flow)
- [ ] Load testing (100 concurrent users)
- [ ] User acceptance testing (beta users)
- [ ] Bug fixes
- [ ] Documentation (user guide, API docs)
- [ ] Admin training materials

**Deliverables:**
- 80%+ test coverage
- Beta user feedback
- Production-ready code
- Documentation

### Phase 7: Deployment (Week 11)
**Goal:** Production release

- [ ] Docker image build
- [ ] Environment configuration
- [ ] Database migration (production)
- [ ] Seed production airport data
- [ ] Monitoring and logging setup
- [ ] Rollout plan (gradual release)
- [ ] Rollback plan

**Deliverables:**
- Production deployment
- Monitoring dashboards
- Incident response plan

---

## Resource Requirements

### 1. Development Resources

**Team:**
- 1x Backend Developer (Node.js/TypeScript) - 11 weeks
- 1x Data Engineer (airport data collection) - 2 weeks
- 1x QA Engineer - 2 weeks
- 0.5x DevOps Engineer - 1 week

**External Dependencies:**
- Incheon Airport floor maps (PDF/SVG)
- API access to flight information
- Beta testers (10-20 users)

### 2. Infrastructure

**Compute:**
- Existing docker-compose setup (sufficient for MVP)
- Additional storage: ~500MB for floor map images

**Third-party Services:**
- Incheon Airport Open API (free tier: 1000 req/day)
- Optional: Image hosting (AWS S3 or CloudFlare R2)

### 3. Data Requirements

**Airport Data Collection:**
- Terminal 1: 50 gates, ~200 waypoints
- Terminal 2: 30 gates, ~150 waypoints
- Manual data entry time: ~40 hours
- Coordinate mapping time: ~20 hours

**Automation Options:**
- Hire data entry contractor
- Crowdsource via admin UI
- Partner with Incheon Airport for official data

---

## Risk Assessment

### High Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **GPS doesn't work indoors** | High - Core feature fails | Fallback to manual location selection UI |
| **Flight API rate limits** | Medium - Degraded real-time data | Cache aggressively, fallback to manual DB |
| **Airport data accuracy** | High - Wrong directions | Rigorous testing, user feedback loop |
| **Complex pathfinding performance** | Medium - Slow response | Algorithm optimization, caching routes |

### Medium Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Airport layout changes** | Medium - Outdated maps | Admin UI for easy updates |
| **User adoption** | Medium - Feature unused | Marketing, onboarding tutorial |
| **Scope creep** | Medium - Delayed release | Strict MVP scope, phased rollout |

### Low Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Image generation crashes** | Low - Temporary failures | Retry logic, graceful degradation |
| **Database migration issues** | Low - Deployment hiccup | Thorough staging tests |

---

## Success Criteria

### MVP Launch Criteria (Must-Have)

- [ ] `/navigate <flight_number>` command works end-to-end
- [ ] Route map image generated with red path overlay
- [ ] Manual location selection works (10+ preset locations)
- [ ] Pathfinding accurate for Terminal 1 main gates
- [ ] 80%+ test coverage
- [ ] Zero critical bugs
- [ ] Admin can add/edit waypoints via dashboard

### Post-Launch Goals (6 months)

- [ ] 500+ monthly active users
- [ ] 95%+ navigation accuracy (user feedback)
- [ ] < 2% error rate (crashes, wrong routes)
- [ ] Average route generation time < 2 seconds
- [ ] NPS score 70+

---

## Future Enhancements (v2.2+)

### Phase 2 Features (Post-MVP)

1. **Real-time Location Tracking**
   - GPS polling every 10 seconds
   - Geofencing alerts ("You've arrived at the gate!")
   - Rerouting if user deviates from path

2. **Additional Airports**
   - Gimpo Airport (김포)
   - Jeju Airport (제주)
   - International airports (Narita, Changi, etc.)

3. **Enhanced POI Search**
   - `/find restaurant` - 식당 검색
   - `/find restroom` - 화장실 찾기
   - `/find lounge` - 라운지 위치
   - `/find atm` - ATM, 환전소

4. **Accessibility Features**
   - Wheelchair-accessible routes only
   - Elevator-only navigation
   - Voice guidance (TTS integration)

5. **Multi-language Support**
   - English, Chinese, Japanese
   - Auto-detect user language preference

6. **Interactive Web Map**
   - Leaflet.js/Mapbox GL embedded view
   - Zoom, pan, layer switching
   - Share route URL

7. **Arrival Assistance**
   - Baggage claim navigation
   - Immigration line wait times
   - Ground transportation directions

8. **Integration with Flight Booking**
   - Auto-import from email (Gmail API)
   - Calendar integration (boarding reminders)

---

## Appendix

### A. Glossary

- **Waypoint:** 네비게이션 노드, 공항 내 주요 지점 (게이트, 카운터 등)
- **Pathfinding:** 최단 경로 탐색 알고리즘
- **Floor Plan:** 공항 층별 평면도
- **Turn-by-turn:** 단계별 이동 안내 (좌회전, 우회전 등)
- **Geofencing:** GPS 기반 지리적 경계 설정 및 알림

### B. References

- [Incheon Airport Open API Documentation](https://www.airport.kr/ap/ko/dep/openApi.do)
- [Telegram Bot API - Location](https://core.telegram.org/bots/api#location)
- [Dijkstra's Algorithm Explained](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm)
- [Node Canvas Documentation](https://github.com/Automattic/node-canvas)
- [MySQL Spatial Data Types](https://dev.mysql.com/doc/refman/8.0/en/spatial-types.html)

### C. Sample API Responses

**Flight Gate Info:**
```json
{
  "flight_number": "KE123",
  "airline": "대한항공",
  "airline_code": "KE",
  "departure_time": "2025-11-05T14:30:00+09:00",
  "terminal": "T1",
  "counter_zone": "A",
  "counter_numbers": "01-20",
  "gate_number": "101",
  "boarding_time": "2025-11-05T13:50:00+09:00",
  "status": "SCHEDULED"
}
```

**Navigation Route:**
```json
{
  "id": "nav-abc123",
  "flight_number": "KE123",
  "start": {
    "waypoint_id": "T1-3F-ENTRANCE-MAIN",
    "name_ko": "제1터미널 3층 메인 입구"
  },
  "end": {
    "waypoint_id": "T1-3F-GATE-101",
    "name_ko": "101번 게이트"
  },
  "route": {
    "path": ["T1-3F-ENTRANCE-MAIN", "T1-3F-COUNTER-A", "T1-3F-IMMIGRATION-C", "T1-3F-GATE-101"],
    "total_distance_meters": 450,
    "estimated_time_minutes": 8
  },
  "instructions": [
    {
      "step": 1,
      "instruction_ko": "A 체크인 카운터 방향으로 50m 이동",
      "distance_meters": 50,
      "time_minutes": 1
    },
    {
      "step": 2,
      "instruction_ko": "출국심사대 C 통과",
      "distance_meters": 100,
      "time_minutes": 2
    },
    {
      "step": 3,
      "instruction_ko": "101번 게이트까지 300m 직진",
      "distance_meters": 300,
      "time_minutes": 5
    }
  ],
  "map_image_url": "/api/navigation/route/nav-abc123/image"
}
```

---

## Approval & Sign-off

**Prepared by:** Claude (AI Assistant)
**Review Required by:**
- [ ] Product Owner
- [ ] Technical Lead
- [ ] Backend Engineer
- [ ] QA Lead

**Approval Status:** ⏳ Pending Review

**Next Steps:**
1. ✅ Review PRD with stakeholders
2. ⏳ Approve or request changes
3. ⏳ Set up development worktree
4. ⏳ Begin Phase 1 implementation

---

*End of PRD*
