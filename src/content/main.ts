import { createStyleInjector } from '../shared/custom-css';
import { countMatches, createRoleMarker, observeDom } from '../shared/marker';
import type { Message } from '../shared/messages';
import { STATE_ATTRS, getRole } from '../shared/selectors';
import {
  DEFAULT_CUSTOM_CSS,
  DEFAULT_OVERLAY,
  DEFAULT_SETTINGS,
  PRESETS,
  loadCustomCss,
  loadSettings,
  onCustomCssChanged,
  onSettingsChanged,
  saveSelector,
  saveSettings,
  type CustomCss,
  type OverlayRect,
  type Settings,
} from '../shared/settings';
import { clampRect, createOverlayHandles } from './overlay';
import { createPicker } from './picker';
import { createChatSlot, type SlotTarget } from './slot';

/*
 * レイアウトは static/content.css 側で実装する。ここでは
 *   - YouTube の要素に役割の目印 (data-ytcl-<役割>) を付ける（src/shared/marker.ts）
 *   - <html> に class と CSS 変数 (--ytcl-*) を付ける
 *       ytcl-preset-<id>  : 適用中のプリセット
 *       ytcl-s-<状態>     : 視聴ページの状態（STATE_ATTRS を転記）
 *       ytcl-chat-width   : チャット幅を上書きするか
 *       ytcl-slot-ready   : 差し込み枠を置けたか（置けないときはチャットを動かさない）
 * だけを行う。
 */

const root = document.documentElement;
let settings: Settings = DEFAULT_SETTINGS;
let customCss: CustomCss = DEFAULT_CUSTOM_CSS;
let watch: Element | null = null;

const marker = createRoleMarker(document, 'page');
const chatSlot = createChatSlot();
const injectCustomCss = createStyleInjector(document, 'ytcl-custom-css');

const watchObserver = new MutationObserver(() => {
  syncState();
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
  marker.setOverrides(next.selectors);
  refresh();
  applyCustomCss();
  scheduleRelayout();
}

function applyCustomCss() {
  injectCustomCss(settings.enabled ? customCss.page : '');
}

function syncState() {
  for (const [name, attr] of Object.entries(STATE_ATTRS)) {
    root.classList.toggle(`ytcl-s-${name}`, !!watch?.hasAttribute(attr));
  }
}

function slotTarget(): SlotTarget | null {
  if (!settings.enabled) return null;
  if (settings.preset === 'above-comments') return { el: marker.first('description'), where: 'after' };
  if (settings.preset === 'above-related') return { el: marker.first('related'), where: 'before' };
  return null;
}

/**
 * 役割の目印を付け直し、それに依存する処理をまとめて行う。
 * SPA 遷移や YouTube の再描画で要素が入れ替わっても、DOM の変化のたびに追従する。
 */
function refresh() {
  marker.refresh();
  const el = marker.first('watch');
  if (el !== watch) {
    watchObserver.disconnect();
    watch = el;
    if (el) watchObserver.observe(el, { attributes: true, attributeFilter: Object.values(STATE_ATTRS) });
    scheduleRelayout();
  }
  syncState();
  root.classList.toggle('ytcl-slot-ready', chatSlot.place(slotTarget()));
  handles.mount();
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

const picker = createPicker({
  getSelector: (role) => settings.selectors[role] ?? getRole(role).defaultSelector,
  getChatFrame: () => {
    const frames = [...(marker.first('chat')?.querySelectorAll('iframe') ?? []), ...document.querySelectorAll('iframe')];
    return frames.find((f) => {
      try {
        return f.contentWindow?.location.pathname.startsWith('/live_chat') ?? false;
      } catch {
        return false;
      }
    }) ?? null;
  },
  onDone: async (role, selector) => {
    // 既定と同じなら上書きとして保存しない
    if (selector !== null) await saveSelector(role, selector === getRole(role).defaultSelector ? '' : selector);
    const msg: Message = { type: 'picker-done', role, selector };
    // 設定画面が開いていなければ受け手がいないので失敗を無視する
    chrome.runtime.sendMessage(msg).catch(() => {});
  },
});

function toggleChat() {
  const el = marker.first('chat-toggle');
  const button = el?.matches('button') ? el : (el?.querySelector('button') ?? el);
  (button as HTMLElement | null)?.click();
}

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (msg.type === 'toggle-chat') toggleChat();
  else if (msg.type === 'start-picker') picker.start(msg.role);
  else if (msg.type === 'count-selector' && getRole(msg.role).scope === 'page') {
    sendResponse(countMatches(document, msg.selector));
  }
});

applySettings(DEFAULT_SETTINGS);
loadSettings().then(applySettings);
onSettingsChanged(applySettings);
loadCustomCss().then((css) => {
  customCss = css;
  applyCustomCss();
});
onCustomCssChanged((css) => {
  customCss = css;
  applyCustomCss();
});

observeDom(document, refresh, 150);
document.addEventListener('yt-navigate-finish', refresh);

// ウィンドウサイズが変わっても % 指定なので位置は追従する。はみ出しだけ補正する
window.addEventListener('resize', () => setOverlayVars(clampRect(settings.overlay)));
