/**
 * 친환경 법규 검토 시스템 - 법규 데이터베이스
 * 기준일: 2026.02.12
 * PDF 참조: 친환경법규 검토 양식(업데이트) ver. 2026.02.12
 */

// ─────────────────────────────────────────────
// 헬퍼 상수 & 함수
// ─────────────────────────────────────────────

/** 주거용 용도 */
const RESIDENTIAL_USES = ['단독주택', '공동주택', '기숙사', '오피스텔'];

/** 비주거용 판별 */
function isResidential(use) {
    return RESIDENTIAL_USES.includes(use);
}
function isNonResidential(use) {
    return !RESIDENTIAL_USES.includes(use);
}

/** ZEB 4등급 대상 용도 (1000㎡ 이상일 때) - 나머지는 5등급 */
const ZEB_GRADE4_USES = [
    '문화및집회시설', '종교시설', '판매시설', '운수시설',
    '의료시설', '교육연구시설', '노유자시설', '수련시설',
    '운동시설', '업무시설', '숙박시설', '위락시설',
    '교정시설', '방송통신시설', '묘지관련시설',
    '관광휴게시설', '장례시설'
];

/** 신재생에너지 의무 제외 용도 (주거용, 기타) */
const RENEWABLE_EXEMPT_USES = [
    '창고시설', '위험물저장및처리시설', '발전시설'
];

/** 신재생에너지 공급의무비율 (허가연도별) */
function getRenewableRate(permitYear) {
    if (permitYear <= 2025) return 34;
    if (permitYear <= 2027) return 36;
    if (permitYear <= 2029) return 38;
    return 40; // 2030~
}

/** BEMS 제외 용도 */
const BEMS_EXEMPT_USES = ['공동주택', '기숙사', '오피스텔', '공장', '자원순환관련시설', '발전시설'];

/** 비전기식 냉방 제외 용도 (건축법 시행령 별표1 제2호) */
const NON_ELECTRIC_COOLING_EXEMPT_USES = ['공동주택', '기숙사'];

/** 열관류율 지역 분류 */
function getThermalRegion(region, subRegion) {
    // 제주
    if (region === '제주특별자치도') return '제주도';

    // 직할 중부2 (서울, 대전, 세종, 인천, 충남, 전북)
    const directZone2 = ['서울특별시', '대전광역시', '세종특별자치시', '인천광역시',
                         '충청남도', '전북특별자치도', '고양시'];
    if (directZone2.includes(region)) return '중부2지역';

    // 직할 남부 (부산, 대구, 울산, 광주, 전남)
    const directSouth = ['부산광역시', '대구광역시', '울산광역시', '광주광역시', '전라남도'];
    if (directSouth.includes(region)) return '남부지역';

    // 강원특별자치도: 고성/속초/양양/강릉/동해/삼척 → 중부2, 그 외 → 중부1
    if (region === '강원특별자치도') {
        const gangwonCoast = ['고성', '속초', '양양', '강릉', '동해', '삼척'];
        return gangwonCoast.includes(subRegion) ? '중부2지역' : '중부1지역';
    }

    // 경기도: 연천/포천/가평/남양주/의정부/양주/동두천/파주 → 중부1, 그 외 → 중부2
    if (region === '경기도') {
        const gyeonggiNorth = ['연천', '포천', '가평', '남양주', '의정부', '양주', '동두천', '파주'];
        return gyeonggiNorth.includes(subRegion) ? '중부1지역' : '중부2지역';
    }

    // 충청북도: 제천 → 중부1, 그 외 → 중부2
    if (region === '충청북도') {
        return subRegion === '제천' ? '중부1지역' : '중부2지역';
    }

    // 경상북도: 봉화/청송 → 중부1, 울진/영덕/포항/경주/청도/경산 → 남부, 그 외 → 중부2
    if (region === '경상북도') {
        const gyeongbukZone1 = ['봉화', '청송'];
        const gyeongbukSouth = ['울진', '영덕', '포항', '경주', '청도', '경산'];
        if (gyeongbukZone1.includes(subRegion)) return '중부1지역';
        if (gyeongbukSouth.includes(subRegion)) return '남부지역';
        return '중부2지역';
    }

    // 경상남도: 거창/함양 → 중부2, 그 외 → 남부
    if (region === '경상남도') {
        const gyeongnamZone2 = ['거창', '함양'];
        return gyeongnamZone2.includes(subRegion) ? '중부2지역' : '남부지역';
    }

    return '중부2지역';
}

// ─────────────────────────────────────────────
// EV 충전 지역별 조례 데이터
// ─────────────────────────────────────────────
const EV_REGIONAL_DATA = {
    '서울특별시': { parking: 5, charger: 5, note: '대시설 충주차대수의 100분의 2 이상, 기축시설 충주차대수의 100분의 2' },
    '인천광역시': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5% (기축시설 100분의 2)' },
    '경기도': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5% (기축시설 100분의 2)' },
    '부산광역시': { parking: 5, charger: 5, note: '충전시설 급속+완속, 기축시설 100분의 2' },
    '대구광역시': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5%' },
    '광주광역시': { parking: 5, charger: 5, note: '신축시설 100분의 5, 기축 100분의 2' },
    '대전광역시': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5%' },
    '울산광역시': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5%' },
    '세종특별자치시': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5%' },
    '강원특별자치도': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5% (기축 100분의 2)' },
    '충청북도': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5%' },
    '충청남도': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5%' },
    '전북특별자치도': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5%' },
    '전라남도': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5%' },
    '경상북도': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5%' },
    '경상남도': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 5%' },
    '제주특별자치도': { parking: 5, charger: 5, note: '전용주차구역 5%, 충전시설 급속+완속' },
    '고양시': { parking: 5, charger: 5, note: '경기도 조례 준용' }
};

// ─────────────────────────────────────────────
// 중수도 지역별 조례 데이터
// ─────────────────────────────────────────────
const GRAYWATER_REGIONAL_DATA = {
    '서울특별시': {
        area: 60000,
        note: '서울시 물의재이용조례: 연면적 6만㎡ 이상 시설 (용도별 차등)',
        details: [
            '연면적 3만㎡ 이상 숙박시설',
            '연면적 5만㎡ 이상 문화·집회·판매·운수·의료·교육연구·업무·위락시설 등'
        ]
    },
    '경상남도': { area: 60000, note: '연면적 6만㎡ 이상' },
    '제주특별자치도': { area: 60000, note: '연면적 6만㎡ 이상' },
    '고양시': { area: 60000, note: '연면적 6만㎡ 이상' },
    '경기도': { area: 60000, note: '지역별 조례 상이 (과천시, 안산시, 오산시, 의정부시 등)' },
    '충청남도': { area: 60000, note: '보은군, 서산시, 청양군 등 지역별 조례' },
    '충청북도': { area: 60000, note: '지역별 조례' },
    '전북특별자치도': { area: 60000, note: '군산시, 임실군 등 지역별 조례' },
    '전라남도': { area: 60000, note: '나주시, 무안군, 순천시, 신안군, 장성군 등 지역별 조례' },
    '경상북도': { area: 60000, note: '고성군 등 지역별 조례' },
    // 나머지 지역은 국가 기준 (60,000㎡) 적용
};

