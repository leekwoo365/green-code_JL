/**
 * 친환경 법규 검토 시스템 - 법규 데이터베이스
 * 기준일: 2025.11.14
 */

const REGULATIONS = {
    // 1. 녹색건축물 조성 지원법
    energySavingPlan: {
        category: "녹색건축물 조성 지원법",
        item: "에너지절약계획서 제출",
        basis: "법 제14조, 영 제10조, 규칙 제7조, 고시 제3조",
        content: "연면적 합계 500㎡ 이상인 건축물은 건축허가 신청 시 에너지 절약계획서 제출 대상 (대수선 제외)",
        check: (data) => {
            if (data.buildingAction === '대수선') {
                return { applicable: false, detail: "대수선은 제출 제외" };
            }
            if (data.totalFloorArea >= 500) {
                return { 
                    applicable: true, 
                    detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 500㎡ → EPI 65점 이상 필요` 
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 500㎡` };
        }
    },

    greenBuildingCertification: {
        category: "녹색건축물 조성 지원법",
        item: "녹색건축 인증",
        basis: "법 제16조, 영 제11조의3",
        content: "공공기관이 신축·재축·별동증축하는 연면적 3,000㎡ 이상 건축물은 녹색건축 인증 의무 취득",
        check: (data) => {
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
                    detail: `공공 건축물, 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 3,000㎡ → 그린2등급(우수) 이상 취득` 
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 3,000㎡` };
        }
    },

    zeroEnergyCertification: {
        category: "녹색건축물 조성 지원법",
        item: "제로에너지건축물 인증",
        basis: "법 제17조, 영 제12조, 영 별표1",
        content: "공공기관이 신축·재축·별동증축·전부개축하는 연면적 500㎡ 이상 건축물 (공동주택 30세대 이상)",
        check: (data) => {
            const targetActions = ['신축', '재축', '별동증축', '전부개축'];
            if (data.ownership !== 'public') {
                // 민간은 2025년 기준 1,000㎡ 이상 5등급 수준 설계 권장
                if (data.totalFloorArea >= 1000 && targetActions.includes(data.buildingAction)) {
                    return { 
                        applicable: true, 
                        detail: `민간 건축물 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 1,000㎡ → 5등급 수준 설계 권장 (의무 아님)` 
                    };
                }
                return { applicable: false, detail: "민간 건축물 (공공만 의무)" };
            }
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님` };
            }
            
            // 2025년 공공 기준
            if (data.permitYear >= 2025) {
                if (data.totalFloorArea >= 500) {
                    // 일부 용도는 1,000㎡ 이상일 때 4등급, 그 외는 5등급
                    const grade = data.totalFloorArea >= 1000 ? "4등급 또는 5등급 (용도에 따라)" : "5등급";
                    return { 
                        applicable: true, 
                        detail: `공공 건축물 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 500㎡ → ${grade} 취득 의무` 
                    };
                }
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 500㎡` };
        }
    },

    sunshade: {
        category: "녹색건축물 조성 지원법",
        item: "차양장치 설치",
        basis: "법 제14조의2, 영 제10조의2",
        content: "공공기관의 연면적 3,000㎡ 이상 업무시설 또는 교육연구시설은 외벽 창에 일사조절장치 설치",
        check: (data) => {
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물" };
            }
            if (data.totalFloorArea >= 3000) {
                return { 
                    applicable: true, 
                    detail: `공공 건축물 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 3,000㎡ → 업무/교육연구시설인 경우 차양장치 설치` 
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 3,000㎡` };
        }
    },

    // 2. 건축물의 에너지절약 설계기준
    thermalInsulation: {
        category: "건축물의 에너지절약 설계기준",
        item: "열손실 방지조치",
        basis: "고시 제2조, 제6조, 별표1",
        content: "건축물을 건축(신축, 증축, 개축, 재축, 이전), 대수선, 용도변경 시 부위별 열관류율 기준 준수",
        check: (data) => {
            const targetActions = ['신축', '증축', '별동증축', '개축', '전부개축', '재축', '대수선', '용도변경'];
            if (targetActions.includes(data.buildingAction)) {
                // 지역에 따른 열관류율 기준
                let region = "중부2지역";
                if (['부산광역시', '대구광역시', '울산광역시', '광주광역시', '전라남도'].includes(data.region)) {
                    region = "남부지역";
                } else if (data.region === '제주특별자치도') {
                    region = "제주도";
                } else if (['강원특별자치도'].includes(data.region)) {
                    region = "중부1지역 또는 중부2지역 (상세지역 확인 필요)";
                }
                return { 
                    applicable: true, 
                    detail: `${region} 기준 열관류율 적용 필요` 
                };
            }
            return { applicable: false, detail: `${data.buildingAction}은 열손실 변동 없는 경우 제외` };
        }
    },

    epiArchitectural: {
        category: "건축물의 에너지절약 설계기준",
        item: "에너지성능지표(EPI) 건축부문 의무사항",
        basis: "고시 제6조",
        content: "에너지절약계획서 제출대상 건축물은 건축부문 1번(외벽평균열관류율) 0.6점 이상 및 방풍구조 적용",
        check: (data) => {
            if (data.totalFloorArea >= 500 && data.buildingAction !== '대수선') {
                return { 
                    applicable: true, 
                    detail: "EPI 건축부문 1번 항목 0.6점 이상, 방풍구조 적용 필요" 
                };
            }
            return { applicable: false, detail: "에너지절약계획서 제출대상 아님" };
        }
    },

    energyConsumptionReport: {
        category: "건축물의 에너지절약 설계기준",
        item: "에너지소요량 평가서 제출",
        basis: "고시 제21조",
        content: "공공기관 연면적 500㎡ 이상 또는 민간 연면적 3,000㎡ 이상 교육연구시설 등",
        check: (data) => {
            if (data.ownership === 'public' && data.totalFloorArea >= 500) {
                return { 
                    applicable: true, 
                    detail: `공공 건축물 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 500㎡ → ECO2-OD 시뮬레이션 필요` 
                };
            }
            if (data.ownership === 'private' && data.totalFloorArea >= 3000) {
                return { 
                    applicable: true, 
                    detail: `민간 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 3,000㎡ → 교육연구시설인 경우 소요량 평가서 제출` 
                };
            }
            return { applicable: false, detail: "제출대상 아님" };
        }
    },

    // 4. 신재생에너지 의무화
    renewableEnergy: {
        category: "신에너지 및 재생에너지 개발·이용·보급 촉진법",
        item: "신재생에너지 설비 설치 의무",
        basis: "법 제12조, 영 제15조~17조",
        content: "공공기관이 신축·증축·개축하는 연면적 1,000㎡ 이상 건축물 (특정 용도)",
        check: (data) => {
            const targetActions = ['신축', '증축', '별동증축', '개축', '전부개축'];
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물 (공공기관만 의무)" };
            }
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님` };
            }
            if (data.totalFloorArea >= 1000) {
                // 2024~2025년 기준 34%
                const rate = data.permitYear >= 2026 ? "36%" : "34%";
                return { 
                    applicable: true, 
                    detail: `공공 건축물 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 1,000㎡ → 예상에너지사용량의 ${rate} 이상 신재생에너지 설치` 
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 1,000㎡` };
        }
    },

    // 5. 공공기관 에너지이용 합리화 규정
    bems: {
        category: "공공기관 에너지이용 합리화 규정",
        item: "BEMS 구축",
        basis: "규정 제6조",
        content: "공공기관 연면적 10,000㎡ 이상 건축물을 신축·별동증축하는 경우 건물에너지관리시스템 구축",
        check: (data) => {
            const targetActions = ['신축', '별동증축'];
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물" };
            }
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님` };
            }
            if (data.totalFloorArea >= 10000) {
                return { 
                    applicable: true, 
                    detail: `공공 건축물 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 10,000㎡ → BEMS 구축·운영 의무` 
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 10,000㎡` };
        }
    },

    nonElectricCooling: {
        category: "공공기관 에너지이용 합리화 규정",
        item: "비전기식 냉방방식",
        basis: "규정 제10조",
        content: "공공기관 연면적 1,000㎡ 이상 건축물 신축·증축 시 냉방용량 60% 이상 비전기식 냉방장치 설치",
        check: (data) => {
            const targetActions = ['신축', '증축', '별동증축'];
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물" };
            }
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님` };
            }
            if (data.totalFloorArea >= 1000) {
                return { 
                    applicable: true, 
                    detail: `공공 건축물 연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 1,000㎡ → 냉방용량 60% 이상 비전기식 (공동주택, 학교 등 일부 제외)` 
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 1,000㎡` };
        }
    },

    ledLighting: {
        category: "공공기관 에너지이용 합리화 규정",
        item: "LED 조명기기",
        basis: "규정 제11조",
        content: "공공기관 소유 건축물의 실내 및 주차장 조명기기를 LED제품으로 100% 적용",
        check: (data) => {
            if (data.ownership === 'public') {
                return { 
                    applicable: true, 
                    detail: "공공 건축물 → LED 조명기기 100% 적용 의무" 
                };
            }
            return { applicable: false, detail: "민간 건축물" };
        }
    },

    essInstallation: {
        category: "공공기관 에너지이용 합리화 규정",
        item: "ESS 설치",
        basis: "규정 제11조",
        content: "공공기관 계약전력 2,000kW 이상 건축물에 계약전력 5% 이상 에너지저장장치(ESS) 설치",
        check: (data) => {
            if (data.ownership === 'public') {
                return { 
                    applicable: true, 
                    detail: "공공 건축물 → 계약전력 2,000kW 이상인 경우 계약전력 5% 이상 ESS 설치 (일부 시설 제외)" 
                };
            }
            return { applicable: false, detail: "민간 건축물" };
        }
    },

    ecoCarParking: {
        category: "공공기관 에너지이용 합리화 규정",
        item: "친환경 자동차 전용주차구역",
        basis: "규정 제16조",
        content: "공공기관 청사주차장(50대 이상)에 경차 및 환경친화적 자동차 전용 주차면 10% 이상 설치",
        check: (data) => {
            if (data.ownership === 'public') {
                return { 
                    applicable: true, 
                    detail: "공공 건축물 → 주차단위구획 50대 이상 시 전용주차구역 10% 이상 설치" 
                };
            }
            return { applicable: false, detail: "민간 건축물" };
        }
    },

    // 6. 에너지이용 합리화법
    energyUsePlan: {
        category: "에너지이용 합리화법",
        item: "에너지사용계획서 제출",
        basis: "법 제10조, 영 제20조",
        content: "민간: 연간 5,000TOE 이상 연료/열 또는 연간 20,000MWh 이상 전력 사용 시설",
        check: (data) => {
            // 공공은 2,500TOE 또는 10,000MWh, 민간은 5,000TOE 또는 20,000MWh
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

    // 7. 물의 재이용법
    rainwaterSystem: {
        category: "물의 재이용 촉진 및 지원에 관한 법률",
        item: "빗물이용시설 설치",
        basis: "법 제8조, 영 제10조",
        content: "공공업무시설/체육관 지붕면적 1,000㎡ 이상, 공동주택 건축면적 10,000㎡ 이상, 학교 건축면적 5,000㎡ 이상",
        check: (data) => {
            // 공공업무시설/체육관 지붕면적 1,000㎡ 이상
            if (data.ownership === 'public' && data.roofArea && data.roofArea >= 1000) {
                return { 
                    applicable: true, 
                    detail: `공공 건축물 지붕면적 ${data.roofArea.toLocaleString()}㎡ ≥ 1,000㎡ → 우수조 용량: 지붕면적 × 0.05m` 
                };
            }
            // 공동주택 건축면적 10,000㎡ 이상
            if (data.buildingArea && data.buildingArea >= 10000 && data.householdCount) {
                return { 
                    applicable: true, 
                    detail: `공동주택 건축면적 ${data.buildingArea.toLocaleString()}㎡ ≥ 10,000㎡ → 빗물이용시설 설치` 
                };
            }
            // 학교 건축면적 5,000㎡ 이상
            if (data.buildingArea && data.buildingArea >= 5000) {
                return { 
                    applicable: true, 
                    detail: `건축면적 ${data.buildingArea.toLocaleString()}㎡ → 학교시설인 경우 빗물이용시설 설치 (5,000㎡ 이상)` 
                };
            }
            return { applicable: false, detail: "지붕면적/건축면적 미입력 또는 기준 미만" };
        }
    },

    grayWaterSystem: {
        category: "물의 재이용 촉진 및 지원에 관한 법률",
        item: "중수도 설치",
        basis: "법 제9조, 영 제11조",
        content: "연면적 60,000㎡ 이상 특정시설(숙박업, 대규모점포, 업무시설 등)",
        check: (data) => {
            if (data.totalFloorArea >= 60000) {
                return { 
                    applicable: true, 
                    detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ ≥ 60,000㎡ → 중수도 설치 대상 (용도별 확인 필요)` 
                };
            }
            return { applicable: false, detail: `연면적 ${data.totalFloorArea.toLocaleString()}㎡ < 60,000㎡` };
        }
    },

    // 9. 자전거 이용 활성화법
    bicycleParking: {
        category: "자전거 이용 활성화에 관한 법률",
        item: "자전거 주차장 설치",
        basis: "법 제11조, 영 제7조, 별표1",
        content: "주차장법에 따른 시설물에 자동차 주차대수의 10~40% 자전거 주차장 설치",
        check: (data) => {
            if (data.totalFloorArea >= 500) {
                return { 
                    applicable: true, 
                    detail: "시설 용도에 따라 자동차 주차대수의 10~20% 자전거 주차장 설치 (5대 미만 제외)" 
                };
            }
            return { applicable: false, detail: "소규모 시설" };
        }
    },

    // 11. 장애물 없는 생활환경 인증
    bfCertification: {
        category: "장애물 없는 생활환경 인증",
        item: "BF 인증",
        basis: "법 제10조의2, 영 제5조의2",
        content: "국가·지자체·공공기관이 설치하는 공공건물 및 공중이용시설 신축·별동증축·전부개축·재축 시",
        check: (data) => {
            const targetActions = ['신축', '별동증축', '전부개축', '재축'];
            if (data.ownership !== 'public') {
                return { applicable: false, detail: "민간 건축물 (공공만 의무, 공동주택 의무대상 제외)" };
            }
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 인증 대상 아님` };
            }
            return { 
                applicable: true, 
                detail: "공공건물 및 공중이용시설 → BF 인증 의무 (일반등급 이상)" 
            };
        }
    },

    // 12. 건축물 마감재료 난연성능 기준
    fireResistantMaterial: {
        category: "건축물 마감재료의 난연성능 기준",
        item: "외벽 준불연 이상 단열재",
        basis: "법 제52조, 영 제61조",
        content: "3층 이상 또는 높이 9m 이상 건축물의 외벽에 불연 또는 준불연 마감재료 사용",
        check: (data) => {
            // 일반적으로 3층 이상 또는 9m 이상이면 해당
            return { 
                applicable: true, 
                detail: "3층 이상 또는 높이 9m 이상 건축물 → 외벽 단열재 준불연 이상 적용" 
            };
        }
    },

    // 13. 환경친화적 자동차법
    evCharging: {
        category: "환경친화적 자동차의 개발 및 보급 촉진에 관한 법률",
        item: "전기차 충전시설",
        basis: "법 제11조의2, 영 제18조의5~7",
        content: "주차단위구획 50대 이상 시설에 총주차대수의 5% 전용주차구역 및 충전시설 설치 (지역 조례)",
        check: (data) => {
            const targetActions = ['신축', '증축', '별동증축', '개축', '전부개축', '재축'];
            if (!targetActions.includes(data.buildingAction)) {
                return { applicable: false, detail: `${data.buildingAction}은 대상 아님` };
            }
            
            // 2022.1.28 이후 건축허가 기준
            let rate = "5%";
            if (data.permitYear < 2022) {
                rate = "기축시설 기준 적용";
            }
            
            return { 
                applicable: true, 
                detail: `주차단위구획 50대 이상 시 → 전용주차구역 ${rate}, 충전시설 ${rate} 설치 (${data.region} 조례 확인)` 
            };
        }
    },

    // 서울시 특별 기준
    seoulGreenBuilding: {
        category: "서울시 녹색건축물 설계기준",
        item: "서울시 녹색건축 기준",
        basis: "서울시 녹색건축물 설계기준",
        content: "서울시 건축물에 대한 추가적인 녹색건축 기준 적용",
        check: (data) => {
            if (data.region !== '서울특별시') {
                return { applicable: false, detail: "서울특별시 아님" };
            }
            if (data.ownership === 'public' && data.totalFloorArea >= 500) {
                return { 
                    applicable: true, 
                    detail: "서울시 공공 건축물 → 에너지 모니터링 장치(5종 이상), 신재생에너지 10% 이상 등 적용" 
                };
            }
            return { applicable: true, detail: "서울시 건축물 → 서울시 녹색건축물 설계기준 확인 필요" };
        }
    },

    // 마곡지구 특별 기준
    magokDistrict: {
        category: "마곡 도시개발사업 지구단위계획 시행지침",
        item: "마곡지구 친환경 기준",
        basis: "마곡 지구단위계획 시행지침",
        content: "마곡지구 내 건축물에 대한 EPI 81점 이상, 태양광 설치, 생태면적률 30% 등",
        check: (data) => {
            if (data.region !== '서울특별시' || data.isMagok !== 'yes') {
                return { applicable: false, detail: "마곡지구 아님" };
            }
            return { 
                applicable: true, 
                detail: "마곡지구 → EPI 81점 이상, 수요부하 5% 태양광, 생태면적률 30% 이상 (공공청사)" 
            };
        }
    },

    // 생태면적률
    ecologicalArea: {
        category: "서울시 생태면적률 운영지침",
        item: "생태면적률",
        basis: "서울시 생태면적률 운영지침",
        content: "서울시 도시관리계획, 개발행위허가 대상 사업 및 공공건축물에 생태면적률 적용",
        check: (data) => {
            if (data.region !== '서울특별시') {
                return { applicable: false, detail: "서울특별시 아님" };
            }
            return { 
                applicable: true, 
                detail: "서울시 건축물 → 용도지역별 생태면적률 기준 적용 (상업 25~35%, 주거 40~55% 등)" 
            };
        }
    },

    // 저영향개발 사전협의
    lidConsultation: {
        category: "서울특별시 저영향개발 사전협의",
        item: "저영향개발(LID) 사전협의",
        basis: "서울특별시 저영향개발 사전협의",
        content: "대지면적 2,000㎡ 이상 또는 건축연면적 3,000㎡ 이상 건축",
        check: (data) => {
            if (data.region !== '서울특별시') {
                return { applicable: false, detail: "서울특별시 아님" };
            }
            if ((data.siteArea && data.siteArea >= 2000) || data.totalFloorArea >= 3000) {
                return { 
                    applicable: true, 
                    detail: `대지면적 ${data.siteArea || '미입력'}㎡ 또는 연면적 ${data.totalFloorArea.toLocaleString()}㎡ → LID 사전협의 대상` 
                };
            }
            return { applicable: false, detail: "대지면적 2,000㎡ 미만 및 연면적 3,000㎡ 미만" };
        }
    }
};

// 모든 법규를 순서대로 배열
const REGULATION_ORDER = [
    'energySavingPlan',
    'greenBuildingCertification',
    'zeroEnergyCertification',
    'sunshade',
    'thermalInsulation',
    'epiArchitectural',
    'energyConsumptionReport',
    'renewableEnergy',
    'bems',
    'nonElectricCooling',
    'ledLighting',
    'essInstallation',
    'ecoCarParking',
    'energyUsePlan',
    'rainwaterSystem',
    'grayWaterSystem',
    'bicycleParking',
    'bfCertification',
    'fireResistantMaterial',
    'evCharging',
    'seoulGreenBuilding',
    'magokDistrict',
    'ecologicalArea',
    'lidConsultation'
];

// Export for use in app.js
window.REGULATIONS = REGULATIONS;
window.REGULATION_ORDER = REGULATION_ORDER;
