/**
 * KMGM 홀덤펍 이벤트 보드 UI.
 *
 * 해시 경로로 홈·빙고·포켓·출석 페이지를 바꾸고, 관리 모드에서만 기록을 수정한다.
 */

import * as store from "./store.js";

const EVENT_NAV = [
  {path: "/bingo", label: "3×3 빙고"},
  {path: "/pocket", label: "10~A 포켓"},
  {path: "/attend", label: "데일리 출석"},
];

const ui = {
  pinOpen: false,
  pinError: "",
  settingsOpen: false,
  selectedBingoId: null,
  selectedPocketId: null,
  selectedAttendId: null,
  editingCell: null,
  downloading: null,
};

/**
 * HTML 특수문자를 이스케이프한다.
 *
 * @param {unknown} value 원문
 * @return {string} 안전한 문자열
 */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

/**
 * 현재 해시 경로를 읽는다.
 *
 * @return {string} `/`, `/bingo`, `/pocket`, `/attend`
 */
function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  return hash.startsWith("/") ? hash : `/${hash}`;
}

/**
 * 마지막 업데이트 시각을 한국어로 표시한다.
 *
 * @param {string|null} iso ISO 시각
 * @return {string} 표시 문구
 */
function formatUpdated(iso) {
  if (!iso) {
    return "마지막 업데이트 없음";
  }
  const text = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
  return `마지막 업데이트 ${text}`;
}

/**
 * 파일 이름에 쓸 날짜를 만든다.
 *
 * @param {Date} date 시각
 * @return {string} YYYYMMDD-HHMM
 */
function formatFileStamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
}

/**
 * 이미지 저장 버튼만 만든다.
 *
 * @param {object} options 버튼 옵션
 * @return {string} HTML
 */
function renderBoardToolbar(options) {
  const {action, busy} = options;
  return `
    <div class="board-toolbar no-capture">
      <button class="ghost save-btn" data-action="${escapeHtml(action)}" type="button" ${busy ? "disabled" : ""}>
        ${busy ? "저장 중..." : "이미지 저장"}
      </button>
    </div>
  `;
}

/**
 * 보드 우하단 업데이트 시각을 만든다.
 *
 * @param {string|null} iso ISO 시각
 * @return {string} HTML
 */
function renderBoardStamp(iso) {
  return `<p class="board-stamp">${escapeHtml(formatUpdated(iso))}</p>`;
}

/**
 * 네온 조명 레이어를 만든다.
 *
 * @param {"home"|"board"} kind 랜딩 또는 보드
 * @return {string} HTML
 */
function renderNeonScene(kind) {
  return `
    <div class="neon-scene ${kind === "board" ? "board-lights no-capture" : ""}" aria-hidden="true">
      <span class="spot spot-coral"></span>
      <span class="spot spot-amber"></span>
      <span class="spot spot-mint"></span>
      <span class="beam beam-l"></span>
      <span class="beam beam-c"></span>
      <span class="beam beam-r"></span>
      <span class="bulb b1"></span>
      <span class="bulb b2"></span>
      <span class="bulb b3"></span>
      <span class="suit s-heart">♥</span>
      <span class="suit s-spade">♠</span>
      <span class="suit s-diamond">♦</span>
      <span class="suit s-club">♣</span>
    </div>
  `;
}

function render() {
  const root = document.getElementById("app");
  const state = store.load();
  const admin = store.isAdmin();
  const path = route();

  let page = "";
  if (path === "/bingo") {
    page = renderBingo(state, admin);
  } else if (path === "/pocket") {
    page = renderPocket(state, admin);
  } else if (path === "/attend") {
    page = renderAttend(state, admin);
  } else {
    page = renderHome();
  }

  root.innerHTML = `
    ${path !== "/" ? renderNeonScene("board") : ""}
    ${renderHeader(admin, path)}
    <main class="page">${page}</main>
    ${ui.pinOpen ? renderPinModal() : ""}
    ${ui.settingsOpen && admin ? renderSettingsModal() : ""}
  `;
  document.body.classList.toggle("is-home", path === "/");
  revealActiveNav();
}

/**
 * 공통 헤더를 만든다.
 *
 * @param {boolean} admin 관리 모드
 * @param {string} path 현재 경로
 * @return {string} HTML
 */
