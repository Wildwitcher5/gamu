import { useState, useEffect } from "react";

const ARROW_IMG = "/assets/arrow.png";

function getTutorialSteps(nick, e1, e2) {
  const n = nick || "Союзник";
  const en1 = e1 || "Страж";
  const en2 = e2 || "Тень";
  return [
  {
    target: null,
    title: "Добро пожаловать в дружину",
    text: `Ты и твой напарник ${n} сражаетесь против ${en1} и ${en2}. У каждого 100 здоровья. Победа — уничтожить обоих врагов. Поражение — только если погибнете оба.`,
  },
  {
    target: '[data-tutorial="enemies"]',
    title: "Твои враги",
    text: `${en1} и ${en2} действуют самостоятельно — те же карты, та же колода, но против вас. Под именем — полоска здоровья и число карт в руке.`,
    arrowDir: "up",
  },
  {
    target: '[data-tutorial="ally"]',
    title: `Напарник — ${n}`,
    text: `${n} тянет карты из общей колоды вместе с тобой. Если вы оба упадёте до 0 — бой проигран. ${n} ходит каждый ход и пишет в чат.`,
    arrowDir: "down",
  },
  {
    target: '[data-tutorial="ap"]',
    title: "Очки действий (ОД)",
    text: "Каждый ход — 2 ОД. Карты стоят 1 или 2 ОД. Когда ОД кончились — завершай ход.\n«Энергия» даёт +2 ОД на следующий ход. «Пропуск» копит +1 ОД в запас.",
    arrowDir: "up",
  },
  {
    target: '[data-tutorial="hand"]',
    title: "Твоя рука",
    text: "Карты, которые можно сыграть прямо сейчас. Кружки под картой — стоимость в ОД. Серая карта — не хватает ОД. Нажми на карту, чтобы увидеть описание и выбрать цель.",
    arrowDir: "up",
  },
  {
    target: null,
    title: "Изнурение",
    text: "Все четыре игрока тянут из одной колоды. Когда она заканчивается и тасуется заново — начинается Изнурение: каждая сыгранная карта наносит тебе урон.\nЦикл 2: −3 HP за карту. Цикл 3: −6. Цикл 4+: −10.\nЧем дольше затягивается бой — тем больнее.",
  },
  {
    target: null,
    title: "Переполнение руки",
    text: "Если в руке уже 5 карт, при получении новой появится экран выбора.\nВыбери одну из старых карт для сброса — или откажись от новой карты (это бесплатно, штрафа нет).",
  },
  {
    target: null,
    title: "Карты атаки",
    text: "⚔️ Атака (1 ОД): −8 HP одному врагу.\n🔥 Ярость (2 ОД): −18 врагу, −4 себе — мощно, но рискованно.\n⚔️⚔️ Рассечение (2 ОД): −8 HP двум разным врагам одновременно.",
  },
  {
    target: null,
    title: "Защита и лечение",
    text: `🛡️ Щит (1 ОД): +10 HP себе.\n💉 Исцелить (1 ОД): +12 HP ${n}.\n✨ Возрождение (2 ОД): воскрешает ${n} (30 HP) — только если он уже пал.\n↩️ Контр (1 ОД): следующий удар по тебе отражается врагу (пассивный).\n🪤 Ловушка (1 ОД): враг, который тебя ударит, получит −10 HP (пассивная).`,
  },
  {
    target: null,
    title: "Яд и кровотечение",
    text: "☠️ Яд: −5 HP в ход, 3 хода подряд = 15 урона суммарно.\n🩸 Кровотечение: −3 HP в ход, 4 хода. Каждое новое применение добавляет ещё 4 хода.\nИконки под полоской здоровья показывают сколько ходов осталось.",
  },
  {
    target: null,
    title: "Особые карты",
    text: "🔍 Шпионаж (1 ОД): взять случайную карту из руки врага.\n⚡ Энергия (1 ОД): +2 ОД на следующий ход — можно сыграть больше карт.\n🃏 Перебор (1 ОД): +2 карты в руку прямо сейчас.\n🔰 Контрудар (2 ОД): отменить совм. удар врагов и вернуть им 50% урона.",
  },
  {
    target: null,
    title: "Комбо",
    text: "Сыграй обе карты из пары за один ход — комбо сработает автоматически:\n• Ярость + Яд → Ядовитый огонь 🔥☠️\n• Щит + Исцелить → Крепость (оба +8 HP)\n• Ловушка + Атака → Засада\n• Атака + Атака → Двойной удар\n• Атака + Рассечение → Натиск\nПорядок карт не важен — главное сыграть обе.",
  },
  {
    target: '[data-tutorial="ally"]',
    title: "Обмен с напарником",
    text: `${n} иногда предлагает обменяться картой. ${n} даёт тебе карту, но ты не знаешь заранее какую. Выбери, какую карту отдашь взамен.\nХороший способ избавиться от ненужных карт и получить что-то новое.`,
    arrowDir: "down",
  },
  {
    target: null,
    title: "Совместный удар",
    text: `💥 Совм. удар (1 ОД): 22 урона — самый сильный удар в игре.\nНо он требует согласия ${n}: выбери карту, укажи цель — ${n} ответит «✓» или откажется прямо в чате.\nЛучше всего использовать против врага с большим запасом HP.`,
  },
  {
    target: null,
    title: "Вперёд!",
    text: `Это всё, что нужно знать для боя.\nСледи за здоровьем ${n}, используй комбо, не давай врагам накапливать урон.\nЧат всегда открыт — пиши ${n}, если нужна помощь или хочешь скоординировать удар. Удачи!`,
    isLast: true,
  },
  ];
}

