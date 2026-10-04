import type { Message } from '../shared/messages';
import { FLEXY_ATTR, FLEXY_WATCHED_ATTRS, SEL } from '../shared/selectors';
import {
  DEFAULT_OVERLAY,
  DEFAULT_SETTINGS,
  PRESETS,
  SLOT_PRESETS,
  loadSettings,
  onSettingsChanged,
  saveSettings,
  type OverlayRect,
  type Settings,
} from '../shared/settings';
import { clampRect, createOverlayHandles } from './overlay';
import { createChatSlot } from './slot';

/*
 * レイアウトは static/content.css 側で実装し、ここでは <html> に
 *   - ytcl-preset-<id>   : 適用中のプリセット
 *   - ytcl-chat-width    : チャット幅を上書きするか
 *   - ytcl-chat-open     : チャットが開いているか（ytd-watch-flexy の属性から転記）
 *   - ytcl-slot-ready    : 差し込み枠を置けたか（置けないときはチャットを動かさない）
 * の class と CSS 変数 (--ytcl-*) を付けるだけにする。
 */

const root = document.documentElement;
let settings: Settings = DEFAULT_SETTINGS;
let flexy: Element | null = null;

const chatSlot = createChatSlot();

const flexyObserver = new MutationObserver(() => {
  syncChatOpen();
  placeSlot();
  scheduleRelayout();
});

let relayoutTimer: number | undefined;
/** レイアウトを変えた後はプレイヤーに動画サイズを再計算させる */
function scheduleRelayout() {
  clearTimeout(relayoutTimer);
  relayoutTimer = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
}

function setOverlayVars(r: OverlayRect) {
  root.style.setProperty('--ytcl-ov-x', `${r.x}vw`);
  root.style.setProperty('--ytcl-ov-y', `${r.y}vh`);
  root.style.setProperty('--ytcl-ov-w', `${r.w}vw`);
  root.style.setProperty('--ytcl-ov-h', `${r.h}vh`);
}

function applySettings(next: Settings) {
  settings = next;
  const on = next.enabled;
  for (const p of PRESETS) {
    root.classList.toggle(`ytcl-preset-${p.id}`, on && next.preset === p.id && p.id !== 'default');
  }
  root.classList.toggle('ytcl-chat-width', on && next.preset !== 'overlay' && next.chatWidth > 0);
  root.style.setProperty('--ytcl-chat-width', `${next.chatWidth}px`);
  root.style.setProperty('--ytcl-chat-height', `${next.chatHeight}px`);
  setOverlayVars(next.overlay);
  placeSlot();
  scheduleRelayout();
}

function placeSlot() {
  const wanted = settings.enabled && SLOT_PRESETS.includes(settings.preset);
  root.classList.toggle('ytcl-slot-ready', wanted && chatSlot.place(settings.preset));
  if (!wanted) chatSlot.place('default');
}

function syncChatOpen() {
  root.classList.toggle('ytcl-chat-open', !!flexy?.hasAttribute(FLEXY_ATTR.chatOpen));
}

/** SPA 遷移で ytd-watch-flexy が後から生成されるため、遷移のたびに付け直す */
function attachFlexy() {
  const el = document.querySelector(SEL.watchFlexy);
  if (el && el !== flexy) {
    flexyObserver.disconnect();
    flexy = el;
    flexyObserver.observe(el, { attributes: true, attributeFilter: FLEXY_WATCHED_ATTRS });
  }
  syncChatOpen();
  placeSlot();
  handles.mount();
  scheduleRelayout();
}

const handles = createOverlayHandles({
  getRect: () => settings.overlay,
  onChange: setOverlayVars,
  onCommit: (rect) => {
    settings = { ...settings, overlay: rect };
    void saveSettings({ overlay: rect });
  },
  onReset: () => void saveSettings({ overlay: DEFAULT_OVERLAY }),
});

function toggleChat() {
  document.querySelector<HTMLElement>(SEL.chatToggleButton)?.click();
}

chrome.runtime.onMessage.addListener((msg: Message) => {
  if (msg.type === 'toggle-chat') toggleChat();
});

applySettings(DEFAULT_SETTINGS);
loadSettings().then(applySettings);
onSettingsChanged(applySettings);

document.addEventListener('yt-navigate-finish', attachFlexy);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachFlexy, { once: true });
} else {
  attachFlexy();
}

// ウィンドウサイズが変わっても % 指定なので位置は追従する。はみ出しだけ補正する
window.addEventListener('resize', () => setOverlayVars(clampRect(settings.overlay)));
