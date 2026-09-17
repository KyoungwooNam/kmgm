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

export const WEEKDAYS = [
  {key: "mon", label: "월", name: "월요일", jsDay: 1},
  {key: "tue", label: "화", name: "화요일", jsDay: 2},
  {key: "wed", label: "수", name: "수요일", jsDay: 3},
  {key: "thu", label: "목", name: "목요일", jsDay: 4},
  {key: "fri", label: "금", name: "금요일", jsDay: 5},
  {key: "sat", label: "토", name: "토요일", jsDay: 6},
  {key: "sun", label: "일", name: "일요일", jsDay: 0},
];

/**
 * 빈 이벤트 상태를 만든다.
 *
 * @return {object} 기본 빙고·포켓·출석 데이터
 */
export function defaultState() {
  return {
    bingo: {
      title: "3×3 빙고",
      subtitle: "한 줄을 완성하면 빙고입니다.",
      updatedAt: null,
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
      updatedAt: null,
      participants: [],
    },
    attend: {
      title: "데일리 출석",
      subtitle: "월요일부터 일요일까지 매일 출석하면 만근입니다.",
      updatedAt: null,
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
 * 월~일 출석 칸을 모두 거짓으로 만든다.
 *
 * @return {Object<string, boolean>} 요일 키별 출석
 */
export function emptyDays() {
  return Object.fromEntries(WEEKDAYS.map((day) => [day.key, false]));
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
 * @param {"bingo"|"pocket"|"attend"} [eventKey] 갱신 시각을 적을 이벤트
 * @return {object} 변경된 상태
 */
export function update(mutator, eventKey) {
  const state = load();
  mutator(state);
  if (eventKey && state[eventKey]) {
    state[eventKey].updatedAt = new Date().toISOString();
  }
  save(state);
  return state;
}

/**
 * 빙고 참여자를 진행이 많은 순으로 정렬한다.
 *
 * @param {object[]} people 참여자
 * @return {object[]} 정렬된 복사본
 */
export function sortBingoPeople(people) {
  return [...people].sort((left, right) => {
    const lineDiff = bingoLineCount(right.marks) - bingoLineCount(left.marks);
    if (lineDiff) {
      return lineDiff;
    }
    const cellDiff = right.marks.filter(Boolean).length - left.marks.filter(Boolean).length;
    if (cellDiff) {
      return cellDiff;
    }
    return left.name.localeCompare(right.name, "ko");
  });
}

/**
 * 포켓 참여자를 진행이 많은 순으로 정렬한다.
 *
 * @param {object[]} people 참여자
 * @return {object[]} 정렬된 복사본
 */
export function sortPocketPeople(people) {
  return [...people].sort((left, right) => {
    const leftCount = POCKETS.filter((pocket) => left.pockets[pocket.key]).length;
    const rightCount = POCKETS.filter((pocket) => right.pockets[pocket.key]).length;
    if (rightCount !== leftCount) {
      return rightCount - leftCount;
    }
    return left.name.localeCompare(right.name, "ko");
  });
}

/**
 * 출석 참여자를 출석 일수가 많은 순으로 정렬한다.
 *
 * @param {object[]} people 참여자
 * @return {object[]} 정렬된 복사본
 */
export function sortAttendPeople(people) {
  return [...people].sort((left, right) => {
    const dayDiff = attendCount(right.days) - attendCount(left.days);
    if (dayDiff) {
      return dayDiff;
    }
    return left.name.localeCompare(right.name, "ko");
  });
}

/**
 * 포켓 달성 칸 수를 센다.
 *
 * @param {Object<string, boolean>} wins 포켓 표시
 * @return {number} 채운 칸 수
 */
export function pocketCount(wins) {
  return POCKETS.filter((pocket) => Boolean(wins && wins[pocket.key])).length;
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
 * 출석 일수를 센다.
 *
 * @param {Object<string, boolean>} days 요일 표시
 * @return {number} 출석한 날 수
 */
export function attendCount(days) {
  return WEEKDAYS.filter((day) => Boolean(days && days[day.key])).length;
}

/**
 * 월~일을 모두 출석했는지 확인한다.
 *
 * @param {Object<string, boolean>} days 요일 표시
 * @return {boolean} 만근 여부
 */
export function attendComplete(days) {
  return WEEKDAYS.every((day) => Boolean(days && days[day.key]));
}

/**
 * 오늘에 해당하는 요일 키를 돌려준다.
 *
 * @param {Date} [date] 기준 날짜
 * @return {string} mon~sun
 */
export function todayWeekdayKey(date = new Date()) {
  const match = WEEKDAYS.find((day) => day.jsDay === date.getDay());
  return match ? match.key : "mon";
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
  const attend = parsed && parsed.attend ? parsed.attend : {};

  base.bingo.title = bingo.title || base.bingo.title;
  base.bingo.subtitle = bingo.subtitle || base.bingo.subtitle;
  base.bingo.updatedAt = bingo.updatedAt || null;
  if (Array.isArray(bingo.cells) && bingo.cells.length === 9) {
    base.bingo.cells = bingo.cells.map((cell) => String(cell || ""));
  }
  base.bingo.participants = normalizeBingoPeople(bingo.participants);

  base.pocket.title = pocket.title || base.pocket.title;
  base.pocket.subtitle = pocket.subtitle || base.pocket.subtitle;
  base.pocket.updatedAt = pocket.updatedAt || null;
  base.pocket.participants = normalizePocketPeople(pocket.participants);

  base.attend.title = attend.title || base.attend.title;
  base.attend.subtitle = attend.subtitle || base.attend.subtitle;
  base.attend.updatedAt = attend.updatedAt || null;
  base.attend.participants = normalizeAttendPeople(attend.participants);
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

/**
 * 출석 참여자 배열을 정규화한다.
 *
 * @param {unknown} people 저장된 참여자
 * @return {object[]} 참여자 목록
 */
function normalizeAttendPeople(people) {
  if (!Array.isArray(people)) {
    return [];
  }
  return people
      .map((person) => {
        const days = emptyDays();
        const saved = person.days || person.attend || {};
        for (const day of WEEKDAYS) {
          days[day.key] = Boolean(saved[day.key]);
        }
        return {
          id: person.id || newId(),
          name: String(person.name || "").trim(),
          days,
        };
      })
      .filter((person) => person.name);
}
