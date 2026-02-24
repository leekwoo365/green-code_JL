# Green Code - 친환경 법규 검토 시스템

## 프로젝트 개요
정림건축의 친환경 법규 검토 웹 애플리케이션 (v2025.11)
건축물 정보를 입력하면 24개 친환경 법규 해당 여부를 자동 판정

## 기술 스택
- 순수 HTML/CSS/JS (프레임워크 없음, 정적 웹앱)
- 서버 불필요 (index.html 직접 실행 가능)

## 파일 구조
```
Green Code/
├── index.html          # UI 레이아웃 (입력 폼 + 결과 테이블)
├── app.js              # 앱 로직 (폼 검증, 검토 실행, 결과 표시, Excel/인쇄)
├── regulations.js      # 법규 데이터베이스 (24개 법규 판정 로직)
├── styles.css          # Liquid Glass 디자인 테마
├── logo.png            # 정림건축 로고
└── Junglim_logo_ai/    # 로고 원본 AI 파일
```

## 수정 가이드
- UI 변경: index.html + styles.css
- 기능/로직 변경: app.js
- 법규 추가/수정: regulations.js (REGULATIONS 객체 + REGULATION_ORDER 배열)
- 디자인: styles.css (CSS 변수는 :root에 정의)

## 코딩 규칙
- 한국어 UI 유지
- 기존 Liquid Glass 디자인 톤 유지
- 외부 라이브러리 최소화 (현재 Google Fonts만 사용)
- 법규 기준일 변경 시 footer와 주석 모두 업데이트