function renderHeader(admin, path) {
  const adminBtn = admin
      ? `
        <button class="ghost" data-action="open-settings" type="button">설정</button>
        <button class="ghost" data-action="logout" type="button">관리 종료</button>
      `
      : `<button class="gold" data-action="open-pin" type="button">관리자</button>`;
  const nav = EVENT_NAV.map((item) => `
    <a class="nav-chip ${path === item.path ? "is-on" : ""}" href="#${item.path}">${escapeHtml(item.label)}</a>
  `).join("");

  return `
    <header class="site-head">
      <div class="topbar">
        <a class="logo" href="#/">KMGM</a>
        <div class="top-actions">
          ${admin ? `<span class="admin-badge">관리 모드</span>` : ""}
          ${adminBtn}
        </div>
      </div>
      <nav class="event-nav" aria-label="이벤트">${nav}</nav>
    </header>
  `;
}

/**
 * 선택된 이벤트 칩이 가로 스크롤 안에 보이게 한다.
 */
function revealActiveNav() {
  const nav = document.querySelector(".event-nav");
  const active = nav && nav.querySelector(".is-on");
  if (!nav || !active) {
    return;
  }
  const navBox = nav.getBoundingClientRect();
  const chipBox = active.getBoundingClientRect();
  const shift = chipBox.left - navBox.left - (nav.clientWidth - chipBox.width) / 2;
  nav.scrollLeft += shift;
}

/**
 * 첫 화면 랜딩을 만든다.
 *
 * @return {string} HTML
 */
function renderHome() {
  return `
    <section class="landing">
      ${renderNeonScene("home")}
      <aside class="pub-ticket">
        <span>TONIGHT</span>
        <strong>프리티켓</strong>
        <em>KMGM</em>
      </aside>
      <p class="neon-sign">KMGM</p>
      <h1 class="pub-title">오늘 한 판 어때요</h1>
    </section>
  `;
}

/**
 * 3×3 빙고 페이지를 만든다.
 *
 * @param {object} state 이벤트 상태
 * @param {boolean} admin 관리 모드
 * @return {string} HTML
 */
function renderBingo(state, admin) {
  const people = store.sortBingoPeople(state.bingo.participants);
  const selected = people.find((person) => person.id === ui.selectedBingoId);
  const lineCells = selected ? store.bingoLineCells(selected.marks) : new Set();
  const winners = people.filter((person) => store.bingoLineCount(person.marks) > 0);

  const cells = state.bingo.cells.map((label, index) => {
    const names = people
        .filter((person) => person.marks[index])
        .map((person) => person.name);
    const selectedOn = Boolean(selected && selected.marks[index]);
    const editing = admin && ui.editingCell === index;
    const labelHtml = editing
        ? `<input class="cell-edit" data-field="bingo-cell" data-index="${index}" value="${escapeHtml(label)}" maxlength="24" />`
        : `<span class="cell-label">${escapeHtml(label)}</span>`;

    return `
      <button
        class="bingo-cell ${selectedOn ? "marked" : ""} ${lineCells.has(index) ? "in-line" : ""} ${admin ? "" : "view-only"}"
        data-action="bingo-cell"
        data-index="${index}"
        type="button"
      >
        ${labelHtml}
        <span class="chips">
          ${names.map((name) => `
            <span class="chip ${selected && selected.name === name ? "me" : ""}">${escapeHtml(name)}</span>
          `).join("")}
        </span>
      </button>
    `;
  }).join("");

  return `
    ${renderBoardToolbar({
      action: "download-bingo",
      busy: ui.downloading === "bingo",
    })}
    ${admin ? `
      <p class="hint no-capture">
        ${selected
            ? `<b>${escapeHtml(selected.name)}</b>의 칸을 누르면 기록이 바뀝니다. 참여자 선택을 해제하면 칸 문구를 수정합니다.`
            : "참여자를 고른 뒤 칸을 누르면 달성 표시가 됩니다. 선택하지 않은 채 칸을 누르면 문구를 고칩니다."}
      </p>
    ` : ""}
    <div class="board-capture" data-capture="bingo">
      <section class="event-head">
        <div>
          <p class="eyebrow">EVENT 01</p>
          ${admin
              ? `<input class="title-edit" data-field="bingo-title" value="${escapeHtml(state.bingo.title)}" maxlength="32" />`
              : `<h1>${escapeHtml(state.bingo.title)}</h1>`}
          ${admin
              ? `<input class="sub-edit" data-field="bingo-subtitle" value="${escapeHtml(state.bingo.subtitle)}" maxlength="80" />`
              : `<p>${escapeHtml(state.bingo.subtitle)}</p>`}
        </div>
        ${winners.length ? `
          <aside class="winner-strip">
            <strong>빙고</strong>
            <span>${winners.map((person) => escapeHtml(person.name)).join(" · ")}</span>
          </aside>
        ` : ""}
      </section>
      <div class="bingo-layout">
        <div class="felt-frame">
          <div class="felt-board" aria-label="3x3 빙고판">
            <div class="bingo-grid">${cells}</div>
          </div>
          ${renderBoardStamp(state.bingo.updatedAt)}
        </div>
        ${renderPeoplePanel({
          admin,
          people,
          selectedId: ui.selectedBingoId,
          eventKey: "bingo",
          statusOf: (person) => {
            const lines = store.bingoLineCount(person.marks);
            return lines > 0 ? `빙고 ${lines}줄` : `${person.marks.filter(Boolean).length}/9`;
          },
        })}
      </div>
    </div>
  `;
}

