import { useState, useEffect } from "react";

const ARROW_IMG = "/assets/arrow.png";

const TUTORIAL_STEPS = [
  {
    target: null,
    title: "Добро пожаловать в дружину",
    text: "Ты и твой напарник Алекс сражаетесь против Стража и Тени. У каждого 100 HP. Победа — убить обоих врагов. Поражение — только если погибнете оба.",
    arrowDir: null,
  },
  {
    target: '[data-tutorial="enemies"]',
    title: "Твои враги",
    text: "Страж и Тень — такие же игроки как ты, только на другой стороне. Те же карты, та же колода. Под именем каждого — полоска HP и карты которые они держат в руке.",
    arrowDir: "up",
  },
  {
    target: '[data-tutorial="ally"]',
    title: "Твой напарник",
    text: "Алекс тянет карты из одной общей колоды вместе с тобой. Следи за его HP. Пока хоть один из вас жив — бой продолжается. Алекс действует и разговаривает с тобой в чате.",
    arrowDir: "down",
  },
  {
    target: '[data-tutorial="ap"]',
    title: "Очки действий (ОД)",
    text: "Каждый ход ты получаешь 2 ОД. Карты стоят 1 или 2 ОД. Потратил все — ход заканчивается. Карта «Энергия» даёт +2 ОД на следующий ход. Кнопка «Пропуск» копит +1 ОД в запас.",
    arrowDir: "up",
  },
  {
    target: '[data-tutorial="hand"]',
    title: "Твои карты",
    text: "Это твоя рука — карты которые можно сыграть прямо сейчас. Кружки внизу каждой карты — сколько ОД она стоит. Серая карта — не хватает ОД на этот ход.",
    arrowDir: "up",
  },
  {
    target: '[data-tutorial="deck"]',
    title: "Колода и изнурение",
    text: "Все четыре игрока тянут карты из одной общей колоды. Когда колода заканчивается и тасуется заново — начинается Изнурение. Цикл 2: −3 HP за карту. Цикл 3: −6 HP. Цикл 4+: −10 HP. Чем дольше бой — тем больнее.",
    arrowDir: "up",
  },
  {
    target: null,
    title: "Взять или сбросить?",
    text: "При переполнении руки (5 карт) тебе предложат новую карту. Возьми её — заменишь одну из старых (−2 ОД следующего хода). Или сбрось новую карту (−1 ОД). Иногда лучше отказаться от ненужной карты.",
    arrowDir: null,
  },
  {
    target: null,
    title: "Карты атаки",
    text: "⚔️ Атака (1 ОД): −8 HP врагу.\n🔥 Ярость (2 ОД): −18 HP врагу, −4 HP себе — отдача.\n⚔️⚔️ Рассечение (2 ОД): −8 HP двум разным врагам сразу.",
    arrowDir: null,
  },
  {
    target: null,
    title: "Защита и лечение",
    text: "🛡️ Щит (1 ОД): +10 HP себе.\n💉 Исцелить (1 ОД): +12 HP Алексу.\n✨ Возрождение (2 ОД): воскрешает Алекса (30 HP).\n↩️ Контр (1 ОД): отражает урон обратно врагу.\n🪤 Ловушка (1 ОД): −10 HP тому кто тебя ударит.",
    arrowDir: null,
  },
  {
    target: null,
    title: "Яд и кровотечение",
    text: "☠️ Яд: 3 тика по −5 HP. Итого 15 урона если враг доживёт.\n🩸 Кровотечение: 4 тика по −3 HP. Стакается — каждое применение добавляет ещё 4 тика.\nИконки под полоской HP показывают сколько тиков осталось.",
    arrowDir: null,
  },
  {
    target: null,
    title: "Особые карты",
    text: "🔍 Шпионаж (1 ОД): берёшь одну карту из колоды — хорошо когда нужна конкретная карта которой нет в руке.\n⚡ Энергия (1 ОД): +2 ОД на следующий ход — позволяет сыграть дорогие карты или комбо.",
    arrowDir: null,
  },
  {
    target: null,
    title: "Комбо — играй карты вместе",
    text: "Если за один ход сыграть определённые пары — срабатывает комбо:\n• Ярость + Яд = Ядовитый огонь (+24 HP + яд)\n• Энергия + Ярость = Шквал (+16 HP)\n• Щит + Исцелить = Крепость (каждый +8 HP)\n• Ловушка + Атака = Засада (+14 HP)\n• Атака + Атака = Двойной удар (+8 HP)\n• Атака + Рассечение = Натиск (+12 HP)\n• Яд + Кровотечение = Кровавый яд (+8 HP + яд)\nСрабатывает автоматически.",
    arrowDir: null,
  },
  {
    target: '[data-tutorial="ally"]',
    title: "Обмен с напарником",
    text: "Иногда Алекс предлагает обмен картами. Он отдаёт карту рубашкой вниз — ты не знаешь что получишь. Выбери какую карту отдашь ты. Риск, но иногда стоит: можно избавиться от ненужной карты.",
    arrowDir: "down",
  },
  {
    target: null,
    title: "Совместный удар",
    text: "💥 Совм. удар (1 ОД): наносит 22 урона — но только если Алекс согласен. Выбери карту, укажи цель — Алекс ответит в чате. Самый мощный одиночный удар в игре.",
    arrowDir: null,
  },
  {
    target: null,
    title: "Ты готов",
    text: "Это всё что нужно знать. Следи за HP напарника, используй комбо, не давай врагам накапливать силу. Удачи.",
    arrowDir: null,
    isLast: true,
  },
];

