# Grid System

그리드의 비율과 타이포그래피를 화면에서 조율하고, 실제 작업에 쓸 수 있는 레이아웃 설정으로 내보내는 브라우저 기반 도구입니다.

[grid-system.pages.dev — 바로 사용하기](https://grid-system.pages.dev/) · [검증 기록](VERIFICATION.md)

현재 버전 **1.1.0** · English / 한국어

![20분할 편집 화면](docs/screenshots/grid-system-desktop.png)

Josef Müller-Brockmann의 그리드 사고를 오늘의 웹 작업 흐름으로 옮깁니다. 고전 책의 판면을 복제하는 것이 아니라, 화면 크기·여백·컬럼·행·거터·타이포그래피의 관계를 실험하고 재사용 가능한 레이아웃 설정으로 내보내는 데 목적이 있습니다.

## 핵심 기능

- Figma 레이아웃 가이드에 익숙한 방식으로 columns, rows, margins, gutters를 px 단위로 조절합니다.
- 기본 20분할과 32분할 모드를 제공하며, 20분할을 기본값으로 사용합니다.
- 활성 프레임 안에서 실제 사용 가능한 폭·높이와 입력값을 바탕으로 셀, 행, 컬럼, 분할 수를 계산해 표시합니다.
- 화면 미리보기에는 그리드 색상·불투명도, 텍스트 색상·불투명도, Inter 기본 서체, 글자 크기·자간·행간 조절을 제공합니다.
- 제공받은 독일어 발췌문을 반복해 문단을 구성하고, 그리드의 모듈과 베이스라인에 맞춘 배치를 미리 봅니다.
- Figma의 실제 Frame preset에서 확인한 Phone, Tablet, Desktop 규격을 제공하고, 기본 프레임은 Desktop 1440×1024입니다.
- 12종 서체와 60개 작업판 프리셋을 검색하고 선택할 수 있습니다. ISO B와 JIS B, 국내 국절과 완성 판형을 구분합니다.
- 상단 **Random layout**은 시드로 컬럼·행·네 방향 여백·가로/세로 거터·글자 크기와 굵기·자간·행간·문단 채우기 양을 함께 생성합니다. 작업판과 서체, 색상은 유지합니다.
- 자유 배치는 제목·본문의 시작 셀과 모듈 결합을 그리드 전체에서 탐색합니다. 제목보다 위에 본문을 두거나 가운데·하단에서 시작할 수 있습니다.
- 행간을 최소 1px까지 줄여 글리프가 겹치는 실험도 표시·내보내기합니다. 겹침 경고가 나와도 배치를 숨기지 않습니다.
- UI는 영어가 기본이며 한국어로 전환할 수 있습니다. 지정된 독일어 샘플 원문은 언어 전환과 관계없이 보존됩니다.

## 사용 흐름

1. 작업판 프리셋을 고르거나 프레임 크기를 정합니다.
2. 컬럼·행·여백·거터를 직접 조절하거나 상단 **Random layout**으로 새로운 구성을 탐색합니다. **Seed → Apply seed**로 같은 작업판·서체에서 결과를 재현할 수 있습니다.
3. 필요한 형식으로 내보내어 다른 디자인·개발 작업에 활용합니다.

시드는 랜덤 생성의 출발점입니다. 생성 후 수치를 직접 수정한 최종 결과를 그대로 보관하려면 설정 JSON을 사용하세요. 자유 배치의 그리드 영역끼리는 겹치지 않지만, 짧은 행간에서 텍스트 줄끼리 겹치는 것은 의도적으로 허용합니다. 큰 작업판의 극단적인 밀도에서는 성능 보호를 위해 전체 텍스트를 최대 10,000행으로 제한하고 안내합니다.

## 내보내기

SVG, HTML/CSS ZIP, 설정 JSON을 내려받습니다. Figma 네이티브 Layout Guide를 만드는 플러그인은 아닙니다.

| 형식 | 적합한 용도 | 유의할 점 |
| --- | --- | --- |
| SVG | 편집 가능한 텍스트와 계산된 줄 위치를 담은 시각 결과 | 가져오는 앱에 같은 폰트가 없으면 글자 모양과 폭이 달라질 수 있습니다. |
| HTML/CSS ZIP | 선택한 웹폰트·고지문을 포함한 오프라인 레이아웃 | 좁은 화면에서는 본문이 읽기 순서대로 재배치됩니다. |
| 설정 JSON | 현재 그리드 설정의 보관·재사용 | 시각 결과 자체가 아니라 설정값을 담습니다. |

<details>
<summary>화면 예시 보기</summary>

**A4 · Libre Baskerville · 자유 배치 · Seed 149**

![A4 인쇄용 구성](docs/screenshots/grid-system-print.png)

**디자인에서 개발까지, 세 가지 내보내기**

![SVG, HTML/CSS, JSON 내보내기](docs/screenshots/grid-system-export.png)

</details>

## 개발 및 배포

상태: 구현·로컬 검증·비공개 GitHub push·Cloudflare Pages 배포 완료.

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

배포 주소는 https://grid-system.pages.dev/ 입니다. `main` push의 자동 프로덕션 배포는 켜져 있으며, 다른 브랜치의 preview 배포와 PR 댓글은 꺼져 있습니다. Node.js는 `.node-version`과 Pages 환경 변수의 `22.15.0`으로 고정합니다.

PowerShell에서 `CLOUDFLARE_API_TOKEN`과 `CLOUDFLARE_ACCOUNT_ID`가 설정되어 있으면 다음 명령으로 상태 조회 또는 연결된 `main`의 수동 재배포를 할 수 있습니다. 토큰을 명령에 직접 적거나 저장소에 저장하지 마세요. `-Create`는 최초 프로젝트 생성용이며 이미 생성된 프로젝트에는 사용하지 않습니다.

```powershell
.\scripts\deploy-pages.ps1
.\scripts\deploy-pages.ps1 -Deploy
```

## 검증

변경마다 다음 검증을 적용합니다.

```bash
npm run typecheck
npm run build
npm test
npm run test:e2e
```

브라우저 테스트는 로컬 Chrome을 사용합니다. 20/32분할 전환, 12종 폰트, 프리셋과 실제 인쇄 치수, 잘못된 수치·JSON, 폰트 로딩 실패·재시도, 좁은 화면, 오프라인 HTML/CSS 파일에 더해 언어 전환, 시드 재현, 자유 배치, 겹치는 행간 출력을 확인합니다. 실제 결과는 [VERIFICATION.md](VERIFICATION.md)에 기록합니다.

배포된 앱에 같은 테스트를 실행하려면:

```powershell
$env:GRID_SYSTEM_BASE_URL = 'https://grid-system.pages.dev'
npm run test:e2e
```

README의 이미지는 실제 앱에서 직접 캡처했습니다. `node scripts/capture-readme.mjs`로 배포된 버전의 같은 화면을 다시 생성할 수 있습니다.

## 글꼴, SVG, 라이선스

- 기본 작업판 폰트는 Inter입니다. 확장 서체의 출처·지원 굵기·고지 기준은 [FONTS.md](FONTS.md)에 관리합니다.
- 폰트는 자체 호스팅하고 선택할 때 로드합니다. 10종은 OFL 원문을 포함하며, 열린명조·열린고딕은 사용자가 지정한 저장소의 제작사 확인·웹폰트 배포 안내와 별도 출처 고지를 보존합니다. 열린 서체를 OFL이라고 표기하지 않습니다.
- SVG의 `<text>`는 편집 가능하지만 대상 환경에 해당 글꼴이 없으면 모양과 개행이 바뀔 수 있습니다. 완전히 고정된 시각 결과가 필요한 인쇄물·공유물은 글꼴 라이선스가 허용하는 범위에서 윤곽선화한 별도 파일 또는 PDF를 검토합니다.
- 브라우저의 인쇄는 현재 viewport, 로컬 폰트, 프린터 설정, 페이지 나눔에 영향을 받습니다. 인쇄 전용 출력은 별도 print stylesheet와 실제 브라우저 인쇄 미리보기에서 검증해야 하며, 화면 미리보기와 완전히 동일하다고 가정하지 않습니다.

## 텍스트 출처

예시 문장은 사용자가 제공한 `internationale_typographie_auszug_de_without_markers.txt`의 내용을 그대로 `src/sample.txt`에 보존하고 순환해 구성합니다. 제공된 발췌 파일의 내용은 앱과 다운로드에 포함되며, 책 전체 PDF는 포함하지 않습니다. 마지막 미완성 구절 `Eine Werb`도 임의로 수정하지 않았습니다. 코드·글꼴·예시 원문의 권리를 하나의 라이선스로 일괄 표시하지 않습니다.

## 참고

- [PLAN.md](PLAN.md): 제품 및 구현 계획
- [CHANGELOG.md](CHANGELOG.md): 버전별 변경 사항
- [PRESETS.md](PRESETS.md): 프레임과 그리드 preset 근거
- [FONTS.md](FONTS.md): 글꼴 추가 및 고지 기준
- [Cloudflare Pages Create project API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/create/)
