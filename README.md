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

브라우저에서 `http://localhost:8080`으로 접속해 화면을 확인할 수 있습니다.

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
- `/`는 서비스 소개 홈입니다. 가입 성공 시 `/login`, 로그인 성공 시 `/dashboard`로 이동합니다.
- `/dashboard`는 예시 데이터로 구성한 대시보드입니다. 대시보드와 텍스트 분석 화면의 공통 사이드바에서 기능을 이동할 수 있습니다.
- 홈·대시보드·텍스트 분석 화면의 우측 상단은 HttpOnly 쿠키의 토큰으로 `/profile`을 조회해 회원 이름과 이메일을 표시합니다. 비로그인 상태에서는 로그인·시작하기 링크를 표시합니다.
- `/text-detector`에서 텍스트를 입력하고 분석 결과를 확인할 수 있습니다. `POST /public/analyze`의 `is_drug` 응답으로 의심 여부를 표시하며, 서버가 제공하지 않는 점수나 상세 근거는 표시하지 않습니다.
- `src/app/globals.css`는 Tailwind CSS를 불러오고 기본 배경색, 글자색, 박스 모델, 폰트 스타일을 정의합니다.
- TypeScript는 strict mode로 설정되어 있습니다.
- `@/*` 경로 별칭은 `src/*`를 가리킵니다.

## 개발 참고

### 회원가입 임시 중단

`SIGNUP_ENABLED`는 기본적으로 비활성화됩니다. `/signup`에 중단 안내를 표시하고, 회원가입 서버 액션도 백엔드 호출 전에 거절합니다. 로그인은 계속 사용할 수 있습니다. 다시 열려면 배포 환경에 `SIGNUP_ENABLED=true`를 설정하고 재배포합니다.

프론트 차단만으로 백엔드 URL에 대한 직접 요청을 막을 수는 없습니다. 백엔드의 `POST /auth/signup`에서도 계정 생성 전에 가입 허용 여부를 검사하고, 중단 중에는 `403`과 안내용 `detail`을 반환해야 합니다.

### 배포 환경에서 수동 크롤링

`/admin/crawl`의 서버 액션은 `BACKEND_API_URL`과 `INTERNAL_API_KEY`를 사용합니다. 로컬 `.env.local` 값은 배포 서버에 자동으로 전달되지 않으므로 배포 플랫폼의 서버 환경 변수에도 설정해야 합니다. 내부 키는 백엔드 값과 일치해야 하며 공개 환경 변수로 설정하지 않습니다.

- 내부 키 미설정: 프론트 서버 환경 변수 설정을 확인합니다.
- 내부 API 인증 오류(401/403): 백엔드와 프론트의 내부 키가 같은지 확인합니다.
- 서버 오류(500): 백엔드 로그에서 해당 요청의 예외를 확인합니다. 프론트는 백엔드가 반환한 문자열 `detail` 또는 상태 코드를 표시합니다. 백엔드는 사용자에게 공개 가능한 오류 설명만 `detail`에 넣어야 합니다.
- 응답 시간 초과: 크롤링 요청은 최대 270초 대기하며, `/admin/crawl`의 Vercel 실행 제한은 300초입니다. 프로필 조회와 오류 응답에 필요한 시간을 남깁니다. 수집이 계속될 수 있으므로 목록을 확인한 뒤 재시도합니다. 장시간 작업이 필요하면 백엔드가 작업을 접수하고 별도 워커에서 실행하도록 변경해야 합니다.

Vercel 프로젝트의 Settings → Environment Variables에서 배포 대상(Production/Preview)에 `BACKEND_API_URL`, 백엔드와 동일한 `INTERNAL_API_KEY`, `SIGNUP_ENABLED=false`를 설정하고 재배포합니다. 키에는 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. Fluid Compute 활성화 여부와 해당 플랜의 [실행 시간 제한](https://vercel.com/docs/functions/configuring-functions/duration)을 확인합니다.

백엔드 저장소는 https://github.com/HelI-OKitty/drug-detection-backend 입니다. 수동 수집은 Cloud Run의 `/internal/crawl`에서 실행하므로 X API 토큰과 AI 서버 설정은 백엔드에 필요합니다. Vercel은 이 요청을 중계합니다.

인증 폼은 `src/components/auth-form.tsx`, 서버 액션은 `src/app/auth-actions.ts`, 백엔드 요청은 `src/lib/auth-api.ts`에 있습니다.

- 회원가입: `POST /auth/signup`에 이름·이메일·비밀번호를 전달합니다. 비밀번호 확인은 프론트에서 검증하며 API에는 보내지 않습니다. 가입 후 로그인을 별도로 진행합니다.
- 로그인: `POST /auth/login` 후 Bearer 토큰으로 `GET /profile`을 조회하고, 성공하면 대시보드로 이동합니다.
- 토큰: Next.js 서버에서 HttpOnly·SameSite=Lax 세션 쿠키로 저장합니다. 프로덕션에서는 Secure를 적용하며 브라우저 스크립트에 토큰을 반환하지 않습니다.
- 기본 API 주소는 배포된 Cloud Run 서버입니다. 변경하려면 `.env.example`을 참고해 `.env.local`의 `BACKEND_API_URL`을 설정한 후 서버를 재시작합니다.
- 텍스트 분석은 `src/lib/text-detector.ts`와 `src/app/text-detector/actions.ts`에서 처리합니다. 같은 `BACKEND_API_URL`을 사용하며, 현재 백엔드 명세상 인증이 필요하지 않습니다. 빈 입력, 중복 제출, 통신 오류, 60초 시간 초과 및 잘못된 응답을 처리합니다.
- 현재 범위는 가입·로그인, 사용자 정보 확인, 텍스트 분석입니다. 대시보드의 실데이터 연결, 보호된 페이지, 자동 토큰 갱신, 로그아웃은 아직 구현하지 않았습니다.

요청 계약 테스트는 TypeScript 직접 실행을 지원하는 Node.js 22.18 이상에서 실행합니다. 실제 서버나 계정을 변경하지 않습니다.

```bash
node --test tests/*.test.mjs
```