/**
 * 10~A 포켓 페이지를 만든다.
 *
 * @param {object} state 이벤트 상태
 * @param {boolean} admin 관리 모드
 * @return {string} HTML
 */
function renderPocket(state, admin) {
  const people = store.sortPocketPeople(state.pocket.participants);
  const winners = people.filter((person) => store.pocketComplete(person.pockets));
  const selected = people.find((person) => person.id === ui.selectedPocketId);

  const columns = store.POCKETS.map((pocket) => {
    const names = people
        .filter((person) => person.pockets[pocket.key])
        .map((person) => person.name);
    return `
      <article class="pair-col">
        <div class="pair" aria-hidden="true">
          <span class="pcard red"><b>${pocket.label}</b><i>${pocket.red}</i></span>
          <span class="pcard black"><b>${pocket.label}</b><i>${pocket.black}</i></span>
        </div>
        <h3>${escapeHtml(pocket.name)}</h3>
        <ul class="name-list">
          ${names.length
              ? names.map((name) => `<li>${escapeHtml(name)}</li>`).join("")
              : `<li class="muted">아직 없음</li>`}
        </ul>
      </article>
    `;
  }).join("");

  const rows = people.map((person) => {
    const done = store.pocketComplete(person.pockets);
    const count = store.pocketCount(person.pockets);
    const marks = store.POCKETS.map((pocket) => {
      const on = person.pockets[pocket.key];
      if (!admin) {
        return `<td class="mark-cell">${on ? "●" : ""}</td>`;
      }
      return `
        <td>
          <button
            class="mark ${on ? "on" : ""}"
            data-action="pocket-mark"
            data-id="${escapeHtml(person.id)}"
            data-pocket="${pocket.key}"
            type="button"
            aria-pressed="${on}"
          >${on ? "승" : ""}</button>
        </td>
      `;
    }).join("");

    return `
      <tr class="${done ? "winner" : ""} ${selected && selected.id === person.id ? "selected" : ""}">
        <th>${escapeHtml(person.name)}</th>
        ${marks}
        <td class="status">${done ? "당첨" : `${count}/5`}</td>
      </tr>
    `;
  }).join("");

  return `
    ${renderBoardToolbar({
      action: "download-pocket",
      busy: ui.downloading === "pocket",
    })}
    ${admin ? `<p class="hint no-capture">표의 칸을 누르면 그 포켓으로 승리한 기록이 바뀝니다. 다섯 칸을 모두 채우면 당첨입니다.</p>` : ""}
    <div class="board-capture" data-capture="pocket">
      <section class="event-head">
        <div>
          <p class="eyebrow">EVENT 02</p>
          ${admin
              ? `<input class="title-edit" data-field="pocket-title" value="${escapeHtml(state.pocket.title)}" maxlength="32" />`
              : `<h1>${escapeHtml(state.pocket.title)}</h1>`}
          ${admin
              ? `<input class="sub-edit" data-field="pocket-subtitle" value="${escapeHtml(state.pocket.subtitle)}" maxlength="80" />`
              : `<p>${escapeHtml(state.pocket.subtitle)}</p>`}
        </div>
        ${winners.length ? `
          <aside class="winner-strip">
            <strong>당첨</strong>
            <span>${winners.map((person) => escapeHtml(person.name)).join(" · ")}</span>
          </aside>
        ` : ""}
      </section>
      <div class="felt-frame pocket-frame">
        <div class="felt-board pocket-board" aria-label="10부터 에이스 포켓 보드">
          <div class="pocket-cols">${columns}</div>
        </div>
        ${renderBoardStamp(state.pocket.updatedAt)}
      </div>
      <div class="bingo-layout">
        <div class="table-wrap">
          <table class="score">
            <thead>
              <tr>
                <th>이름</th>
                ${store.POCKETS.map((pocket) => `<th>${pocket.label}</th>`).join("")}
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="7" class="empty">아직 참여자가 없습니다.</td></tr>`}
            </tbody>
          </table>
        </div>
        ${renderPeoplePanel({
          admin,
          people,
          selectedId: ui.selectedPocketId,
          eventKey: "pocket",
          statusOf: (person) => store.pocketComplete(person.pockets)
              ? "당첨"
              : `${store.pocketCount(person.pockets)}/5`,
        })}
      </div>
    </div>
  `;
}

/**
 * 월~일 데일리 출석 페이지를 만든다.
 *
 * @param {object} state 이벤트 상태
 * @param {boolean} admin 관리 모드
 * @return {string} HTML
 */
function renderAttend(state, admin) {
  const people = store.sortAttendPeople(state.attend.participants);
  const winners = people.filter((person) => store.attendComplete(person.days));
  const selected = people.find((person) => person.id === ui.selectedAttendId);
  const todayKey = store.todayWeekdayKey();

  const columns = store.WEEKDAYS.map((day) => {
    const names = people
        .filter((person) => person.days[day.key])
        .map((person) => person.name);
    const weekend = day.key === "sat" || day.key === "sun";
    return `
      <article class="day-col ${day.key === todayKey ? "today" : ""} ${weekend ? "weekend" : ""}">
        <div class="day-badge" aria-hidden="true">${escapeHtml(day.label)}</div>
        <h3>${escapeHtml(day.name)}</h3>
        <ul class="name-list">
          ${names.length
              ? names.map((name) => `<li>${escapeHtml(name)}</li>`).join("")
              : `<li class="muted">아직 없음</li>`}
        </ul>
      </article>
    `;
  }).join("");

  const rows = people.map((person) => {
    const done = store.attendComplete(person.days);
    const count = store.attendCount(person.days);
    const marks = store.WEEKDAYS.map((day) => {
      const on = person.days[day.key];
      if (!admin) {
        return `<td class="mark-cell">${on ? "●" : ""}</td>`;
      }
      return `
        <td>
          <button
            class="mark ${on ? "on" : ""}"
            data-action="attend-mark"
            data-id="${escapeHtml(person.id)}"
            data-day="${day.key}"
            type="button"
            aria-pressed="${on}"
          >${on ? "출" : ""}</button>
        </td>
      `;
    }).join("");

    return `
      <tr class="${done ? "winner" : ""} ${selected && selected.id === person.id ? "selected" : ""}">
        <th>${escapeHtml(person.name)}</th>
        ${marks}
        <td class="status">${done ? "만근" : `${count}/7`}</td>
      </tr>
    `;
  }).join("");

  return `
    ${renderBoardToolbar({
      action: "download-attend",
      busy: ui.downloading === "attend",
    })}
    ${admin ? `<p class="hint no-capture">표의 칸을 누르면 그날 출석이 바뀝니다. 월~일을 모두 채우면 만근입니다.</p>` : ""}
    <div class="board-capture" data-capture="attend">
      <section class="event-head">
        <div>
          <p class="eyebrow">EVENT 03</p>
          ${admin
              ? `<input class="title-edit" data-field="attend-title" value="${escapeHtml(state.attend.title)}" maxlength="32" />`
              : `<h1>${escapeHtml(state.attend.title)}</h1>`}
          ${admin
              ? `<input class="sub-edit" data-field="attend-subtitle" value="${escapeHtml(state.attend.subtitle)}" maxlength="80" />`
              : `<p>${escapeHtml(state.attend.subtitle)}</p>`}
        </div>
        ${winners.length ? `
          <aside class="winner-strip">
            <strong>만근</strong>
            <span>${winners.map((person) => escapeHtml(person.name)).join(" · ")}</span>
          </aside>
        ` : ""}
      </section>
      <div class="felt-frame pocket-frame">
        <div class="felt-board attend-board" aria-label="월부터 일요일 출석 보드">
          <div class="attend-cols">${columns}</div>
        </div>
        ${renderBoardStamp(state.attend.updatedAt)}
      </div>
      <div class="bingo-layout">
        <div class="table-wrap">
          <table class="score">
            <thead>
              <tr>
                <th>이름</th>
                ${store.WEEKDAYS.map((day) => `<th>${day.label}</th>`).join("")}
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="9" class="empty">아직 참여자가 없습니다.</td></tr>`}
            </tbody>
          </table>
        </div>
        ${renderPeoplePanel({
          admin,
          people,
          selectedId: ui.selectedAttendId,
          eventKey: "attend",
          statusOf: (person) => store.attendComplete(person.days)
              ? "만근"
              : `${store.attendCount(person.days)}/7`,
        })}
      </div>
    </div>
  `;
}

