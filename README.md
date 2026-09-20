# 개발한입

개발 지식을 읽고 복습하는 학습 전용 웹 앱입니다.

## 주요 기능

- 카테고리별 학습 콘텐츠 탐색과 검색
- 학습 완료 표시 및 일괄 변경
- 즐겨찾기 저장과 필터
- 학습 완료 및 즐겨찾기 기기 동기화
- PWA 설치 및 오프라인 학습

학습 기록은 브라우저에 저장됩니다. 동기화 ID를 설정하면 기기 간에 공유할 수 있습니다.

## 로컬 실행

Node.js 22 이상을 권장합니다.

```bash
npm run build
python3 -m http.server 4173 -d dist
```

## 콘텐츠 관리

학습 원본은 `notion_technical_questions_final.txt`입니다. 내용을 검수한 다음 승인하고 빌드합니다.

```bash
npm run content:approve
npm run build
```

`npm run quality`는 승인된 원본과 용어를 검사합니다. 자동 검사는 기술적 정확성과 설명 품질에 대한 직접 검수를 대신하지 않습니다.

상세 절차는 [CONTENT_WORKFLOW.md](./CONTENT_WORKFLOW.md)를 참고하세요.

## 기술 구성

Vanilla JavaScript, HTML/CSS, PWA Service Worker, Node.js 빌드 도구, Vercel 배포 및 Redis 기반 동기화 API를 사용합니다. `dist/`와 `.vercel/`은 Git에서 제외됩니다.
