# Grid System: 폰트 지원 계획

작성일: 2026-09-16. 사용자 제공 `C:\Users\JohnHB\Downloads\추가폰트지원.txt`를 반영한 구현 사양이다. 실제 자체 호스팅 WOFF2, SHA-256 manifest, 고지 파일은 `public/fonts/`, `public/font-notices/`에 있다.

## 1. 지원 목록

첫 버전에 기존 Inter를 포함한 총 12종을 선택 가능하게 한다. 기본값은 Inter다. 메뉴는 사용자 목록에 따라 `Serif`, `Sans-serif`, `한국어`로 구분하고 검색을 지원한다.

| 분류 | 표시 이름 | 확인한 배포 특성 | 출처 |
| --- | --- | --- | --- |
| Serif | Libre Baskerville | 정적 400 / 700 | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/librebaskerville) |
| Serif | EB Garamond | variable wght 400–800 | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/ebgaramond) |
| Serif | Cormorant | variable wght 300–700 | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/cormorant) |
| Sans-serif | Inter | variable wght 100–900, 기본 서체 | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/inter) |
| Sans-serif | Montserrat | variable wght 100–900 | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/montserrat) |
| Sans-serif | Lato | 정적 100 / 300 / 400 / 700 / 900 | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/lato) |
| Sans-serif | Oswald | variable wght 200–700 | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/oswald) |
| Sans-serif | Outfit | variable wght 100–900 | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/outfit) |
| 한국어 | Pretendard | 정적 9종 및 variable, WOFF2·서브셋 제공 | [지정 저장소](https://github.com/orioncactus/pretendard) |
| 한국어 | Wanted Sans | 정적 7종, variable 400–1000, complete·split 웹폰트 제공 | [지정 저장소](https://github.com/wanteddev/wanted-sans) |
| 한국어 | 열린명조 | WOFF2, Light 300 / Medium 500 / Bold 700. 독일어 움라우트는 Inter fallback | [지정 저장소](https://github.com/hyunbinseo/yeolrin) |
| 한국어 | 열린고딕 | WOFF2, Light 300 / Medium 500 / Bold 700. 독일어 움라우트는 Inter fallback | [지정 저장소](https://github.com/hyunbinseo/yeolrin) |

Google Fonts는 CSS2 2026-09-16 스냅샷의 실제 WOFF2(`latin`·`latin-ext` 포함)를 사용한다. 모든 자산의 SHA-256은 `public/fonts/ASSET-SHA256.json`에 고정했다. Cormorant는 사용자가 지정한 Cormorant 패밀리를 사용한다.

## 2. 화면 동작

- 작업판 전체의 기본 폰트 패밀리를 선택한다. 제목·본문의 크기 위계는 유지한다.
- 폰트 선택기는 이름, 분류, 실제 지원 굵기를 보여준다. 존재하지 않는 굵기를 브라우저가 임의로 합성하지 않도록 한다.
- 이전에 선택한 굵기가 새 서체에 없으면 가장 가까운 지원 굵기로 바꾸고 현재 수치를 명확히 보여준다. 예를 들어 열린명조·열린고딕에는 실제 배포된 300/500/700만 제공한다.
- 자간·행간·글자 크기·색상·불투명도는 폰트와 독립적으로 조절한다. 서체 변경으로 문단이 들어가지 않으면 공간 부족과 조정 방향을 안내한다.
- 인터페이스의 폰트는 Inter와 Pretendard를 사용한다. 사용자가 바꾸는 작업판 폰트와 구분해 조작부의 크기가 흔들리지 않게 한다. `font-synthesis: none`으로 존재하지 않는 굵기의 합성을 막는다.
- 샘플 문단은 처음 지정한 독일어 텍스트 파일을 그대로 순환·반복한다. 한국어 폰트 선택만으로 예시 문장을 번역하거나 교체하지 않는다.

## 3. 로딩과 재배치

- 서체 카탈로그에 안정적인 fontId, CSS 패밀리, 분류, 굵기 범위/목록, 파일 경로, 버전, 고지 파일, 문자 지원 정보를 둔다.
- 기본 Inter와 UI에 필요한 자원부터 로드한다. 나머지는 실제 선택한 서체·굵기만 지연 로드한다. 폰트 선택기를 여는 것만으로 전체 파일을 내려받지 않는다.
- WOFF2를 우선 사용하고, 한국어 대용량 서체는 공식 제공 서브셋이나 필요한 글리프 범위를 활용한다. 선택한 배포 방식에 해당하는 고지와 파일 연결을 보존한다.
- 선택한 폰트와 굵기의 로딩 완료를 확인한 뒤 줄바꿈, 글자 폭, 행의 높이, 베이스라인을 다시 계산한다. 로딩은 15초 제한을 두며, 실패한 CSS 노드와 Promise cache를 제거해 재시도할 수 있다. 로딩 도중의 대체 서체 측정값을 최종 결과로 저장하지 않는다.
- 빠르게 폰트를 여러 번 바꿨을 때 먼저 요청한 폰트의 늦은 응답이 최신 선택을 덮어쓰지 않도록 한다.
- 실패하면 실패 상태와 다시 시도를 표시하고 이전에 검증된 배치를 유지한다. 완료 전 다운로드는 준비 상태를 안내한다.
- `fontTools`로 원문에 포함된 `ä`, `ö`, `ü`, `Ä`, `Ö`, `Ü`, `ß`, `«`, `»`을 검사한다. 열린명조·열린고딕은 여섯 움라우트가 없으므로 `Inter` fallback을 명시하고, 측정·미리보기·SVG·HTML/CSS 내보내기에 동일한 font stack을 사용한다. 결과는 `public/fonts/GLYPH-COVERAGE.json`에 기록한다.

## 4. 배포 출처와 고지

- Google Fonts 8종은 지정된 공식 저장소의 폰트 파일과 해당 `OFL.txt`를 함께 관리한다. 메타데이터상 8종 모두 OFL로 표시되어 있다.
- Pretendard는 공식 `dist/web` 배포물과 루트 [LICENSE](https://github.com/orioncactus/pretendard/blob/main/LICENSE)를 관리한다.
- Wanted Sans는 공식 `packages/wanted-sans/fonts/webfonts` 배포물과 루트 [OFL.txt](https://github.com/wanteddev/wanted-sans/blob/main/OFL.txt)를 관리한다.
- 열린명조·열린고딕은 지정 저장소가 제공하는 WOFF2와 [index.css](https://github.com/hyunbinseo/yeolrin/blob/main/index.css)를 기준으로 한다. CSS 패밀리는 각각 `Yeolrin Myeongjo`, `Yeolrin Gothic`이다.
- 윤디자인의 [공식 프로젝트 페이지](https://yoondesign.com/portfolio_exclusive/?bmode=view&idx=158521043)는 원저작 서울산업진흥원(현 서울경제진흥원), 윤디자인 제작 및 FONCO 무료 사용을 안내한다. 사용자 지정 [배포 저장소 README](https://github.com/hyunbinseo/yeolrin/tree/v1.0.0)는 서울경제진흥원 윤리경영실 국민신문고 처리 정보(신청번호 `1AA-2505-0517144`)와 윤디자인 확인을 근거로 오픈소스형 개발 프로젝트이며 라이선스 제약이 없다고 안내하고, WOFF2 직접 사용·CDN 웹폰트 사용법을 제공한다. 이 특정 안내를 근거로 12종 지원 범위에 포함한다. 다만 원저작권자의 라이선스 전문은 저장소에 없으므로 OFL로 표기하지 않으며, 특수 용도·정책 변경은 권리자와 최신 공식 안내를 재확인한다. FONCO 일반 상품 정책을 이 특정 무료 글꼴 안내보다 자동으로 우선한다고 단정하지 않는다. 자세한 고지는 `public/font-notices/Yeolrin-NOTICE.md`를 따른다.

## 5. 내보내기와 검증

- JSON에는 fontId와 실제 적용된 굵기·크기·자간·행간·스타일을 저장한다.
- HTML/CSS 묶음에는 선택된 서체·굵기의 필요한 파일과 출처/라이선스 고지를 포함하고, 외부 네트워크 없이 열었을 때도 동일한 줄바꿈이 나오도록 확인한다.
- SVG에는 선택 서체와 실제 줄 배치를 반영한다. 편집 가능한 텍스트의 폰트 의존성과 Figma 등 가져오기 환경의 차이는 내보내기 안내에 표시한다.
- 12종 선택, 굵기 유효성, 독일어 문자 표시, 폰트 교체 후 재배치, 빠른 연속 선택, 로딩 실패, 설정 복원, 내보내기 일치를 검증한다.