/**
 * 참여자 목록과 등록 폼을 만든다.
 *
 * @param {object} options 패널 옵션
 * @return {string} HTML
 */
function renderPeoplePanel(options) {
  const {admin, people, selectedId, eventKey, statusOf} = options;
  const items = people.map((person) => `
    <li class="${person.id === selectedId ? "on" : ""}">
      <button class="pick" data-action="select-${eventKey}" data-id="${escapeHtml(person.id)}" type="button">
        <span>${escapeHtml(person.name)}</span>
        <em>${escapeHtml(statusOf(person))}</em>
      </button>
      ${admin ? `
        <button class="icon-btn no-capture" data-action="remove-${eventKey}" data-id="${escapeHtml(person.id)}" type="button" aria-label="${escapeHtml(person.name)} 삭제">×</button>
      ` : ""}
    </li>
  `).join("");

  return `
    <aside class="people">
      <div class="people-head">
        <h2>참여자</h2>
        <span>${people.length}명</span>
      </div>
      ${admin ? `
        <form class="add-form no-capture" data-form="add-${eventKey}">
          <input name="name" type="text" maxlength="16" placeholder="이름 입력" autocomplete="off" required />
          <button class="gold" type="submit">등록</button>
        </form>
      ` : ""}
      <ul class="people-list">
        ${items || `<li class="empty-row">아직 없습니다.</li>`}
      </ul>
      ${admin && people.length ? `
        <button class="ghost danger no-capture" data-action="reset-${eventKey}" type="button">명단 초기화</button>
      ` : ""}
    </aside>
  `;
}

