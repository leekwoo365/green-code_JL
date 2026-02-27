/**
 * Phase 5: 검증 테스트 스크립트
 * Node.js로 regulations.js의 판정 로직을 6개 시나리오로 검증
 * 실행: node test_regulations.js
 */

// Node.js 환경에서 window 시뮬레이션
global.window = {};

// regulations.js 로드
require('./regulations.js');

const REGULATIONS = window.REGULATIONS;
const REGULATION_ORDER = window.REGULATION_ORDER;

// 검토 실행 함수 (app.js의 runRegulationCheck 로직 재현)
function runCheck(data) {
    const context = {};
    const results = {};

    REGULATION_ORDER.forEach(regKey => {
        const regulation = REGULATIONS[regKey];
        if (!regulation) return;
        const checkResult = regulation.check(data, context);
        context[regKey] = checkResult;
        results[regKey] = {
            item: regulation.item,
            applicable: checkResult.applicable,
            detail: checkResult.detail
        };
    });

    return results;
}

// 테스트 결과 카운터
let passed = 0;
let failed = 0;
let total = 0;

function assert(testName, condition, detail) {
    total++;
    if (condition) {
        passed++;
        console.log(`  ✓ ${testName}`);
    } else {
        failed++;
        console.log(`  ✗ ${testName}`);
        console.log(`    → ${detail || '조건 불일치'}`);
    }
}

// ══════════════════════════════════════════
// 시나리오 1: 공공 + 업무시설 + 서울 + 신축 + 3000㎡
// ══════════════════════════════════════════
console.log('\n═══ 시나리오 1: 공공 + 업무시설 + 서울 + 신축 + 3000㎡ ═══');
const s1 = runCheck({
    ownership: 'public',
    region: '서울특별시',
    isMagok: 'no',
    buildingAction: '신축',
    buildingUse: '업무시설',
    totalFloorArea: 3000,
    permitYear: 2026,
    householdCount: null,
    fuelUsage: null,
    electricUsage: null,
    roofArea: null,
    buildingArea: null,
    siteArea: null,
    storeArea: null
});

assert('에너지절약계획서 → 해당',
    s1.energySavingPlan.applicable === true,
    `actual: ${s1.energySavingPlan.applicable}, detail: ${s1.energySavingPlan.detail}`);

assert('차양장치 → 해당 (공공 업무시설 3000㎡)',
    s1.sunshade.applicable === true,
    `actual: ${s1.sunshade.applicable}, detail: ${s1.sunshade.detail}`);

assert('녹색건축 인증 → 해당 (공공 3000㎡)',
    s1.greenBuildingCertification.applicable === true,
    `actual: ${s1.greenBuildingCertification.applicable}, detail: ${s1.greenBuildingCertification.detail}`);

assert('ZEB 인증 → 해당 (공공 1000㎡+ 업무시설 4등급)',
    s1.zeroEnergyCertification.applicable === true,
    `actual: ${s1.zeroEnergyCertification.applicable}, detail: ${s1.zeroEnergyCertification.detail}`);

assert('ZEB 인증 detail에 "4등급" 포함',
    s1.zeroEnergyCertification.detail.includes('4등급'),
    `actual detail: ${s1.zeroEnergyCertification.detail}`);

assert('신재생에너지 → 해당 (공공 1000㎡+)',
    s1.renewableEnergy.applicable === true,
    `actual: ${s1.renewableEnergy.applicable}, detail: ${s1.renewableEnergy.detail}`);

assert('신재생에너지 36% (2026년 기준)',
    s1.renewableEnergy.detail.includes('36%'),
    `actual detail: ${s1.renewableEnergy.detail}`);

assert('BEMS → 해당없음 (3000㎡ < 10000㎡)',
    s1.bems.applicable === false,
    `actual: ${s1.bems.applicable}, detail: ${s1.bems.detail}`);

assert('서울시 녹색건축물 설계기준 → 해당',
    s1.seoulGreenBuilding.applicable === true,
    `actual: ${s1.seoulGreenBuilding.applicable}, detail: ${s1.seoulGreenBuilding.detail}`);

