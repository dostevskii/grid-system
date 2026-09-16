# Grid System

Josef Müller-Brockmann의 그리드 사고를 오늘의 웹 작업 흐름으로 옮기는 브라우저 기반 레이아웃 도구입니다. 고전 책의 판면을 복제하는 것이 아니라, 화면 크기·여백·컬럼·행·거터·타이포그래피의 관계를 실험하고 재사용 가능한 레이아웃 설정으로 내보내는 데 목적이 있습니다.

상태: 구현과 로컬 검증, 비공개 GitHub push 완료. Cloudflare Pages는 사용자 로그인·GitHub App 연결 대기이며 아직 배포되지 않았습니다. [검증과 남은 단계](VERIFICATION.md)를 확인하세요.

## 기능

- Figma 레이아웃 가이드에 익숙한 방식으로 columns, rows, margins, gutters를 px 단위로 조절합니다.
- 기본 20분할과 32분할 모드를 제공하며, 20분할을 기본값으로 사용합니다.
- 활성 프레임 안에서 실제 사용 가능한 폭·높이와 입력값을 바탕으로 셀, 행, 컬럼, 분할 수를 계산해 표시합니다.
- 화면 미리보기에는 그리드 색상·불투명도, 텍스트 색상·불투명도, Inter 기본 서체, 글자 크기·자간·행간 조절을 제공합니다.
- 제공받은 독일어 발췌문을 반복해 문단을 구성하고, 그리드의 모듈과 베이스라인에 맞춘 배치를 미리 봅니다.
- Figma의 실제 Frame preset에서 확인한 Phone, Tablet, Desktop 규격을 제공하고, 기본 프레임은 Desktop 1440×1024입니다.
- 12종 서체와 60개 작업판 프리셋을 검색하고 선택할 수 있습니다. ISO B와 JIS B, 국내 국절과 완성 판형을 구분합니다.
- SVG, HTML/CSS ZIP, 설정 JSON을 내려받습니다. SVG는 편집 가능한 텍스트와 계산된 줄 위치를 담지만, 가져오는 앱에 같은 폰트가 없으면 글자 모양과 폭이 달라질 수 있습니다. Figma 네이티브 Layout Guide를 만드는 플러그인은 아닙니다.

## 개발

Node.js 22.12 이상을 사용합니다.

```bash
npm ci
npm run dev
```

정적 산출물은 `dist/`에 생성합니다.

```bash
npm run build
npm run preview
```

Cloudflare Pages의 Git integration에서는 `main`을 production branch로 두고, build command에 `npm run build`, build output directory에 `dist`를 지정합니다. Pages 프로젝트와 GitHub repository의 공개성은 별개입니다. 이 저장소는 private이며 앱은 공개합니다. 제공된 샘플 발췌문과 웹폰트는 방문자의 브라우저에 전달되지만, 참고 도서 PDF는 저장소와 배포에 포함하지 않습니다. API 자격 증명은 환경 변수로만 전달합니다.

## 검증

변경마다 다음 검증을 적용합니다.

```bash
npm run typecheck
npm run build
npm test
npm run test:e2e
```

브라우저 테스트는 로컬 Chrome을 사용합니다. 20/32분할 전환, 12종 폰트, 프리셋과 실제 인쇄 치수, 잘못된 수치·JSON, 폰트 로딩 실패·재시도, 좁은 화면, 오프라인 HTML/CSS 파일을 확인합니다. 실제 결과는 [VERIFICATION.md](VERIFICATION.md)에 기록합니다.

## 글꼴, SVG, 라이선스

- 기본 작업판 폰트는 Inter입니다. 확장 서체의 출처·지원 굵기·고지 기준은 [FONTS.md](FONTS.md)에 관리합니다.
- 폰트는 자체 호스팅하고 선택할 때 로드합니다. 10종은 OFL 원문을 포함하며, 열린명조·열린고딕은 사용자가 지정한 저장소의 제작사 확인·웹폰트 배포 안내와 별도 출처 고지를 보존합니다. 열린 서체를 OFL이라고 표기하지 않습니다.
- SVG의 `<text>`는 편집 가능하지만 대상 환경에 해당 글꼴이 없으면 모양과 개행이 바뀔 수 있습니다. 완전히 고정된 시각 결과가 필요한 인쇄물·공유물은 글꼴 라이선스가 허용하는 범위에서 윤곽선화한 별도 파일 또는 PDF를 검토합니다.
- 브라우저의 인쇄는 현재 viewport, 로컬 폰트, 프린터 설정, 페이지 나눔에 영향을 받습니다. 인쇄 전용 출력은 별도 print stylesheet와 실제 브라우저 인쇄 미리보기에서 검증해야 하며, 화면 미리보기와 완전히 동일하다고 가정하지 않습니다.

## 텍스트 출처

예시 문장은 사용자가 제공한 `internationale_typographie_auszug_de_without_markers.txt`의 내용을 그대로 `src/sample.txt`에 보존하고 순환해 구성합니다. 제공된 발췌 파일의 내용은 앱과 다운로드에 포함되며, 책 전체 PDF는 포함하지 않습니다. 마지막 미완성 구절 `Eine Werb`도 임의로 수정하지 않았습니다. 코드·글꼴·예시 원문의 권리를 하나의 라이선스로 일괄 표시하지 않습니다.

## 참고

- [PLAN.md](PLAN.md): 제품 및 구현 계획
- [PRESETS.md](PRESETS.md): 프레임과 그리드 preset 근거
- [FONTS.md](FONTS.md): 글꼴 추가 및 고지 기준
- [Cloudflare Pages Create project API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/create/)