// Maps tutorial target selectors to the mobile tab that contains them
const TAB_FOR_TARGET = {
  '[data-tutorial="enemies"]': "battle",
  '[data-tutorial="ally"]': "battle",
  '[data-tutorial="ap"]': "battle",
  '[data-tutorial="hand"]': "cards",
};

export default function Tutorial({ onEnd, allyNick, e1Nick, e2Nick, setActiveTab }) {
  const steps = getTutorialSteps(allyNick, e1Nick, e2Nick);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [popupPos, setPopupPos] = useState({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
  const [arrowStyle, setArrowStyle] = useState({ display: "none" });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const s = steps[step];
    // On mobile, switch to the tab that contains the target element before positioning
    if (isMobile && setActiveTab && s.target && TAB_FOR_TARGET[s.target]) {
      setActiveTab(TAB_FOR_TARGET[s.target]);
    }
    const timer = setTimeout(updatePositions, 80);
    window.addEventListener("resize", updatePositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePositions);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isMobile]);

  function updatePositions() {
    const s = steps[step];
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
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Only spotlight if element is actually visible in the viewport
    // (on mobile with tabs, some elements may be off-screen or hidden)
    const isVisible = rect.width > 0 && rect.height > 0
      && rect.bottom > 0 && rect.top < vh
      && rect.right > 0 && rect.left < vw;
    if (!isVisible) {
      setTargetRect(null);
      setPopupPos({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
      setArrowStyle({ display: "none" });
      return;
    }
    setTargetRect({ ...rect.toJSON() });
    placePopup(rect, vw, vh);
  }

  function placePopup(rect, vw, vh) {
    const mobile = vw < 768;
    const POPUP_W = mobile ? Math.min(vw - 24, 340) : 350;
    const POPUP_H = mobile ? 260 : 280;
    const ARROW_SZ = 40;
    const GAP = 12;

    let top, left, arTop, arLeft, arRotate;

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = vw - rect.right;

    if (spaceBelow >= POPUP_H + ARROW_SZ + GAP) {
      top = rect.bottom + ARROW_SZ + GAP;
      left = clamp(rect.left + rect.width / 2 - POPUP_W / 2, 10, vw - POPUP_W - 10);
      arTop = rect.bottom + GAP / 2;
      arLeft = rect.left + rect.width / 2 - ARROW_SZ / 2;
      arRotate = 180;
    } else if (spaceAbove >= POPUP_H + ARROW_SZ + GAP) {
      top = rect.top - POPUP_H - ARROW_SZ - GAP;
      left = clamp(rect.left + rect.width / 2 - POPUP_W / 2, 10, vw - POPUP_W - 10);
      arTop = rect.top - ARROW_SZ - GAP / 2;
      arLeft = rect.left + rect.width / 2 - ARROW_SZ / 2;
      arRotate = 0;
    } else if (spaceRight >= POPUP_W + ARROW_SZ + GAP) {
      left = rect.right + ARROW_SZ + GAP;
      top = clamp(rect.top + rect.height / 2 - POPUP_H / 2, 10, vh - POPUP_H - 10);
      arLeft = rect.right + GAP / 2;
      arTop = rect.top + rect.height / 2 - ARROW_SZ / 2;
      arRotate = -90;
    } else {
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
    if (steps[step].isLast) handleEnd();
    else setStep(s => s + 1);
  };

  const handleEnd = () => {
    localStorage.setItem("tutorialDone", "true");
    onEnd();
  };

  const current = steps[step];
  const total = steps.length;
  const progress = ((step + 1) / total) * 100;

  return (
    <>
      {/* Dark overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.75)", pointerEvents: "all",
      }} onClick={e => e.stopPropagation()} />

      {/* Spotlight */}
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

      {/* Arrow */}
      <img
        src={ARROW_IMG}
        alt=""
        style={{
          ...arrowStyle,
          position: "fixed",
          width: 36,
          height: 36,
          zIndex: 503,
          pointerEvents: "none",
          animationName: "arrowBounce",
          animationDuration: "1s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      />

      {/* Popup */}
      <div
        style={{
          ...popupPos,
          position: "fixed",
          zIndex: 502,
          background: "linear-gradient(135deg, #1a1208, #2d1f0a)",
          border: "2px solid #8b6914",
          borderRadius: 10,
          padding: isMobile ? "14px 16px 12px" : "20px 24px 16px",
          width: isMobile ? "calc(100vw - 24px)" : 350,
          maxWidth: "calc(100vw - 20px)",
          maxHeight: isMobile ? "78vh" : "80vh",
          display: "flex",
          flexDirection: "column",
          color: "#e8d5a0",
          fontFamily: "Georgia, serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.85)",
          animation: "fadeIn 0.2s",
          pointerEvents: "all",
          boxSizing: "border-box",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div style={{ height: 2, background: "#3a2a0a", borderRadius: 1, marginBottom: 10, flexShrink: 0 }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "linear-gradient(90deg,#8b6914,#f0c040)",
            borderRadius: 1, transition: "width 0.3s",
          }} />
        </div>

        {/* Step counter */}
        <div style={{ fontSize: 11, color: "#9a7a50", marginBottom: 6, flexShrink: 0 }}>
          {step + 1} / {total}
        </div>

        {/* Title */}
        <div style={{
          fontSize: isMobile ? 13 : 15,
          fontWeight: 700, color: "#f0c040",
          marginBottom: 8,
          textTransform: "uppercase", letterSpacing: 1,
          flexShrink: 0,
        }}>
          {current.title}
        </div>

        {/* Body — scrollable */}
        <div style={{
          fontSize: isMobile ? 12 : 13,
          lineHeight: 1.65,
          color: "#d4b896",
          whiteSpace: "pre-line",
          overflowY: "auto",
          flex: 1,
          marginBottom: 10,
          WebkitOverflowScrolling: "touch",
        }}>
          {current.text}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0, gap: 8 }}>
          <button
            onClick={handleEnd}
            style={{
              background: "transparent", color: "#7a6040",
              border: "none", cursor: "pointer",
              fontSize: isMobile ? 11 : 12,
              textDecoration: "underline",
              fontFamily: "Georgia, serif",
              padding: "6px 0",
              minHeight: 44,
              flexShrink: 0,
            }}
          >
            Пропустить
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleNext}
            style={{
              background: current.isLast
                ? "linear-gradient(135deg,#7a4008,#c87820)"
                : "#8b6914",
              color: "#fff", border: "none",
              padding: isMobile ? "0 18px" : "0 22px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: isMobile ? 12 : 13,
              fontFamily: "Georgia, serif", fontWeight: 700,
              letterSpacing: 0.5,
              minHeight: 44,
              display: "flex", alignItems: "center",
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
