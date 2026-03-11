/**
 * 친환경 법규 검토 시스템 - 메인 애플리케이션
 * 기준일: 2026.02.12
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// ─────────────────────────────────────────────
// 요약 페이지용 설정 (항목별 대표명 + 설계 액션)
// ─────────────────────────────────────────────
const SUMMARY_CONFIG = {
    energySavingPlan: {
        summaryName: "에너지절약계획서 제출",
        getDesignAction: (data, result) => {
            const epiMin = data.ownership === 'public' ? 74 : 65;
            return `에너지성능지표(EPI) ${epiMin}점 이상 획득`;
        }
    },
    greenBuildingCertification: {
        summaryName: "녹색건축인증",
        getDesignAction: () => '녹색건축인증 우수(그린2등급) 이상 획득'
    },
    zeroEnergyCertification: {
        summaryName: "제로에너지인증",
        getDesignAction: (data, result) => {
            if (result.detail.includes('4등급')) return '제로에너지인증 4등급 취득';
            if (result.detail.includes('3등급')) return '제로에너지인증 3등급 취득';
            return '제로에너지인증 5등급 취득';
        }
    },
    sunshade: {
        summaryName: "차양장치 설치",
        getDesignAction: () => '외벽 창 일사조절장치 설치'
    },
    greenBuildingCertRule: {
        summaryName: "녹색건축 인증 규칙",
        getDesignAction: () => '인증서 발급 (유효기간 5년)'
    },
    designStandardException: {
        summaryName: "설계기준 적용예외",
        getDesignAction: (data, result) => {
            if (result.detail.includes('제로에너지건축물 인증 취득')) return '제로에너지건축물 인증 취득 시 설계검토서(의무+성능지표+소요량평가서) 제출 예외 (단, 인허가 시 예비인증서 제출 필요)';
            if (result.detail.includes('열손실의 변동이 없는')) return '설계검토서(의무+성능지표+소요량평가서) 제출 예외';
            if (result.detail.includes('제출 대상')) return '성능지표(EPI) 제출 예외 없음 (소요량 평가서 판정기준 만족 시 제출 예외)';
            if (result.detail.includes('성능지표(EPI)') && result.detail.includes('제출 예외')) return '성능지표(EPI) 제출 예외';
            return '소요량 평가서 판정기준 만족 시 EPI 제출 예외';
        }
    },
    thermalInsulation: {
        summaryName: "열손실 방지",
        getDesignAction: (data, result) => {
            const match = result.detail.match(/^(.+?) 기준/);
            return match ? `${match[1]} 열관류율 기준 적용` : '열관류율 기준 적용';
        }
    },
    architecturalMandatory: {
        summaryName: "건축부문 의무사항",
        getDesignAction: () => 'EPI 건축부문 1번 0.6점 이상, 방풍구조 적용'
    },
    mechanicalMandatory: {
        summaryName: "기계부문 의무사항",
        getDesignAction: (data, result) => {
            let actions = [];
            if (result.detail.includes('비전기식')) actions.push('비전기식 냉방 60% 이상');
            if (result.detail.includes('고효율')) actions.push('고효율 냉난방설비');
            if (result.detail.includes('원격검침')) actions.push('원격검침계량기 설치');
            return actions.length > 0 ? actions.join(', ') : '기계부문 의무사항 확인';
        }
    },
    electricalMandatory: {
        summaryName: "전기부문 의무사항",
        getDesignAction: () => 'BEMS, LED, ESS 등 전기부문 확인'
    },
    epiScore: {
        summaryName: "에너지성능지표(EPI)",
        getDesignAction: (data, result) => {
            if (result.detail.includes('면제')) return 'ZEB 인증 시 EPI 면제 가능';
            const epiMin = data.ownership === 'public' ? 74 : 65;
            return `EPI ${epiMin}점 이상 획득`;
        }
    },
    energyConsumptionReport: {
        summaryName: "에너지소요량 평가서",
        getDesignAction: () => '소요량 평가서 제출, ECO2-OD 시뮬레이션'
    },
    renewableEnergy: {
        summaryName: "신재생에너지",
        getDesignAction: (data, result) => {
            const match = result.detail.match(/(\d+)%/);
            return match ? `신재생 ${match[1]}% 이상 설치` : '신재생에너지 설치';
        }
    },
    zebObligation: {
        summaryName: "ZEB 의무취득",
        getDesignAction: () => 'ZEB 인증 취득'
    },
    bems: {
        summaryName: "BEMS",
        getDesignAction: () => '모니터링 기능, BEMS 설치·운영'
    },
    nonElectricCooling: {
        summaryName: "비전기식 냉방",
        getDesignAction: () => '비전기식 냉방장치 60% 적용'
    },
    highEfficiencyEquipment: {
        summaryName: "LED·ESS",
        getDesignAction: () => 'LED 등기구 100% 적용, ESS 검토'
    },
    outdoorLighting: {
        summaryName: "옥외 경관조명",
        getDesignAction: () => '옥외 경관조명 원칙적 설치 불가, LED 사용'
    },
    ecoCarParking: {
        summaryName: "친환경차 주차",
        getDesignAction: () => '전용 주차면 10% 이상 설치'
    },
    energyUsePlan: {
        summaryName: "에너지사용계획서",
        getDesignAction: () => '에너지 사용량 검토 후, 에너지사용계획서 제출여부 결정'
    },
    distributedEnergy: {
        summaryName: "분산에너지",
        getDesignAction: () => '분산에너지 설비 설치계획서 제출'
    },
    rainwaterSystem: {
        summaryName: "우수조 설치",
        getDesignAction: () => '우수조 설치 (지붕면적 × 0.05m)'
    },
    grayWaterSystem: {
        summaryName: "중수도 설비",
        getDesignAction: () => '중수도 설치'
    },
    bicycleParking: {
        summaryName: "자전거주차장",
        getDesignAction: (data, result) => {
            const match = result.detail.match(/(\d+~?\d*%)/);
            return match ? `자동차 주차대수의 ${match[1]} 설치` : '자전거주차장 설치';
        }
    },
    environmentalImpact: {
        summaryName: "환경영향평가",
        getDesignAction: () => '환경영향평가 실시'
    },
    bfCertification: {
        summaryName: "BF 인증",
        getDesignAction: () => 'BF 인증 일반등급 이상 취득'
    },
    fireResistantMaterial: {
        summaryName: "외벽 단열재",
        getDesignAction: () => '외벽 단열재 준불연 이상 적용'
    },
    evCharging: {
        summaryName: "전기차 인프라",
        getDesignAction: (data, result) => {
            const match = result.detail.match(/전용주차구역 (\d+)%, 충전시설 (\d+)%/);
            if (match) return `주차면 ${match[1]}%, 충전시설 ${match[2]}% 설치`;
            return '전기차 충전시설 설치';
        }
    },
    regionalGreenBuilding: {
        summaryName: "지역 녹색건축 기준",
        getDesignAction: (data, result) => {
            if (result.detail.includes('국가 기준')) return '국가 기준(에너지절약 설계기준) 적용';
            const gradeMatch = result.detail.match(/\[(.)\] 등급/);
            const grade = gradeMatch ? gradeMatch[1] : '';
            return `[${grade}] 등급 기준 적용`;
        }
    },
    seoulGreenBuilding: {
        summaryName: "서울시 녹색건축 기준",
        getDesignAction: (data, result) => {
            const gradeMatch = result.detail.match(/\[(.)\] 등급/);
            const grade = gradeMatch ? gradeMatch[1] : '';
            let actions = [`[${grade}] 등급 적용`];
            const rateMatch = result.detail.match(/신재생에너지 설치비율: .+? (\d+\.?\d*%)/);
            if (rateMatch) actions.push(`신재생 ${rateMatch[1]}`);
            return actions.join(', ');
        }
    },
    seoulDistrictPlan: {
        summaryName: "지구단위/유리커튼월",
        getDesignAction: () => '유리커튼월 에너지부문, 친환경계획 검토'
    },
    ecologicalArea: {
        summaryName: "생태면적률",
        getDesignAction: (data, result) => {
            const match = result.detail.match(/(\d+)% 이상/);
            return match ? `생태면적률 ${match[1]}% 이상 확보` : '생태면적률 기준 적용';
        }
    },
    seoulEnvironmentalImpact: {
        summaryName: "서울시 환경영향평가",
        getDesignAction: () => '서울시 환경영향평가 실시'
    },
    magokDistrict: {
        summaryName: "마곡지구 기준",
        getDesignAction: (data) => {
            if (data.ownership === 'public') return 'EPI 81점 이상, 생태면적률 30%, 태양광 설치';
            return 'EPI 81점 이상, 생태면적률 20% 이상';
        }
    },
    seoulBFBuilding: {
        summaryName: "서울형 BF 인증",
        getDesignAction: () => '편의시설 적합성 확인·인증 신청'
    },
    lidConsultation: {
        summaryName: "저영향개발(LID)",
        getDesignAction: () => '저영향개발(LID) 사전협의, 빗물관리시설 설치'
    },
    incentives: {
        summaryName: "건축기준 완화",
        getDesignAction: () => '녹색건축/ZEB 인센티브 적용 검토'
    }
};

/**
 * 애플리케이션 초기화
 */
