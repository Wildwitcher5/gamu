import * as neutral from "./neutral.js";
import * as pro from "./pro.js";
import * as anti from "./anti.js";

/**
 * Select persona based on experimental condition + participant's ingroup.
 * cond_4             → neutral (partner from neutral folder, politics off)
 * ingroup="approve"  → anti   (partner disapproves of Russia's course)
 * ingroup="disapprove"→ pro   (partner approves of Russia's course)
 */
export function selectPersona(condition, ingroup) {
  if (condition === "cond_4") return neutral;
  if (ingroup === "approve")  return anti;
  return pro;
}

export function pickNickname(persona) {
  const names = persona.NICKNAMES;
  return names[Math.floor(Math.random() * names.length)];
}
