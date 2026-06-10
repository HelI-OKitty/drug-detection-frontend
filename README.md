# drug-detection-frontend

Next.js App Router와 TypeScript 기반의 마약 탐지 서비스 프론트엔드 프로젝트입니다.
현재는 향후 기능 개발을 위한 기본 앱 구조, 전역 스타일, 린트/빌드 설정이 구성된 초기 골격 상태입니다.

## 기술 스택

- Next.js 15
- React 19
- TypeScript 5
- Tailwind CSS 4
- ESLint 9
- npm

## 실행 방법

의존성을 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속해 화면을 확인할 수 있습니다.

## 사용 가능한 스크립트

```bash
npm run dev
```

개발 서버를 실행합니다.

```bash
npm run build
```

프로덕션 빌드를 생성합니다.

```bash
npm run start
```

생성된 프로덕션 빌드를 실행합니다. 먼저 `npm run build`가 필요합니다.

```bash
npm run lint
```

ESLint로 코드 품질을 검사합니다.

## 프로젝트 구조

```text
drug-detection-frontend/
├─ src/
│  └─ app/
│     ├─ globals.css     # 전역 스타일 및 Tailwind CSS import
│     ├─ layout.tsx      # 앱 공통 HTML 레이아웃과 메타데이터
│     └─ page.tsx        # 루트 경로('/') 홈 화면
├─ eslint.config.mjs     # ESLint flat config
├─ next.config.ts        # Next.js 설정
├─ package.json          # scripts 및 의존성
├─ package-lock.json     # npm lockfile
├─ postcss.config.mjs    # Tailwind CSS용 PostCSS 설정
└─ tsconfig.json         # TypeScript 설정 및 @/* 경로 별칭
```

## 현재 구현 상태

- `src/app/layout.tsx`에서 한국어 문서 언어(`lang="ko"`)와 기본 메타데이터를 설정합니다.
- `src/app/page.tsx`는 중앙 정렬된 홈 화면을 렌더링합니다.
- `src/app/globals.css`는 Tailwind CSS를 불러오고 기본 배경색, 글자색, 박스 모델, 폰트 스타일을 정의합니다.
- TypeScript는 strict mode로 설정되어 있습니다.
- `@/*` 경로 별칭은 `src/*`를 가리킵니다.

## 개발 참고

현재 저장소에는 API 연동, 인증, 탐지 결과 화면, 공통 컴포넌트 디렉터리 등이 아직 추가되어 있지 않습니다.
기능이 늘어나면 `src/components`, `src/lib`, `src/types` 같은 디렉터리를 목적에 맞게 추가하는 방식으로 확장하면 됩니다.
