# 검증 기록

2026-09-16, Windows / Node.js 22.15.0 / Chrome headless.

## 로컬 결과

- `npm test`: 3개 파일, 20개 테스트 통과. 산식, 중첩 입력 검증, JSON 정규화, 원문 흐름, 긴 단어, 배치 변형과 경계, ISO A/B·JIS B·국내 치수, 내보내기를 검사했다.
- `npm run build`: TypeScript 검사 및 Vite 프로덕션 빌드 통과.
- `npm run test:e2e`: 8개 브라우저 테스트 통과. 12종 폰트와 20/32분할, 잘못된 입력/JSON, 폰트 실패·재시도, 모바일 패널·다이얼로그, A4 실치수, SVG/JSON/ZIP 다운로드를 확인했다.
- ZIP에 담긴 HTML/CSS와 폰트를 외부 네트워크 없이 로드했다. Inter·Libre Baskerville·열린명조의 SVG와 HTML 줄 위치·기준선·폭, 그리드 셀과 불투명도를 비교했다.
- 390px 모바일 HTML의 긴 독일어 단어 줄바꿈과 인쇄 모드의 A4 물리적 크기를 확인했다.
- 기본 데스크톱·모바일 및 SVG/HTML 비교 스크린샷을 검토했다. 스크린샷과 추적 로그는 Git에서 제외했다.
- 사용자 원문 파일과 `src/sample.txt`의 내용이 줄바꿈 방식·마지막 개행을 제외하고 일치함을 확인했다.
- 설치 시 `npm audit`: 취약점 0개.

## 폰트

82개 WOFF2와 SHA-256 목록을 보존한다. 10종은 검사한 독일어 문자 `äöüÄÖÜß«»`를 포함한다. 열린명조·열린고딕의 움라우트 6자는 Inter로 보완하며 같은 fallback을 측정·미리보기·SVG·HTML에 적용한다. OFL 10종과 열린 서체의 별도 출처 고지를 구분한다.

## 범위와 한계

- 자동 구성은 세 배치 계열의 재현 가능한 모듈 변형이며 임의 드래그 편집기는 아니다.
- SVG는 편집 가능한 텍스트를 유지하므로 Figma 등의 가져오기 환경에 같은 폰트가 필요하다. Figma 네이티브 Layout Guide 생성·SVG 글자 윤곽선화는 포함하지 않는다.
- 인쇄 크기는 mm/inch로 보존하지만 색분해, CMYK, 도련, 재단선 등 전문 인쇄 프리플라이트는 포함하지 않는다.
- 원래 샘플의 미완성 마지막 구절도 보존한다.
- 폰트 출처와 이용 근거의 상세 내용은 `public/font-notices/`에 포함한다.

## 배포

비공개 GitHub 저장소 https://github.com/dostevskii/grid-system 의 Private 상태와 `main` push를 확인했다. 구현 커밋 `8813402`의 GitHub Actions 빌드·단위 테스트도 성공했다.

Cloudflare Pages 생성 API는 `8000011`(Git installation 오류)을 반환했다. API로 프로젝트가 생성되지 않았음을 확인했으며 GitHub 설치 앱 목록에는 Cloudflare가 없다. Cloudflare 대시보드는 로그인 화면이므로 사용자 로그인·해당 저장소에 한정된 GitHub App 승인이 남았다. 공개 배포 URL은 아직 없으며 배포 성공으로 간주하지 않는다.

로컬 미리보기 http://127.0.0.1:5173/ 를 브라우저에 열어 두었다. 배포 후에는 `GRID_SYSTEM_BASE_URL` 환경 변수를 공개 주소로 지정하여 브라우저 테스트를 실행할 수 있다.
