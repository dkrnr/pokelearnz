// Existing MVP input filter, retained. This is not a complete child-safety system.
const NSFW_WORDS = [
  // profanity
  "fuck",
  "fucking",
  "fucker",
  "fucks",
  "fucked",
  "shit",
  "shits",
  "shitting",
  "bullshit",
  "bitch",
  "bitches",
  "bitchy",
  "cunt",
  "cunts",
  "asshole",
  "assholes",
  "bastard",
  "bastards",
  "damn",
  "goddamn",
  // sexual
  "cock",
  "cocks",
  "dick",
  "dicks",
  "penis",
  "pussy",
  "vagina",
  "boob",
  "boobs",
  "tit",
  "tits",
  "breast",
  "porn",
  "porno",
  "pornography",
  "sex",
  "sexual",
  "sexy",
  "nude",
  "nudes",
  "naked",
  "condom",
  "masturbate",
  "masturbation",
  "orgasm",
  "erection",
  // slurs
  "nigger",
  "niggers",
  "nigga",
  "niggas",
  "faggot",
  "faggots",
  "fag",
  "retard",
  "retards",
  "retarded",
  // self-harm / violence
  "suicide",
  "suicidal",
  "rape",
  "raping",
  "raped",
  "rapist",
  "kill yourself",
  "kys",
  // hard drugs
  "heroin",
  "cocaine",
  "meth",
  "methamphetamine",
  "crack",
];

const NSFW_PATTERNS = [
  /\bf+[u*@#]+c+k/i, // f*ck, f**k, fuuuck
  /\bs+h+[i!1*]+t/i, // sh!t, sh*t, shiiit
  /\bb+[i!1*]+t+c+h/i, // b!tch, b*tch
  /\ba+s+\s*h+o+l+e/i, // a s s h o l e (spaced)
  /\bn+[i*!1]+g+[gae]+/i, // n-word obfuscations
];

function containsNSFW(text) {
  const lower = (text || "").toLowerCase();
  for (const word of NSFW_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(lower)) return true;
  }
  for (const pattern of NSFW_PATTERNS) {
    if (pattern.test(lower)) return true;
  }
  return false;
}

function censorText(text) {
  let result = text;
  for (const word of NSFW_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "***");
  }
  return result;
}

export { containsNSFW };
