export type PieceSet = {
  id: string;
  name: string;
  folder: string;
};

export const pieceSetStorageKey = "chesstrix.pieceSet";

const assetPieceFolders = [
  "neo",
  "modern",
  "classic",
  "club",
  "alpha",
  "book",
  "bases",
  "cases",
  "condal",
  "tournament",
  "light",
  "vintage",
  "wood",
  "neo_wood",
  "3d_staunton",
  "3d_plastic",
  "3d_wood",
  "3d_chesskid",
  "marble",
  "metal",
  "glass",
  "icy_sea",
  "sky",
  "ocean",
  "nature",
  "newspaper",
  "gothic",
  "maya",
  "dash",
  "space",
  "8_bit",
  "bubblegum",
  "graffiti",
  "lolz",
  "neon",
  "tigers",
  "game_room"
];

export const pieceSets: PieceSet[] = assetPieceFolders.map((folder) => ({
  id: `asset-${folder.replace(/_/g, "-")}`,
  folder,
  name: formatPieceSetName(folder)
}));

export function getSavedPieceSet() {
  const saved = localStorage.getItem(pieceSetStorageKey);
  return pieceSets.some((set) => set.id === saved) ? saved ?? pieceSets[0].id : pieceSets[0].id;
}

export function getPieceSet(id: string) {
  return pieceSets.find((set) => set.id === id) ?? pieceSets[0];
}

export function savePieceSet(id: string) {
  localStorage.setItem(pieceSetStorageKey, id);
  window.dispatchEvent(new CustomEvent("chesstrix:piece-set", { detail: id }));
}

function formatPieceSetName(folder: string) {
  return folder
    .split("_")
    .map((part) => (part === "3d" ? "3D" : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}
