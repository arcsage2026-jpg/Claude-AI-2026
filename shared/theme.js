export const T = {
  bg: "#191410", bg2: "#211a14", card: "#271f18", cardHi: "#2f261d",
  line: "#3a2f24", ink: "#F3EBDD", sub: "#B6A896", faint: "#8a7c6a",
  solar: "#E68A34", solarSoft: "#3a2a18",
  lunar: "#9DB8B0", lunarSoft: "#20302e",
  done: "#8FB98A",
};

export const elcolor = (e) => (e === "lunar" || e === "rest" ? T.lunar : T.solar);
export const esoft = (e) => (e === "lunar" || e === "rest" ? T.lunarSoft : T.solarSoft);
