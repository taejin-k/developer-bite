# 개발한입

프론트엔드 학습 내용을 읽고, 퀴즈로 다시 떠올리며 복습하는 정적 웹 애플리케이션입니다.

- 서비스: https://interview-bite.vercel.app
- 학습 콘텐츠: 150개
- 검수된 퀴즈 개념: 105개
- 퀴즈가 연결된 학습 콘텐츠: 103개
- 출제 정의: 210개
- 검수된 선택지 원본: 737개

## 주요 기능

- 분야별 학습 콘텐츠 탐색과 검색
- 학습 완료 상태와 북마크 저장
- 4지선다 및 OX 퀴즈
- 20개, 50개, 100개, 전체 문제 모드
- 정답과 오답 선택지별 상세 해설
- 문제별 다시 풀기와 이전 문제 확인
- 오답노트와 PWA 설치

학습 상태와 오답 기록은 브라우저 저장소에 보관됩니다.

## 기술 구성

- Vanilla JavaScript
- HTML / CSS
- PWA Service Worker
- Node.js 콘텐츠 빌드 및 검증 스크립트
- Vercel 정적 배포
- Notion 기반 학습 원본

별도 프레임워크 없이 정적 파일로 동작하며, 빌드 과정에서 학습 콘텐츠와 검수된 퀴즈 데이터를 `dist/`에 생성합니다.

## 로컬 실행

Node.js 22 이상을 권장합니다.

```bash
npm run build
python3 -m http.server 4173 -d dist
```

브라우저에서 `http://localhost:4173`을 엽니다.

## 콘텐츠 구조

`notion_technical_questions_final.txt`는 앱에 노출되는 학습 원본입니다.

`quiz-concepts.json`의 퀴즈 개념 하나는 다음 항목을 가집니다.

- 학습 원본 제목과 해시
- 올바른 설명 문제와 틀린 설명 문제
- 사실 선택지 3개
- 오개념 선택지 4개
- 모든 선택지의 독립적인 상세 해설

앱은 이 선택지 후보를 조합하고 순서를 섞어 문제를 출제합니다. 문제 수를 늘리기 위해 다른 개념의 선택지를 섞거나 단순 부정문을 자동 생성하지 않습니다.

## 품질 기준

신규 퀴즈는 `qualityVersion: 2`를 사용합니다.

- 사실 선택지 3개 이상
- 오개념 선택지 4개 이상
- 선택지마다 60자 이상, 두 문장 이상의 해설
- 질문과 같은 개념 범위에서 경쟁하는 오답
- 정답과 오답의 문체 및 길이 균형
- 노골적인 부정형과 중복 선택지 차단
- `script`, `Web Worker` 등 문제 내부 용어 표기 통일
- 학습 원본이 바뀌면 연결된 퀴즈의 재검수 요구

```bash
npm run quality
```

검증에 실패한 콘텐츠는 프로덕션 빌드에 포함하지 않습니다.

## Notion 콘텐츠 갱신

1. Notion의 `기술 질문` 페이지를 텍스트 또는 Markdown으로 내보냅니다.
2. 학습 원본을 가져옵니다.
3. 새 학습 항목의 퀴즈 개념을 작성하고 검수합니다.
4. 원본과 퀴즈를 승인한 뒤 빌드합니다.

```bash
node scripts/import-notion-content.mjs <notion-export-file>
npm run quiz:scaffold -- "새 질문이란?"
npm run content:approve
npm run build
```

세부 절차는 [CONTENT_WORKFLOW.md](./CONTENT_WORKFLOW.md)에 정리되어 있습니다.

## 주요 명령어

```bash
npm run quiz:build
npm run quiz:validate
npm run content:validate
npm run content:approve
npm run quality
npm run build
```

## 디렉터리

```text
.
├── app.js
├── index.html
├── styles.css
├── quiz-concepts.json
├── quiz-bank-v2.json
├── notion_technical_questions_final.txt
├── scripts/
├── dist/
└── CONTENT_WORKFLOW.md
```

`dist/`와 `.vercel/`은 Git에서 제외됩니다.