export default function Tutorial({ onEnd }) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [popupPos, setPopupPos] = useState({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
  const [arrowStyle, setArrowStyle] = useState({ display: "none" });

  useEffect(() => {
    const timer = setTimeout(updatePositions, 60);
    window.addEventListener("resize", updatePositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePositions);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function updatePositions() {
    const s = TUTORIAL_STEPS[step];
    if (!s.target) {
      setTargetRect(null);
      setPopupPos({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
      setArrowStyle({ display: "none" });
      return;
    }
    const el = document.querySelector(s.target);
    if (!el) {
      setTargetRect(null);
      setPopupPos({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
      setArrowStyle({ display: "none" });
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({ ...rect.toJSON() });
    placePopup(rect);
  }

  function placePopup(rect) {
    const POPUP_W = 350;
    const POPUP_H = 280;
    const ARROW_SZ = 44;
    const GAP = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left, arTop, arLeft, arRotate;

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = vw - rect.right;

    if (spaceBelow >= POPUP_H + ARROW_SZ + GAP) {
      // popup is below the element — arrow should point UP at the element
      top = rect.bottom + ARROW_SZ + GAP;
      left = clamp(rect.left + rect.width / 2 - POPUP_W / 2, 10, vw - POPUP_W - 10);
      arTop = rect.bottom + GAP / 2;
      arLeft = rect.left + rect.width / 2 - ARROW_SZ / 2;
      arRotate = 180;
    } else if (spaceAbove >= POPUP_H + ARROW_SZ + GAP) {
      // popup is above the element — arrow should point DOWN at the element
      top = rect.top - POPUP_H - ARROW_SZ - GAP;
      left = clamp(rect.left + rect.width / 2 - POPUP_W / 2, 10, vw - POPUP_W - 10);
      arTop = rect.top - ARROW_SZ - GAP / 2;
      arLeft = rect.left + rect.width / 2 - ARROW_SZ / 2;
      arRotate = 0;
    } else if (spaceRight >= POPUP_W + ARROW_SZ + GAP) {
      // right
      left = rect.right + ARROW_SZ + GAP;
      top = clamp(rect.top + rect.height / 2 - POPUP_H / 2, 10, vh - POPUP_H - 10);
      arLeft = rect.right + GAP / 2;
      arTop = rect.top + rect.height / 2 - ARROW_SZ / 2;
      arRotate = -90;
    } else {
      // left
      left = rect.left - POPUP_W - ARROW_SZ - GAP;
      top = clamp(rect.top + rect.height / 2 - POPUP_H / 2, 10, vh - POPUP_H - 10);
      arLeft = rect.left - ARROW_SZ - GAP / 2;
      arTop = rect.top + rect.height / 2 - ARROW_SZ / 2;
      arRotate = 90;
    }

    setPopupPos({ top: `${Math.max(8, top)}px`, left: `${Math.max(8, left)}px`, transform: "none" });
    setArrowStyle({
      display: "block",
      top: `${arTop}px`,
      left: `${arLeft}px`,
      "--arrow-rotate": `${arRotate}deg`,
    });
  }

  function clamp(val, lo, hi) {
    return Math.max(lo, Math.min(hi, val));
  }

  const handleNext = () => {
    const current = TUTORIAL_STEPS[step];
    if (current.isLast) {
      handleEnd();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleEnd = () => {
    localStorage.setItem("tutorialDone", "true");
    onEnd();
  };

  const current = TUTORIAL_STEPS[step];
  const total = TUTORIAL_STEPS.length;

  return (
    <>
      {/* Full-screen dark overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.75)", pointerEvents: "all",
      }} onClick={e => e.stopPropagation()} />

      {/* Spotlight — punches a bright hole in the overlay using box-shadow */}
      {targetRect && (
        <div style={{
          position: "fixed",
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          zIndex: 501,
          pointerEvents: "none",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
          borderRadius: 10,
          border: "2px solid rgba(200,160,80,0.65)",
        }} />
      )}

      {/* Arrow — rotation is handled inside the CSS keyframe via --arrow-rotate variable.
           Do NOT set transform here: inline styles override animation transforms. */}
      <img
        src={ARROW_IMG}
        alt=""
        style={{
          ...arrowStyle,
          position: "fixed",
          width: 40,
          height: 40,
          zIndex: 503,
          pointerEvents: "none",
          animationName: "arrowBounce",
          animationDuration: "1s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      />

      {/* Popup card */}
      <div
        style={{
          ...popupPos,
          position: "fixed",
          zIndex: 502,
          background: "linear-gradient(135deg, #1a1208, #2d1f0a)",
          border: "2px solid #8b6914",
          borderRadius: 10,
          padding: "20px 24px",
          width: 350,
          maxWidth: "calc(100vw - 20px)",
          color: "#e8d5a0",
          fontFamily: "Georgia, serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.85)",
          animation: "fadeIn 0.2s",
          pointerEvents: "all",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Step counter */}
        <div style={{ fontSize: 11, color: "#7a6040", marginBottom: 8 }}>
          Шаг {step + 1} / {total}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 15, fontWeight: 700, color: "#f0c040",
          marginBottom: 10, textTransform: "uppercase", letterSpacing: 1,
        }}>
          {current.title}
        </div>

        {/* Body text — preserve newlines */}
        <div style={{ fontSize: 13, lineHeight: 1.65, color: "#d4b896", whiteSpace: "pre-line" }}>
          {current.text}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 16 }}>
          <button
            onClick={handleEnd}
            style={{
              background: "transparent", color: "#7a6040",
              border: "none", cursor: "pointer", fontSize: 12,
              textDecoration: "underline", fontFamily: "Georgia, serif",
              padding: "6px 0",
            }}
          >
            Пропустить обучение
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleNext}
            style={{
              background: current.isLast
                ? "linear-gradient(135deg,#7a4008,#c87820)"
                : "#8b6914",
              color: "#fff", border: "none",
              padding: "9px 22px", borderRadius: 6,
              cursor: "pointer", fontSize: 13,
              fontFamily: "Georgia, serif", fontWeight: 700,
              letterSpacing: 0.5,
              boxShadow: current.isLast ? "0 0 20px rgba(200,120,20,0.5)" : "none",
            }}
          >
            {current.isLast ? "Начать бой" : "Понятно →"}
          </button>
        </div>
      </div>
    </>
  );
}
