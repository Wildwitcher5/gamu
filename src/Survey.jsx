import { useState, useEffect } from "react";

/* ═══════════════════════ STORAGE KEYS ═══════════════════════════════════ */
const SESSION_KEY = "pol_current_session";

/* ═══════════════════════ SCALE CONSTANTS ═══════════════════════════════ */
const SCALE_AGREE = [
  "Совершенно\nне согласен(а)",
  "Скорее\nне согласен(а)",
  "Не\nуверен(а)",
  "Скорее\nсогласен(а)",
  "Совершенно\nсогласен(а)",
];
const SCALE_COMFORT = [
  "Очень\nнекомфортно",
  "Скорее\nнекомфортно",
  "Не\nуверен(а)",
  "Скорее\nкомфортно",
  "Очень\nкомфортно",
];
const SCALE_COOP = [
  "Совсем не\nготов(а)",
  "Скорее не\nготов(а)",
  "Не\nуверен(а)",
  "Скорее\nготов(а)",
  "Полностью\nготов(а)",
];
const SCALE_GAME_ENJOY = [
  "Очень не\nпонравилась",
  "Скорее не\nпонравилась",
  "Нейтрально",
  "Скорее\nпонравилась",
  "Очень\nпонравилась",
];
const SCALE_GAME_ENGAGE = [
  "Совсем не\nувлёкся(лась)",
  "Скорее не\nувлёкся(лась)",
  "Не\nуверен(а)",
  "Скорее\nувлёкся(лась)",
  "Был(а) полностью\nувлечён(а)",
];
const SCALE_GAME_FREQ = [
  "Никогда",
  "Несколько раз\nв год",
  "Несколько раз\nв месяц",
  "Несколько раз\nв неделю",
  "Каждый день или\nпочти каждый день",
];

const TRAITS_ITEMS = [
  "Умные",
  "Отзывчивые",
  "Честные",
  "Склонные к тщательному анализу информации",
  "Склонные к помощи",
  "Открытые к новым идеям",
];

const EDUCATION_OPTS = [
  "Неполное среднее",
  "Среднее (школа, ПТУ)",
  "Среднее специальное (колледж, техникум)",
  "Незаконченное высшее",
  "Высшее (бакалавр, специалист)",
  "Два и более высших / учёная степень",
];
const INCOME_OPTS = [
  "Денег не хватает даже на еду",
  "Денег хватает только на еду",
  "Денег хватает на еду и одежду, но не на крупные покупки",
  "Денег хватает на большинство необходимых покупок",
  "Можем позволить себе практически всё",
];


/* ════════════════════════ STORAGE UTILS ════════════════════════════════ */
function generateUUID() {
  // Prefer crypto.randomUUID() when available (cryptographically unique, no Math.random collision risk).
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try { return crypto.randomUUID(); } catch {}
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* upsertResponse: push current session snapshot to the server as a partial save.
 * Used for mid-flow writes (condition stamp, nick/avatar stamp, game-over metadata)
 * so data survives even if the user closes the tab before the post-survey.
 * Fire-and-forget with one in-flight retry to avoid spamming the endpoint. */
const _pendingPost = {};
export function upsertResponse(session) {
  if (!session || !session.session_id) return;
  const sid = session.session_id;
  // Always send status='incomplete' from mid-flow — the post-survey will upgrade to 'complete'.
  // Server-side guard (see api/save-response.js) prevents downgrading a completed row.
  const body = JSON.stringify({ session_id: sid, status: "incomplete", data: session });
  const attempt = async (tries) => {
    try {
      const r = await fetch("/api/save-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true, // survive tab close during pagehide/unload
      });
      if (!r.ok && tries > 0) {
        setTimeout(() => attempt(tries - 1), 800);
      }
    } catch {
      if (tries > 0) setTimeout(() => attempt(tries - 1), 800);
    }
  };
  // De-dupe: if a call for this session is already in flight, skip
  if (_pendingPost[sid]) return;
  _pendingPost[sid] = true;
  attempt(2).finally(() => { delete _pendingPost[sid]; });
}

export function saveCurrentSession(data) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch(e) { console.error("saveCurrentSession failed:", e); }
}

export function getCurrentSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch(e) { console.error("getCurrentSession failed:", e); return null; }
}

/* ════════════════════════ INDEX COMPUTATION ════════════════════════════ */
const r3 = v => Math.round(v * 1000) / 1000;