assert('에너지소요량 평가서 → 해당 (업무시설 3000㎡+)',
    s1.energyConsumptionReport.applicable === true,
    `actual: ${s1.energyConsumptionReport.applicable}, detail: ${s1.energyConsumptionReport.detail}`);

// ══════════════════════════════════════════
// 시나리오 2: 공공 + 공동주택 + 서울 + 신축 + 1000㎡
// ══════════════════════════════════════════
console.log('\n═══ 시나리오 2: 공공 + 공동주택 + 서울 + 신축 + 1000㎡ ═══');
const s2 = runCheck({
    ownership: 'public',
    region: '서울특별시',
    isMagok: 'no',
    buildingAction: '신축',
    buildingUse: '공동주택',
    totalFloorArea: 1000,
    permitYear: 2026,
    householdCount: 20,
    fuelUsage: null,
    electricUsage: null,
    roofArea: null,
    buildingArea: null,
    siteArea: null,
    storeArea: null
});

assert('BEMS → 해당없음 (공동주택 제외)',
    s2.bems.applicable === false,
    `actual: ${s2.bems.applicable}, detail: ${s2.bems.detail}`);

assert('비전기식 냉방 → 해당없음 (공동주택 제외)',
    s2.nonElectricCooling.applicable === false,
    `actual: ${s2.nonElectricCooling.applicable}, detail: ${s2.nonElectricCooling.detail}`);

assert('BF 인증 → 해당없음 (공동주택 제외)',
    s2.bfCertification.applicable === false,
    `actual: ${s2.bfCertification.applicable}, detail: ${s2.bfCertification.detail}`);

assert('에너지절약계획서 → 해당 (1000㎡)',
    s2.energySavingPlan.applicable === true,
    `actual: ${s2.energySavingPlan.applicable}, detail: ${s2.energySavingPlan.detail}`);

// ══════════════════════════════════════════
// 시나리오 3: 민간 + 업무시설 + 경기도 + 신축 + 5000㎡
// ══════════════════════════════════════════
console.log('\n═══ 시나리오 3: 민간 + 업무시설 + 경기도 + 신축 + 5000㎡ ═══');
const s3 = runCheck({
    ownership: 'private',
    region: '경기도',
    isMagok: 'no',
    buildingAction: '신축',
    buildingUse: '업무시설',
    totalFloorArea: 5000,
    permitYear: 2026,
    householdCount: null,
    fuelUsage: null,
    electricUsage: null,
    roofArea: null,
    buildingArea: null,
    siteArea: null,
    storeArea: null
});

assert('경기도 설계기준 → 해당',
    s3.regionalGreenBuilding.applicable === true,
    `actual: ${s3.regionalGreenBuilding.applicable}, detail: ${s3.regionalGreenBuilding.detail}`);

assert('에너지절약계획서 → 해당',
    s3.energySavingPlan.applicable === true,
    `actual: ${s3.energySavingPlan.applicable}, detail: ${s3.energySavingPlan.detail}`);

assert('신재생에너지 → 해당없음 (민간)',
    s3.renewableEnergy.applicable === false,
    `actual: ${s3.renewableEnergy.applicable}, detail: ${s3.renewableEnergy.detail}`);

assert('차양장치 → 해당없음 (민간)',
    s3.sunshade.applicable === false,
    `actual: ${s3.sunshade.applicable}, detail: ${s3.sunshade.detail}`);

assert('서울시 녹색건축물 기준 → 해당없음 (경기도)',
    s3.seoulGreenBuilding.applicable === false,
    `actual: ${s3.seoulGreenBuilding.applicable}, detail: ${s3.seoulGreenBuilding.detail}`);

// ══════════════════════════════════════════
// 시나리오 4: 공공 + 공장 + 인천 + 신축 + 1000㎡
// ══════════════════════════════════════════
console.log('\n═══ 시나리오 4: 공공 + 공장 + 인천 + 신축 + 1000㎡ ═══');
const s4 = runCheck({
    ownership: 'public',
    region: '인천광역시',
    isMagok: 'no',
    buildingAction: '신축',
    buildingUse: '공장',
    totalFloorArea: 1000,
    permitYear: 2026,
    householdCount: null,
    fuelUsage: null,
    electricUsage: null,
    roofArea: null,
    buildingArea: null,
    siteArea: null,
    storeArea: null
});