/**
 * 관리자 비밀번호 모달을 만든다.
 *
 * @return {string} HTML
 */
function renderPinModal() {
  return `
    <div class="overlay" data-action="close-pin">
      <form class="modal" data-form="pin">
        <h2>관리자</h2>
        <p>이벤트 내용과 참여자를 수정하려면 비밀번호가 필요합니다.</p>
        <input name="pin" type="password" maxlength="32" placeholder="비밀번호" autocomplete="current-password" required />
        ${ui.pinError ? `<p class="error">${escapeHtml(ui.pinError)}</p>` : ""}
        <div class="modal-actions">
          <button class="ghost" data-action="close-pin" type="button">취소</button>
          <button class="gold" type="submit">입장</button>
        </div>
      </form>
    </div>
  `;
}

/**
 * 비밀번호 변경 모달을 만든다.
 *
 * @return {string} HTML
 */
function renderSettingsModal() {
  return `
    <div class="overlay" data-action="close-settings">
      <form class="modal" data-form="settings">
        <h2>관리 설정</h2>
        <p>이 브라우저에만 저장되는 관리 비밀번호를 바꿉니다.</p>
        <input name="pin" type="password" maxlength="32" placeholder="새 비밀번호" autocomplete="new-password" required />
        <div class="modal-actions">
          <button class="ghost" data-action="close-settings" type="button">취소</button>
          <button class="gold" type="submit">저장</button>
        </div>
      </form>
    </div>
  `;
}

/**
 * 클릭 이벤트를 처리한다.
 *
 * @param {MouseEvent} event 클릭
 */
