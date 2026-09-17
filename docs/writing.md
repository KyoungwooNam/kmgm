# 문서 작성 가이드

GitHub Pages에 올리기 전에, 이 저장소에서는 `docs/`의 마크다운만 작성합니다.

## 파일 위치

| 경로 | 용도 |
| --- | --- |
| `docs/*.md` | 문서 본문 |
| `docs/assets/` | 이미지, 첨부 파일 |
| `mkdocs.yml` | 사이트 이름, 테마, 왼쪽 목차(`nav`) |

파일 이름은 영문 소문자와 하이픈을 씁니다. 예: `getting-started.md`, `api-reference.md`.

## 새 페이지 추가

1. `docs/`에 마크다운 파일을 만듭니다.
2. 첫 줄에 `# 제목`을 둡니다. 이 제목이 페이지 제목이 됩니다.
3. `mkdocs.yml`의 `nav`에 항목을 추가합니다.

```yaml
nav:
  - 홈: index.md
  - 문서 작성 가이드: writing.md
  - 시작하기: getting-started.md
```

하위 섹션이 필요하면 리스트를 한 단계 더 넣습니다.

```yaml
nav:
  - 가이드:
      - 시작하기: getting-started.md
      - 설치: install.md
```

4. `mkdocs serve`로 미리보기에서 링크와 목차를 확인합니다.

## 이미지

이미지는 `docs/assets/`에 두고, 문서에서는 상대 경로로 넣습니다.

```markdown
![설명](assets/example.png)
```

## 문체

- 한국어로 씁니다.
- 한 문장은 한 가지 사실만 담습니다.
- 명령어, 파일, 설정 키는 인라인 코드로 감쌉니다. 예: `mkdocs.yml`
- 아직 정해지지 않은 내용은 추측해서 채우지 않고, 비워 두거나 “미정”이라고 적습니다.

## 자주 쓰는 마크다운

알림 상자:

```markdown
!!! note "참고"
    보조 설명은 여기에 적습니다.

!!! warning "주의"
    빠뜨리면 안 되는 내용은 여기에 적습니다.
```

코드 블록은 언어를 명시합니다.

````markdown
```bash
mkdocs serve
```
````

표:

```markdown
| 항목 | 설명 |
| --- | --- |
| `docs/` | 문서 원본 |
| `site/` | 빌드 결과 (커밋하지 않음) |
```

## 로컬 확인

```bash
source .venv/bin/activate
mkdocs serve
```

http://127.0.0.1:8000 에서 새 페이지가 목차에 보이는지, 링크가 깨지지 않는지 확인합니다.

## GitHub Pages와의 관계

`main`에 푸시하면 GitHub Actions가 MkDocs로 `docs/`를 빌드하고, 결과를 GitHub Pages에 올립니다.
공개 주소는 https://kyoungwoonam.github.io/kmgm/ 입니다.
