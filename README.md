# drug-detection-frontend

Next.js와 TypeScript 기반 프론트엔드 프로젝트입니다.

## 시작하기

```bash
npm install
npm run dev
```

개발 서버가 실행되면 브라우저에서 `http://localhost:3000`을 열어 확인할 수 있습니다.

## 포함된 기본 구성

- Next.js App Router
- TypeScript strict mode
- ESLint
- Tailwind CSS
- `@/*` 경로 별칭

## 프론트 폴더 구조

```text
drug-detection-frontend/
├─ src/
│  └─ app/
│     ├─ layout.tsx      # 전체 페이지 공통 레이아웃
│     ├─ page.tsx        # 기본 홈 화면
│     └─ globals.css     # 전역 스타일 및 Tailwind CSS 설정
├─ public/               # 정적 파일을 둘 위치
├─ next.config.ts        # Next.js 설정
├─ tsconfig.json         # TypeScript 설정
├─ eslint.config.mjs     # ESLint 설정
├─ postcss.config.mjs    # Tailwind/PostCSS 설정
├─ package.json          # scripts 및 의존성 관리
└─ package-lock.json     # npm 의존성 잠금 파일
```

현재는 아이디어 확정 전 단계이므로 최소 구조만 구성되어 있습니다. 이후 기능이 정해지면 `src/components`, `src/lib`, `src/types` 같은 폴더를 필요에 맞게 추가하면 됩니다.