function onClick(event) {
  const actionNode = event.target.closest("[data-action]");
  if (!actionNode) {
    return;
  }
  if (event.target.closest(".modal") && actionNode.classList.contains("overlay")) {
    return;
  }

  const action = actionNode.dataset.action;
  const id = actionNode.dataset.id;

  switch (action) {
    case "open-pin":
      ui.pinOpen = true;
      ui.pinError = "";
      render();
      document.querySelector("input[name='pin']")?.focus();
      break;
    case "close-pin":
      ui.pinOpen = false;
      ui.pinError = "";
      render();
      break;
    case "open-settings":
      ui.settingsOpen = true;
      render();
      document.querySelector("form[data-form='settings'] input[name='pin']")?.focus();
      break;
    case "close-settings":
      ui.settingsOpen = false;
      render();
      break;
    case "logout":
      store.logout();
      ui.settingsOpen = false;
      ui.editingCell = null;
      render();
      break;
    case "bingo-cell":
      if (event.target.closest(".cell-edit")) {
        return;
      }
      handleBingoCell(Number(actionNode.dataset.index));
      break;
    case "select-bingo":
      ui.selectedBingoId = ui.selectedBingoId === id ? null : id;
      ui.editingCell = null;
      render();
      break;
    case "select-pocket":
      ui.selectedPocketId = ui.selectedPocketId === id ? null : id;
      render();
      break;
    case "select-attend":
      ui.selectedAttendId = ui.selectedAttendId === id ? null : id;
      render();
      break;
    case "remove-bingo":
      removePerson("bingo", id);
      break;
    case "remove-pocket":
      removePerson("pocket", id);
      break;
    case "remove-attend":
      removePerson("attend", id);
      break;
    case "reset-bingo":
      resetPeople("bingo");
      break;
    case "reset-pocket":
      resetPeople("pocket");
      break;
    case "reset-attend":
      resetPeople("attend");
      break;
    case "pocket-mark":
      togglePocket(id, actionNode.dataset.pocket);
      break;
    case "attend-mark":
      toggleAttend(id, actionNode.dataset.day);
      break;
    case "download-bingo":
      downloadBoard("bingo", "3x3빙고");
      break;
    case "download-pocket":
      downloadBoard("pocket", "10-A포켓");
      break;
    case "download-attend":
      downloadBoard("attend", "데일리출석");
      break;
    default:
      break;
  }
}

/**
 * 빙고 칸 클릭: 선택 참여자 표시 또는 칸 문구 수정.
 *
 * @param {number} index 칸 번호 0~8
 */
function handleBingoCell(index) {
  if (!store.isAdmin()) {
    return;
  }
  if (ui.selectedBingoId) {
    store.update((state) => {
      const person = state.bingo.participants.find((item) => item.id === ui.selectedBingoId);
      if (person) {
        person.marks[index] = !person.marks[index];
      }
    }, "bingo");
    ui.editingCell = null;
    render();
    return;
  }
  ui.editingCell = ui.editingCell === index ? null : index;
  render();
  document.querySelector(".cell-edit")?.focus();
  document.querySelector(".cell-edit")?.select();
}

/**
 * 참여자를 삭제한다.
 *
 * @param {"bingo"|"pocket"|"attend"} eventKey 이벤트
 * @param {string} id 참여자 id
 */
function removePerson(eventKey, id) {
  if (!store.isAdmin()) {
    return;
  }
  const state = store.load();
  const person = state[eventKey].participants.find((item) => item.id === id);
  if (!person || !confirm(`${person.name}을(를) 명단에서 뺄까요?`)) {
    return;
  }
  store.update((next) => {
    next[eventKey].participants = next[eventKey].participants.filter((item) => item.id !== id);
  }, eventKey);
  if (eventKey === "bingo" && ui.selectedBingoId === id) {
    ui.selectedBingoId = null;
  }
  if (eventKey === "pocket" && ui.selectedPocketId === id) {
    ui.selectedPocketId = null;
  }
  if (eventKey === "attend" && ui.selectedAttendId === id) {
    ui.selectedAttendId = null;
  }
  render();
}

/**
 * 참여자 명단만 비운다.
 *
 * @param {"bingo"|"pocket"|"attend"} eventKey 이벤트
 */
function resetPeople(eventKey) {
  if (!store.isAdmin()) {
    return;
  }
  if (!confirm("참여자 명단과 기록을 모두 지울까요? 칸 문구는 그대로 둡니다.")) {
    return;
  }
  store.update((state) => {
    state[eventKey].participants = [];
  }, eventKey);
  if (eventKey === "bingo") {
    ui.selectedBingoId = null;
  }
  if (eventKey === "pocket") {
    ui.selectedPocketId = null;
  }
  if (eventKey === "attend") {
    ui.selectedAttendId = null;
  }
  render();
}