assert('신재생에너지 → 해당없음 (공장 제외 용도 아님, 1000㎡ 이상이므로 해당)',
    // 공장은 RENEWABLE_EXEMPT_USES에 포함되지 않음 (창고시설, 위험물저장및처리시설, 발전시설만 제외)
    // 따라서 공장은 신재생에너지 대상
    s4.renewableEnergy.applicable === true,
    `actual: ${s4.renewableEnergy.applicable}, detail: ${s4.renewableEnergy.detail}`);

// RENEWABLE_EXEMPT_USES 확인 (창고시설, 위험물저장및처리시설, 발전시설만 제외)
console.log('  ℹ 공장은 신재생에너지 제외 리스트에 없으므로 대상임 (제외: 창고시설, 위험물저장및처리시설, 발전시설)');

assert('인천광역시 설계기준 → 해당',
    s4.regionalGreenBuilding.applicable === true,
    `actual: ${s4.regionalGreenBuilding.applicable}, detail: ${s4.regionalGreenBuilding.detail}`);

assert('BEMS → 해당없음 (1000㎡ < 10000㎡)',
    s4.bems.applicable === false,
    `actual: ${s4.bems.applicable}, detail: ${s4.bems.detail}`);

// ══════════════════════════════════════════
// 시나리오 5: 민간 + 위락시설 + 서울 + 신축 + 1000㎡
// (위락시설은 ZEB_GRADE4_USES에 포함 → 4등급이 아닌 5등급인지 확인)
// ══════════════════════════════════════════
console.log('\n═══ 시나리오 5: 민간 + 위락시설 + 서울 + 신축 + 1000㎡ ═══');
const s5 = runCheck({
    ownership: 'private',
    region: '서울특별시',
    isMagok: 'no',
    buildingAction: '신축',
    buildingUse: '위락시설',
    totalFloorArea: 1000,
    permitYear: 2026,
    householdCount: null,
    fuelUsage: null,
    electricUsage: null,
    roofArea: null,
    buildingArea: null,
    siteArea: null,
    storeArea: null
});

// 계획서 원문: 위락시설 + 1000㎡ → ZEB 5등급 (4등급 아님)
// 하지만 코드상 위락시설은 ZEB_GRADE4_USES에 포함되어 있음
// 민간의 경우 1000㎡ 이상이면 5등급 수준 설계 (is4GradeUse 분기 없음)
assert('ZEB 인증 → 해당 (민간 1000㎡)',
    s5.zeroEnergyCertification.applicable === true,
    `actual: ${s5.zeroEnergyCertification.applicable}, detail: ${s5.zeroEnergyCertification.detail}`);

assert('ZEB 인증 detail에 "5등급" 포함 (민간 위락시설)',
    s5.zeroEnergyCertification.detail.includes('5등급'),
    `actual detail: ${s5.zeroEnergyCertification.detail}`);

// ══════════════════════════════════════════
// 시나리오 6: 의존성 체인 확인
// 에너지절약계획서 "해당없음" → 하위 항목들 "에너지절약계획서 제출대상 아님"
// ══════════════════════════════════════════
console.log('\n═══ 시나리오 6: 의존성 체인 (대수선 → ESP 해당없음 → 하위 전파) ═══');
const s6 = runCheck({
    ownership: 'public',
    region: '서울특별시',
    isMagok: 'no',
    buildingAction: '대수선',
    buildingUse: '업무시설',
    totalFloorArea: 3000,
    permitYear: 2026,
    householdCount: null,
    fuelUsage: null,
    electricUsage: null,
    roofArea: null,
    buildingArea: null,
    siteArea: null,
    storeArea: null
});