function initializeApp() {
    // 상세지역 데이터 (열손실 권역 구분용)
    const SUB_REGION_DATA = {
        '강원특별자치도': {
            label: '강원 상세 지역',
            options: [
                { value: '고성', text: '고성' },
                { value: '속초', text: '속초' },
                { value: '양양', text: '양양' },
                { value: '강릉', text: '강릉' },
                { value: '동해', text: '동해' },
                { value: '삼척', text: '삼척' },
                { value: '그 외', text: '그 외 지역' }
            ]
        },
        '경기도': {
            label: '경기 상세 지역',
            options: [
                { value: '연천', text: '연천' },
                { value: '포천', text: '포천' },
                { value: '가평', text: '가평' },
                { value: '남양주', text: '남양주' },
                { value: '의정부', text: '의정부' },
                { value: '양주', text: '양주' },
                { value: '동두천', text: '동두천' },
                { value: '파주', text: '파주' },
                { value: '그 외', text: '그 외 지역' }
            ]
        },
        '충청북도': {
            label: '충북 상세 지역',
            options: [
                { value: '제천', text: '제천' },
                { value: '그 외', text: '그 외 지역' }
            ]
        },
        '경상북도': {
            label: '경북 상세 지역',
            options: [
                { value: '봉화', text: '봉화' },
                { value: '청송', text: '청송' },
                { value: '울진', text: '울진' },
                { value: '영덕', text: '영덕' },
                { value: '포항', text: '포항' },
                { value: '경주', text: '경주' },
                { value: '청도', text: '청도' },
                { value: '경산', text: '경산' },
                { value: '그 외', text: '그 외 지역' }
            ]
        },
        '경상남도': {
            label: '경남 상세 지역',
            options: [
                { value: '거창', text: '거창' },
                { value: '함양', text: '함양' },
                { value: '그 외', text: '그 외 지역' }
            ]
        }
    };

    // 지역 선택 시 마곡 옵션 + 상세지역 표시/숨김
    const regionSelect = document.getElementById('region');
    const magokGroup = document.getElementById('magokGroup');
    const subRegionGroup = document.getElementById('subRegionGroup');
    const subRegionSelect = document.getElementById('subRegion');
    const subRegionLabel = document.getElementById('subRegionLabel');

    regionSelect.addEventListener('change', function() {
        // 마곡
        if (this.value === '서울특별시') {
            magokGroup.style.display = 'block';
        } else {
            magokGroup.style.display = 'none';
            document.getElementById('isMagok').value = 'no';
        }

        // 상세지역
        const subData = SUB_REGION_DATA[this.value];
        if (subData) {
            subRegionLabel.textContent = subData.label;
            subRegionSelect.innerHTML = '';
            subData.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                subRegionSelect.appendChild(option);
            });
            subRegionGroup.style.display = 'block';
        } else {
            subRegionGroup.style.display = 'none';
            subRegionSelect.innerHTML = '';
        }
    });

    // 건축행위 선택 시 조건부 입력 표시/숨김
    const buildingActionSelect = document.getElementById('buildingAction');
    const heatLossGroup = document.getElementById('heatLossGroup');
    const halfExpansionGroup = document.getElementById('halfExpansionGroup');
    const expansionAreaGroup = document.getElementById('expansionAreaGroup');

    buildingActionSelect.addEventListener('change', function() {
        const val = this.value;
        const showHeatLoss = ['증축', '대수선', '용도변경', '건축물기재내용변경'].includes(val);
        const showHalfExpansion = val === '증축';

        heatLossGroup.style.display = showHeatLoss ? 'block' : 'none';
        if (!showHeatLoss) document.getElementById('heatLossChange').value = 'no';

        halfExpansionGroup.style.display = showHalfExpansion ? 'block' : 'none';
        if (!showHalfExpansion) {
            document.getElementById('isHalfExpansion').value = 'no';
            expansionAreaGroup.style.display = 'none';
            document.getElementById('expansionArea').value = '';
        }
    });

    // 1/2 이상 증축 선택 시 증축 연면적 입력 표시/숨김
    document.getElementById('isHalfExpansion').addEventListener('change', function() {
        if (this.value === 'yes') {
            expansionAreaGroup.style.display = 'block';
        } else {
            expansionAreaGroup.style.display = 'none';
            document.getElementById('expansionArea').value = '';
        }
    });

    // 건축물용도 선택 시 세대수 입력 표시/숨김
    const buildingUseSelect = document.getElementById('buildingUse');
    const householdGroup = document.getElementById('householdGroup');

    buildingUseSelect.addEventListener('change', function() {
        if (this.value === '공동주택') {
            householdGroup.style.display = 'block';
        } else {
            householdGroup.style.display = 'none';
            document.getElementById('householdCount').value = '';
        }
    });

    // 폼 제출 이벤트
    const form = document.getElementById('regulationForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm()) {
            runRegulationCheck();
        }
    });

    // 숫자 입력 필드 포맷팅
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !isNaN(this.value)) {
                this.value = parseFloat(this.value).toFixed(2).replace(/\.?0+$/, '');
            }
        });
    });
}