function avg(arr) {
  const valid = arr.filter(v => v != null);
  if (!valid.length) return 0;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function computeIndices(pfx, traitsOut, traitsIn, affectOut, affectIn,
                                distOut, distIn, coopOut, coopIn) {
  const trOutM   = r3(avg(traitsOut));
  const trInM    = r3(avg(traitsIn));
  const trDiff   = r3(trInM - trOutM);

  const affDiff  = r3((affectIn ?? 0) - (affectOut ?? 0));

  const distOutM = r3(avg(distOut));
  const distInM  = r3(avg(distIn));
  const distDiff = r3(distInM - distOutM);

  const coopOutM = r3(avg(coopOut));
  const coopInM  = r3(avg(coopIn));
  const coopDiff = r3(coopInM - coopOutM);

  const polarIdx = r3((trDiff/6 + affDiff/6 + distDiff/4 + coopDiff/4) / 4);

  return {
    [`${pfx}_traits_in_mean`]:  trInM,
    [`${pfx}_traits_out_mean`]: trOutM,
    [`${pfx}_traits_diff`]:     trDiff,
    [`${pfx}_affect_diff`]:     affDiff,
    [`${pfx}_dist_in_mean`]:    distInM,
    [`${pfx}_dist_out_mean`]:   distOutM,
    [`${pfx}_dist_diff`]:       distDiff,
    [`${pfx}_coop_in_mean`]:    coopInM,
    [`${pfx}_coop_out_mean`]:   coopOutM,
    [`${pfx}_coop_diff`]:       coopDiff,
    [`${pfx}_polar_index`]:     polarIdx,
  };
}

/* ════════════════════════ COOKIE UTILS ═════════════════════════════════ */
function getCookie(name) {
  return document.cookie.split(";").some(c => c.trim().startsWith(name + "="));
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

/* ════════════════════════ HELPER FUNCTIONS ═════════════════════════════ */
function computeIngroup(dir) {
  return dir <= 2 ? "disapprove" : "approve";
}

export function getGroupText(ingroup) {
  if (ingroup === "disapprove") {
    return {
      inTxt:  "людей, которые считают, что дела в России идут в неправильном направлении",
      outTxt: "людей, которые считают, что дела в России идут в правильном направлении",
      inDir:  "неправильном",
      outDir: "правильном",
    };
  }
  return {
    inTxt:  "людей, которые считают, что дела в России идут в правильном направлении",
    outTxt: "людей, которые считают, что дела в России идут в неправильном направлении",
    inDir:  "правильном",
    outDir: "неправильном",
  };
}

/* ═════════════════════════ UI PRIMITIVES ════════════════════════════════ */
function BodyText({ children, style }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.85, color: "#3a3228", marginBottom: 20, fontFamily: "Georgia, serif", ...style }}>
      {children}
    </div>
  );
}

function QLabel({ children }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 600, color: "#2a2520", marginBottom: 10, lineHeight: 1.55, fontFamily: "Georgia, serif" }}>
      {children}
    </div>
  );
}

function QBlock({ label, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <QLabel>{label}</QLabel>
      {children}
    </div>
  );
}

function RadioOption({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 9, cursor: "pointer", fontSize: 13.5, color: "#2a2520", lineHeight: 1.5, fontFamily: "Georgia, serif" }}>
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        style={{ accentColor: "#2d5a8c", width: 16, height: 16, cursor: "pointer", flexShrink: 0, marginTop: 2 }}
      />
      {label}
    </label>
  );
}