assert('에너지절약계획서 → 해당없음 (대수선)',
    s6.energySavingPlan.applicable === false,
    `actual: ${s6.energySavingPlan.applicable}, detail: ${s6.energySavingPlan.detail}`);

assert('녹색건축 인증 → 해당없음 (ESP 대상 아님)',
    s6.greenBuildingCertification.applicable === false,
    `actual: ${s6.greenBuildingCertification.applicable}, detail: ${s6.greenBuildingCertification.detail}`);

assert('건축부문 의무사항 → 해당없음 (ESP 대상 아님)',
    s6.architecturalMandatory.applicable === false,
    `actual: ${s6.architecturalMandatory.applicable}, detail: ${s6.architecturalMandatory.detail}`);

assert('기계부문 의무사항 → 해당없음 (ESP 대상 아님)',
    s6.mechanicalMandatory.applicable === false,
    `actual: ${s6.mechanicalMandatory.applicable}, detail: ${s6.mechanicalMandatory.detail}`);

assert('전기부문 의무사항 → 해당없음 (ESP 대상 아님)',
    s6.electricalMandatory.applicable === false,
    `actual: ${s6.electricalMandatory.applicable}, detail: ${s6.electricalMandatory.detail}`);

assert('설계기준 예외 → 해당없음 (ESP 대상 아님)',
    s6.designStandardException.applicable === false,
    `actual: ${s6.designStandardException.applicable}, detail: ${s6.designStandardException.detail}`);

assert('EPI → 해당없음 (ESP 대상 아님)',
    s6.epiScore.applicable === false,
    `actual: ${s6.epiScore.applicable}, detail: ${s6.epiScore.detail}`);

assert('에너지소요량 평가서 → 해당없음 (ESP 대상 아님)',
    s6.energyConsumptionReport.applicable === false,
    `actual: ${s6.energyConsumptionReport.applicable}, detail: ${s6.energyConsumptionReport.detail}`);

assert('서울시 녹색건축물 → 해당없음 (ESP 대상 아님)',
    s6.seoulGreenBuilding.applicable === false,
    `actual: ${s6.seoulGreenBuilding.applicable}, detail: ${s6.seoulGreenBuilding.detail}`);

assert('지역별 녹색건축물 → 해당없음 (서울은 별도)',
    s6.regionalGreenBuilding.applicable === false,
    `actual: ${s6.regionalGreenBuilding.applicable}, detail: ${s6.regionalGreenBuilding.detail}`);

// ══════════════════════════════════════════
// 추가 검증: REGULATION_ORDER 무결성
// ══════════════════════════════════════════
console.log('\n═══ 추가 검증: REGULATION_ORDER 무결성 ═══');

assert('REGULATION_ORDER 길이 = 37',
    REGULATION_ORDER.length === 37,
    `actual: ${REGULATION_ORDER.length}`);

assert('모든 ORDER 키가 REGULATIONS에 존재',
    REGULATION_ORDER.every(key => REGULATIONS[key] !== undefined),
    `missing: ${REGULATION_ORDER.filter(key => !REGULATIONS[key]).join(', ')}`);

assert('REGULATIONS의 모든 키가 ORDER에 포함',
    Object.keys(REGULATIONS).every(key => REGULATION_ORDER.includes(key)),
    `not in order: ${Object.keys(REGULATIONS).filter(key => !REGULATION_ORDER.includes(key)).join(', ')}`);

// 모든 check 함수가 (data, context) 시그니처인지 확인
assert('모든 check 함수가 2개 매개변수(data, context)',
    Object.values(REGULATIONS).every(r => r.check.length === 2),
    `violations: ${Object.entries(REGULATIONS).filter(([k,r]) => r.check.length !== 2).map(([k]) => k).join(', ')}`);

// ══════════════════════════════════════════
// 결과 요약
// ══════════════════════════════════════════
console.log('\n══════════════════════════════════════════');
console.log(`총 ${total}개 테스트: ${passed}개 통과, ${failed}개 실패`);
if (failed === 0) {
    console.log('✓ 모든 테스트 통과!');
} else {
    console.log('✗ 실패한 테스트가 있습니다.');
    process.exit(1);
}
