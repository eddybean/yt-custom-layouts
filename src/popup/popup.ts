import type { Message } from '../shared/messages';
import {
  DEFAULT_OVERLAY,
  PRESETS,
  SLOT_PRESETS,
  loadSettings,
  saveSettings,
  type PresetId,
  type Settings,
} from '../shared/settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const enabled = $<HTMLInputElement>('enabled');
const presetList = $<HTMLDivElement>('presets');
const chatWidth = $<HTMLInputElement>('chatWidth');
const chatWidthValue = $<HTMLOutputElement>('chatWidthValue');
const chatHeight = $<HTMLInputElement>('chatHeight');
const chatHeightValue = $<HTMLOutputElement>('chatHeightValue');
const bgAlpha = $<HTMLInputElement>('bgAlpha');
const bgAlphaValue = $<HTMLOutputElement>('bgAlphaValue');
const fontScale = $<HTMLInputElement>('fontScale');
const fontScaleValue = $<HTMLOutputElement>('fontScaleValue');
const hideHeader = $<HTMLInputElement>('hideHeader');
const hideInput = $<HTMLInputElement>('hideInput');
const hideTicker = $<HTMLInputElement>('hideTicker');

const labelWidth = (px: number) => (px === 0 ? '既定' : `${px}px`);
const labelPx = (px: number) => `${px}px`;
const labelPercent = (v: number) => `${Math.round(v * 100)}%`;

function renderPresets(current: PresetId) {
  presetList.replaceChildren(
    ...PRESETS.map((p) => {
      const label = document.createElement('label');
      label.className = 'preset';
      label.title = p.description;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'preset';
      input.value = p.id;
      input.checked = p.id === current;
      input.addEventListener('change', () => void saveSettings({ preset: p.id }).then(render));
      const text = document.createElement('span');
      text.textContent = p.label;
      label.append(input, text);
      return label;
    }),
  );
}

function render(s: Settings) {
  enabled.checked = s.enabled;
  renderPresets(s.preset);
  chatWidth.value = String(s.chatWidth);
  chatWidthValue.value = labelWidth(s.chatWidth);
  chatWidth.disabled = s.preset === 'overlay';
  chatHeight.value = String(s.chatHeight);
  chatHeightValue.value = labelPx(s.chatHeight);
  chatHeight.disabled = !SLOT_PRESETS.includes(s.preset);
  bgAlpha.value = String(Math.round(s.overlayBgAlpha * 100));
  bgAlphaValue.value = labelPercent(s.overlayBgAlpha);
  fontScale.value = String(Math.round(s.chatFontScale * 100));
  fontScaleValue.value = labelPercent(s.chatFontScale);
  hideHeader.checked = s.hideChatHeader;
  hideInput.checked = s.hideChatInput;
  hideTicker.checked = s.hideTicker;
}

// スライダーは表示だけ input で更新し、保存は change で行う（storage.sync の書き込み回数制限対策）
function bindRange(
  input: HTMLInputElement,
  output: HTMLOutputElement,
  toValue: (raw: number) => number,
  toLabel: (v: number) => string,
  save: (v: number) => Partial<Settings>,
) {
  input.addEventListener('input', () => (output.value = toLabel(toValue(Number(input.value)))));
  input.addEventListener('change', () => void saveSettings(save(toValue(Number(input.value)))));
}

bindRange(chatWidth, chatWidthValue, (v) => v, labelWidth, (v) => ({ chatWidth: v }));
bindRange(chatHeight, chatHeightValue, (v) => v, labelPx, (v) => ({ chatHeight: v }));
bindRange(bgAlpha, bgAlphaValue, (v) => v / 100, labelPercent, (v) => ({ overlayBgAlpha: v }));
bindRange(fontScale, fontScaleValue, (v) => v / 100, labelPercent, (v) => ({ chatFontScale: v }));

enabled.addEventListener('change', () => void saveSettings({ enabled: enabled.checked }));
hideHeader.addEventListener('change', () => void saveSettings({ hideChatHeader: hideHeader.checked }));
hideInput.addEventListener('change', () => void saveSettings({ hideChatInput: hideInput.checked }));
hideTicker.addEventListener('change', () => void saveSettings({ hideTicker: hideTicker.checked }));

$('openOptions').addEventListener('click', () => void chrome.runtime.openOptionsPage());
$('resetOverlay').addEventListener('click', () => void saveSettings({ overlay: DEFAULT_OVERLAY }));
$('toggleChat').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id !== undefined) {
    const msg: Message = { type: 'toggle-chat' };
    chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
  }
});

loadSettings().then(render);
