export type ThemeDefinition = {
  id: string;
  name: string;
  background: string;
  panel: string;
  card: string;
  border: string;
  accent: string;
  accentHover: string;
  text: string;
  muted: string;
  disabled: string;
  boardLight: string;
  boardDark: string;
  boardImage?: string;
  selected: string;
  lastMove: string;
  legal: string;
  check: string;
  danger: string;
  info: string;
};

type BoardThemeSeed = {
  id: string;
  name: string;
  file: string;
  accent: string;
  boardLight: string;
  boardDark: string;
};

const boardThemeSeeds: BoardThemeSeed[] = [
  { id: "green", name: "Green", file: "green.png", accent: "#8EBB56", boardLight: "#EEEED2", boardDark: "#769656" },
  { id: "brown", name: "Brown", file: "brown.png", accent: "#B58863", boardLight: "#F0D9B5", boardDark: "#B58863" },
  { id: "blue", name: "Blue", file: "blue.png", accent: "#6C8EAD", boardLight: "#D8EAF3", boardDark: "#6C8EAD" },
  { id: "tan", name: "Tan", file: "tan.png", accent: "#C7A06A", boardLight: "#F3E0C4", boardDark: "#C7A06A" },
  { id: "light", name: "Light", file: "light.png", accent: "#A7B2C2", boardLight: "#EEF1F4", boardDark: "#B7C0CC" },
  { id: "sky", name: "Sky", file: "sky.png", accent: "#7DB7D8", boardLight: "#E0F2FA", boardDark: "#83B9D7" },
  { id: "purple", name: "Purple", file: "purple.png", accent: "#8B6BC4", boardLight: "#DCCDF3", boardDark: "#8B6BC4" },
  { id: "red", name: "Red", file: "red.png", accent: "#B45A5A", boardLight: "#E9C6C3", boardDark: "#B45A5A" },
  { id: "orange", name: "Orange", file: "orange.png", accent: "#D08A3D", boardLight: "#F2D1A4", boardDark: "#D08A3D" },
  { id: "walnut", name: "Walnut", file: "walnut.png", accent: "#A87A4B", boardLight: "#D8B98B", boardDark: "#7A4C2E" },
  { id: "burled-wood", name: "Burled Wood", file: "burled_wood.png", accent: "#B98342", boardLight: "#E2B979", boardDark: "#7A4327" },
  { id: "dark-wood", name: "Dark Wood", file: "dark_wood.png", accent: "#9B6A42", boardLight: "#C09A6A", boardDark: "#4A2B1F" },
  { id: "tournament", name: "Tournament", file: "tournament.png", accent: "#7CA35A", boardLight: "#E7E6C8", boardDark: "#6E8F4E" },
  { id: "marble", name: "Marble", file: "marble.png", accent: "#98A2B3", boardLight: "#ECEFF4", boardDark: "#9AA4B2" },
  { id: "stone", name: "Stone", file: "stone.png", accent: "#8D98A5", boardLight: "#D8D9D5", boardDark: "#7B8184" },
  { id: "metal", name: "Metal", file: "metal.png", accent: "#A8B0BD", boardLight: "#D9DEE5", boardDark: "#7D8795" },
  { id: "glass", name: "Glass", file: "glass.png", accent: "#8EC5D7", boardLight: "#DCEBF0", boardDark: "#83AEBB" },
  { id: "icy-sea", name: "Icy Sea", file: "icy_sea.png", accent: "#83BFD6", boardLight: "#E2F1F4", boardDark: "#6DA7BF" },
  { id: "sand", name: "Sand", file: "sand.png", accent: "#C7A45F", boardLight: "#EAD8B3", boardDark: "#B98B4D" },
  { id: "parchment", name: "Parchment", file: "parchment.png", accent: "#B99A63", boardLight: "#EAD7AA", boardDark: "#A57A42" },
  { id: "newspaper", name: "Newspaper", file: "newspaper.png", accent: "#9AA0A6", boardLight: "#E9E6DA", boardDark: "#A5A19A" },
  { id: "bases", name: "Bases", file: "bases.png", accent: "#8F9DB7", boardLight: "#D8DDEA", boardDark: "#7885A0" },
  { id: "dash", name: "Dash", file: "dash.png", accent: "#6FA7BA", boardLight: "#DAE9ED", boardDark: "#6599AA" },
  { id: "translucent", name: "Translucent", file: "translucent.png", accent: "#8AA4B8", boardLight: "#DCE6EE", boardDark: "#7F96A8" },
  { id: "overlay", name: "Overlay", file: "overlay.png", accent: "#9BA7B8", boardLight: "#E4E8ED", boardDark: "#8A97A8" },
  { id: "8-bit", name: "8 Bit", file: "8_bit.png", accent: "#7AA84F", boardLight: "#D7D8A8", boardDark: "#6A8B43" },
  { id: "bubblegum", name: "Bubblegum", file: "bubblegum.png", accent: "#DB7CAA", boardLight: "#F5C8DE", boardDark: "#C96B9B" },
  { id: "graffiti", name: "Graffiti", file: "graffiti.png", accent: "#DBA33A", boardLight: "#D6D0A8", boardDark: "#7A6D63" },
  { id: "lolz", name: "Lolz", file: "lolz.png", accent: "#D19E43", boardLight: "#F0D079", boardDark: "#7EA95A" },
  { id: "neon", name: "Neon", file: "neon.png", accent: "#00D9FF", boardLight: "#263445", boardDark: "#101820" }
];

function makeBoardTheme(seed: BoardThemeSeed): ThemeDefinition {
  return {
    id: `board-${seed.id}`,
    name: seed.name,
    background: "#07142C",
    panel: "#111F3D",
    card: "#17294D",
    border: "#263A66",
    accent: seed.accent,
    accentHover: "#E0B342",
    text: "#FFFFFF",
    muted: "#AEB8D0",
    disabled: "#64708A",
    boardLight: seed.boardLight,
    boardDark: seed.boardDark,
    boardImage: `chess-assets/boards/${seed.file}`,
    selected: "#F6F669",
    lastMove: "#CDD26A",
    legal: "#7FAE6A",
    check: "#D95C5C",
    danger: "#D95C5C",
    info: "#60A5FA"
  };
}

export const themes: ThemeDefinition[] = boardThemeSeeds.map(makeBoardTheme);

export const defaultTheme = themes[0];

export function findTheme(id: string | null) {
  return themes.find((theme) => theme.id === id) ?? defaultTheme;
}
