/**
 * KMGM 홀덤펍 이벤트 상태 저장소.
 *
 * 브라우저 localStorage에 이벤트 내용과 참여자 기록을 보관한다.
 */

export const STORAGE_KEY = "kmgm.events.v1";
export const PIN_KEY = "kmgm.admin.pin";
export const SESSION_KEY = "kmgm.admin.session";
export const DEFAULT_PIN = "kmgm";

export const BINGO_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const POCKETS = [
  {key: "10", label: "10", name: "포켓 텐", red: "♥", black: "♠"},
  {key: "J", label: "J", name: "포켓 잭", red: "♦", black: "♣"},
  {key: "Q", label: "Q", name: "포켓 퀸", red: "♥", black: "♠"},
  {key: "K", label: "K", name: "포켓 킹", red: "♦", black: "♣"},
  {key: "A", label: "A", name: "포켓 에이스", red: "♥", black: "♠"},
];

/**
 * 빈 이벤트 상태를 만든다.
 *
 * @return {object} 기본 빙고·포켓 데이터
 */
export function defaultState() {
  return {
    bingo: {
      title: "3×3 빙고",
      subtitle: "한 줄을 완성하면 빙고입니다.",
      cells: [
        "포켓페어 승리",
        "플러시",
        "스플래시",
        "스트레이트",
        "풀하우스",
        "쓰리벳 팟 승리",
        "블러프 성공",
        "언더독 승리",
        "쇼다운 승리",
      ],
      participants: [],
    },
    pocket: {
      title: "10~A 포켓",
      subtitle: "10·J·Q·K·A 포켓으로 각각 승리하면 당첨입니다.",
      participants: [],
    },
  };
}

/**
 * 포켓 승리 칸을 모두 거짓으로 만든다.
 *
 * @return {Object<string, boolean>} 포켓 키별 표시
 */
export function emptyPockets() {
  return Object.fromEntries(POCKETS.map((pocket) => [pocket.key, false]));
}

/**
 * 참여자 식별자를 만든다.
 *
 * @return {string} 새 id
 */
export function newId() {
  if (globalThis.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 저장된 상태를 읽고, 없으면 기본값을 쓴다.
 *
 * @return {object} 이벤트 상태
 */
export function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultState();
  }
  try {
    return migrate(JSON.parse(raw));
  } catch (error) {
    console.warn("이벤트 저장 데이터를 읽지 못해 기본값으로 시작합니다.", error);
    return defaultState();
  }
}

/**
 * 상태를 저장한다.
 *
 * @param {object} state 이벤트 상태
 */
export function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * 상태를 바꿔 저장한다.
 *
 * @param {function(object): void} mutator 상태 변경 함수
 * @return {object} 변경된 상태
 */
export function update(mutator) {
  const state = load();
  mutator(state);
  save(state);
  return state;
}

/**
 * 빙고 줄 수를 센다.
 *
 * @param {boolean[]} marks 9칸 표시
 * @return {number} 완성된 줄 수
 */
export function bingoLineCount(marks) {
  return BINGO_LINES.filter((line) => line.every((index) => marks[index])).length;
}

/**
 * 선택된 참여자가 채운 빙고 줄에 들어가는 칸 집합.
 *
 * @param {boolean[]} marks 9칸 표시
 * @return {Set<number>} 줄에 속한 칸 번호
 */
export function bingoLineCells(marks) {
  const cells = new Set();
  for (const line of BINGO_LINES) {
    if (line.every((index) => marks[index])) {
      line.forEach((index) => cells.add(index));
    }
  }
  return cells;
}

/**
 * 다섯 포켓을 모두 채웠는지 확인한다.
 *
 * @param {Object<string, boolean>} wins 포켓 표시
 * @return {boolean} 당첨 여부
 */
export function pocketComplete(wins) {
  return POCKETS.every((pocket) => Boolean(wins && wins[pocket.key]));
}

/**
 * 관리 세션이 열려 있는지 확인한다.
 *
 * @return {boolean} 관리 모드 여부
 */
export function isAdmin() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

/**
 * 저장된 관리 비밀번호를 읽는다.
 *
 * @return {string} 비밀번호
 */
export function getPin() {
  return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
}

/**
 * 비밀번호가 맞으면 관리 세션을 연다.
 *
 * @param {string} pin 입력 비밀번호
 * @return {boolean} 성공 여부
 */
export function login(pin) {
  if (pin !== getPin()) {
    return false;
  }
  sessionStorage.setItem(SESSION_KEY, "1");
  return true;
}

/** 관리 세션을 닫는다. */
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * 관리 비밀번호를 바꾼다.
 *
 * @param {string} pin 새 비밀번호
 */
export function setPin(pin) {
  localStorage.setItem(PIN_KEY, pin);
}

/**
 * 예전 저장 형식과 빠진 필드를 보정한다.
 *
 * @param {object} parsed 저장된 JSON
 * @return {object} 사용 가능한 상태
 */
function migrate(parsed) {
  const base = defaultState();
  const bingo = parsed && parsed.bingo ? parsed.bingo : {};
  const pocket = parsed && parsed.pocket ? parsed.pocket : {};

  base.bingo.title = bingo.title || base.bingo.title;
  base.bingo.subtitle = bingo.subtitle || base.bingo.subtitle;
  if (Array.isArray(bingo.cells) && bingo.cells.length === 9) {
    base.bingo.cells = bingo.cells.map((cell) => String(cell || ""));
  }
  base.bingo.participants = normalizeBingoPeople(bingo.participants);

  base.pocket.title = pocket.title || base.pocket.title;
  base.pocket.subtitle = pocket.subtitle || base.pocket.subtitle;
  base.pocket.participants = normalizePocketPeople(pocket.participants);
  return base;
}

/**
 * 빙고 참여자 배열을 정규화한다.
 *
 * @param {unknown} people 저장된 참여자
 * @return {object[]} 참여자 목록
 */
function normalizeBingoPeople(people) {
  if (!Array.isArray(people)) {
    return [];
  }
  return people
      .map((person) => {
        const marks = Array.isArray(person.marks)
            ? person.marks.slice(0, 9).map(Boolean)
            : [];
        while (marks.length < 9) {
          marks.push(false);
        }
        return {
          id: person.id || newId(),
          name: String(person.name || "").trim(),
          marks,
        };
      })
      .filter((person) => person.name);
}

/**
 * 포켓 참여자 배열을 정규화한다.
 *
 * @param {unknown} people 저장된 참여자
 * @return {object[]} 참여자 목록
 */
function normalizePocketPeople(people) {
  if (!Array.isArray(people)) {
    return [];
  }
  return people
      .map((person) => {
        const wins = emptyPockets();
        const saved = person.pockets || person.wins || {};
        for (const pocket of POCKETS) {
          wins[pocket.key] = Boolean(saved[pocket.key]);
        }
        return {
          id: person.id || newId(),
          name: String(person.name || "").trim(),
          pockets: wins,
        };
      })
      .filter((person) => person.name);
}
