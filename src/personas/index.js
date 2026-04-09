import * as pro from "./pro.js";
import * as anti from "./anti.js";

/**
 * Select persona based on participant's ingroup.
 * ingroup="approve"   → anti (partner disapproves of Russia's course)
 * ingroup="disapprove"→ pro  (partner approves of Russia's course)
 */
export function selectPersona(_condition, ingroup) {
  if (ingroup === "approve") return anti;
  return pro;
}

export function pickNickname(persona) {
  const names = persona.NICKNAMES;
  return names[Math.floor(Math.random() * names.length)];
}
