# Modern React Application Template

최신 도구와 베스트 프랙티스를 적용한 완전한 React 애플리케이션 템플릿입니다.

## 개요

이 템플릿은 TypeScript, 최신 빌드 도구, UI 라이브러리, 상태 관리, 테스팅 프레임워크를 포함한 현대적인 React 애플리케이션을 빠르게 시작할 수 있도록 설계되었습니다.

### 주요 기능

- **현대적 도구**: Vite, Webpack, TypeScript 지원
- **UI 라이브러리**: Tailwind CSS, Material-UI, Chakra UI, Ant Design
- **상태 관리**: Zustand, Redux Toolkit, Context API
- **인증**: Auth0, Firebase, Supabase 통합
- **테스팅**: Vitest/Jest + React Testing Library + Playwright
- **배포**: Vercel, Netlify, GitHub Pages, Docker
- **개발 도구**: ESLint, Prettier, Husky

### 지원 기술 스택

#### 코어 기술
- **React**: 17.x, 18.x
- **언어**: TypeScript, JavaScript
- **빌드 도구**: Vite, Webpack, Create React App

#### UI 및 스타일링
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **Material-UI**: Google Material Design
- **Chakra UI**: 모듈러 컴포넌트 라이브러리
- **Ant Design**: 엔터프라이즈급 UI 라이브러리

#### 상태 관리
- **Zustand**: 경량 상태 관리
- **Redux Toolkit**: 예측 가능한 상태 컨테이너
- **Context API**: React 내장 상태 관리

## 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │   Build Process │    │   Production    │
│   Server        │───►│   (Vite/Webpack)│───►│   Deployment    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Hot Reload    │    │   Code          │    │   CDN/Static    │
│   Fast Refresh  │    │   Optimization  │    │   Hosting       │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Application Structure:
┌─────────────────┐
│   src/          │
│   ├── components/   ← 재사용 가능한 컴포넌트
│   ├── pages/       ← 페이지 컴포넌트
│   ├── hooks/       ← 커스텀 React 훅
│   ├── store/       ← 상태 관리
│   ├── services/    ← API 서비스
│   ├── utils/       ← 유틸리티 함수
│   └── types/       ← TypeScript 타입 정의
└─────────────────┘
```

## 템플릿 옵션

### 기본 구성
- **애플리케이션 이름**: 프로젝트 식별자
- **설명**: 프로젝트 설명
- **저장소**: Git 저장소 위치

### React 구성
- **React 버전**: 17.x 또는 18.x
- **빌드 도구**: Vite (권장), Webpack, CRA
- **TypeScript**: 활성화/비활성화
- **라우터**: React Router 포함 여부

### UI 및 스타일링
- **UI 라이브러리**: 원하는 컴포넌트 라이브러리 선택
- **PWA**: Progressive Web App 기능
- **Storybook**: 컴포넌트 개발 도구

### 개발 도구
- **ESLint**: 코드 품질 검사
- **Prettier**: 코드 포맷팅
- **Husky**: Git 훅 관리
- **테스팅**: Vitest 또는 Jest

### 배포 옵션
- **Vercel**: 자동 배포 및 호스팅
- **Netlify**: JAMstack 호스팅
- **GitHub Pages**: 정적 사이트 호스팅
- **Docker**: 컨테이너화 배포

## 빠른 시작

1. **템플릿 선택**: Backstage에서 "Modern React Application" 선택
2. **기본 정보**: 프로젝트명, 설명, 저장소 입력
3. **기술 스택**: React 버전, 빌드 도구, UI 라이브러리 선택
4. **기능 선택**: 인증, API 통합, PWA 등 필요한 기능 선택
5. **배포 설정**: 배포 플랫폼 및 CI/CD 설정
6. **생성**: 템플릿 생성 및 저장소에 푸시

## 생성된 프로젝트 구조

```
my-react-app/
├── public/                 # 정적 파일
├── src/
│   ├── components/         # 재사용 컴포넌트
│   ├── pages/             # 페이지 컴포넌트
│   ├── hooks/             # 커스텀 훅
│   ├── store/             # 상태 관리
│   ├── services/          # API 서비스
│   ├── styles/            # 스타일 파일
│   ├── utils/             # 유틸리티
│   ├── types/             # TypeScript 타입
│   ├── App.tsx            # 메인 앱 컴포넌트
│   └── main.tsx           # 엔트리 포인트
├── .github/workflows/     # CI/CD 파이프라인
├── package.json           # 의존성 및 스크립트
├── vite.config.ts         # Vite 설정
├── tsconfig.json          # TypeScript 설정
├── tailwind.config.js     # Tailwind 설정
├── .eslintrc.cjs          # ESLint 규칙
├── .prettierrc            # Prettier 설정
├── Dockerfile             # Docker 설정
└── README.md              # 프로젝트 문서
```

## 다음 단계

- [시작하기](getting-started.md) - 개발 환경 설정 및 첫 실행
- [구성 옵션](configuration-options.md) - 상세한 설정 옵션
- [빌드 도구](build-tools.md) - Vite, Webpack 설정 가이드
- [UI 라이브러리](ui-libraries.md) - 각 UI 라이브러리 사용법
- [상태 관리](state-management.md) - 상태 관리 패턴
- [테스팅](testing.md) - 테스트 작성 및 실행
- [배포](deployment.md) - 프로덕션 배포 가이드
- [베스트 프랙티스](best-practices.md) - 개발 모범 사례