export const PICKER_STYLE = `
:host { color-scheme: dark; }
.boxes { position: absolute; inset: 0; }
.box {
  position: absolute;
  box-sizing: border-box;
  background: rgba(62, 166, 255, 0.18);
  outline: 2px solid #3ea6ff;
}
.box.picked { outline: 2px dashed #ffd166; }
.box.unmatched { background: transparent; }
.box[data-label]:not([data-label=""])::after {
  content: attr(data-label);
  position: absolute;
  left: 0;
  top: -20px;
  padding: 1px 6px;
  font: 12px/18px ui-monospace, Consolas, monospace;
  color: #fff;
  background: #3ea6ff;
  border-radius: 3px;
  white-space: nowrap;
}
.panel {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: 440px;
  max-height: 60vh;
  overflow: auto;
  box-sizing: border-box;
  padding: 12px 14px;
  pointer-events: auto;
  font: 13px/1.5 system-ui, sans-serif;
  color: #f1f1f1;
  background: rgba(33, 33, 33, 0.97);
  border: 1px solid #3a3a3a;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}
.panel.left { right: auto; left: 16px; }
.title { font-weight: 600; font-size: 14px; }
.hint { color: #aaa; margin: 4px 0 8px; }
.cands { list-style: none; margin: 0 0 8px; padding: 0; }
.cands li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
}
.cands li:hover { background: #303030; }
.cands li.selected { background: #263850; }
code { font: 12px/1.6 ui-monospace, Consolas, monospace; word-break: break-all; }
.n, .count { white-space: nowrap; font-variant-numeric: tabular-nums; }
.good { color: #6fcf97; }
.warn { color: #ffd166; }
.bad { color: #ff6b6b; }
.edit { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.edit[hidden] { display: none; }
.sel {
  flex: 1;
  min-width: 0;
  padding: 5px 8px;
  font: 12px ui-monospace, Consolas, monospace;
  color: inherit;
  background: #121212;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
}
.buttons { display: flex; gap: 6px; align-items: center; }
.spacer { flex: 1; }
button {
  padding: 5px 10px;
  font: inherit;
  color: inherit;
  background: #303030;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  cursor: pointer;
}
button[hidden] { display: none; }
button:disabled { opacity: 0.4; cursor: default; }
button.primary { background: #3ea6ff; border-color: #3ea6ff; color: #0f0f0f; font-weight: 600; }
`;
