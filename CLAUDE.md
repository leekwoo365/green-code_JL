# Green Code - 친환경 법규 검토 시스템

## 프로젝트 개요
정림건축의 친환경 법규 검토 웹 애플리케이션 (v2026.02)
건축물 정보를 입력하면 37개 친환경 법규 해당 여부를 자동 판정
PDF 참조: 친환경법규 검토 양식(업데이트) ver. 2026.02.12

## 기술 스택
- 순수 HTML/CSS/JS (프레임워크 없음, 정적 웹앱)
- 서버 불필요 (index.html 직접 실행 가능)

## 파일 구조
```
Green Code/
├── index.html          # UI 레이아웃 (입력 폼 + 결과 테이블)
├── app.js              # 앱 로직 (폼 검증, 검토 실행, 결과 표시, Excel/인쇄)
├── regulations.js      # 법규 데이터베이스 (37개 법규 판정 로직, ~2500줄)
├── styles.css          # Liquid Glass 디자인 테마
├── logo.png            # 정림건축 로고
├── data/               # 참조 문서
│   ├── 친환경법규 검토 양식(업데이트) ver. 2026 02 12.pdf
│   └── 20250821_에너지절약계획서_검토양식_VBA.xlsm
└── Junglim_logo_ai/    # 로고 원본 AI 파일
```

## 아키텍처

### 의존성 체인 (Context Pattern)
- `runRegulationCheck()`에서 `context = {}` 객체를 생성
- 각 check 함수 시그니처: `check(data, context)`
- 앞선 법규의 판정 결과가 context에 저장되어 다음 check에서 참조
- 예: `energySavingPlan` → `greenBuildingCertification`이 context.energySavingPlan 참조

### 입력 필드 (필수 6개 + 선택 7개)
- 필수: 소유주체, 지역, 건축행위, **건축물용도(v2026.02 추가)**, 연면적, 건축허가시점
- 선택: 세대수, 연간연료/열사용량, 연간전력사용량, 지붕면적, 건축면적, 부지면적, 매장면적

### REGULATION_ORDER (37개, 의존성 안전 순서)
1~13: 국가 법규 (에너지절약계획서 → 녹색건축 → ZEB → 차양 → 인증규칙 → 설계기준예외 → 열손실 → 건축/기계/전기 의무 → EPI → 에너지소요량 → 신재생)
14~28: 공공기관 규정, 에너지이용합리화, 분산에너지, 물재이용, 자전거, 환경영향평가, BF인증, 난연, EV충전
29~37: 지역별 (녹색건축물설계기준 12개 지역, 서울시 기준, 지구단위, 생태면적률, 서울환경영향평가, 마곡, 서울형BF, LID, 인센티브)

## 수정 가이드
- UI 변경: index.html + styles.css
- 기능/로직 변경: app.js
- 법규 추가/수정: regulations.js (REGULATIONS 객체 + REGULATION_ORDER 배열)
- 디자인: styles.css (CSS 변수는 :root에 정의)
- 지역 데이터: regulations.js 상단의 EV_REGIONAL_DATA, GRAYWATER_REGIONAL_DATA, REGIONAL_GREEN_DATA

## 코딩 규칙
- 한국어 UI 유지
- 기존 Liquid Glass 디자인 톤 유지
- 외부 라이브러리 최소화 (현재 Google Fonts만 사용)
- 법규 기준일 변경 시 footer와 주석 모두 업데이트
- check 함수에 context 매개변수 항상 포함
