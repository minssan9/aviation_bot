// 요일별 항공지식 데이터
const aviationKnowledge = {
  0: { // 일요일
    topic: "응급상황 및 안전",
    subjects: [
      "Engine Failure 시 Best Glide Speed와 Landing Site 선정",
      "Spatial Disorientation 예방과 발생 시 대응방법", 
      "Emergency Descent 절차와 Cabin Pressurization 문제",
      "Fire Emergency (Engine, Electrical, Cabin) 대응절차",
      "Inadvertent IMC Entry 시 절차와 예방방법"
    ]
  },
  1: { // 월요일
    topic: "항공역학",
    subjects: [
      "Bernoulli's Principle과 실제 양력 생성 원리의 차이점",
      "Wing Loading이 항공기 성능에 미치는 영향",
      "Stall의 종류와 각각의 특성 (Power-on, Power-off, Accelerated stall)",
      "Ground Effect 현상과 이착륙 시 고려사항",
      "Adverse Yaw 현상과 조종사의 대응방법"
    ]
  },
  2: { // 화요일
    topic: "항법",
    subjects: [
      "ILS Approach의 구성요소와 Category별 최저기상조건",
      "GPS WAAS와 기존 GPS의 차이점 및 정밀접근 가능성",
      "VOR Station Check 절차와 정확도 확인 방법",
      "Dead Reckoning과 Pilotage의 실제 적용",
      "Magnetic Variation과 Deviation의 차이 및 계산법"
    ]
  },
  3: { // 수요일
    topic: "기상학",
    subjects: [
      "Thunderstorm의 생성과정과 3단계 (Cumulus, Mature, Dissipating)",
      "Wind Shear의 종류와 조종사 대응절차",
      "Icing 조건과 Anti-ice/De-ice 시스템 작동원리",
      "Mountain Wave와 Rotor의 형성 및 위험성",
      "METAR/TAF 해석과 실제 비행계획 적용"
    ]
  },
  4: { // 목요일
    topic: "항공기 시스템",
    subjects: [
      "Turbocharged vs Supercharged Engine의 차이점과 운용방법",
      "Electrical System 구성과 Generator/Alternator 고장 시 절차",
      "Hydraulic System의 작동원리와 백업 시스템",
      "Pitot-Static System과 관련 계기 오류 패턴",
      "Fuel System과 Fuel Management 절차"
    ]
  },
  5: { // 금요일
    topic: "비행 규정",
    subjects: [
      "Class A, B, C, D, E Airspace의 입장 요건과 장비 요구사항",
      "사업용 조종사의 Duty Time과 Rest Requirements",
      "IFR Alternate Airport 선정 기준과 Fuel Requirements",
      "Medical Certificate의 종류별 유효기간과 제한사항",
      "Controlled Airport에서의 Communication Procedures"
    ]
  },
  6: { // 토요일
    topic: "비행 계획 및 성능",
    subjects: [
      "Weight & Balance 계산과 CG Envelope 내 유지 방법",
      "Takeoff/Landing Performance Chart 해석과 실제 적용",
      "Density Altitude 계산과 항공기 성능에 미치는 영향",
      "Wind Triangle과 Ground Speed 계산",
      "Fuel Planning과 Reserve Fuel 요구사항"
    ]
  }
};

class AviationKnowledgeManager {
  static getKnowledgeByDay(dayOfWeek) {
    return aviationKnowledge[dayOfWeek];
  }

  static getRandomSubject(dayOfWeek) {
    const knowledge = this.getKnowledgeByDay(dayOfWeek);
    return knowledge.subjects[Math.floor(Math.random() * knowledge.subjects.length)];
  }

  static getAllTopics() {
    return Object.values(aviationKnowledge).map(k => k.topic);
  }

  static getWeeklySchedule() {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return days.map((day, index) => ({
      day,
      topic: aviationKnowledge[index].topic
    }));
  }
}

module.exports = { aviationKnowledge, AviationKnowledgeManager };