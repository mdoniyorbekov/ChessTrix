import { useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { themes } from "../../theme/themes";
import { useTheme } from "../../theme/ThemeProvider";
import { publicAssetUrl } from "../../theme/assetPath";
import { countries, getCountryByCode } from "../../data/countries";
import { formatTimeControl, getSavedTimeControl, saveTimeControl, timeControlPresets, type TimeControl } from "../../game/timeControls";
import { getSavedPieceSet, pieceSets, savePieceSet } from "../../game/pieceSets";
import { defaultBotDraft, getCustomBots, saveCustomBot, updateCustomBot, type BotDraft, type BotGender, type BotProfile } from "../../game/bots/botProfiles";
import { Piece } from "../board/Piece";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { ThemeCard } from "./ThemeCard";
import { getSavedSettings, saveSettings } from "../../game/settings";
import "./settings.css";

const toggles = [
  "Sound",
  "Show coordinates",
  "Highlight legal moves",
  "Show evaluation bar",
  "Allow premoves",
  "Board arrows",
  "Flip board"
];

export function SettingsScreen() {
  const { theme, setThemeId } = useTheme();
  const [timeControl, setTimeControl] = useState<TimeControl>(getSavedTimeControl);
  const [pieceSet, setPieceSet] = useState(getSavedPieceSet);
  const [customMinutes, setCustomMinutes] = useState(String(timeControl.minutes));
  const [customIncrement, setCustomIncrement] = useState(String(timeControl.incrementSeconds));
  const [bots, setBots] = useState<BotProfile[]>(getCustomBots);
  const [botDraft, setBotDraft] = useState<BotDraft>(defaultBotDraft);
  const [botEditorOpen, setBotEditorOpen] = useState(false);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, boolean>>(getSavedSettings);

  const update = (key: string) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    saveSettings(next);
  };

  const chooseTimeControl = (control: TimeControl) => {
    setTimeControl(control);
    setCustomMinutes(String(control.minutes));
    setCustomIncrement(String(control.incrementSeconds));
    saveTimeControl(control);
  };

  const saveCustomTimeControl = () => {
    const minutes = Math.max(1, Math.min(180, Number(customMinutes) || 10));
    const incrementSeconds = Math.max(0, Math.min(120, Number(customIncrement) || 0));
    chooseTimeControl({
      id: `custom-${minutes}-${incrementSeconds}`,
      name: `Custom ${minutes}+${incrementSeconds}`,
      minutes,
      incrementSeconds
    });
  };

  const choosePieceSet = (id: string) => {
    setPieceSet(id);
    savePieceSet(id);
  };

  const updateBotDraft = <K extends keyof BotDraft>(key: K, value: BotDraft[K]) => {
    setBotDraft((current) => ({ ...current, [key]: value }));
  };

  const chooseBotCountry = (code: string) => {
    const country = getCountryByCode(code);
    setBotDraft((current) => ({ ...current, countryCode: country.code, countryName: country.name }));
  };

  const chooseAvatar = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateBotDraft("avatarDataUrl", String(reader.result));
    reader.readAsDataURL(file);
  };

  const openCreateBot = () => {
    setEditingBotId(null);
    setBotDraft(defaultBotDraft);
    setBotEditorOpen(true);
  };

  const openEditBot = (bot: BotProfile) => {
    const { id: _id, ...draft } = bot;
    setEditingBotId(bot.id);
    setBotDraft(draft);
    setBotEditorOpen(true);
  };

  const closeBotEditor = () => {
    setEditingBotId(null);
    setBotDraft(defaultBotDraft);
    setBotEditorOpen(false);
  };

  const saveBot = () => {
    if (editingBotId) {
      updateCustomBot(editingBotId, botDraft);
    } else {
      saveCustomBot(botDraft);
    }
    setBots(getCustomBots());
    closeBotEditor();
  };

  return (
    <div className="settings-screen">
      <section className="settings-main">
        <section className="settings-section">
          <h2>Boards</h2>
          <div className="settings-grid">
            {themes.map((item) => (
              <ThemeCard key={item.id} theme={item} selected={item.id === theme.id} onSelect={() => setThemeId(item.id)} />
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h2>Pieces</h2>
          <div className="settings-grid">
            {pieceSets.map((set) => (
              <Card key={set.id} className={`theme-card piece-style-card ${set.id === pieceSet ? "theme-card--selected" : ""}`}>
                <div className="piece-style-card__preview">
                  <Piece color="w" type="k" size={42} pieceSetOverride={set.id} />
                  <Piece color="b" type="q" size={42} pieceSetOverride={set.id} />
                </div>
                <div>
                  <h3>{set.name}</h3>
                  <p>Piece style</p>
                </div>
                <Button variant={set.id === pieceSet ? "primary" : "secondary"} icon={set.id === pieceSet ? <Check /> : undefined} onClick={() => choosePieceSet(set.id)}>
                  {set.id === pieceSet ? "Selected" : "Select"}
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <Card>
          <div className="bot-manager__header">
            <div>
              <h2>Bots</h2>
              <p>{bots.length ? `${bots.length} custom bot${bots.length === 1 ? "" : "s"}` : "No custom bots yet."}</p>
            </div>
            <Button icon={<Plus />} onClick={openCreateBot}>Create Bot</Button>
          </div>

          <div className="saved-bot-list">
            {bots.length ? bots.map((bot) => (
              <div key={bot.id} className={editingBotId === bot.id ? "saved-bot-list__item active" : "saved-bot-list__item"}>
                {bot.avatarDataUrl ? <img src={bot.avatarDataUrl} alt="" /> : <span>{bot.name.slice(0, 2).toUpperCase()}</span>}
                <div>
                  <strong>{bot.name}</strong>
                  <small>
                    <img className="bot-country-flag" src={publicAssetUrl(getCountryByCode(bot.countryCode).flagPath)} alt="" />
                    {bot.elo} Elo - {getCountryByCode(bot.countryCode).name} - {bot.style}
                  </small>
                </div>
                <Button variant="ghost" icon={<Pencil />} onClick={() => openEditBot(bot)}>Edit</Button>
              </div>
            )) : <p>No custom bots yet.</p>}
          </div>

          {botEditorOpen && (
            <div className="bot-editor-panel">
              <div className="bot-editor-panel__header">
                <h3>{editingBotId ? "Edit Bot" : "Create Bot"}</h3>
                <Button variant="ghost" icon={<X />} onClick={closeBotEditor}>Cancel</Button>
              </div>
              <div className="bot-builder">
                <label>
                  Name
                  <input value={botDraft.name} onChange={(event) => updateBotDraft("name", event.target.value)} />
                </label>
                <label>
                  Gender
                  <select value={botDraft.gender} onChange={(event) => updateBotDraft("gender", event.target.value as BotGender)}>
                    <option value="other">Other</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </label>
                <label>
                  Country
                  <select value={botDraft.countryCode} onChange={(event) => chooseBotCountry(event.target.value)}>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Elo rating
                  <input type="number" min="1320" max="3190" value={botDraft.elo} onChange={(event) => updateBotDraft("elo", Number(event.target.value))} />
                </label>
                <label>
                  Skill level
                  <input type="number" min="0" max="20" value={botDraft.skillLevel} onChange={(event) => updateBotDraft("skillLevel", Number(event.target.value))} />
                </label>
                <label>
                  Move time ms
                  <input type="number" min="100" max="5000" step="100" value={botDraft.moveTimeMs} onChange={(event) => updateBotDraft("moveTimeMs", Number(event.target.value))} />
                </label>
                <label>
                  Blunder chance
                  <input type="number" min="0" max="0.5" step="0.01" value={botDraft.blunderChance} onChange={(event) => updateBotDraft("blunderChance", Number(event.target.value))} />
                </label>
                <label>
                  Style
                  <input value={botDraft.style} onChange={(event) => updateBotDraft("style", event.target.value)} />
                </label>
                <label>
                  Description
                  <textarea value={botDraft.description} onChange={(event) => updateBotDraft("description", event.target.value)} />
                </label>
                <label>
                  Avatar
                  <input type="file" accept="image/*" onChange={(event) => chooseAvatar(event.target.files?.[0])} />
                </label>
                <div className="bot-builder__preview">
                  {botDraft.avatarDataUrl ? <img src={botDraft.avatarDataUrl} alt="" /> : <span>{botDraft.name.slice(0, 2).toUpperCase()}</span>}
                  <div>
                    <strong>{botDraft.name}</strong>
                    <small>
                      <img className="bot-country-flag" src={publicAssetUrl(getCountryByCode(botDraft.countryCode).flagPath)} alt="" />
                      {botDraft.elo} Elo - {getCountryByCode(botDraft.countryCode).name} - {botDraft.style}
                    </small>
                  </div>
                </div>
                <Button onClick={saveBot}>{editingBotId ? "Save Changes" : "Add Bot"}</Button>
              </div>
            </div>
          )}
        </Card>

      </section>

      <section className="settings-side">
        <Card>
          <h2>Board Preview</h2>
          <div
            className={`board-preview ${theme.boardImage ? "board-preview--image" : ""}`}
            style={theme.boardImage ? { backgroundImage: `url("${publicAssetUrl(theme.boardImage)}")` } : undefined}
          >
            {!theme.boardImage && Array.from({ length: 64 }).map((_, index) => <span key={index} />)}
          </div>
        </Card>
        <Card>
          <h2>Preferences</h2>
          <div className="toggle-list">
            {toggles.map((toggle) => (
              <label key={toggle} className="toggle-row">
                <span>{toggle}</span>
                <input type="checkbox" checked={Boolean(settings[toggle])} onChange={() => update(toggle)} />
              </label>
            ))}
          </div>
        </Card>
        <Card>
          <h2>Time Control</h2>
          <div className="time-settings">
            <Badge>{timeControl.name}</Badge>
            <div className="time-preset-grid">
              {timeControlPresets.map((preset) => (
                <button key={preset.id} className={preset.id === timeControl.id ? "active" : ""} onClick={() => chooseTimeControl(preset)}>
                  {formatTimeControl(preset)}
                </button>
              ))}
            </div>
            <div className="custom-time-row">
              <label>
                Minutes
                <input type="number" min="1" max="180" value={customMinutes} onChange={(event) => setCustomMinutes(event.target.value)} />
              </label>
              <label>
                Increment
                <input type="number" min="0" max="120" value={customIncrement} onChange={(event) => setCustomIncrement(event.target.value)} />
              </label>
            </div>
            <Button variant="secondary" onClick={saveCustomTimeControl}>Save Custom</Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