/**
 * 포켓 승리 칸을 토글한다.
 *
 * @param {string} id 참여자 id
 * @param {string} pocketKey 포켓 키
 */
function togglePocket(id, pocketKey) {
  if (!store.isAdmin()) {
    return;
  }
  store.update((state) => {
    const person = state.pocket.participants.find((item) => item.id === id);
    if (person) {
      person.pockets[pocketKey] = !person.pockets[pocketKey];
    }
  }, "pocket");
  render();
}

/**
 * 출석 칸을 토글한다.
 *
 * @param {string} id 참여자 id
 * @param {string} dayKey 요일 키
 */
function toggleAttend(id, dayKey) {
  if (!store.isAdmin()) {
    return;
  }
  store.update((state) => {
    const person = state.attend.participants.find((item) => item.id === id);
    if (person) {
      person.days[dayKey] = !person.days[dayKey];
    }
  }, "attend");
  render();
}

/**
 * 폼 제출을 처리한다.
 *
 * @param {SubmitEvent} event 제출
 */
function onSubmit(event) {
  const form = event.target.closest("form");
  if (!form) {
    return;
  }
  event.preventDefault();
  const formType = form.dataset.form;

  if (formType === "pin") {
    const pin = String(new FormData(form).get("pin") || "");
    if (store.login(pin)) {
      ui.pinOpen = false;
      ui.pinError = "";
    } else {
      ui.pinError = "비밀번호가 맞지 않습니다.";
    }
    render();
    return;
  }

  if (formType === "settings") {
    const pin = String(new FormData(form).get("pin") || "").trim();
    if (pin) {
      store.setPin(pin);
      ui.settingsOpen = false;
      render();
    }
    return;
  }

  if (formType === "add-bingo" || formType === "add-pocket" || formType === "add-attend") {
    addPerson(formType.replace("add-", ""), form);
  }
}

/**
 * 참여자를 등록한다.
 *
 * @param {"bingo"|"pocket"|"attend"} eventKey 이벤트
 * @param {HTMLFormElement} form 등록 폼
 */
function addPerson(eventKey, form) {
  if (!store.isAdmin()) {
    return;
  }
  const name = String(new FormData(form).get("name") || "").trim();
  if (!name) {
    return;
  }
  const state = store.load();
  const exists = state[eventKey].participants.some((person) => person.name === name);
  if (exists) {
    alert("같은 이름이 이미 있습니다.");
    return;
  }

  let newPersonId = "";
  store.update((next) => {
    const person = makePerson(eventKey, name);
    newPersonId = person.id;
    next[eventKey].participants.push(person);
  }, eventKey);

  if (eventKey === "bingo") {
    ui.selectedBingoId = newPersonId;
    ui.editingCell = null;
  } else if (eventKey === "pocket") {
    ui.selectedPocketId = newPersonId;
  } else {
    ui.selectedAttendId = newPersonId;
  }
  render();
}

/**
 * 이벤트별 새 참여자 객체를 만든다.
 *
 * @param {"bingo"|"pocket"|"attend"} eventKey 이벤트
 * @param {string} name 이름
 * @return {object} 참여자
 */
function makePerson(eventKey, name) {
  const id = store.newId();
  if (eventKey === "bingo") {
    return {id, name, marks: Array(9).fill(false)};
  }
  if (eventKey === "pocket") {
    return {id, name, pockets: store.emptyPockets()};
  }
  return {id, name, days: store.emptyDays()};
}

/**
 * 제목·칸 문구 입력을 저장한다.
 *
 * @param {Event} event 입력 또는 포커스 아웃
 */
