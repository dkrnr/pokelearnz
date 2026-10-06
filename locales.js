/** EN/SI/TA scaffold. Draft strings are gated pending human review. */
export const languages = {
  en: { label: "English", speech: "en", reviewed: true },
  si: { label: "සිංහල · draft", speech: "si-LK", reviewed: false },
  ta: { label: "தமிழ் · draft", speech: "ta-LK", reviewed: false },
};
export const en = {
  play: "Play",
  ask: "Ask",
  listen: "Listen",
  done: "Done for now",
  retry: "Try again",
};
export const si = {
  play: "සෙල්ලම් කරමු",
  ask: "අසන්න",
  listen: "අහන්න",
  done: "දැනට අවසන්",
  retry: "නැවත උත්සාහ කරන්න",
};
export const ta = {
  play: "விளையாடு",
  ask: "கேள்",
  listen: "கேள்",
  done: "இப்போதைக்கு முடிந்தது",
  retry: "மீண்டும் முயற்சி செய்",
};
export function translate(key, language = "en") {
  return languages[language]?.reviewed
    ? ({ en, si, ta }[language][key] ?? en[key])
    : en[key];
}
