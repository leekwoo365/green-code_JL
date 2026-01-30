/**
 * 친환경 법규 검토 시스템 - 메인 애플리케이션
 * 기준일: 2025.11.14
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * 애플리케이션 초기화
 */
function initializeApp() {
    // 지역 선택 시 마곡 옵션 표시/숨김
    const regionSelect = document.getElementById('region');
    const magokGroup = document.getElementById('magokGroup');
    
    regionSelect.addEventListener('change', function() {
        if (this.value === '서울특별시') {
            magokGroup.style.display = 'block';
        } else {
            magokGroup.style.display = 'none';
            document.getElementById('isMagok').value = 'no';
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
                // 소수점 이하 2자리까지만 유지
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
        isMagok: document.getElementById('isMagok').value,
        buildingAction: document.getElementById('buildingAction').value,
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
 * 법규 검토 실행
 */
function runRegulationCheck() {
    const data = getFormData();
    const results = [];
    let applicableCount = 0;
    let notApplicableCount = 0;

    // 각 법규에 대해 검토 수행
    REGULATION_ORDER.forEach(regKey => {
        const regulation = REGULATIONS[regKey];
        const checkResult = regulation.check(data);
        
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
        } else {
            notApplicableCount++;
        }
    });

    // 결과 표시
    displayResults(data, results, applicableCount, notApplicableCount);
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
        // 카테고리 헤더 추가
        if (result.category !== currentCategory) {
            currentCategory = result.category;
            tableHTML += `
                <tr class="category-row">
                    <td colspan="4">${currentCategory}</td>
                </tr>
            `;
        }

        // 결과 행 추가
        const remarkClass = result.applicable ? 'remark-applicable' : 'remark-not-applicable';
        const remarkText = result.applicable ? '해당' : '해당없음';
        
        tableHTML += `
            <tr>
                <td class="col-item">${result.item}</td>
                <td class="col-basis">${result.basis}</td>
                <td class="col-content">${result.content}</td>
                <td class="col-remark">
                    <span class="${remarkClass}">${remarkText}</span>
                    ${result.detail ? `<span class="remark-detail">${result.detail}</span>` : ''}
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = tableHTML;

    // 결과 섹션 표시 및 스크롤
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * 폼 초기화
 */
function resetForm() {
    if (confirm('모든 입력 내용을 초기화하시겠습니까?')) {
        document.getElementById('regulationForm').reset();
        document.getElementById('magokGroup').style.display = 'none';
        document.getElementById('resultSection').style.display = 'none';
        
        // 에러 상태 제거
        document.querySelectorAll('.form-group.error').forEach(el => {
            el.classList.remove('error');
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Excel 다운로드
 */
function exportToExcel() {
    const data = getFormData();
    const results = [];
    
    // 결과 데이터 수집
    REGULATION_ORDER.forEach(regKey => {
        const regulation = REGULATIONS[regKey];
        const checkResult = regulation.check(data);
        
        results.push({
            분류: regulation.category,
            항목: regulation.item,
            관련근거: regulation.basis,
            내용: regulation.content,
            비고: checkResult.applicable ? `해당 - ${checkResult.detail}` : `해당없음 - ${checkResult.detail}`
        });
    });

    // CSV 형식으로 변환
    const headers = ['분류', '항목', '관련근거', '내용', '비고'];
    let csvContent = '\uFEFF'; // BOM for Excel UTF-8
    csvContent += headers.join(',') + '\n';

    results.forEach(row => {
        const values = headers.map(header => {
            let value = row[header] || '';
            // 쉼표와 줄바꿈 처리
            value = value.toString().replace(/"/g, '""');
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                value = `"${value}"`;
            }
            return value;
        });
        csvContent += values.join(',') + '\n';
    });

    // 파일 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const filename = `친환경법규검토_${data.region}_${data.buildingAction}_${new Date().toISOString().slice(0,10)}.csv`;
    
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