/**
 * 폼 유효성 검사
 */
function validateForm() {
    const requiredFields = [
        { id: 'ownership', name: '소유주체' },
        { id: 'region', name: '지역' },
        { id: 'buildingAction', name: '건축행위' },
        { id: 'buildingUse', name: '건축물 용도' },
        { id: 'totalFloorArea', name: '연면적' },
        { id: 'permitYear', name: '건축허가 시점' }
    ];

    let isValid = true;
    let errorMessages = [];

    // 기존 에러 상태 제거
    document.querySelectorAll('.form-group.error').forEach(el => {
        el.classList.remove('error');
        const errorMsg = el.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
    });

    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        const value = element.value.trim();

        if (!value) {
            isValid = false;
            errorMessages.push(field.name);
            element.closest('.form-group').classList.add('error');
        }
    });

    if (!isValid) {
        alert(`다음 필수 항목을 입력해 주세요:\n\n• ${errorMessages.join('\n• ')}`);
    }

    return isValid;
}

/**
 * 폼 데이터 수집
 */
function getFormData() {
    return {
        ownership: document.getElementById('ownership').value,
        region: document.getElementById('region').value,
        subRegion: document.getElementById('subRegion').value || null,
        isMagok: document.getElementById('isMagok').value,
        buildingAction: document.getElementById('buildingAction').value,
        heatLossChange: document.getElementById('heatLossChange').value,
        isHalfExpansion: document.getElementById('isHalfExpansion').value,
        expansionArea: parseFloat(document.getElementById('expansionArea').value) || null,
        buildingUse: document.getElementById('buildingUse').value,
        totalFloorArea: parseFloat(document.getElementById('totalFloorArea').value) || 0,
        permitYear: parseInt(document.getElementById('permitYear').value) || 2025,
        householdCount: parseInt(document.getElementById('householdCount').value) || null,
        fuelUsage: parseFloat(document.getElementById('fuelUsage').value) || null,
        electricUsage: parseFloat(document.getElementById('electricUsage').value) || null,
        roofArea: parseFloat(document.getElementById('roofArea').value) || null,
        buildingArea: parseFloat(document.getElementById('buildingArea').value) || null,
        siteArea: parseFloat(document.getElementById('siteArea').value) || null,
        storeArea: parseFloat(document.getElementById('storeArea').value) || null
    };
}

