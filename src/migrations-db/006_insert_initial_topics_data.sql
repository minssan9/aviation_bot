-- 기본 토픽 데이터 삽입 (simplified structure - no day_of_week)
INSERT INTO topics (name, description, topic_category, difficulty_level) VALUES
('응급상황 및 안전', '항공기 운항 중 발생할 수 있는 응급상황과 안전 절차에 대한 지식', '안전 및 응급상황', 'advanced'),
('항공역학', '항공기 비행 원리와 공기역학적 특성에 대한 기본 이론', '항공역학', 'intermediate'),
('항법', '항공기 항법 시스템과 비행 경로 계획에 관한 지식', '항법', 'intermediate'),
('기상학', '항공 기상과 날씨가 비행에 미치는 영향', '기상학', 'intermediate'),
('항공기 시스템', '항공기의 각종 시스템과 작동 원리', '항공기 시스템', 'intermediate'),
('비행 규정', '항공 법규와 운항 절차에 관한 규정', '비행 규정', 'intermediate'),
('비행 계획 및 성능', '항공기 성능 계산과 비행 계획 수립', '비행 계획', 'intermediate')
ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  topic_category = VALUES(topic_category),
  difficulty_level = VALUES(difficulty_level),
  updated_at = CURRENT_TIMESTAMP;

-- 응급상황 및 안전 주제들
INSERT INTO subjects (topic_id, title, content, difficulty_level, sort_order) VALUES
((SELECT id FROM topics WHERE name = '응급상황 및 안전'), 'Engine Failure 시 Best Glide Speed와 Landing Site 선정', 'Engine Failure 발생 시 최적 활공속도 유지와 비상착륙지 선정 절차', 'advanced', 1),
((SELECT id FROM topics WHERE name = '응급상황 및 안전'), 'Spatial Disorientation 예방과 발생 시 대응방법', '공간정위상실의 원인과 예방법, 발생 시 회복 절차', 'intermediate', 2),
((SELECT id FROM topics WHERE name = '응급상황 및 안전'), 'Emergency Descent 절차와 Cabin Pressurization 문제', '비상강하 절차와 객실 압력 시스템 문제 대응', 'advanced', 3),
((SELECT id FROM topics WHERE name = '응급상황 및 안전'), 'Fire Emergency (Engine, Electrical, Cabin) 대응절차', '엔진, 전기, 객실 화재 시 비상 대응 절차', 'advanced', 4),
((SELECT id FROM topics WHERE name = '응급상황 및 안전'), 'Inadvertent IMC Entry 시 절차와 예방방법', '의도하지 않은 기상조건 진입 시 절차와 예방법', 'intermediate', 5);

-- 항공역학 주제들
INSERT INTO subjects (topic_id, title, content, difficulty_level, sort_order) VALUES
((SELECT id FROM topics WHERE name = '항공역학'), 'Bernoulli\'s Principle과 실제 양력 생성 원리의 차이점', '베르누이 정리와 실제 양력 생성 메커니즘의 차이', 'intermediate', 1),
((SELECT id FROM topics WHERE name = '항공역학'), 'Wing Loading이 항공기 성능에 미치는 영향', '날개 하중이 항공기 성능에 미치는 영향 분석', 'intermediate', 2),
((SELECT id FROM topics WHERE name = '항공역학'), 'Stall의 종류와 각각의 특성 (Power-on, Power-off, Accelerated stall)', '실속의 유형별 특성과 회복 방법', 'advanced', 3),
((SELECT id FROM topics WHERE name = '항공역학'), 'Ground Effect 현상과 이착륙 시 고려사항', '지면효과 현상과 이착륙 시 영향', 'intermediate', 4),
((SELECT id FROM topics WHERE name = '항공역학'), 'Adverse Yaw 현상과 조종사의 대응방법', '역 요잉 현상의 원인과 대응 방법', 'intermediate', 5);

-- 항법 주제들
INSERT INTO subjects (topic_id, title, content, difficulty_level, sort_order) VALUES
((SELECT id FROM topics WHERE name = '항법'), 'ILS Approach의 구성요소와 Category별 최저기상조건', 'ILS 접근의 구성 요소와 카테고리별 기상 최저조건', 'advanced', 1),
((SELECT id FROM topics WHERE name = '항법'), 'GPS WAAS와 기존 GPS의 차이점 및 정밀접근 가능성', 'WAAS GPS와 일반 GPS의 차이점 및 정밀접근 활용', 'intermediate', 2),
((SELECT id FROM topics WHERE name = '항법'), 'VOR Station Check 절차와 정확도 확인 방법', 'VOR 스테이션 점검 절차와 정확도 검증', 'intermediate', 3),
((SELECT id FROM topics WHERE name = '항법'), 'Dead Reckoning과 Pilotage의 실제 적용', '추측항법과 지문항법의 실제 적용 방법', 'beginner', 4),
((SELECT id FROM topics WHERE name = '항법'), 'Magnetic Variation과 Deviation의 차이 및 계산법', '자기편각과 자차의 차이점 및 계산 방법', 'intermediate', 5);

