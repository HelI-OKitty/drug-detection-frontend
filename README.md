# drug-detection-frontend

Next.js App Router와 TypeScript 기반의 마약 탐지 서비스 프론트엔드 프로젝트입니다.
회원가입·로그인 화면과 배포된 백엔드 인증 API가 연결되어 있습니다.

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
- `/`는 “홈” 화면이며, `/signup`과 `/login`에서 회원가입·로그인을 진행합니다. 가입 성공 시 `/login`, 로그인 성공 시 `/`로 이동합니다.
- `src/app/globals.css`는 Tailwind CSS를 불러오고 기본 배경색, 글자색, 박스 모델, 폰트 스타일을 정의합니다.
- TypeScript는 strict mode로 설정되어 있습니다.
- `@/*` 경로 별칭은 `src/*`를 가리킵니다.

## 개발 참고

인증 폼은 `src/components/auth-form.tsx`, 서버 액션은 `src/app/auth-actions.ts`, 백엔드 요청은 `src/lib/auth-api.ts`에 있습니다.

- 회원가입: `POST /auth/signup`에 이름·이메일·비밀번호를 전달합니다. 비밀번호 확인은 프론트에서 검증하며 API에는 보내지 않습니다. 가입 후 로그인을 별도로 진행합니다.
- 로그인: `POST /auth/login` 후 Bearer 토큰으로 `GET /profile`을 조회하고, 성공하면 홈 화면으로 이동합니다.
- 토큰: Next.js 서버에서 HttpOnly·SameSite=Lax 세션 쿠키로 저장합니다. 프로덕션에서는 Secure를 적용하며 브라우저 스크립트에 토큰을 반환하지 않습니다.
- 기본 API 주소는 배포된 Cloud Run 서버입니다. 변경하려면 `.env.example`을 참고해 `.env.local`의 `BACKEND_API_URL`을 설정한 후 서버를 재시작합니다.
- 현재 범위는 가입·로그인과 사용자 정보 확인입니다. 대시보드 이동, 보호된 페이지, 자동 토큰 갱신, 로그아웃은 아직 구현하지 않았습니다.

요청 계약 테스트는 TypeScript 직접 실행을 지원하는 Node.js 22.18 이상에서 실행합니다. 실제 서버나 계정을 변경하지 않습니다.

```bash
node --test tests/auth-api.test.mjs
```
