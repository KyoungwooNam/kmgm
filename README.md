# KMGM 문서

GitHub Pages로 공개하는 KMGM 문서 저장소입니다.
본문은 `docs/`의 마크다운이고, `main`에 푸시하면 Actions가 사이트를 빌드해 Pages에 올립니다.

- 문서: https://kyoungwoonam.github.io/kmgm/
- 저장소: https://github.com/KyoungwooNam/kmgm

## 문서 쓰기

마크다운 파일은 모두 [`docs/`](docs/) 아래에 둡니다.

| 파일 | 역할 |
| --- | --- |
| `docs/index.md` | 문서 홈 |
| `docs/writing.md` | 작성 규칙과 페이지 추가 방법 |
| `docs/assets/` | 이미지 등 정적 파일 |

새 페이지를 만들었으면 `mkdocs.yml`의 `nav`에도 항목을 넣습니다.
자세한 규칙은 [문서 작성 가이드](docs/writing.md)를 따릅니다.

## 로컬에서 미리보기

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-docs.txt
mkdocs serve
```

브라우저에서 http://127.0.0.1:8000 을 엽니다. `docs/`를 저장하면 미리보기가 바로 갱신됩니다.

정적 파일만 만들려면:

```bash
mkdocs build
```

결과는 `site/`에 생성됩니다. 이 폴더는 Git에 올리지 않습니다.

## GitHub Pages

배포는 [`.github/workflows/pages.yml`](.github/workflows/pages.yml)이 담당합니다.
`main`에 푸시하거나 Actions에서 워크플로를 수동 실행하면 MkDocs가 `docs/`를 빌드하고 GitHub Pages에 올립니다.