/**
 * 법규 검토 실행 (의존성 체인 context 패턴)
 */
function runRegulationCheck() {
    const data = getFormData();
    const results = [];
    const summaryItems = [];
    const context = {};
    let applicableCount = 0;
    let notApplicableCount = 0;

    // 각 법규에 대해 검토 수행 (순서대로, context 전달)
    REGULATION_ORDER.forEach(regKey => {
        const regulation = REGULATIONS[regKey];
        if (!regulation) return;
        const checkResult = regulation.check(data, context);

        // 결과를 context에 저장하여 다음 check에서 참조
        context[regKey] = checkResult;

        results.push({
            category: regulation.category,
            item: regulation.item,
            basis: regulation.basis,
            content: regulation.content,
            applicable: checkResult.applicable,
            detail: checkResult.detail
        });

        if (checkResult.applicable) {
            applicableCount++;

            // 요약 데이터 수집
            const config = SUMMARY_CONFIG[regKey];
            if (config) {
                summaryItems.push({
                    summaryName: config.summaryName,
                    basisLaw: regulation.category,
                    basisCriteria: checkResult.detail,
                    designAction: config.getDesignAction(data, checkResult, context)
                });
            }
        } else {
            notApplicableCount++;
        }
    });

    // 결과 표시
    displaySummary(summaryItems);
    displayResults(data, results, applicableCount, notApplicableCount);
}