/* Matrix: column headers + item rows sharing one scale */
function SurveyMatrix({ items, scale, values, onChange, uid }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  if (isMobile) {
    return (
      <div>
        {items.map((item, ri) => (
          <div key={ri} style={{ borderTop: "1px solid #eeece8", padding: "14px 0" }}>
            <div style={{ fontSize: 13.5, color: "#2a2520", lineHeight: 1.6, fontFamily: "Georgia, serif", marginBottom: 12 }}>
              {item}
            </div>
            <div style={{ display: "flex" }}>
              {scale.map((lbl, ci) => (
                <label key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  <input type="radio" name={`${uid}_r${ri}`} checked={values[ri] === ci + 1}
                    onChange={() => onChange(ri, ci + 1)}
                    style={{ accentColor: "#2d5a8c", width: 22, height: 22, cursor: "pointer" }} />
                  <span style={{ fontSize: 8, color: "#999", textAlign: "center", lineHeight: 1.2, whiteSpace: "pre-line" }}>{lbl}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="survey-matrix">
      <div className="survey-matrix-header">
        {scale.map((lbl, ci) => (
          <div key={ci} style={{ flex: 1, textAlign: "center", fontSize: 9.5, color: "#999", lineHeight: 1.3, whiteSpace: "pre-line", padding: "0 1px" }}>
            {lbl}
          </div>
        ))}
      </div>
      {items.map((item, ri) => (
        <div key={ri} style={{ display: "flex", alignItems: "center", borderTop: "1px solid #eeece8", padding: "10px 0" }}>
          <div className="survey-matrix-label" style={{ paddingRight: 12, fontSize: 13, color: "#2a2520", lineHeight: 1.55, fontFamily: "Georgia, serif" }}>
            {item}
          </div>
          <div style={{ flex: 1, display: "flex" }}>
            {scale.map((_, ci) => (
              <label key={ci} style={{ flex: 1, display: "flex", justifyContent: "center", cursor: "pointer" }}>
                <input type="radio" name={`${uid}_r${ri}`} checked={values[ri] === ci + 1}
                  onChange={() => onChange(ri, ci + 1)}
                  style={{ accentColor: "#2d5a8c", width: 18, height: 18, cursor: "pointer" }} />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Single-item horizontal scale with labels below each button */
function RadioScale({ scale, value, onChange, name }) {
  return (
    <div style={{ display: "flex", gap: 0 }}>
      {scale.map((lbl, i) => (
        <label key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 2px" }}>
          <input
            type="radio"
            name={name}
            checked={value === i + 1}
            onChange={() => onChange(i + 1)}
            style={{ accentColor: "#2d5a8c", width: 17, height: 17, cursor: "pointer" }}
          />
          <span style={{ fontSize: 10, color: "#888", textAlign: "center", lineHeight: 1.3, whiteSpace: "pre-line" }}>
            {lbl}
          </span>
        </label>
      ))}
    </div>
  );
}

/* Semantic differential: left label — radio dots — right label */
function SemanticDiff({ leftLabel, rightLabel, n, value, onChange, name }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const dots = Array.from({ length: n }, (_, i) => (
    <label key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}>
      <input type="radio" name={name} checked={value === i + 1} onChange={() => onChange(i + 1)}
        style={{ accentColor: "#2d5a8c", width: isMobile ? 22 : 18, height: isMobile ? 22 : 18, cursor: "pointer" }} />
      <span style={{ fontSize: 11, color: "#bbb" }}>{i + 1}</span>
    </label>
  ));

  if (isMobile) {
    return (
      <div style={{ margin: "12px 0 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: "#3a3228", fontStyle: "italic", lineHeight: 1.4, fontFamily: "Georgia, serif", flex: 1 }}>← {leftLabel}</span>
          <span style={{ fontSize: 12, color: "#3a3228", fontStyle: "italic", lineHeight: 1.4, fontFamily: "Georgia, serif", flex: 1, textAlign: "right" }}>{rightLabel} →</span>
        </div>
        <div style={{ display: "flex" }}>{dots}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", margin: "12px 0 4px", width: "100%" }}>
      <div style={{ fontSize: 12, color: "#3a3228", lineHeight: 1.45, textAlign: "right", flex: "1 1 0", minWidth: 0, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
        {leftLabel}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>{dots}</div>
      <div style={{ fontSize: 12, color: "#3a3228", lineHeight: 1.45, textAlign: "left", flex: "1 1 0", minWidth: 0, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
        {rightLabel}
      </div>
    </div>
  );
}

/* Bipolar matrix: each row = [left label] [7 radio buttons] [right label].
   Intermediate points (2–6) are not labelled. */
function BipolarMatrix({ items, values, onChange, uid }) {
  return (
    <div className="bipolar-matrix">
      {items.map(([leftLabel, rightLabel], ri) => (
        <div key={ri} className="bipolar-row">
          <div className="bipolar-label bipolar-label-left">{leftLabel}</div>
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            {Array.from({ length: 7 }, (_, ci) => (
              <label key={ci} style={{ flex: 1, display: "flex", justifyContent: "center", cursor: "pointer", padding: "4px 0" }}>
                <input
                  type="radio"
                  name={`${uid}_r${ri}`}
                  checked={values[ri] === ci + 1}
                  onChange={() => onChange(ri, ci + 1)}
                  style={{ accentColor: "#2d5a8c", width: 18, height: 18, cursor: "pointer" }}
                />
              </label>
            ))}
          </div>
          <div className="bipolar-label bipolar-label-right">{rightLabel}</div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════ MAIN SURVEY COMPONENT ════════════════════════ */
/*
  Screen layout:

  PRE (13 screens):
    0  welcome
    1  dir
    2  ingId  (always user's own group — not affected by blockOrder)
    3–6  Block A: traitsA, affectA, distA, coopA  (A = out if outFirst, else in)
    7–10 Block B: traitsB, affectB, distB, coopB  (B = in if outFirst, else out)
    11 demo
    12 final

  POST (12 screens):
    0  welcome
    1  ingId
    2–5  Block A: traitsA, affectA, distA, coopA
    6–9  Block B: traitsB, affectB, distB, coopB
    10 gameQ
    11 final
*/
export default function Survey({ type, blockOrder = "approve_first", onComplete, priorSession = null }) {
  const isPre = type === "pre";
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* Cookie check — pre only */
  const [cookieScreen, setCookieScreen] = useState(() => isPre && getCookie("pol_study_done") ? "check" : null);
  const [submitting,  setSubmitting]   = useState(false);
  const [submitError, setSubmitError]  = useState(null);

  const [screen, setScreen] = useState(0);
  const [ans, setAns] = useState(() => {
    const prefillDir = !isPre ? (getCurrentSession()?.s1_direction ?? null) : null;
    return {
    gender: null,
    age: "",
    education: null,
    income: null,
    direction: prefillDir,
    ingroupId:  [null, null, null],
    traitsOut:  [null, null, null, null, null, null],
    traitsIn:   [null, null, null, null, null, null],
    affectOut:  null,
    affectIn:   null,
    distOut:    [null, null, null, null],
    distIn:     [null, null, null, null],
    coopOut:    [null, null, null],
    coopIn:     [null, null, null],
    gameEnjoyment:  null,
    gameEngagement: null,
    gameFrequency:  null,
    gameGuess:      "",
  };
  });

  /* Init session on Survey mount.
     Pre: create a fresh session_id (unless localStorage still has one from a resumed session).
     Post: seed localStorage from priorSession prop so getCurrentSession() works even if
     localStorage was wiped between pre and post (iOS private mode, killed background tab, etc). */
  useEffect(() => {
    if (isPre) {
      const existing = getCurrentSession();
      if (existing && existing.session_id) return; // already initialized (don't overwrite)
      const session = {
        session_id: generateUUID(),
        status: "started",
        ts_s1_start: new Date().toISOString(),
      };
      saveCurrentSession(session);
      upsertResponse(session);
    } else {
      // Post-survey: make sure localStorage has the session_id from the pre-survey
      const existing = getCurrentSession();
      if (priorSession && priorSession.session_id && (!existing || !existing.session_id)) {
        saveCurrentSession(priorSession);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setVal(key, val) { setAns(a => ({ ...a, [key]: val })); }
  function setArr(key, idx, val) { setAns(a => ({ ...a, [key]: a[key].map((v, i) => i === idx ? val : v) })); }

  const ingroup = ans.direction !== null ? computeIngroup(ans.direction) : null;
  const gt = ingroup ? getGroupText(ingroup) : { inTxt: "…", outTxt: "…", inDir: "…", outDir: "…" };

  /* Skip the ingroup-identification screen for undecided participants (direction === 3) */
  const skipIngId = ans.direction === 3;
  const TOTAL = isPre ? (skipIngId ? 14 : 15) : (skipIngId ? 13 : 14);

  /*
   * outFirst: do outgroup questions appear BEFORE ingroup questions in each block?
   * Determined purely by blockOrder (randomised 50/50 at session start) — independent
   * of the participant's own political position.
   * "disapprove_first" → outgroup block shown first for every participant.
   * "approve_first"    → ingroup block shown first for every participant.
   */
  const outFirst = blockOrder === "disapprove_first";

  /*
   * Block ordering: ALL questions for one direction come BEFORE all questions for the other.
   * outFirst=true  → steps 3-6 are outgroup (неправильно), steps 7-10 are ingroup (правильно)
   * outFirst=false → steps 3-6 are ingroup  (правильно),   steps 7-10 are outgroup (неправильно)
   * When skipIngId=true the ingId slot is removed; all subsequent indices shift down by 1.
   */
  const IDX = isPre
    ? (skipIngId
      ? { welcome:0, dir:1,
          blockOutIntro:outFirst?2:7,  blockInIntro:outFirst?7:2,
          traitsOut:outFirst?3:8,  traitsIn:outFirst?8:3,
          affectOut:outFirst?4:9,  affectIn:outFirst?9:4,
          distOut:  outFirst?5:10, distIn:  outFirst?10:5,
          coopOut:  outFirst?6:11, coopIn:  outFirst?11:6,
          demo:12, final:13 }
      : { welcome:0, dir:1, ingId:2,
          blockOutIntro:outFirst?3:8,  blockInIntro:outFirst?8:3,
          traitsOut:outFirst?4:9,  traitsIn:outFirst?9:4,
          affectOut:outFirst?5:10, affectIn:outFirst?10:5,
          distOut:  outFirst?6:11, distIn:  outFirst?11:6,
          coopOut:  outFirst?7:12, coopIn:  outFirst?12:7,
          demo:13, final:14 })
    : (skipIngId
      ? { welcome:0,
          blockOutIntro:outFirst?1:6,  blockInIntro:outFirst?6:1,
          traitsOut:outFirst?2:7,  traitsIn:outFirst?7:2,
          affectOut:outFirst?3:8,  affectIn:outFirst?8:3,
          distOut:  outFirst?4:9,  distIn:  outFirst?9:4,
          coopOut:  outFirst?5:10, coopIn:  outFirst?10:5,
          gameQ:11, final:12 }
      : { welcome:0, ingId:1,
          blockOutIntro:outFirst?2:7,  blockInIntro:outFirst?7:2,
          traitsOut:outFirst?3:8,  traitsIn:outFirst?8:3,
          affectOut:outFirst?4:9,  affectIn:outFirst?9:4,
          distOut:  outFirst?5:10, distIn:  outFirst?10:5,
          coopOut:  outFirst?6:11, coopIn:  outFirst?11:6,
          gameQ:12, final:13 });

  /* ── Validation ─────────────────────────────────────────────── */
  function isComplete() {
    switch (screen) {
      case IDX.welcome:        return true;
      case IDX.dir:            return ans.direction !== null;
      case IDX.ingId:          return ans.ingroupId.every(v => v !== null);
      case IDX.blockOutIntro:  return true;
      case IDX.blockInIntro:   return true;
      case IDX.traitsOut:      return ans.traitsOut.every(v => v !== null);
      case IDX.traitsIn:  return ans.traitsIn.every(v => v !== null);
      case IDX.affectOut: return ans.affectOut !== null;
      case IDX.affectIn:  return ans.affectIn !== null;
      case IDX.distOut:   return ans.distOut.every(v => v !== null);
      case IDX.distIn:    return ans.distIn.every(v => v !== null);
      case IDX.coopOut:   return ans.coopOut.every(v => v !== null);
      case IDX.coopIn:    return ans.coopIn.every(v => v !== null);
      case IDX.final:     return true;
      default:
        if (isPre && screen === IDX.demo) {
          const n = parseInt(ans.age, 10);
          return ans.gender !== null && !isNaN(n) && n >= 18 && n <= 99 && ans.education !== null && ans.income !== null;
        }
        if (!isPre && screen === IDX.gameQ)     return ans.gameEnjoyment !== null && ans.gameEngagement !== null && ans.gameFrequency !== null;
        return true;
    }
  }

  /* ── Save helpers ───────────────────────────────────────────── */
  function saveS1() {
    const current = getCurrentSession() || {};
    const ageN = parseInt(ans.age, 10);
    const updated = {
      ...current,
      status: "survey1_complete",
      ts_s1_end: new Date().toISOString(),
      dem_gender:    ans.gender,
      dem_age:       isNaN(ageN) ? null : ageN,
      dem_education: ans.education ? EDUCATION_OPTS.indexOf(ans.education) + 1 : null,
      dem_income:    ans.income    ? INCOME_OPTS.indexOf(ans.income) + 1    : null,
      s1_direction: ans.direction,
      s1_ingroup:   ingroup,
      ...Object.fromEntries(ans.traitsOut.map((v,i) => [`s1_traits_out_${i+1}`, v])),
      ...Object.fromEntries(ans.traitsIn.map( (v,i) => [`s1_traits_in_${i+1}`,  v])),
      s1_affect_out: ans.affectOut,
      s1_affect_in:  ans.affectIn,
      ...Object.fromEntries(ans.distOut.map(  (v,i) => [`s1_dist_out_${i+1}`,   v])),
      ...Object.fromEntries(ans.distIn.map(   (v,i) => [`s1_dist_in_${i+1}`,    v])),
      ...Object.fromEntries(ans.coopOut.map(  (v,i) => [`s1_coop_out_${i+1}`,   v])),
      ...Object.fromEntries(ans.coopIn.map(   (v,i) => [`s1_coop_in_${i+1}`,    v])),
      ...Object.fromEntries(ans.ingroupId.map((v,i) => [`s1_ingroup_id_${i+1}`, v])),
      ...computeIndices("s1",
          ans.traitsOut, ans.traitsIn, ans.affectOut, ans.affectIn,
          ans.distOut,   ans.distIn,   ans.coopOut,   ans.coopIn),
    };
    saveCurrentSession(updated);
    return updated;
  }

  function saveS2() {
    // Prefer localStorage, but fall back to priorSession prop if localStorage was wiped
    // (iOS private mode, killed background tab). Ensures session_id survives.
    const stored = getCurrentSession();
    const current = (stored && stored.session_id) ? stored : (priorSession || stored || {});
    const s2idx = computeIndices("s2",
      ans.traitsOut, ans.traitsIn, ans.affectOut, ans.affectIn,
      ans.distOut,   ans.distIn,   ans.coopOut,   ans.coopIn);
    const updated = {
      ...current,
      status: "complete",
      ts_s2_end: new Date().toISOString(),
      s2_direction: current.s1_direction ?? ans.direction,
      s2_ingroup:   current.s1_ingroup  ?? ingroup,
      ...Object.fromEntries(ans.traitsOut.map((v,i) => [`s2_traits_out_${i+1}`, v])),
      ...Object.fromEntries(ans.traitsIn.map( (v,i) => [`s2_traits_in_${i+1}`,  v])),
      s2_affect_out: ans.affectOut,
      s2_affect_in:  ans.affectIn,
      ...Object.fromEntries(ans.distOut.map(  (v,i) => [`s2_dist_out_${i+1}`,   v])),
      ...Object.fromEntries(ans.distIn.map(   (v,i) => [`s2_dist_in_${i+1}`,    v])),
      ...Object.fromEntries(ans.coopOut.map(  (v,i) => [`s2_coop_out_${i+1}`,   v])),
      ...Object.fromEntries(ans.coopIn.map(   (v,i) => [`s2_coop_in_${i+1}`,    v])),
      ...s2idx,
      delta_polar:  r3((s2idx.s2_polar_index || 0) - (current.s1_polar_index  || 0)),
      delta_traits: r3((s2idx.s2_traits_diff || 0) - (current.s1_traits_diff  || 0)),
      delta_affect: r3((s2idx.s2_affect_diff || 0) - (current.s1_affect_diff  || 0)),
      delta_dist:   r3((s2idx.s2_dist_diff   || 0) - (current.s1_dist_diff    || 0)),
      delta_coop:   r3((s2idx.s2_coop_diff   || 0) - (current.s1_coop_diff    || 0)),
      game_enjoyment:       ans.gameEnjoyment,
      game_engagement:      ans.gameEngagement,
      game_frequency:       ans.gameFrequency,
      game_guess:           ans.gameGuess,
      game_outcome:         current.game_outcome ?? null,
      game_turns:           current.game_turns   ?? null,
      chat_messages_sent:   current.chat_messages_sent ?? null,
      block_order:          current.block_order  ?? null,
    };
    saveCurrentSession(updated);
    return updated;
  }

  /* ── Server POST helper ──────────────────────────────────────── */
  async function postToServer(session) {
    const isComplete = !isPre;
    // Defensive: if session_id somehow disappeared (localStorage wiped, React state lost),
    // generate a fresh one so the record still saves. Orphan records can be linked later
    // by timestamp/IP but at least no data is silently dropped.
    let sid = session.session_id;
    if (!sid) {
      sid = generateUUID();
      session = { ...session, session_id: sid, _orphan: true };
      try { saveCurrentSession(session); } catch {}
    }
    const body = JSON.stringify({
      session_id: sid,
      status:     isComplete ? 'complete' : 'incomplete',
      data:       session,
    });
    // Retry with exponential backoff — network hiccups and cold-start 5xx must not
    // silently lose data. 3 attempts total: 0ms, 600ms, 1600ms.
    let lastErr;
    for (let i = 0; i < 3; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 400 * i * i + 200));
      try {
        const r = await fetch('/api/save-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        });
        if (r.ok) return;
        lastErr = new Error(`HTTP ${r.status}`);
      } catch (e) {
        lastErr = e;
      }
    }
    console.error('postToServer failed after 3 attempts:', lastErr);
    throw lastErr || new Error('Network error');
  }

  /* ── Navigation ─────────────────────────────────────────────── */
  async function handleNext() {
    if (screen < TOTAL - 1) {
      setScreen(s => s + 1);
      return;
    }
    /* Final screen — POST to server before proceeding */
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (isPre) {
        const session = saveS1();
        await postToServer(session);
        onComplete({ direction: ans.direction, ingroup, session });
      } else {
        const session = saveS2();
        await postToServer(session);
        setCookie("pol_study_done", "1", 365);
        onComplete({ direction: ans.direction, ingroup, session });
      }
    } catch {
      setSubmitError('Не удалось сохранить данные. Проверьте соединение и попробуйте ещё раз.');
      setSubmitting(false);
    }
  }

  /* ── Cookie screens ─────────────────────────────────────────── */
  if (cookieScreen === "check") {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(6,4,2,0.97)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1500, backdropFilter: "blur(8px)" }}>
        <div style={{ background: "#faf8f4", borderRadius: 12, padding: "44px 48px", maxWidth: 560, width: "90%", fontFamily: "Georgia, serif", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1410", marginBottom: 20 }}>
            Вы уже участвовали в исследовании?
          </div>
          <BodyText>
            Похоже, вы уже участвовали в этом исследовании с данного устройства.
            Повторное прохождение может исказить результаты исследования.
          </BodyText>
          <div style={{ display: "flex", gap: 14, marginTop: 28, flexWrap: "wrap" }}>
            <button
              onClick={() => setCookieScreen(null)}
              style={{ background: "linear-gradient(135deg,#1a3a5c,#2d6496)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}
            >
              Я участвую впервые
            </button>
            <button
              onClick={() => setCookieScreen("declined")}
              style={{ background: "#e0dcd6", color: "#3a3228", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}
            >
              Да, я уже проходил(а)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cookieScreen === "declined") {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(6,4,2,0.97)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1500 }}>
        <div style={{ background: "#faf8f4", borderRadius: 12, padding: "44px 48px", maxWidth: 500, width: "90%", fontFamily: "Georgia, serif", textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
          <div style={{ fontSize: 44, marginBottom: 20 }}>🙏</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1410", marginBottom: 16 }}>Большое спасибо!</div>
          <BodyText style={{ textAlign: "center" }}>
            Вы уже участвовали в нашем исследовании.
          </BodyText>
          <button
            onClick={() => setCookieScreen(null)}
            style={{ marginTop: 22, background: "transparent", color: "#8a8278", border: "1px solid #d6d0c6", borderRadius: 6, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}
          >
            Нажал(а) по ошибке — пройти всё равно
          </button>
        </div>
      </div>
    );
  }

  /* ── Derived UI state ───────────────────────────────────────── */
  const complete  = isComplete();
  const progress  = TOTAL > 1 ? (screen / (TOTAL - 1)) * 100 : 100;
  const isFinal   = screen === IDX.final;
  const btnLabel  = submitting ? "⏳ Сохраняем…" : isFinal ? (isPre ? "Начать игру →" : "Завершить →") : "Далее →";


  /* ── Screen content ──────────────────────────────────────────── */
  function renderScreen() {

    /* Welcome */
    if (screen === IDX.welcome) {
      if (isPre) {
        return (
          <>
            <BodyText>
              Это исследование посвящено тому, как люди с разными взглядами на
              жизнь в стране общаются и взаимодействуют друг с другом в онлайн-игре.
              Нас интересует, как мы можем улучшить опыт взаимодействия с другими
              игроками и что влияет на восприятие союзника.
            </BodyText>
            <BodyText>
              Мы — группа исследователей из Высшей школы экономики. Если вы
              живёте в России, просим вас ответить на несколько вопросов перед
              началом игры. Это займёт около 10 минут.
            </BodyText>
            <BodyText>
              Правильных и неправильных ответов здесь нет — нас интересует
              именно ваше личное мнение. Пожалуйста, отвечайте честно и не
              торопитесь. Исследование полностью анонимно: имя и личные данные
              указывать не нужно. Ваши ответы используются только в обобщённом
              виде и только в научных целях.
            </BodyText>
          </>
        );
      }
      return (
        <BodyText>
          Игра завершена. Пожалуйста, ответьте ещё на несколько вопросов —
          это займёт около 5 минут.
        </BodyText>
      );
    }

    /* Demographics (pre only) */
    if (isPre && screen === IDX.demo) {
      return (
        <>
          <QBlock label="Ваш пол">
            {["Мужской", "Женский", "Предпочитаю не указывать"].map(opt => (
              <RadioOption key={opt} label={opt} checked={ans.gender === opt} onChange={() => setVal("gender", opt)} />
            ))}
          </QBlock>
          <QBlock label="Ваш возраст">
            <input
              type="number" min={18} max={99} value={ans.age}
              onChange={e => setVal("age", e.target.value)}
              placeholder="Введите возраст (18–99)"
              style={{ border: "1px solid #ddd8d0", borderRadius: 6, padding: "9px 14px", fontSize: 14, color: "#1a1410", width: "100%", boxSizing: "border-box", fontFamily: "Georgia, serif", background: "#fefcf8", outline: "none" }}
            />
          </QBlock>
          <QBlock label="Ваш уровень образования">
            {EDUCATION_OPTS.map(opt => (
              <RadioOption key={opt} label={opt} checked={ans.education === opt} onChange={() => setVal("education", opt)} />
            ))}
          </QBlock>
          <QBlock label="Оцените материальное положение вашей семьи">
            {INCOME_OPTS.map(opt => (
              <RadioOption key={opt} label={opt} checked={ans.income === opt} onChange={() => setVal("income", opt)} />
            ))}
          </QBlock>
        </>
      );
    }

    /* Direction */
    if (screen === IDX.dir) {
      return (
        <>
          <BodyText>
            Люди придерживаются разных позиций относительно того, что
            происходит в нашей стране. Одни считают, что дела в России идут в
            правильном направлении, а другие полагают, что в неправильном.
            Какой позиции придерживаетесь вы?
          </BodyText>
          <SemanticDiff
            leftLabel="Дела в России идут в неправильном направлении"
            rightLabel="Дела в России идут в правильном направлении"
            n={5} value={ans.direction}
            onChange={v => setVal("direction", v)}
            name={`${type}_dir`}
          />
        </>
      );
    }

    /* Ingroup identification */
    if (screen === IDX.ingId) {
      return (
        <>
          <BodyText style={{ marginBottom: 16 }}>
            Оцените, насколько вы согласны со следующими утверждениями о себе.
          </BodyText>
          <SurveyMatrix
            items={[
              `Я горжусь тем, что принадлежу к числу ${gt.inTxt}`,
              `Мне важно входить в число ${gt.inTxt}`,
              `Я ощущаю психологическую связь с людьми, которые считают, что дела в России идут в ${gt.inDir} направлении`,
            ]}
            scale={SCALE_AGREE}
            values={ans.ingroupId}
            onChange={(ri, v) => setArr("ingroupId", ri, v)}
            uid={`${type}_ing`}
          />
        </>
      );
    }

    /* Block intro — outgroup */
    if (screen === IDX.blockOutIntro) {
      return (
        <BodyText>
          Пожалуйста, ответьте на несколько вопросов о людях, которые считают,
          что дела в России идут в <strong>{gt.outDir} направлении</strong>.
        </BodyText>
      );
    }

    /* Block intro — ingroup */
    if (screen === IDX.blockInIntro) {
      return (
        <BodyText>
          Пожалуйста, ответьте на несколько вопросов о людях, которые считают,
          что дела в России идут в <strong>{gt.inDir} направлении</strong>.
        </BodyText>
      );
    }

    /* Block A: Traits — outgroup */
    if (screen === IDX.traitsOut) {
      return (
        <>
          <BodyText style={{ marginBottom: 16 }}>
            Ниже приведён список личностных качеств. Как вам кажется, какими
            особенностями обладают люди, считающие, что дела в России идут в{" "}
            {gt.outDir} направлении?
          </BodyText>
          <SurveyMatrix
            items={TRAITS_ITEMS}
            scale={SCALE_AGREE}
            values={ans.traitsOut}
            onChange={(ri, v) => setArr("traitsOut", ri, v)}
            uid={`${type}_trout`}
          />
        </>
      );
    }

    /* Block A: Traits — ingroup */
    if (screen === IDX.traitsIn) {
      return (
        <>
          <BodyText style={{ marginBottom: 16 }}>
            Ниже приведён список личностных качеств. Как вам кажется, какими
            особенностями обладают люди, считающие, что дела в России идут в{" "}
            {gt.inDir} направлении?
          </BodyText>
          <SurveyMatrix
            items={TRAITS_ITEMS}
            scale={SCALE_AGREE}
            values={ans.traitsIn}
            onChange={(ri, v) => setArr("traitsIn", ri, v)}
            uid={`${type}_trin`}
          />
        </>
      );
    }

    /* Block B: Affect — outgroup */
    if (screen === IDX.affectOut) {
      return (
        <>
          <BodyText style={{ marginBottom: 20 }}>
            Как бы вы оценили своё отношение к людям, которые считают,
            что дела в России идут в {gt.outDir} направлении?
          </BodyText>
          <SemanticDiff
            leftLabel="Отношение очень холодное, отрицательное"
            rightLabel="Отношение очень тёплое, положительное"
            n={7} value={ans.affectOut}
            onChange={v => setVal("affectOut", v)}
            name={`${type}_affout`}
          />
        </>
      );
    }

    /* Block B: Affect — ingroup */
    if (screen === IDX.affectIn) {
      return (
        <>
          <BodyText style={{ marginBottom: 20 }}>
            Как бы вы оценили своё отношение к людям, которые считают,
            что дела в России идут в {gt.inDir} направлении?
          </BodyText>
          <SemanticDiff
            leftLabel="Отношение очень холодное, отрицательное"
            rightLabel="Отношение очень тёплое, положительное"
            n={7} value={ans.affectIn}
            onChange={v => setVal("affectIn", v)}
            name={`${type}_affin`}
          />
        </>
      );
    }

    /* Block C: Social Distance — outgroup */
    if (screen === IDX.distOut) {
      return (
        <>
          <BodyText style={{ marginBottom: 16 }}>
            Насколько вам было бы комфортно общаться на личные темы и
            обсуждать ситуацию в стране с человеком, который считает, что дела
            в России идут в {gt.outDir} направлении, если этот человек —
          </BodyText>
          <SurveyMatrix
            items={["Член вашей семьи", "Ваш друг", "Ваш коллега", "Ваш сосед"]}
            scale={SCALE_COMFORT}
            values={ans.distOut}
            onChange={(ri, v) => setArr("distOut", ri, v)}
            uid={`${type}_dout`}
          />
        </>
      );
    }

    /* Block C: Social Distance — ingroup */
    if (screen === IDX.distIn) {
      return (
        <>
          <BodyText style={{ marginBottom: 16 }}>
            Насколько вам было бы комфортно общаться на личные темы и
            обсуждать ситуацию в стране с человеком, который считает, что дела
            в России идут в {gt.inDir} направлении, если этот человек —
          </BodyText>
          <SurveyMatrix
            items={["Член вашей семьи", "Ваш друг", "Ваш коллега", "Ваш сосед"]}
            scale={SCALE_COMFORT}
            values={ans.distIn}
            onChange={(ri, v) => setArr("distIn", ri, v)}
            uid={`${type}_din`}
          />
        </>
      );
    }

    /* Block D: Cooperation — outgroup */
    if (screen === IDX.coopOut) {
      return (
        <>
          <BodyText style={{ marginBottom: 16 }}>
            Насколько вы готовы совместно с людьми, которые считают,
            что дела в России идут в {gt.outDir} направлении...
          </BodyText>
          <SurveyMatrix
            items={[
              "Обсуждать общественно значимые проблемы",
              "Искать совместные решения общественных проблем",
              "Участвовать в совместных гражданских инициативах (например, субботнике или организации местного мероприятия)",
            ]}
            scale={SCALE_COOP}
            values={ans.coopOut}
            onChange={(ri, v) => setArr("coopOut", ri, v)}
            uid={`${type}_coopout`}
          />
        </>
      );
    }

    /* Block D: Cooperation — ingroup */
    if (screen === IDX.coopIn) {
      return (
        <>
          <BodyText style={{ marginBottom: 16 }}>
            Насколько вы готовы совместно с людьми, которые считают,
            что дела в России идут в {gt.inDir} направлении...
          </BodyText>
          <SurveyMatrix
            items={[
              "Обсуждать общественно значимые проблемы",
              "Искать совместные решения общественных проблем",
              "Участвовать в совместных гражданских инициативах (например, субботнике или организации местного мероприятия)",
            ]}
            scale={SCALE_COOP}
            values={ans.coopIn}
            onChange={(ri, v) => setArr("coopIn", ri, v)}
            uid={`${type}_coopin`}
          />
        </>
      );
    }

    /* Game questions (post only) */
    if (!isPre && screen === IDX.gameQ) {
      return (
        <>
          <QBlock label="Как бы вы оценили игру в целом?">
            <RadioScale scale={SCALE_GAME_ENJOY} value={ans.gameEnjoyment} onChange={v => setVal("gameEnjoyment", v)} name={`${type}_enjoy`} />
          </QBlock>
          <QBlock label="Насколько вы были увлечены игрой?">
            <RadioScale scale={SCALE_GAME_ENGAGE} value={ans.gameEngagement} onChange={v => setVal("gameEngagement", v)} name={`${type}_engage`} />
          </QBlock>
          <QBlock label="Как часто вы играете в видеоигры (на компьютере, телефоне и т.п.)?">
            <RadioScale scale={SCALE_GAME_FREQ} value={ans.gameFrequency} onChange={v => setVal("gameFrequency", v)} name={`${type}_gfreq`} />
          </QBlock>
          <QBlock label="Как вам кажется, что именно изучает данное исследование? (необязательно)">
            <textarea
              value={ans.gameGuess}
              onChange={e => setVal("gameGuess", e.target.value)}
              rows={3}
              placeholder="Ваш ответ..."
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd8d0", borderRadius: 6, padding: "9px 14px", fontSize: 13, color: "#1a1410", fontFamily: "Georgia, serif", background: "#fefcf8", resize: "vertical", outline: "none" }}
            />
          </QBlock>
        </>
      );
    }

    /* Final */
    if (screen === IDX.final) {
      return (
        <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <div style={{ fontSize: 44, marginBottom: 20 }}>{isPre ? "🎮" : "🙏"}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1410", marginBottom: 16, fontFamily: "Georgia, serif", lineHeight: 1.4 }}>
            {isPre ? "Спасибо за ответы!" : "Большое спасибо за участие в исследовании!"}
          </div>
          {isPre && (
            <BodyText style={{ textAlign: "center" }}>
              Теперь вас ждёт игра. Нажмите «Начать игру», чтобы продолжить.
            </BodyText>
          )}
        </div>
      );
    }

    return null;
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div style={{ position: "fixed", inset: 0, background: isMobile ? "#faf8f4" : "rgba(6,4,2,0.97)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1500, backdropFilter: isMobile ? "none" : "blur(8px)", overflowY: "auto", padding: isMobile ? "0" : "32px 16px 48px" }}>
      <div className="survey-inner" style={{ background: "#faf8f4", borderRadius: isMobile ? 0 : 12, padding: isMobile ? "28px 20px 40px" : "44px 48px", width: "100%", maxWidth: 700, minHeight: isMobile ? "100dvh" : "auto", color: "#1a1410", fontFamily: "Georgia, serif", boxShadow: isMobile ? "none" : "0 24px 80px rgba(0,0,0,0.7)", animation: "scaleIn 0.25s ease", boxSizing: "border-box", marginBottom: isMobile ? 0 : 32 }}>

        {/* Progress bar */}
        <div style={{ height: 4, background: "#e8e4de", borderRadius: 2, marginBottom: 6 }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg,#1a3a5c,#4a8ac4)", borderRadius: 2, width: `${progress}%`, transition: "width 0.35s ease" }} />
        </div>
        <div style={{ fontSize: 11, color: "#b0a898", marginBottom: 28, fontFamily: "Georgia, serif", letterSpacing: 0.3 }}>
          Шаг {screen + 1} из {TOTAL}
        </div>

        {/* Content */}
        {renderScreen()}

        {/* Navigation */}
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", alignItems: isMobile ? "stretch" : "flex-end", gap: 10 }}>
          {submitError && (
            <div style={{ fontSize: 13, color: "#c0392b", background: "#fdf0ee",
              border: "1px solid #e8c0bc", borderRadius: 8, padding: "10px 16px",
              lineHeight: 1.5, fontFamily: "Georgia, serif" }}>
              ⚠ {submitError}
            </div>
          )}
          <button
            onClick={handleNext}
            disabled={!complete || submitting}
            style={{
              background: complete && !submitting ? "linear-gradient(135deg,#1a3a5c,#2d6496)" : "#e0dcd6",
              color: complete && !submitting ? "#fff" : "#b0a898",
              border: "none", borderRadius: 8,
              padding: isMobile ? "15px 24px" : "13px 46px",
              fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
              cursor: complete && !submitting ? "pointer" : "default",
              fontFamily: "Georgia, serif",
              boxShadow: complete && !submitting ? "0 4px 20px rgba(45,100,150,0.3)" : "none",
              transition: "all 0.2s",
            }}
          >
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