function onFieldChange(event) {
  const field = event.target.dataset.field;
  if (!field || !store.isAdmin()) {
    return;
  }
  const value = event.target.value;

  if (field === "bingo-title") {
    store.update((state) => {
      state.bingo.title = value.trim() || "3×3 빙고";
    }, "bingo");
    return;
  }
  if (field === "bingo-subtitle") {
    store.update((state) => {
      state.bingo.subtitle = value.trim() || store.defaultState().bingo.subtitle;
    }, "bingo");
    return;
  }
  if (field === "pocket-title") {
    store.update((state) => {
      state.pocket.title = value.trim() || "10~A 포켓";
    }, "pocket");
    return;
  }
  if (field === "pocket-subtitle") {
    store.update((state) => {
      state.pocket.subtitle = value.trim() || store.defaultState().pocket.subtitle;
    }, "pocket");
    return;
  }
  if (field === "attend-title") {
    store.update((state) => {
      state.attend.title = value.trim() || "데일리 출석";
    }, "attend");
    return;
  }
  if (field === "attend-subtitle") {
    store.update((state) => {
      state.attend.subtitle = value.trim() || store.defaultState().attend.subtitle;
    }, "attend");
    return;
  }
  if (field === "bingo-cell") {
    const index = Number(event.target.dataset.index);
    store.update((state) => {
      state.bingo.cells[index] = value.trim() || state.bingo.cells[index];
    }, "bingo");
    if (event.type === "change" || event.type === "focusout") {
      ui.editingCell = null;
      render();
    }
  }
}

/**
 * html2canvas를 같은 주소에서 불러온다.
 *
 * @return {Promise<Function>} html2canvas
 */
function loadHtml2Canvas() {
  if (typeof window.html2canvas === "function") {
    return Promise.resolve(window.html2canvas);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL("./html2canvas.min.js", import.meta.url).href;
    script.onload = () => {
      if (typeof window.html2canvas === "function") {
        resolve(window.html2canvas);
      } else {
        reject(new Error("html2canvas 없음"));
      }
    };
    script.onerror = () => reject(new Error("html2canvas 로드 실패"));
    document.head.appendChild(script);
  });
}

/**
 * 이벤트 보드를 PNG로 저장한다.
 *
 * @param {"bingo"|"pocket"|"attend"} eventKey 이벤트
 * @param {string} label 파일 이름에 쓸 제목
 */
async function downloadBoard(eventKey, label) {
  if (ui.downloading) {
    return;
  }
  if (!document.querySelector(`[data-capture="${eventKey}"]`)) {
    return;
  }

  let html2canvas;
  try {
    html2canvas = await loadHtml2Canvas();
  } catch (error) {
    console.error(error);
    alert("이미지 저장 기능을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.");
    return;
  }

  ui.downloading = eventKey;
  render();
  document.body.classList.add("is-capturing");
  const captureNode = document.querySelector(`[data-capture="${eventKey}"]`);
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    const canvas = await html2canvas(captureNode, {
      backgroundColor: "#1c2228",
      scale: Math.min(2, window.devicePixelRatio || 2),
      useCORS: true,
      logging: false,
      ignoreElements: (element) => element.classList.contains("no-capture"),
    });
    const filename = `KMGM-${label}-${formatFileStamp(new Date())}.png`;
    await saveCanvas(canvas, filename);
  } catch (error) {
    console.error(error);
    alert("이미지 저장에 실패했습니다.");
  } finally {
    document.body.classList.remove("is-capturing");
    ui.downloading = null;
    render();
  }
}

/**
 * iOS에서는 a[download]가 동작하지 않아 공유 시트로 저장한다.
 *
 * @return {boolean} iPhone·iPad 여부
 */
function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * 캔버스를 PNG 파일로 저장한다. PC·안드로이드는 다운로드, iOS는 공유 시트.
 *
 * @param {HTMLCanvasElement} canvas 캡처 결과
 * @param {string} filename 파일 이름
 * @return {Promise<void>}
 */
async function saveCanvas(canvas, filename) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("빈 이미지");
  }

  if (isIosDevice()) {
    const file = new File([blob], filename, {type: "image/png"});
    if (navigator.canShare && navigator.canShare({files: [file]})) {
      try {
        await navigator.share({files: [file], title: filename});
        return;
      } catch (error) {
        if (error && error.name === "AbortError") {
          return;
        }
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Escape로 모달·칸 편집을 닫는다.
 *
 * @param {KeyboardEvent} event 키
 */
function onKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }
  if (ui.pinOpen || ui.settingsOpen || ui.editingCell !== null) {
    ui.pinOpen = false;
    ui.settingsOpen = false;
    ui.editingCell = null;
    ui.pinError = "";
    render();
  }
}

document.getElementById("app").addEventListener("click", onClick);
document.getElementById("app").addEventListener("submit", onSubmit);
document.getElementById("app").addEventListener("change", onFieldChange);
document.getElementById("app").addEventListener("focusout", onFieldChange);
window.addEventListener("hashchange", render);
window.addEventListener("keydown", onKeydown);
render();