// ─────────────────────────────────────────────
// 지역별 녹색건축물 설계기준 데이터
// ─────────────────────────────────────────────
const REGIONAL_GREEN_DATA = {
    '울산광역시': {
        name: '울산시 녹색건축물 설계기준',
        basis: '울산광역시 고시 제2024-297호 / 2025.1.3. 시행',
        grades: {
            residential: [
                { label: '가', condition: '1,000세대 이상', nonRes: '연면적 합계 10만㎡ 이상' },
                { label: '나', condition: '500세대 이상 ~ 1,000세대 미만', nonRes: '연면적 합계 1만㎡ 이상~10만㎡ 미만' },
                { label: '다', condition: '30세대 이상 ~ 500세대 미만', nonRes: '연면적 합계 3천㎡ 이상~1만㎡ 미만' },
                { label: '라', condition: '30세대 미만 (연면적 합계 500㎡ 이상)', nonRes: '연면적 합계 5백㎡ 이상~3천㎡ 미만' }
            ],
            greenCert: '우량(그린3등급) 이상',
            epi: 'EPI 일정점수 이상 충족',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    },
    '인천광역시': {
        name: '인천광역시 녹색건축물 설계기준',
        basis: '인천광역시고시 제2025-130 / 2025.05.19. 시행',
        grades: {
            residential: [
                { label: '가', condition: '1,000세대 이상', nonRes: '연면적 합계 10만㎡ 이상' },
                { label: '나', condition: '300세대 이상 ~ 1,000세대 미만', nonRes: '연면적 합계 1만㎡ 이상~10만㎡ 미만' },
                { label: '다', condition: '30세대 이상 ~ 300세대 미만', nonRes: '연면적 합계 3천㎡ 이상~1만㎡ 미만' },
                { label: '라', condition: '30세대 미만 (연면적 합계 500㎡ 이상)', nonRes: '연면적 합계 3천㎡ 미만' }
            ],
            greenCert: '우량(그린3등급) 이상 → 나 등급 기준',
            epi: '에너지절약설계기준 일정점수 이상',
            renewable: '연도별 설치비율 적용 / 태양광 발전설비 의무설치',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    },
    '부산광역시': {
        name: '부산광역시 녹색건축물 설계기준',
        basis: '부산광역시 고시',
        grades: {
            greenCert: '녹색건축 인증 기준 적용',
            epi: 'EPI 기준 적용',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    },
    '경기도': {
        name: '경기도 녹색건축물 설계기준',
        basis: '경기도 고시',
        grades: {
            greenCert: '녹색건축 인증 등급 기준 적용',
            epi: 'EPI 기준 적용',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    },
    '고양시': {
        name: '고양시 녹색건축물 설계기준',
        basis: '고양시 고시 (경기도 녹색건축물 설계기준 준용)',
        grades: {
            greenCert: '경기도 기준 준용',
            epi: 'EPI 기준 적용',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    },
    '대전광역시': {
        name: '대전광역시 녹색건축물 설계기준',
        basis: '대전광역시 고시',
        grades: {
            greenCert: '녹색건축 인증 기준 적용',
            epi: 'EPI 기준 적용',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    },
    '대구광역시': {
        name: '대구광역시 녹색건축물 설계기준',
        basis: '대구광역시 고시',
        grades: {
            greenCert: '녹색건축 인증 기준 적용',
            epi: 'EPI 기준 적용',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    },
    '광주광역시': {
        name: '광주광역시 녹색건축물 설계기준',
        basis: '광주광역시 고시',
        grades: {
            greenCert: '녹색건축 인증 기준 적용',
            epi: 'EPI 기준 적용',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    },
    '충청남도': {
        name: '충청남도 녹색건축물 설계기준',
        basis: '충청남도 고시',
        grades: {
            greenCert: '녹색건축 인증 기준 적용',
            epi: 'EPI 기준 적용',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    },
    '경상남도': {
        name: '경상남도 녹색건축물 설계기준',
        basis: '경상남도 고시',
        grades: {
            greenCert: '녹색건축 인증 기준 적용',
            epi: 'EPI 기준 적용',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    },
    '제주특별자치도': {
        name: '제주특별자치도 녹색건축물 설계기준',
        basis: '제주특별자치도 고시',
        grades: {
            greenCert: '녹색건축 인증 기준 적용',
            epi: 'EPI 기준 적용',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    },
    '세종특별자치시': {
        name: '세종특별자치시 녹색건축물 설계기준',
        basis: '세종특별자치시 고시',
        grades: {
            greenCert: '녹색건축 인증 기준 적용',
            epi: 'EPI 기준 적용',
            incentive: '녹색건축 최우수 6%, 우수 3% / ZEB 등급별 11~15% 건축기준 완화'
        }
    }
};


// ═══════════════════════════════════════════════
// 법규 데이터베이스 (37개 항목)
// ═══════════════════════════════════════════════

const REGULATIONS = {

    // ───────────────────────────────────────────
    // 1. 녹색건축물 조성 지원법
    // ───────────────────────────────────────────

    // 1) 에너지절약계획서 제출
    energySavingPlan: {
        category: "녹색건축물 조성 지원법",
        item: "에너지절약계획서 제출",
        basis: "법 제14조, 영 제10조, 규칙 제7조, 고시 제3조",
        content: "건축허가를 신청(대수선 제외), 용도변경의 허가신청 또는 신고, 건축물대장 기재내용의 변경을 신청하는 경우 에너지 절약계획서 제출\n제출대상: 연면적 합계 500㎡ 이상인 건축물",
        check: (data, context) => {
            if (data.buildingAction === '대수선') {
                return { applicable: false, detail: "대수선은 제출 제외" };
            }
            if (data.buildingUse === '단독주택') {
                return { applicable: false, detail: "단독주택은 에너지절약계획서 제출 대상 제외" };
            }
            if (data.totalFloorArea >= 500) {
                const epiMin = data.ownership === 'public' ? 74 : 65;
                return {
                    applicable: true,
                    detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 500㎡ → EPI ${epiMin}점 이상 필요 (${data.ownership === 'public' ? '공공기관 신축' : '일반'}). 동별로 에너지절약계획서 제출 원칙`
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 500㎡` };
        }
    },

    // 2) 녹색건축 인증
    greenBuildingCertification: {
        category: "녹색건축물 조성 지원법",
        item: "녹색건축 인증",
        basis: "법 제16조, 영 제11조의3",
        content: "공공기관이 신축·재축 또는 증축(별동 증축에 한함)하는 건축물\n연면적 3,000㎡ 이상 에너지절약계획서 제출 대상 건축물은 녹색건축 인증 대상",
        check: (data, context) => {
            // 에너지절약계획서 제출대상이어야 함
            const esp = context.energySavingPlan;
            if (esp && !esp.applicable) {
                return { applicable: false, detail: "에너지절약계획서 제출대상 아님" };
            }

            const targetActions = ['신축', '재축', '별동증축'];
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물 (공공만 의무)" };
            }
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 인증 대상 아님 (신축/재축/별동증축만 해당)` };
            }
            if (data.totalFloorArea >= 3000) {
                return {
                    applicable: true,
                    detail: `공공 건축물, 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 3,000㎡ → 녹색건축 인증대상`
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 3,000㎡` };
        }
    },

    // 3) 제로에너지건축물 인증
    zeroEnergyCertification: {
        category: "녹색건축물 조성 지원법",
        item: "제로에너지건축물 인증",
        basis: "법 제17조, 영 제12조, 영 별표1, 규칙 제9조",
        content: "대통령령으로 정하는 건축물을 건축 또는 리모델링하려는 건축주는 제로에너지건축물 인증등급 이상을 받아야 함\n공공: 500㎡ 이상 → 5등급(1,000㎡ 이상 4등급 용도 해당 시 4등급)\n민간: 1,000㎡ 이상 → 5등급 수준 설계\n공동주택: 30세대 이상",
        check: (data, context) => {
            const targetActions = ['신축', '재축', '별동증축', '전부개축'];
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님 (신축/재축/별동증축/전부개축만 해당)` };
            }

            // 기숙사는 건축물 범위에서 제외 (영 제12조, 영 별표1)
            if (data.buildingUse === '기숙사') {
                return { applicable: false, detail: "기숙사는 제로에너지건축물 인증 대상 건축물 범위에서 제외" };
            }

            const isPublic = data.ownership === 'public';
            const area = data.totalFloorArea;
            const use = data.buildingUse;
            const year = data.permitYear;

            // 공동주택: 30세대 이상
            const isApartment = use === '공동주택';
            // 4등급 대상 용도 판별
            const is4GradeUse = ZEB_GRADE4_USES.includes(use);

            // 공동주택은 세대수 기준만 적용 (면적 기준 적용 안 함)
            if (isApartment) {
                if (data.householdCount && data.householdCount >= 30) {
                    const grade = isPublic ? '5등급 취득 의무' : '5등급 수준 설계';
                    const label = isPublic ? '공공' : '민간';
                    return {
                        applicable: true,
                        detail: `${label} 공동주택 ${data.householdCount}세대 ≥ 30세대 → ${grade}`
                    };
                }
                const countText = data.householdCount ? `${data.householdCount}세대 < 30세대` : '세대수 미입력';
                return { applicable: false, detail: `공동주택 ${countText} → 30세대 미만은 대상 아님` };
            }

            if (isPublic) {
                // 2025년 기준: 공공 500㎡ 이상
                if (year >= 2025 && year < 2030) {
                    if (area >= 1000 && is4GradeUse) {
                        return {
                            applicable: true,
                            detail: `공공 건축물 연면적 ${area.toLocaleString()}㎡ ≥ 1,000㎡ (${use}) → 4등급 취득 의무`
                        };
                    }
                    if (area >= 500) {
                        return {
                            applicable: true,
                            detail: `공공 건축물 연면적 ${area.toLocaleString()}㎡ ≥ 500㎡ → 5등급 취득 의무`
                        };
                    }
                }
                // 2030년: 공공 대상 검토 (3등급 수준)
                if (year >= 2030) {
                    if (area >= 500) {
                        return {
                            applicable: true,
                            detail: `공공 건축물 연면적 ${area.toLocaleString()}㎡ ≥ 500㎡ → 3등급 수준 (2030년 로드맵)`
                        };
                    }
                }
                return { applicable: false, detail: `공공 연면적 ${area.toLocaleString()}㎡ < 500㎡` };
            }

            // 민간 (공동주택 제외 - 위에서 처리됨)
            if (year >= 2025 && year < 2030) {
                if (area >= 1000) {
                    return {
                        applicable: true,
                        detail: `민간 건축물 연면적 ${area.toLocaleString()}㎡ ≥ 1,000㎡ → 5등급 수준 설계`
                    };
                }
            }
            if (year >= 2030) {
                if (area >= 500) {
                    return {
                        applicable: true,
                        detail: `민간 건축물 연면적 ${area.toLocaleString()}㎡ ≥ 500㎡ → 5등급 수준 설계 (2030년 로드맵)`
                    };
                }
            }
            return { applicable: false, detail: `민간 연면적 ${area.toLocaleString()}㎡ < 1,000㎡` };
        }
    },

    // 4) 차양장치 설치
    sunshade: {
        category: "녹색건축물 조성 지원법",
        item: "차양 등의 설치",
        basis: "법 제14조의2, 영 제10조의2, 규칙 제7조의2",
        content: "공공기관의 장이 소유 또는 관리하는 건축물\n연면적 3,000㎡ 이상의 업무시설 또는 교육연구시설\n외벽에 창을 설치하거나 유리 등의 건축재료로 하는 경우 차양 등의 일사조절장치 설치",
        check: (data, context) => {
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물" };
            }
            const targetUses = ['업무시설', '교육연구시설'];
            if (!targetUses.includes(data.buildingUse)) {
                return { applicable: false, detail: `${data.buildingUse}은 차양 설치 대상 아님 (업무/교육연구시설만 해당)` };
            }
            if (data.totalFloorArea >= 3000) {
                return {
                    applicable: true,
                    detail: `공공 ${data.buildingUse} 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 3,000㎡ → 외벽 창에 일사조절장치 설치. 채광을 위한 유리 또는 플라스틱 재료`
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 3,000㎡` };
        }
    },

    // ───────────────────────────────────────────
    // 2. 녹색건축 인증에 관한 규칙
    // ───────────────────────────────────────────

    // 5) 녹색건축 인증 규칙 (인증대상 건축물 상세)
    greenBuildingCertRule: {
        category: "녹색건축 인증에 관한 규칙",
        item: "녹색건축 인증 의무 대상",
        basis: "기준 제7조, 규칙 제2조, 규칙 제6조, 규칙 제9조, 규칙 제11조, 세칙 제6조",
        content: "인증신청: 건축주·건축물소유자·사업주체·시공자 신청 가능, 별동 증축 인증대상 가능, 여러 동은 사업승인 또는 건축허가 단위로 신청 가능\n인증 유효기한: 인증서 발급일로부터 5년\n유효기한 연장: 만료일 180일 전부터 연장 신청 가능\n예비인증: 발급일부터 사용승인일 또는 사용검사일까지 유효",
        check: (data, context) => {
            const gc = context.greenBuildingCertification;
            if (gc && gc.applicable) {
                const isPublicOffice = data.ownership === 'public' && data.buildingUse === '업무시설';
                if (isPublicOffice && data.totalFloorArea >= 3000) {
                    return {
                        applicable: true,
                        detail: `녹색건축 인증 의무대상 (공공업무시설, 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 3,000㎡) → 우수(그린2등급) 이상 취득 의무. 인증서 발급일로부터 5년 유효`
                    };
                }
                return {
                    applicable: true,
                    detail: `녹색건축 인증 의무대상 → 인증서 발급일로부터 5년 유효. 대상건물 이외 장소 신재생에너지 설치·공급 인정`
                };
            }
            return { applicable: false, detail: "녹색건축 인증 의무대상 아님" };
        }
    },

    // ───────────────────────────────────────────
    // 3. 건축물의 에너지절약 설계기준
    // ───────────────────────────────────────────

    // 6) 설계기준 예외 (에너지절약계획서 제출 예외)
    designStandardException: {
        category: "건축물의 에너지절약 설계기준",
        item: "설계기준 적용예외",
        basis: "고시 제4조",
        content: "■ 설계 검토서(의무+성능지표+소요량평가서) 제출 예외 대상:\n① 제로에너지건축물 인증을 취득한 경우 (단, 인허가 시 예비인증서 제출 필요)\n② 열손실의 변동이 없는 증축, 용도변경 및 건축물대장기재내용 변경의 경우\n\n■ 성능지표(EPI) 제출 예외 대상:\n① 증축, 용도변경, 건축물대장기재내용을 변경하는 경우\n  (단, 별동증축·기존 연면적 1/2 이상 증축 + 증축 연면적 2,000㎡ 이상은 제출)\n② 소요량 평가서 판정기준 만족 시\n  (민간 150kWh/㎡년 미만, 1천㎡ 미만 200kWh/㎡년 미만, 공공 130kWh/㎡년 미만)",
        check: (data, context) => {
            const esp = context.energySavingPlan;
            const zeb = context.zeroEnergyCertification;

            if (esp && !esp.applicable) {
                return { applicable: false, detail: "에너지절약계획서 제출대상 아님" };
            }

            // 설계검토서 제출 예외 여부 먼저 판정 (설계검토서 = 의무+성능지표+소요량평가서)
            let isReportExempt = false;

            // 1) ZEB 인증 취득 시 설계검토서 제출 예외 (공공만 인증 의무, 민간은 인증 수준이므로 제외)
            if (zeb && zeb.applicable && data.ownership === 'public') {
                return {
                    applicable: true,
                    detail: '제로에너지건축물 인증 취득 시 설계검토서(의무+성능지표+소요량평가서) 제출 예외 (단, 인허가 시 예비인증서 제출 필요)'
                };
            }

            // 2) 열손실 변동 없는 증축/용도변경/건축물기재내용변경 → 설계검토서 전체 예외
            const exemptActions = ['증축', '용도변경', '건축물기재내용변경'];
            if (exemptActions.includes(data.buildingAction) && data.heatLossChange === 'no') {
                return {
                    applicable: true,
                    detail: '열손실의 변동이 없는 증축, 용도변경 및 건축물대장기재내용 변경 → 설계검토서(의무+성능지표+소요량평가서) 제출 예외'
                };
            }

            // 설계검토서 예외가 아닌 경우 → ① 설계검토서 + ② 성능지표 분리 표시
            let details = [];

            // ① 설계검토서 제출 여부
            if (exemptActions.includes(data.buildingAction) && data.heatLossChange === 'yes') {
                details.push('① 설계검토서: 열손실의 변동이 있는 경우 → 제출 필요');
            } else {
                details.push('① 설계검토서: 제출 필요');
            }

            // ② 성능지표(EPI) 제출 여부
            const isPublic = data.ownership === 'public';
            const energyThreshold = isPublic ? 130 : (data.totalFloorArea < 1000 ? 200 : 150);

            if (data.buildingAction === '별동증축') {
                if (data.primaryEnergy !== null && data.primaryEnergy < energyThreshold) {
                    details.push(`② 성능지표(EPI): 제출 예외 (소요량 평가서 판정기준 만족: ${data.primaryEnergy}kWh/㎡ < ${energyThreshold}kWh/㎡)`);
                } else if (data.primaryEnergy !== null && data.primaryEnergy >= energyThreshold) {
                    details.push(`② 성능지표(EPI): 별동증축 → 제출 대상 (${data.primaryEnergy}kWh/㎡ ≥ ${energyThreshold}kWh/㎡)`);
                } else {
                    details.push(`② 성능지표(EPI): 별동증축 → 제출 대상 (소요량 평가서 판정기준 만족 시 제출 예외: ${energyThreshold}kWh/㎡ 미만)`);
                }
            } else if (data.buildingAction === '증축') {
                if (data.isHalfExpansion === 'yes' && data.expansionArea && data.expansionArea >= 2000) {
                    if (data.primaryEnergy !== null && data.primaryEnergy < energyThreshold) {
                        details.push(`② 성능지표(EPI): 제출 예외 (소요량 평가서 판정기준 만족: ${data.primaryEnergy}kWh/㎡ < ${energyThreshold}kWh/㎡)`);
                    } else if (data.primaryEnergy !== null && data.primaryEnergy >= energyThreshold) {
                        details.push(`② 성능지표(EPI): 기존 연면적 1/2 이상 증축 + 증축 연면적 ${data.expansionArea.toLocaleString()}㎡ ≥ 2,000㎡ → 제출 대상 (${data.primaryEnergy}kWh/㎡ ≥ ${energyThreshold}kWh/㎡)`);
                    } else {
                        details.push(`② 성능지표(EPI): 기존 연면적 1/2 이상 증축 + 증축 연면적 ${data.expansionArea.toLocaleString()}㎡ ≥ 2,000㎡ → 제출 대상 (소요량 평가서 판정기준 만족 시 제출 예외: ${energyThreshold}kWh/㎡ 미만)`);
                    }
                } else if (data.isHalfExpansion === 'yes') {
                    details.push(`② 성능지표(EPI): 기존 연면적 1/2 이상 증축하고 증축 연면적 ${data.expansionArea ? data.expansionArea.toLocaleString() + '㎡' : '미입력'} < 2,000㎡ → 제출 예외`);
                } else {
                    details.push('② 성능지표(EPI): 증축 (기존 연면적 1/2 미만) → 제출 예외');
                }
            } else if (['용도변경', '건축물기재내용변경'].includes(data.buildingAction)) {
                details.push(`② 성능지표(EPI): ${data.buildingAction} → 제출 예외`);
            } else {
                if (data.primaryEnergy !== null && data.primaryEnergy < energyThreshold) {
                    details.push(`② 성능지표(EPI): 제출 예외 (1차 에너지소요량 합계 ${data.primaryEnergy}kWh/㎡ < ${energyThreshold}kWh/㎡)`);
                } else if (data.primaryEnergy !== null && data.primaryEnergy >= energyThreshold) {
                    details.push(`② 성능지표(EPI): 제출 대상 (1차 에너지소요량 합계 ${data.primaryEnergy}kWh/㎡ ≥ ${energyThreshold}kWh/㎡)`);
                } else {
                    details.push(`② 성능지표(EPI): 소요량 평가서 판정기준 만족 시 제출 예외 (1차 에너지소요량 합계 ${energyThreshold}kWh/㎡년 미만)`);
                }
            }

            return {
                applicable: true,
                detail: details.join('\n')
            };
        }
    },

    // 7) 열손실 방지조치
    thermalInsulation: {
        category: "건축물의 에너지절약 설계기준",
        item: "열손실 방지조치",
        basis: "고시 제2조, 제6조, 별표1, 별표3",
        content: "건축물을 건축(신축, 증축, 개축, 재축, 이전), 대수선, 용도변경 시 부위별 열관류율 기준 준수\n중부1/중부2/남부/제주 4개 권역별 기준 적용\n\n■ 예외:\n① 열손실 변동이 없는 증축·대수선·용도변경·건축물대장기재내용 변경\n② 창고·차고·기계실 등 거실 용도 아닌 비냉난방 공간\n③ 외기 개방 등 열손실 방지조치 효과 없는 공간\n④ 발전시설 중 원자력안전법에 따른 허가 건축물 (단, 발전소 내 사무동은 대상 포함)",
        check: (data, context) => {
            // 열손실 변동이 없는 증축/대수선/용도변경/건축물대장기재내용변경은 예외
            const heatLossExemptActions = ['증축', '대수선', '용도변경', '건축물기재내용변경'];
            if (heatLossExemptActions.includes(data.buildingAction) && data.heatLossChange === 'no') {
                return { applicable: false, detail: `${data.buildingAction} + 열손실 변동 없음 → 열손실 방지조치 예외` };
            }

            // 발전시설 중 원자력안전법 허가 건축물 예외 (단, 사무동은 대상)
            if (data.buildingUse === '발전시설') {
                return {
                    applicable: true,
                    detail: `발전시설 → 원자력안전법에 따른 허가 건축물은 열손실 방지조치 예외 (단, 발전소 내 사무동은 대상 포함). 해당 여부 확인 필요`
                };
            }

            const targetActions = ['신축', '증축', '별동증축', '개축', '전부개축', '재축', '대수선', '용도변경'];
            if (targetActions.includes(data.buildingAction)) {
                const thermalZone = getThermalRegion(data.region, data.subRegion);
                const locationText = data.subRegion ? `${data.region} ${data.subRegion}` : data.region;
                return {
                    applicable: true,
                    detail: `${locationText} → ${thermalZone}에 해당. ${thermalZone} 기준 열관류율 적용 필요. 열손실방지조치는 최소 기준이며, EPI 점수와 연계해 성능 향상 필요.\n※창고·차고·기계실 등 비냉난방 공간, 외기 개방 공간은 예외`
                };
            }
            return { applicable: false, detail: `${data.buildingAction}은 열손실 방지조치 대상 아님` };
        }
    },

    // 8) 건축부문 의무사항 (기존 epiArchitectural → architecturalMandatory)
    architecturalMandatory: {
        category: "건축물의 에너지절약 설계기준",
        item: "건축부문 의무사항",
        basis: "고시 제6조",
        content: "에너지절약계획서 및 설계검토서 제출대상 건축물:\n① EPI 건축부문 1번(외벽평균열관류율) 0.6점 이상 획득\n② 방풍구조: 출입구(외기에 직접 면하고 1층 또는 지상으로 연결되는 출입문) 방풍구조 설치 대상\n  예외: 사람의 통행을 주목적으로 하지 않는 출입문, 너비 1.2m 이하, 바닥면적 300㎡ 이하 개별점포, 주택(공동주택 포함, 기숙사 제외)\n③ 거실 외피면적당 평균 태양열취득 의무사항:\n  대상: 공공건축물 연면적 3,000㎡ 이상의 업무시설 또는 교육연구시설(영 제10조의2)을 건축 또는 리모델링하는 경우\n  적용: 에너지성능지표의 건축부문 7번 항목 배점 0.6점 이상 획득\n  예외: 제로에너지건축물 인증 취득 시, 에너지소요량 평가서 1차 에너지소요량 합계 130kWh/㎡ 미만 시",
        check: (data, context) => {
            const esp = context.energySavingPlan;
            if (!esp || !esp.applicable) {
                return { applicable: false, detail: "에너지절약계획서 제출대상 아님" };
            }

            let details = [];
            details.push('① EPI 의무: 건축부문 1번 항목(외벽평균열관류율) 0.6점 이상 획득');

            // 방풍구조: 주택(공동주택 포함, 기숙사 제외) 예외, 그 외 적용
            const windbreakExemptUses = ['단독주택', '공동주택', '오피스텔'];
            if (windbreakExemptUses.includes(data.buildingUse)) {
                details.push(`② 방풍구조: 해당없음 (주택 - ${data.buildingUse})`);
            } else if (data.buildingUse === '기숙사') {
                details.push('② 방풍구조: 출입구(외기에 직접 면하고 1층 또는 지상으로 연결되는 출입문) 방풍구조 적용 필요(기숙사는 예외 조건 없음)');
            } else {
                details.push('② 방풍구조: 출입구(외기에 직접 면하고 1층 또는 지상으로 연결되는 출입문) 방풍구조 적용 필요');
            }

            // 태양열취득: 공공 3,000㎡ 이상 업무/교육연구시설 여부에 따라 표시
            const isSolarTarget = data.ownership === 'public' && data.totalFloorArea >= 3000 &&
                ['업무시설', '교육연구시설'].includes(data.buildingUse);

            if (isSolarTarget) {
                const zeb = context.zeroEnergyCertification;

                if (data.primaryEnergy !== null && data.primaryEnergy < 130) {
                    details.push(`③ 거실 외피면적당 평균 태양열취득 의무사항: 해당없음 (1차 에너지소요량 합계 ${data.primaryEnergy}kWh/㎡ < 130kWh/㎡)`);
                } else if (zeb && zeb.applicable) {
                    details.push('③ 거실 외피면적당 평균 태양열취득 의무사항: 해당, 7번 항목 배점 0.6점 이상 획득 (적용예외: 제로에너지건축물 인증 취득)');
                } else {
                    details.push('③ 거실 외피면적당 평균 태양열취득 의무사항: 해당, 7번 항목 배점 0.6점 이상 획득 (예외: ZEB 인증 취득 시, 에너지소요량 1차 에너지 합계 130kWh/㎡ 미만 시)');
                }
            } else {
                details.push('③ 거실 외피면적당 평균 태양열취득 의무사항: 해당없음');
            }

            return {
                applicable: true,
                detail: details.join('\n')
            };
        }
    },

    // 9) 기계부문 의무사항
    mechanicalMandatory: {
        category: "건축물의 에너지절약 설계기준",
        item: "기계부문 의무사항",
        basis: "고시 제8조",
        content: "에너지절약계획서 제출대상 건축물:\n• 비전기식 냉방방식 설치\n• 고효율 냉난방설비 의무 적용\n• 전자식 원격검침계량기 설치 등",
        check: (data, context) => {
            const esp = context.energySavingPlan;
            if (!esp || !esp.applicable) {
                return { applicable: false, detail: "에너지절약계획서 제출대상 아님" };
            }

            let details = [];

            // 비전기식 냉방방식
            if (data.ownership === 'public' && data.totalFloorArea >= 1000 &&
                !NON_ELECTRIC_COOLING_EXEMPT_USES.includes(data.buildingUse)) {
                details.push('비전기식 냉방 설치 의무 (공공 1,000㎡ 이상)');
            }

            // 고효율 냉난방설비
            if (data.ownership === 'public' && data.totalFloorArea >= 3000 &&
                ['교육연구시설', '업무시설'].includes(data.buildingUse)) {
                details.push('고효율 냉난방설비 의무 (교육연구/업무시설 3,000㎡ 이상)');
            }

            // 원격검침계량기
            if (data.ownership === 'public' && data.totalFloorArea >= 3000 &&
                ['교육연구시설', '업무시설'].includes(data.buildingUse)) {
                details.push('전자식 원격검침계량기 설치 (교육연구/업무시설 3,000㎡ 이상)');
            }

            if (details.length === 0) {
                details.push('기계부문 의무사항 확인 필요');
            }

            return {
                applicable: true,
                detail: details.join('. ')
            };
        }
    },

    // 10) 전기부문 의무사항
    electricalMandatory: {
        category: "건축물의 에너지절약 설계기준",
        item: "전기부문 의무사항",
        basis: "고시 제10조",
        content: "전기부문 의무사항:\n• BEMS 구축\n• LED 조명기기 적용\n• ESS 설치 등",
        check: (data, context) => {
            const esp = context.energySavingPlan;
            if (!esp || !esp.applicable) {
                return { applicable: false, detail: "에너지절약계획서 제출대상 아님" };
            }
            return {
                applicable: true,
                detail: "전기부문 의무사항 확인 필요 (BEMS, LED, ESS 등은 개별 항목에서 상세 판정)"
            };
        }
    },

    // 11) 에너지성능지표(EPI) ★NEW
    epiScore: {
        category: "건축물의 에너지절약 설계기준",
        item: "에너지성능지표(EPI)",
        basis: "고시 제15조",
        content: "EPI 평점합계 65점 이상 적합\n공공기관 신축(별동증축 포함) 74점 이상\n연면적 합계 1,000㎡ 이상 신축·재축·전부개축·별동증축 시 EPI 의무적용",
        check: (data, context) => {
            const dse = context.designStandardException;

            // 설계기준 예외에서 ZEB 인증 취득 시 EPI 면제
            if (dse && dse.applicable && dse.detail && dse.detail.includes('ZEB 인증 취득')) {
                return {
                    applicable: true,
                    detail: "ZEB 인증 취득 시 EPI 면제 가능 (단, 허가시점 예비인증서 제출 필요)"
                };
            }

            const esp = context.energySavingPlan;
            if (!esp || !esp.applicable) {
                return { applicable: false, detail: "에너지절약계획서 제출대상 아님" };
            }

            const epiTargetActions = ['신축', '재축', '전부개축', '별동증축'];
            const isEpiMandatory = epiTargetActions.includes(data.buildingAction) && data.totalFloorArea >= 1000;

            if (data.ownership === 'public' && epiTargetActions.includes(data.buildingAction)) {
                return {
                    applicable: true,
                    detail: `공공기관 신축 건축물 → EPI 74점 이상 필요${isEpiMandatory ? '. 연면적 1,000㎡ 이상 EPI 의무적용 (의무화 대상 건축물은 2배이상 적용 필요)' : ''}`
                };
            }

            return {
                applicable: true,
                detail: `EPI 65점 이상 필요${isEpiMandatory ? '. 연면적 1,000㎡ 이상 EPI 의무적용 (의무화 대상 건축물은 2배이상 적용 필요)' : ''}`
            };
        }
    },

    // 12) 에너지소요량 평가서 제출
    energyConsumptionReport: {
        category: "건축물의 에너지절약 설계기준",
        item: "에너지소요량 평가서 제출",
        basis: "고시 제21조",
        content: "신축 또는 별동으로서 연면적 합계 3,000㎡ 이상\n업무시설, 교육연구시설은 에너지소요량 평가서 제출\nECO2-OD 시뮬레이션 필요",
        check: (data, context) => {
            const esp = context.energySavingPlan;
            if (!esp || !esp.applicable) {
                return { applicable: false, detail: "에너지절약계획서 제출대상 아님" };
            }

            const targetActions = ['신축', '별동증축'];
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 제출 대상 아님 (신축/별동증축만 해당)` };
            }

            const targetUses = ['업무시설', '교육연구시설'];
            if (targetUses.includes(data.buildingUse) && data.totalFloorArea >= 3000) {
                const isPublic = data.ownership === 'public';
                const kwhNum = isPublic ? 130 : (data.totalFloorArea < 1000 ? 200 : 150);
                const kwhLimit = isPublic ? '130kWh/㎡·yr' : '150kWh/㎡·yr (1천㎡ 미만 200kWh/㎡·yr)';

                if (data.primaryEnergy !== null && data.primaryEnergy < kwhNum) {
                    return {
                        applicable: true,
                        detail: `${data.buildingUse} 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 3,000㎡ → 판정기준 적합 (1차 에너지소요량 합계 ${data.primaryEnergy}kWh/㎡ < ${kwhNum}kWh/㎡)`
                    };
                } else if (data.primaryEnergy !== null && data.primaryEnergy >= kwhNum) {
                    return {
                        applicable: true,
                        detail: `${data.buildingUse} 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 3,000㎡ → 판정기준 부적합 (1차 에너지소요량 합계 ${data.primaryEnergy}kWh/㎡ ≥ ${kwhNum}kWh/㎡). 설계 개선 필요`
                    };
                }

                return {
                    applicable: true,
                    detail: `${data.buildingUse} 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 3,000㎡ → 단위면적당 1차 에너지소요량 ${kwhLimit} 미만. ECO2-OD 시뮬레이션 필요`
                };
            }
            return { applicable: false, detail: `${data.buildingUse}: 업무/교육연구시설 3,000㎡ 미만 → 제출 대상 아님` };
        }
    },

    // ───────────────────────────────────────────
    // 4. 신에너지 및 재생에너지 개발·이용·보급 촉진법
    // ───────────────────────────────────────────

    // 13) 신재생에너지 설비 설치 의무
    renewableEnergy: {
        category: "신에너지 및 재생에너지 개발·이용·보급 촉진법",
        item: "신재생에너지 설비 설치 의무",
        basis: "법 제12조, 영 제15조~17조, 영 별표2",
        content: "설치의무기관이 신축·증축 또는 개축하는 연면적 1,000㎡ 이상 건축물\n예상 에너지사용량의 일정 비율 이상 신재생에너지 설비 설치\n연도별 비율: '24~'25: 34% → '26~'27: 36% → '28~'29: 38% → '30~: 40%",
        check: (data, context) => {
            const zeb = context.zeroEnergyCertification;

            const targetActions = ['신축', '증축', '별동증축', '개축', '전부개축'];
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님` };
            }

            // 의무기관: 국가, 지자체, 공공기관, 연간 50억 이상 정부출연연구기관, 정부출자기업체 등
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물 (설치의무기관만 해당)" };
            }

            // 제외 용도
            if (RENEWABLE_EXEMPT_USES.includes(data.buildingUse)) {
                return { applicable: false, detail: `${data.buildingUse}은 신재생에너지 의무 제외 용도 (주거용·기타: 창고, 위험물저장, 발전시설 등 제외)` };
            }

            if (data.totalFloorArea >= 1000) {
                const rate = getRenewableRate(data.permitYear);

                // ZEB 인증 대상과의 관계
                let zebNote = '';
                if (zeb && zeb.applicable) {
                    zebNote = '. ZEB 인증 대상 → 에너지자립률 기준으로 신재생에너지 부문 적용';
                }

                return {
                    applicable: true,
                    detail: `공공 건축물 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 1,000㎡ → 예상에너지사용량의 ${rate}% 이상 신재생에너지 설치 (${data.permitYear}년 기준)${zebNote}`
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 1,000㎡` };
        }
    },

    // 14) ZEB 의무취득 (공공기관 에너지이용 합리화 규정 관점) ★NEW
    zebObligation: {
        category: "공공기관 에너지이용 합리화 추진에 관한 규정",
        item: "제로에너지건축물 의무취득",
        basis: "규정 제6조, 규칙 제2조, 기준 별표1",
        content: "공공기관 중 에너지절약계획서 또는 친환경주택 에너지절약계획서 제출대상\n연면적 500㎡ 이상 신축, 재축, 별동 증축하는 건축물\n공동주택 30세대 이상, 기숙사 제외",
        check: (data, context) => {
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물" };
            }
            if (data.buildingUse === '기숙사') {
                return { applicable: false, detail: "기숙사는 ZEB 의무취득 제외" };
            }
            const targetActions = ['신축', '재축', '별동증축'];
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님` };
            }
            if (data.totalFloorArea >= 500) {
                return {
                    applicable: true,
                    detail: `공공 건축물 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 500㎡ → ZEB 의무취득 대상. 인증기준 별표1의2 단위면적당 1차에너지 생산량 기준`
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 500㎡` };
        }
    },

    // ───────────────────────────────────────────
    // 5. 공공기관 에너지이용 합리화 규정
    // ───────────────────────────────────────────

    // 15) BEMS 구축
    bems: {
        category: "공공기관 에너지이용 합리화 추진에 관한 규정",
        item: "BEMS 구축",
        basis: "규정 제6조",
        content: "공공기관에서 에너지절약계획서 제출대상 중\n연면적 10,000㎡ 이상 건축물의 신축, 별동증축하는 경우\n건물에너지관리시스템(BEMS) 구축·운영\n제외: 공동주택, 기숙사, 오피스텔, 공장, 자원순환시설, 발전시설",
        check: (data, context) => {
            const targetActions = ['신축', '별동증축'];
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물" };
            }
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님` };
            }
            // 제외 용도
            if (BEMS_EXEMPT_USES.includes(data.buildingUse)) {
                return { applicable: false, detail: `${data.buildingUse}: BEMS 제외 용도 (공동주택, 기숙사, 오피스텔, 공장, 자원순환시설, 발전시설)` };
            }
            if (data.totalFloorArea >= 10000) {
                return {
                    applicable: true,
                    detail: `공공 건축물 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 10,000㎡ → BEMS 구축·운영 의무. ZEB 인증기준 별표1의2에 따른 BEMS 설치`
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 10,000㎡` };
        }
    },

    // 16) 비전기식 냉방방식
    nonElectricCooling: {
        category: "공공기관 에너지이용 합리화 추진에 관한 규정",
        item: "비전기식 냉방방식",
        basis: "규정 제10조",
        content: "공공기관 연면적 1,000㎡ 이상 건축물을 신축·증축하는 경우\n냉방설비 전면 교체 시 비전기식 냉방방식 60% 이상 설치\n(축열식 전기 냉방, 가스 및 유류이용 냉방 등)\n제외: 공동주택, 기숙사",
        check: (data, context) => {
            const targetActions = ['신축', '증축', '별동증축'];
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물" };
            }
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님` };
            }
            // 제외 용도: 공동주택 등
            if (NON_ELECTRIC_COOLING_EXEMPT_USES.includes(data.buildingUse)) {
                return { applicable: false, detail: `${data.buildingUse}: 비전기식 냉방 제외 용도 (공동주택, 기숙사)` };
            }
            if (data.totalFloorArea >= 1000) {
                let exemptions = [];
                if (data.totalFloorArea < 3000) {
                    exemptions.push('도시가스 미공급 지역에서 건축하는 시설 중 연면적 3,000㎡ 미만인 경우 제외 가능');
                }
                return {
                    applicable: true,
                    detail: `공공 건축물 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 1,000㎡ → 냉방용량 60% 이상 비전기식 설치${exemptions.length > 0 ? '. ' + exemptions.join('. ') : ''}`
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 1,000㎡` };
        }
    },

    // 17) 고효율에너지기자재 (LED + ESS 통합) ★NEW
    highEfficiencyEquipment: {
        category: "공공기관 에너지이용 합리화 추진에 관한 규정",
        item: "고효율에너지기자재 사용 (LED·ESS)",
        basis: "규정 제11조",
        content: "공공기관 소유 건축물:\n• 실내 및 주차장 조명기기 LED제품 100% 적용\n• 계약전력 2,000kW 이상 건축물에 계약전력 5% 이상 ESS 설치\n  (임대·임차 건축물, 발전시설 등 제외)",
        check: (data, context) => {
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물" };
            }
            let details = ['LED 조명기기 100% 적용 의무'];
            details.push('계약전력 2,000kW 이상인 경우 계약전력 5% 이상 ESS 설치 (임대·임차 건축물, 발전시설 등 제외)');
            return {
                applicable: true,
                detail: details.join('. ')
            };
        }
    },

    // 18) 옥외 경관조명 ★NEW
    outdoorLighting: {
        category: "공공기관 에너지이용 합리화 추진에 관한 규정",
        item: "옥외 경관조명 LED 조명 사용",
        basis: "규정 제12조",
        content: "건축물 미관이나 조형물, 수목, 상징물 등을 위하여 옥외 경관조명 설치 불가\n특별한 사유에 의해 설치하는 경우 반드시 LED 조명 사용\n홍보광고판 등 심야(23:00~익일 일출 시) 소등 필요",
        check: (data, context) => {
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물" };
            }
            return {
                applicable: true,
                detail: "공공 건축물 → 옥외 경관조명 원칙적 설치 불가. 홍보광고판 등 심야(23:00~익일 일출 시) 소등 필요. 단, 기관명 표시, 안내 표시 등은 예외"
            };
        }
    },

    // 19) 친환경 자동차 전용주차구역
    ecoCarParking: {
        category: "공공기관 에너지이용 합리화 추진에 관한 규정",
        item: "친환경 자동차 전용주차구역",
        basis: "규정 제16조",
        content: "공공기관 청사주차장(50대 이상)\n경차 및 환경친화적 자동차 전용 주차면 10% 이상 설치\n주차장 바닥 면에 '경차', '환경친화적 자동차' 등 표시",
        check: (data, context) => {
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물" };
            }
            return {
                applicable: true,
                detail: "공공 건축물 → 주차단위구획 50대 이상 시 경차 및 환경친화적 자동차 전용 주차면 10% 이상 설치. 주차장 바닥 면에 '경차', '환경친화적 자동차' 등 표시"
            };
        }
    },

    // ───────────────────────────────────────────
    // 6. 에너지이용 합리화법
    // ───────────────────────────────────────────

    // 20) 에너지사용계획서 제출
    energyUsePlan: {
        category: "에너지이용 합리화법",
        item: "에너지사용계획서 제출",
        basis: "법 제10조, 영 제20조",
        content: "공공: 연간 2,500TOE 이상 연료/열 또는 연간 10,000MWh 이상 전력 사용 시설\n민간: 연간 5,000TOE 이상 연료/열 또는 연간 20,000MWh 이상 전력 사용 시설",
        check: (data, context) => {
            if (data.ownership === 'public') {
                if ((data.fuelUsage && data.fuelUsage >= 2500) || (data.electricUsage && data.electricUsage >= 10000)) {
                    return {
                        applicable: true,
                        detail: `공공사업 - 연료/열 ${data.fuelUsage || 0}TOE, 전력 ${data.electricUsage || 0}MWh → 에너지사용계획서 제출 대상`
                    };
                }
            } else {
                if ((data.fuelUsage && data.fuelUsage >= 5000) || (data.electricUsage && data.electricUsage >= 20000)) {
                    return {
                        applicable: true,
                        detail: `민간사업 - 연료/열 ${data.fuelUsage || 0}TOE, 전력 ${data.electricUsage || 0}MWh → 에너지사용계획서 제출 대상`
                    };
                }
            }
            return { applicable: false, detail: "에너지 사용량 미입력 또는 기준 미만" };
        }
    },

    // ───────────────────────────────────────────
    // 7. 분산에너지 활성화 특별법
    // ───────────────────────────────────────────

    // 21) 분산에너지 설비 설치계획서 제출 ★NEW
    distributedEnergy: {
        category: "분산에너지 활성화 특별법",
        item: "분산에너지 설비 설치계획서 제출",
        basis: "법 제13조, 영 제10조",
        content: "연간 20만MWh 이상 에너지 사용이 예상되는 건축물\n또는 사업면적이 100만㎡ 이상인 사업 시행자\n수도권(서울·인천·경기) 100%, 비수도권 0%\n면제: 의료시설, 교육연구시설, 노유자시설, 발전시설, 국방군사시설",
        check: (data, context) => {
            // 연간 20만MWh 이상 사용 예상 건축물
            if (data.electricUsage && data.electricUsage >= 200000) {
                const isCapital = ['서울특별시', '인천광역시', '경기도', '고양시'].includes(data.region);
                return {
                    applicable: true,
                    detail: `연간 전력사용 ${data.electricUsage.toLocaleString()}MWh ≥ 200,000MWh → 분산에너지 설비 설치계획서 제출. ${isCapital ? '수도권 100%' : '비수도권 0%'} 지역별 비율. 면제대상: 의료시설, 교육연구시설, 노유자시설, 발전시설, 국방군사시설`
                };
            }
            return { applicable: false, detail: "연간 전력사용량 200,000MWh 미만 또는 미입력" };
        }
    },

    // ───────────────────────────────────────────
    // 8. 물의 재이용 촉진 및 지원에 관한 법률
    // ───────────────────────────────────────────

    // 22) 빗물이용시설 설치
    rainwaterSystem: {
        category: "물의 재이용 촉진 및 지원에 관한 법률",
        item: "빗물이용시설 설치",
        basis: "법 제8조, 영 제10조, 규칙 제4조",
        content: "설치 대상:\n• 지붕면적 1,000㎡ 이상 (신축·개축·재축 or 증축 누적)\n• 건축면적 10,000㎡ 이상 공동주택\n• 건축면적 5,000㎡ 이상 학교\n• 부지면적 100,000㎡ 이상\n• 매장면적 3,000㎡ 이상",
        check: (data, context) => {
            let reasons = [];

            // 지붕면적 1,000㎡ 이상 (운동장 있는 체육관, 공공업무시설, 공공기관 청사)
            if (data.roofArea && data.roofArea >= 1000) {
                reasons.push(`지붕면적 ${data.roofArea.toLocaleString()}㎡ ≥ 1,000㎡ → 우수조 용량: 지붕면적 × 0.05m`);
            }

            // 건축면적 10,000㎡ 이상 (공동주택)
            if (data.buildingUse === '공동주택' && data.buildingArea && data.buildingArea >= 10000) {
                reasons.push(`공동주택 건축면적 ${data.buildingArea.toLocaleString()}㎡ ≥ 10,000㎡`);
            }

            // 건축면적 5,000㎡ 이상 (학교)
            if (data.buildingUse === '교육연구시설' && data.buildingArea && data.buildingArea >= 5000) {
                reasons.push(`교육연구시설(학교) 건축면적 ${data.buildingArea.toLocaleString()}㎡ ≥ 5,000㎡`);
            }

            // 부지면적 100,000㎡ 이상
            if (data.siteArea && data.siteArea >= 100000) {
                reasons.push(`부지면적 ${data.siteArea.toLocaleString()}㎡ ≥ 100,000㎡`);
            }

            // 매장면적 3,000㎡ 이상
            if (data.storeArea && data.storeArea >= 3000) {
                reasons.push(`매장면적 ${data.storeArea.toLocaleString()}㎡ ≥ 3,000㎡`);
            }

            if (reasons.length > 0) {
                return {
                    applicable: true,
                    detail: reasons.join('. ') + '. ※ 설치대상 상세기준 해당 지자체 조례 참조 필요'
                };
            }
            return { applicable: false, detail: "지붕면적/건축면적/부지면적/매장면적 미입력 또는 기준 미만" };
        }
    },

    // 23) 중수도 설치
    grayWaterSystem: {
        category: "물의 재이용 촉진 및 지원에 관한 법률",
        item: "중수도 설치",
        basis: "법 제9조, 영 제11조, 규칙 제7조",
        content: "연면적 60,000㎡ 이상 특정시설\n(숙박업, 대규모점포, 업무시설 등)\n지역별 조례에 따라 기준 상이",
        check: (data, context) => {
            const regionalData = GRAYWATER_REGIONAL_DATA[data.region];
            const threshold = regionalData ? regionalData.area : 60000;

            if (data.totalFloorArea >= threshold) {
                let note = regionalData ? regionalData.note : '국가기준 적용';
                return {
                    applicable: true,
                    detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ ${threshold.toLocaleString()}㎡ → 중수도 설치 대상 (용도별 확인 필요). ${note}`
                };
            }

            // 서울시 특례: 용도별 차등 면적
            if (data.region === '서울특별시') {
                if (data.buildingUse === '숙박시설' && data.totalFloorArea >= 30000) {
                    return {
                        applicable: true,
                        detail: `서울시 숙박시설 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 30,000㎡ → 중수도 설치 대상`
                    };
                }
                const seoul50000Uses = ['문화및집회시설', '판매시설', '운수시설', '의료시설',
                                         '교육연구시설', '업무시설', '위락시설'];
                if (seoul50000Uses.includes(data.buildingUse) && data.totalFloorArea >= 50000) {
                    return {
                        applicable: true,
                        detail: `서울시 ${data.buildingUse} 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 50,000㎡ → 중수도 설치 대상`
                    };
                }
            }

            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < ${threshold.toLocaleString()}㎡` };
        }
    },

    // ───────────────────────────────────────────
    // 9. 자전거 이용 활성화에 관한 법률
    // ───────────────────────────────────────────

    // 24) 자전거 주차장 설치
    bicycleParking: {
        category: "자전거 이용 활성화에 관한 법률",
        item: "자전거 주차장 설치",
        basis: "법 제11조, 영 제7조, 영 별표1",
        content: "주차장법에 따른 시설물에 자동차 주차대수의 10~20% 자전거 주차장 설치\n5대 미만 제외\n20% 대상: 문화·집회, 종교, 판매, 운수, 의료, 운동, 업무, 공동주택 등\n10% 대상: 위락, 수련, 공장, 창고, 발전, 관광휴게 등",
        check: (data, context) => {
            if (data.totalFloorArea < 500) {
                return { applicable: false, detail: "소규모 시설" };
            }

            // 20% 대상: 문화·집회(관람장 제외), 종교, 판매, 운수, 의료, 운동, 업무(외국공관 제외), 오피스텔, 방송국, 장례식장
            // + 제1종 근린(공중화장실, 대피소, 지역아동센터 제외), 제2종 근린, 숙박
            // + 다가구주택, 공동주택(기숙사 및 다세대주택 제외), 오피스텔
            const rate20Uses = [
                '문화및집회시설', '종교시설', '판매시설', '운수시설', '의료시설',
                '운동시설', '업무시설', '오피스텔', '방송통신시설', '장례시설',
                '제1종근린생활시설', '제2종근린생활시설', '숙박시설',
                '공동주택'
            ];

            // 10% 대상: 위락시설, 수련시설, 공장, 창고시설, 발전시설, 관광휴게시설, 데이터센터
            const rate10Uses = [
                '위락시설', '수련시설', '공장', '창고시설', '발전시설', '관광휴게시설'
            ];

            let rate = '10~20%';
            if (rate20Uses.includes(data.buildingUse)) {
                rate = '20%';
            } else if (rate10Uses.includes(data.buildingUse)) {
                rate = '10%';
            }

            return {
                applicable: true,
                detail: `자동차 주차대수의 ${rate} 자전거 주차장 설치 (5대 미만 제외). ※ 지자체 조례로 2분의 1 범위 완화/강화 가능`
            };
        }
    },

    // ───────────────────────────────────────────
    // 10. 환경영향평가법
    // ───────────────────────────────────────────

    // 25) 환경영향평가 ★NEW
    environmentalImpact: {
        category: "환경영향평가법",
        item: "환경영향평가",
        basis: "법 제2조, 법 제22조, 영 제31조, 영 별표3",
        content: "도시의 개발사업, 산업입지·산업단지 조성, 에너지개발, 관광단지 개발 등\n일정 규모 이상의 사업\n건축물 건축: 연면적 10만㎡ 이상",
        check: (data, context) => {
            // 건축물 건축 기준: 연면적 10만㎡ 이상
            if (data.totalFloorArea >= 100000) {
                return {
                    applicable: true,
                    detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 100,000㎡ → 환경영향평가 대상 확인 후 제출여부 판단. 전략환경영향평가 및 환경영향평가 대상`
                };
            }
            // 사업면적 기준도 있지만 입력값 없으므로 알림
            if (data.siteArea && data.siteArea >= 250000) {
                return {
                    applicable: true,
                    detail: `부지면적 ${data.siteArea.toLocaleString()}㎡ → 환경영향평가 대상 가능 (사업유형별 기준 확인 필요)`
                };
            }
            return { applicable: false, detail: "연면적 100,000㎡ 미만 → 환경영향평가 대상 확인 필요 (사업유형별 기준 상이)" };
        }
    },

    // ───────────────────────────────────────────
    // 11. 장애물 없는 생활환경 인증
    // ───────────────────────────────────────────

    // 26) BF 인증
    bfCertification: {
        category: "장애물 없는 생활환경 인증",
        item: "BF 인증",
        basis: "법 제10조의2, 영 제5조의2",
        content: "국가·지자체·공공기관이 설치하는 공공건물 및 공중이용시설\n신축·별동증축·전부개축·재축 시 의무 인증\n공동주택 의무대상 제외\n등급: 최우수 90점 이상, 우수 80~90, 일반 70~80\n인증 유효기간 10년",
        check: (data, context) => {
            const targetActions = ['신축', '별동증축', '전부개축', '재축'];
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물 (공공만 의무, 공동주택 의무대상 제외)" };
            }
            if (data.buildingUse === '공동주택' || data.buildingUse === '기숙사') {
                return { applicable: false, detail: `${data.buildingUse}은 BF 인증 의무대상 제외` };
            }
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 인증 대상 아님` };
            }
            return {
                applicable: true,
                detail: "공공건물 및 공중이용시설 → BF 인증 의무 (일반등급 이상). 최우수 90점 이상, 우수 80~90, 일반 70~80. 인증 유효기간 10년"
            };
        }
    },

    // ───────────────────────────────────────────
    // 12. 건축물 마감재료의 난연성능 기준
    // ───────────────────────────────────────────

    // 27) 외벽 준불연 이상 단열재
    fireResistantMaterial: {
        category: "건축물 마감재료의 난연성능 및 화재 확산 방지구조 기준",
        item: "외벽 준불연 이상 마감재료",
        basis: "법 제52조, 영 제61조, 규칙 제24조, 기준 제31조",
        content: "3층 이상 또는 높이 9m 이상 건축물의 외벽에 불연 또는 준불연 마감재료 사용\n의료시설, 교육연구시설, 노유자시설, 수련시설의 용도로 쓰이는 건축물 포함\n1층 전부/일부를 필로티 구조로 설치하여 주차장으로 쓰는 건축물 포함",
        check: (data, context) => {
            return {
                applicable: true,
                detail: "3층 이상 또는 높이 9m 이상 건축물 → 외벽 단열재 준불연 이상 적용. 1층 전부/일부를 필로티 구조로 설치하여 주차장으로 쓰는 건축물 포함"
            };
        }
    },

    // ───────────────────────────────────────────
    // 13. 환경친화적 자동차법
    // ───────────────────────────────────────────

    // 28) 전기차 충전시설
    evCharging: {
        category: "환경친화적 자동차의 개발 및 보급 촉진에 관한 법률",
        item: "전기차 충전시설",
        basis: "법 제11조의2, 영 제18조의5~7",
        content: "주차단위구획 총수(기계식 제외) 50대 이상 시설\n총주차대수의 5% 이상 전용주차구역 및 충전시설 설치\n지역 조례에 따라 차등\n급속충전시설(40kW 이상) 및 완속충전시설 설치",
        check: (data, context) => {
            const targetActions = ['신축', '증축', '별동증축', '개축', '전부개축', '재축'];
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님` };
            }

            const regionalEV = EV_REGIONAL_DATA[data.region] || { parking: 5, charger: 5, note: '기본 5%' };

            let detail = `주차단위구획 50대 이상 시 → 전용주차구역 ${regionalEV.parking}%, 충전시설 ${regionalEV.charger}% 설치`;
            if (data.permitYear < 2022) {
                detail += ' (2022.1.28 이전 건축허가: 기축시설 기준 적용)';
            }
            detail += `. ${data.region} 조례: ${regionalEV.note}`;

            // 급속충전시설: 최대 출력값이 40kW 이상, 완속: 40kW 미만
            detail += '. 급속충전시설(40kW 이상) 및 완속충전시설 설치';

            return { applicable: true, detail };
        }
    },

    // ───────────────────────────────────────────
    // 14~21. 서울시 기준 및 지역별 녹색건축물
    // ───────────────────────────────────────────

    // 29) 지역별 녹색건축물 설계기준 (12개 지역 동적) ★NEW
    regionalGreenBuilding: {
        category: "지역별 녹색건축물 설계기준",
        item: "지역별 녹색건축물 설계기준",
        basis: "각 지역 녹색건축물 설계기준 고시",
        content: "에너지절약계획서 제출대상 건축물에 대해 각 지역 녹색건축물 설계기준 적용\n녹색건축인증, 에너지성능, 신재생에너지 비율, 인센티브 등\n등급구분: [가]~[라] (세대수/연면적 기준)",
        check: (data, context) => {
            // 서울은 별도 항목
            if (data.region === '서울특별시') {
                return { applicable: false, detail: "서울특별시는 별도 항목(서울시 녹색건축물 설계기준)에서 판정" };
            }

            const esp = context.energySavingPlan;
            if (!esp || !esp.applicable) {
                return { applicable: false, detail: "에너지절약계획서 제출대상 아님" };
            }

            const region = data.region === '고양시' ? '고양시' : data.region;
            const rgData = REGIONAL_GREEN_DATA[region];

            if (!rgData) {
                return {
                    applicable: true,
                    detail: `${data.region}: 별도 녹색건축물 설계기준 고시 없음 → 국가 기준(건축물의 에너지절약 설계기준) 적용. 녹색건축인증·ZEB 인증 취득 시 건축기준 완화 인센티브 가능`
                };
            }

            // 등급 구분
            let grade = '라';
            const area = data.totalFloorArea;
            const hh = data.householdCount || 0;
            const isRes = isResidential(data.buildingUse);

            if (isRes) {
                if (hh >= 1000 || area >= 100000) grade = '가';
                else if ((hh >= 300 && hh < 1000) || (area >= 10000 && area < 100000)) grade = '나';
                else if ((hh >= 30 && hh < 300) || (area >= 3000 && area < 10000)) grade = '다';
            } else {
                if (area >= 100000) grade = '가';
                else if (area >= 10000 && area < 100000) grade = '나';
                else if (area >= 3000 && area < 10000) grade = '다';
            }

            return {
                applicable: true,
                detail: `${rgData.name} 적용 (${rgData.basis}). [${grade}] 등급. 녹색건축인증: ${rgData.grades.greenCert}. ${rgData.grades.epi}. ${rgData.grades.incentive}`
            };
        }
    },

    // 30) 서울시 녹색건축물 설계기준
    seoulGreenBuilding: {
        category: "서울시 녹색건축물 설계기준",
        item: "서울시 녹색건축 기준",
        basis: "서울특별시 고시 제2025-7호 / 2025.1.2. 시행",
        content: "에너지절약계획서 제출 대상 건축물 또는 주택법 제15조 사업계획승인 대상 공동주택에 적용\n등급구분 [가]~[라]\n환경성능·에너지성능·에너지관리·신재생에너지 부문\nZEB 인증 취득 시 에너지 성능·관리·신재생에너지 평가 제외",
        check: (data, context) => {
            if (data.region !== '서울특별시') {
                return { applicable: false, detail: "서울특별시 아님" };
            }

            const esp = context.energySavingPlan;
            if (!esp || !esp.applicable) {
                return { applicable: false, detail: "에너지절약계획서 제출대상 아님" };
            }

            // 등급 구분
            let grade = '라';
            const area = data.totalFloorArea;
            const hh = data.householdCount || 0;
            const isRes = isResidential(data.buildingUse);

            if (isRes) {
                if (hh >= 1000) grade = '가';
                else if (hh >= 300 && hh < 1000) grade = '나';
                else if (hh >= 30 && hh < 300) grade = '다';
            } else {
                if (area >= 100000) grade = '가';
                else if (area >= 10000 && area < 100000) grade = '나';
                else if (area >= 3000 && area < 10000) grade = '다';
            }

            // 건축행위별 적용
            const newBuildActions = ['신축', '별동증축', '전부개축', '재축'];
            let actionNote = '';
            if (newBuildActions.includes(data.buildingAction)) {
                actionNote = `신축 등 → [${grade}] 등급 전면 적용`;
            } else if (['증축', '개축'].includes(data.buildingAction)) {
                actionNote = `수직/수평 증축, 일부 개축 → [라] 등급 적용`;
                grade = '라';
            } else {
                actionNote = `용도변경/기재내용변경/대수선 → [라] 등급 적용 (열손실 변동 시)`;
                grade = '라';
            }

            // 환경성능: 녹색건축인증
            let envNote = '';
            if (grade === '가') envNote = '녹색건축인증 우수(그린2등급) 이상';
            else if (grade === '나') envNote = '녹색건축인증 우량(그린3등급) 이상';
            else if (grade === '다') envNote = '녹색건축인증 일반(그린4등급) 이상';

            // 에너지성능: 건축물에너지효율등급(폐지) → 설계기준 개정 전까지 적용 제외 (1등급 이상 적용)
            let energyNote = '에너지효율등급 1등급 이상 적용';

            // 신재생에너지 비율
            const renewYear = data.permitYear;
            let renewRate = '';
            if (data.ownership === 'public') {
                if (renewYear <= 2023) renewRate = '32%';
                else if (renewYear <= 2024) renewRate = '33%';
                else if (renewYear <= 2025) renewRate = '34%';
                else if (renewYear <= 2026) renewRate = '36%';
                else renewRate = '36%';
            } else {
                // 민간 [가]~[다] 등급별 상이
                if (grade === '가') {
                    if (renewYear <= 2025) renewRate = '11%';
                    else if (renewYear <= 2026) renewRate = '11.5%';
                    else renewRate = '11.5%';
                } else if (grade === '나') {
                    if (renewYear <= 2025) renewRate = '10%';
                    else if (renewYear <= 2026) renewRate = '10.5%';
                    else renewRate = '11%';
                } else if (grade === '다') {
                    if (renewYear <= 2025) renewRate = '9.5%';
                    else if (renewYear <= 2026) renewRate = '10%';
                    else renewRate = '10.5%';
                }
            }

            let detail = `서울시 녹색건축물 설계기준 [${grade}] 등급 적용. ${actionNote}`;
            if (envNote) detail += `. 환경성능: ${envNote}`;
            detail += `. ${energyNote}`;
            if (renewRate) detail += `. 신재생에너지 설치비율: ${data.ownership === 'public' ? '공공' : '민간'} ${renewRate}`;
            detail += `. 연면적 3만㎡ 이상 비주거 건물 → 지하개발면적의 50% 이상 지열 설치`;

            // ZEB 인증 시 에너지 평가 제외
            const zeb = context.zeroEnergyCertification;
            if (zeb && zeb.applicable) {
                detail += '. ZEB 인증 취득 시 제1항의 에너지 성능, 에너지 관리, 신재생에너지 평가를 제외';
            }

            return { applicable: true, detail };
        }
    },

    // 31) 서울시 지구단위계획 + 유리커튼월 ★NEW
    seoulDistrictPlan: {
        category: "서울시 지구단위계획·유리커튼월 가이드라인",
        item: "서울시 지구단위계획 친환경 기준",
        basis: "서울시 지구단위계획 수립기준·관리운영기준 (2024.10), 서울시 유리커튼월 가이드라인 (2023.12)",
        content: "지구단위계획 대상의 경우 친환경 계획 검토\n유리커튼월 건물: 연면적 합계 500㎡ 이상(에너지절약계획서 제출대상)\n조류충돌 저감구역 내 유리커튼월 건물\n벽면율 40% 이상 설정, 로이복층유리 또는 로이삼중유리 사양 적용 권장",
        check: (data, context) => {
            if (data.region !== '서울특별시') {
                return { applicable: false, detail: "서울특별시 아님" };
            }

            let details = [];

            // 에너지절약계획서 제출대상(연면적 500㎡ 이상)이면 유리커튼월 에너지부문 해당
            const esp = context.energySavingPlan;
            if (esp && esp.applicable) {
                details.push('유리커튼월 건물 에너지부문 해당: 벽면율 40%이상 설정, 로이복층유리 또는 로이삼중유리 사양 적용 권장');
                details.push('표준모델 대비 에너지절감 목표치 20% 이상 달성 계획');
            }

            // 지구단위계획 기준
            details.push('지구단위계획 대상 시 친환경계획 검토 (비오톱, 생태네트워크, 바람길, 열환경, 대기질 등)');

            return {
                applicable: true,
                detail: details.join('. ')
            };
        }
    },

    // 32) 생태면적률
    ecologicalArea: {
        category: "서울시 생태면적률 운영지침",
        item: "생태면적률",
        basis: "서울시 생태면적률 운영지침 2025.05.21. 시행",
        content: "서울시 도시관리계획, 개발행위허가 대상 사업 및 공공건축물에 생태면적률 적용\n공동주택(다세대주택 제외): 30% 이상\n공공 건축물 및 기반시설: 30% 이상\n그 외 건축물: 20% 이상\n녹지지역: 50% 이상",
        check: (data, context) => {
            if (data.region !== '서울특별시') {
                return { applicable: false, detail: "서울특별시 아님" };
            }

            // 생태면적률 적용기준
            let standard = '';
            if (data.buildingUse === '공동주택') {
                standard = '공동주택(다세대주택 제외) 30% 이상';
            } else if (data.ownership === 'public') {
                standard = '국가·지자체 등 공공 건축물 및 기반시설 30% 이상';
            } else {
                standard = '(1) 이외의 건축물 20% 이상';
            }

            // 녹지지역은 50% 이상
            let note = '녹지지역 시설 및 건축물 50% 이상';

            return {
                applicable: true,
                detail: `서울시 생태면적률 적용: ${standard}. ${note}. 용도지역별 상세 기준 적용 (상업 25~35%, 주거 40~55% 등)`
            };
        }
    },

    // 33) 서울시 환경영향평가 ★NEW
    seoulEnvironmentalImpact: {
        category: "서울시 환경영향평가",
        item: "서울시 환경영향평가",
        basis: "서울특별시 환경영향평가 조례 제9368호, 고시 제2022-844호",
        content: "서울시 내 도시개발, 정비사업, 택지·대지조성 등 일정규모 이상 사업\n건축물 건축: 연면적 10만㎡ 이상\n온실가스·신재생에너지·LED·비전기식냉방·녹색건축인증·전기차인프라·빗물관리·생태면적률 등 평가",
        check: (data, context) => {
            if (data.region !== '서울특별시') {
                return { applicable: false, detail: "서울특별시 아님" };
            }
            if (data.totalFloorArea >= 100000) {
                return {
                    applicable: true,
                    detail: `서울시 건축물 건축 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 100,000㎡ → 환경영향평가 대상. 온실가스·신재생에너지·LED·비전기식냉방·녹색건축인증·전기차인프라·빗물관리·생태면적률 등 평가사항`
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 100,000㎡ (사업유형별 면적 기준 별도 확인 필요)` };
        }
    },

    // 34) 마곡지구 친환경 기준
    magokDistrict: {
        category: "마곡 도시개발사업 지구단위계획 시행지침",
        item: "마곡지구 친환경 기준",
        basis: "마곡 지구단위계획 시행지침 서울특별시고시 제2024-450호 / 2024.9.19. 시행",
        content: "마곡지구 내 건축물:\n• 공동주택 외 EPI 81점 이상 의무적용\n• 빗물이용시설 설치 권장\n• 하수처리수 재이용 적극 권장\n• 공공: 생태면적률 30% 이상, 태양광 의무\n• 민간: 생태면적률 20% 이상 (공동주택 30%)",
        check: (data, context) => {
            if (data.region !== '서울특별시' || data.isMagok !== 'yes') {
                return { applicable: false, detail: "마곡지구 아님" };
            }

            let details = [];
            details.push('공동주택 외 건축물 에너지성능지표(EPI) 81점 이상 의무적용');
            details.push('빗물이용시설 설치 권장 (물의재이용법 기준 준수)');
            details.push('하수처리수 재이용 적극 권장');

            // 민간/공공 구분
            if (data.ownership === 'public') {
                details.push('공공부문: 생태면적률 30% 이상, 신재생에너지 설치 (태양광 의무)');
            } else {
                details.push('민간부문: 생태면적률 20% 이상 (공동주택 30% 이상)');
            }

            return {
                applicable: true,
                detail: details.join('. ')
            };
        }
    },

    // 35) 서울형 장애물 없는 건물 인증제 ★NEW
    seoulBFBuilding: {
        category: "서울형 장애물 없는 건물 인증제",
        item: "서울형 장애물 없는 건물 인증",
        basis: "장애인·노인·임산부 등의 편의증진 보장에 관한 법률 제6조",
        content: "서울지역 민간시설물:\n• 전체인증: 병원, 소매점, 음식점, 공중화장실\n• 부분인증: 약국, 소매점, 음식점, 장애인용 화장실\n의무사항은 아니지만 허가권자의 요청이 있을 수 있음",
        check: (data, context) => {
            if (data.region !== '서울특별시') {
                return { applicable: false, detail: "서울특별시 아님" };
            }
            return {
                applicable: true,
                detail: "서울형 장애물 없는 건물 인증: 의무사항은 아니지만 허가권자의 요청이 있을 수 있음. 건축허가 후 사용승인(준공) 시 신청. 편의시설 적합성 확인 후 자치구에 인증신청서 제출"
            };
        }
    },

    // 36) 저영향개발(LID) 사전협의
    lidConsultation: {
        category: "서울특별시 저영향개발 사전협의",
        item: "저영향개발(LID) 사전협의",
        basis: "서울특별시 물순환 회복 및 저영향개발 기본조례 제9473호 (2025.1.3. 시행)",
        content: "대지면적 1,000㎡ 이상이거나 건축 연면적 1,500㎡ 이상인 건축물\n빗물관리시설 설치 및 빗물분담량 적용\n신축·증축·별동증축·개축·전부개축·재축 대상",
        check: (data, context) => {
            if (data.region !== '서울특별시') {
                return { applicable: false, detail: "서울특별시 아님" };
            }

            const targetActions = ['신축', '증축', '별동증축', '개축', '전부개축', '재축'];
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님` };
            }

            if ((data.siteArea && data.siteArea >= 1000) || data.totalFloorArea >= 1500) {
                return {
                    applicable: true,
                    detail: `대지면적 ${data.siteArea || '미입력'}㎡ 또는 연면적 ${data.totalFloorArea.toLocaleString()}㎡ → LID 사전협의 대상. 빗물관리시설 설치 및 빗물분담량 적용`
                };
            }
            return { applicable: false, detail: "대지면적 1,000㎡ 미만 및 연면적 1,500㎡ 미만" };
        }
    },

    // 37) 인센티브 (건축기준 완화) ★NEW
    incentives: {
        category: "건축기준 완화 (인센티브)",
        item: "건축기준 완화 적용",
        basis: "녹색건축물 조성 지원법 제15조, 건축물의 에너지절약설계기준 별표9, 건축법 제56조·제60조·제61조",
        content: "가. 녹색건축 인증: 최우수(그린1등급) 6%, 우수(그린2등급) 3%\n나. ZEB 인증: 1등급/+등급 15%, 2등급 14%, 3등급 13%, 4등급 12%, 5등급 11%\n다. 재활용 건축자재: 25%이상 15%, 20%이상 10%, 15%이상 5%\n가~다목 합산 최대 15%\n용적률·건축물 높이 완화 적용",
        check: (data, context) => {
            let items = [];

            // 녹색건축 인증에 따른 완화
            items.push('가. 녹색건축 인증: 최우수(그린1등급) 6%, 우수(그린2등급) 3%');

            // ZEB 인증에 따른 완화
            items.push('나. ZEB 인증: 1등급/+등급 15%, 2등급 14%, 3등급 13%, 4등급 12%, 5등급 11%');
            items.push('   에너지효율 1++등급 6%, 1+등급 3%');

            // 재활용 건축자재
            items.push('다. 재활용 건축자재: 25%이상 사용 15%, 20%이상 10%, 15%이상 5%');

            // 취득세 감면
            items.push('취득세 감면(26년12월31일까지): 녹색건축 최우수 10%, 우수 5%');
            items.push('ZEB 취득세: +등급/1등급 20%, 2등급/3등급 표기, 4등급 18%, 5등급 15%');

            // 용적률/높이 완화 공식
            items.push('용적률 완화: 기준 용적률 × [1 + 완화기준]. 높이제한 완화: 최고높이 × [1 + 완화기준]. 최대 115% 이하');

            return {
                applicable: true,
                detail: items.join('. ')
            };
        }
    }
};


// ═══════════════════════════════════════════════
// 의존성 안전 순서 (REGULATION_ORDER)
// ═══════════════════════════════════════════════

const REGULATION_ORDER = [
    // --- 국가 법규 ---
    'energySavingPlan',           // 1. ROOT
    'greenBuildingCertification', // 2. depends on 1
    'zeroEnergyCertification',    // 3. depends on 1
    'sunshade',                   // 4.
    'greenBuildingCertRule',      // 5. depends on 2
    'designStandardException',    // 6. depends on 1, 3
    'thermalInsulation',          // 7.
    'architecturalMandatory',     // 8. depends on 1
    'mechanicalMandatory',        // 9. depends on 1
    'electricalMandatory',        // 10. depends on 1
    'epiScore',                   // 11. depends on 6
    'energyConsumptionReport',    // 12. depends on 1, 11
    'renewableEnergy',            // 13. depends on 3
    'zebObligation',              // 14.
    'bems',                       // 15.
    'nonElectricCooling',         // 16.
    'highEfficiencyEquipment',    // 17.
    'outdoorLighting',            // 18.
    'ecoCarParking',              // 19.
    'energyUsePlan',              // 20.
    'distributedEnergy',          // 21.
    'rainwaterSystem',            // 22.
    'grayWaterSystem',            // 23.
    'bicycleParking',             // 24.
    'environmentalImpact',        // 25.
    'bfCertification',            // 26.
    'fireResistantMaterial',      // 27.
    'evCharging',                 // 28.
    // --- 지역별 ---
    'regionalGreenBuilding',      // 29.
    'seoulGreenBuilding',         // 30.
    'seoulDistrictPlan',          // 31.
    'ecologicalArea',             // 32.
    'seoulEnvironmentalImpact',   // 33.
    'magokDistrict',              // 34.
    'seoulBFBuilding',            // 35.
    'lidConsultation',            // 36.
    'incentives'                  // 37.
];

// Export for use in app.js
window.REGULATIONS = REGULATIONS;
window.REGULATION_ORDER = REGULATION_ORDER;