/**
 * 건축물 용도 한글 표시명
 */
function getBuildingUseLabel(value) {
    const el = document.getElementById('buildingUse');
    if (el) {
        const option = el.querySelector(`option[value="${value}"]`);
        if (option) return option.textContent;
    }
    return value;
}

/**
 * 요약 페이지 표시 (해당 항목만 필터)
 */
function displaySummary(summaryItems) {
    const summarySection = document.getElementById('summarySection');
    const tableBody = document.getElementById('summaryTableBody');

    if (summaryItems.length === 0) {
        summarySection.style.display = 'none';
        return;
    }

    let html = '';
    summaryItems.forEach(item => {
        html += `
            <tr>
                <td class="col-summary-item">${item.summaryName}</td>
                <td class="col-summary-basis">
                    <div class="summary-basis-law">${item.basisLaw}</div>
                    <div class="summary-basis-criteria">${item.basisCriteria}</div>
                </td>
                <td class="col-summary-design">${item.designAction}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
    summarySection.style.display = 'block';
    summarySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * 검토 결과 표시
 */
function displayResults(data, results, applicableCount, notApplicableCount) {
    const resultSection = document.getElementById('resultSection');
    const summaryDiv = document.getElementById('resultSummary');
    const tableBody = document.getElementById('resultTableBody');

    // 요약 정보 생성
    summaryDiv.innerHTML = `
        <div class="summary-item">
            <div class="label">소유주체</div>
            <div class="value">${data.ownership === 'public' ? '공공' : '민간'}</div>
        </div>
        <div class="summary-item">
            <div class="label">지역</div>
            <div class="value">${data.region}${data.isMagok === 'yes' ? ' (마곡)' : ''}</div>
        </div>
        <div class="summary-item">
            <div class="label">건축행위</div>
            <div class="value">${data.buildingAction}</div>
        </div>
        <div class="summary-item">
            <div class="label">건축물 용도</div>
            <div class="value">${getBuildingUseLabel(data.buildingUse)}</div>
        </div>
        <div class="summary-item">
            <div class="label">연면적</div>
            <div class="value">${data.totalFloorArea.toLocaleString()} ㎡</div>
        </div>
        <div class="summary-item">
            <div class="label">해당 항목</div>
            <div class="value applicable">${applicableCount}건</div>
        </div>
        <div class="summary-item">
            <div class="label">해당없음</div>
            <div class="value not-applicable">${notApplicableCount}건</div>
        </div>
    `;

    // 테이블 내용 생성
    let tableHTML = '';
    let currentCategory = '';

    results.forEach((result, index) => {
        if (result.category !== currentCategory) {
            currentCategory = result.category;
            tableHTML += `
                <tr class="category-row">
                    <td colspan="4">${currentCategory}</td>
                </tr>
            `;
        }

        const remarkClass = result.applicable ? 'remark-applicable' : 'remark-not-applicable';
        const remarkText = result.applicable ? '해당' : '해당없음';

        tableHTML += `
            <tr>
                <td class="col-item">${result.item}</td>
                <td class="col-basis">${result.basis}</td>
                <td class="col-content">${result.content.replace(/\n/g, '<br>')}</td>
                <td class="col-remark">
                    <span class="${remarkClass}">${remarkText}</span>
                    ${result.detail ? `<span class="remark-detail">${result.detail.replace(/\n/g, '<br>')}</span>` : ''}
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = tableHTML;

    resultSection.style.display = 'block';
}

/**
 * 폼 초기화
 */
function resetForm() {
    if (confirm('모든 입력 내용을 초기화하시겠습니까?')) {
        document.getElementById('regulationForm').reset();
        document.getElementById('magokGroup').style.display = 'none';
        document.getElementById('subRegionGroup').style.display = 'none';
        document.getElementById('subRegion').innerHTML = '';
        document.getElementById('householdGroup').style.display = 'none';
        document.getElementById('heatLossGroup').style.display = 'none';
        document.getElementById('halfExpansionGroup').style.display = 'none';
        document.getElementById('expansionAreaGroup').style.display = 'none';
        document.getElementById('summarySection').style.display = 'none';
        document.getElementById('resultSection').style.display = 'none';

        document.querySelectorAll('.form-group.error').forEach(el => {
            el.classList.remove('error');
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Excel 다운로드 (context 패턴 적용)
 */
function exportToExcel() {
    const data = getFormData();
    const results = [];
    const summaryRows = [];
    const context = {};

    REGULATION_ORDER.forEach(regKey => {
        const regulation = REGULATIONS[regKey];
        if (!regulation) return;
        const checkResult = regulation.check(data, context);
        context[regKey] = checkResult;

        results.push({
            분류: regulation.category,
            항목: regulation.item,
            관련근거: regulation.basis,
            내용: regulation.content,
            비고: checkResult.applicable ? `해당 - ${checkResult.detail}` : `해당없음 - ${checkResult.detail}`
        });

        // 요약 시트용 (해당 항목만)
        if (checkResult.applicable) {
            const config = SUMMARY_CONFIG[regKey];
            if (config) {
                summaryRows.push({
                    항목: config.summaryName,
                    '법규내용(기준)': `${regulation.category} / ${checkResult.detail}`,
                    설계: config.getDesignAction(data, checkResult, context)
                });
            }
        }
    });

    // CSV 내용 생성: 요약 + 빈줄 + 상세
    let csvContent = '\uFEFF';

    // 요약 섹션
    csvContent += '※ 최종 설계적용 법규사항 정리\n';
    const summaryHeaders = ['항목', '법규내용(기준)', '설계'];
    csvContent += summaryHeaders.join(',') + '\n';
    summaryRows.forEach(row => {
        const values = summaryHeaders.map(header => {
            let value = row[header] || '';
            value = value.toString().replace(/"/g, '""');
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                value = `"${value}"`;
            }
            return value;
        });
        csvContent += values.join(',') + '\n';
    });

    csvContent += '\n\n※ 상세 검토 결과\n';

    const headers = ['분류', '항목', '관련근거', '내용', '비고'];
    csvContent += headers.join(',') + '\n';

    results.forEach(row => {
        const values = headers.map(header => {
            let value = row[header] || '';
            value = value.toString().replace(/"/g, '""');
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                value = `"${value}"`;
            }
            return value;
        });
        csvContent += values.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const filename = `친환경법규검토_${data.region}_${data.buildingAction}_${getBuildingUseLabel(data.buildingUse)}_${new Date().toISOString().slice(0,10)}.csv`;

    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    URL.revokeObjectURL(link.href);
}

/**
 * 인쇄
 */
function printResult() {
    window.print();
}

// 전역 함수 노출
window.resetForm = resetForm;
window.exportToExcel = exportToExcel;
window.printResult = printResult;