-- 기상학 주제들
INSERT INTO subjects (topic_id, title, content, difficulty_level, sort_order) VALUES
((SELECT id FROM topics WHERE name = '기상학'), 'Thunderstorm의 생성과정과 3단계 (Cumulus, Mature, Dissipating)', '뇌우의 생성 과정과 발달 단계별 특성', 'intermediate', 1),
((SELECT id FROM topics WHERE name = '기상학'), 'Wind Shear의 종류와 조종사 대응절차', '윈드시어의 유형과 조종사 대응 절차', 'advanced', 2),
((SELECT id FROM topics WHERE name = '기상학'), 'Icing 조건과 Anti-ice/De-ice 시스템 작동원리', '결빙 조건과 방빙/제빙 시스템 작동 원리', 'advanced', 3),
((SELECT id FROM topics WHERE name = '기상학'), 'Mountain Wave와 Rotor의 형성 및 위험성', '산악파와 회전류의 형성 과정과 위험성', 'advanced', 4),
((SELECT id FROM topics WHERE name = '기상학'), 'METAR/TAF 해석과 실제 비행계획 적용', '기상 전문 해석과 비행 계획 적용', 'intermediate', 5);

-- 항공기 시스템 주제들
INSERT INTO subjects (topic_id, title, content, difficulty_level, sort_order) VALUES
((SELECT id FROM topics WHERE name = '항공기 시스템'), 'Turbocharged vs Supercharged Engine의 차이점과 운용방법', '터보차지와 수퍼차지 엔진의 차이점 및 운용법', 'advanced', 1),
((SELECT id FROM topics WHERE name = '항공기 시스템'), 'Electrical System 구성과 Generator/Alternator 고장 시 절차', '전기 시스템 구성과 발전기 고장 시 절차', 'advanced', 2),
((SELECT id FROM topics WHERE name = '항공기 시스템'), 'Hydraulic System의 작동원리와 백업 시스템', '유압 시스템의 작동 원리와 백업 시스템', 'advanced', 3),
((SELECT id FROM topics WHERE name = '항공기 시스템'), 'Pitot-Static System과 관련 계기 오류 패턴', '피토-정압 시스템과 계기 오류 패턴', 'intermediate', 4),
((SELECT id FROM topics WHERE name = '항공기 시스템'), 'Fuel System과 Fuel Management 절차', '연료 시스템과 연료 관리 절차', 'intermediate', 5);

-- 비행 규정 주제들
INSERT INTO subjects (topic_id, title, content, difficulty_level, sort_order) VALUES
((SELECT id FROM topics WHERE name = '비행 규정'), 'Class A, B, C, D, E Airspace의 입장 요건과 장비 요구사항', '관제공역별 입장 요건과 필요 장비', 'intermediate', 1),
((SELECT id FROM topics WHERE name = '비행 규정'), '사업용 조종사의 Duty Time과 Rest Requirements', '사업용 조종사의 근무 시간과 휴식 요구사항', 'intermediate', 2),
((SELECT id FROM topics WHERE name = '비행 규정'), 'IFR Alternate Airport 선정 기준과 Fuel Requirements', '계기비행 대체공항 선정 기준과 연료 요구사항', 'advanced', 3),
((SELECT id FROM topics WHERE name = '비행 규정'), 'Medical Certificate의 종류별 유효기간과 제한사항', '항공신체검사증명서 종류별 유효기간과 제한', 'beginner', 4),
((SELECT id FROM topics WHERE name = '비행 규정'), 'Controlled Airport에서의 Communication Procedures', '관제공항에서의 통신 절차', 'intermediate', 5);

-- 비행 계획 및 성능 주제들
INSERT INTO subjects (topic_id, title, content, difficulty_level, sort_order) VALUES
((SELECT id FROM topics WHERE name = '비행 계획 및 성능'), 'Weight & Balance 계산과 CG Envelope 내 유지 방법', '중량과 균형 계산 및 중심 위치 유지 방법', 'intermediate', 1),
((SELECT id FROM topics WHERE name = '비행 계획 및 성능'), 'Takeoff/Landing Performance Chart 해석과 실제 적용', '이착륙 성능 차트 해석과 실제 적용', 'intermediate', 2),
((SELECT id FROM topics WHERE name = '비행 계획 및 성능'), 'Density Altitude 계산과 항공기 성능에 미치는 영향', '밀도고도 계산과 항공기 성능에 미치는 영향', 'intermediate', 3),
((SELECT id FROM topics WHERE name = '비행 계획 및 성능'), 'Wind Triangle과 Ground Speed 계산', '풍향 삼각형과 대지속도 계산', 'beginner', 4),
((SELECT id FROM topics WHERE name = '비행 계획 및 성능'), 'Fuel Planning과 Reserve Fuel 요구사항', '연료 계획과 예비 연료 요구사항', 'intermediate', 5)
ON DUPLICATE KEY UPDATE 
  content = VALUES(content),
  difficulty_level = VALUES(difficulty_level),
  sort_order = VALUES(sort_order),
  updated_at = CURRENT_TIMESTAMP;