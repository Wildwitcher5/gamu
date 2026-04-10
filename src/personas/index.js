import { NICKNAMES, getSystemPrompt } from "./ally.js";

/**
 * Select persona based on participant's ingroup.
 * ingroup="approve"    → ally with anti stance (partner disapproves of Russia's course)
 * ingroup="disapprove" → ally with pro stance  (partner approves of Russia's course)
 */
export function selectPersona(_condition, ingroup) {
  const stance = ingroup === "approve" ? "anti" : "pro";
  return { NICKNAMES, getSystemPrompt: (nick) => getSystemPrompt(nick, stance) };
}

export function pickNickname(persona) {
  const names = persona.NICKNAMES;
  return names[Math.floor(Math.random() * names.length)];
}
