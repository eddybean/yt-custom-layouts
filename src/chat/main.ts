import { createStyleInjector } from '../shared/custom-css';
import { countMatches, createRoleMarker, observeDom } from '../shared/marker';
import type { Message } from '../shared/messages';
import { getRole } from '../shared/selectors';
import {
  DEFAULT_CUSTOM_CSS,
  DEFAULT_SETTINGS,
  loadCustomCss,
  loadSettings,
  onCustomCssChanged,
  onSettingsChanged,
  type CustomCss,
  type Settings,
} from '../shared/settings';

/*
 * /live_chat と /live_chat_replay の iframe 内で動く。
 * チャット欄の役割の要素に目印 (data-ytcl-<役割>) を付け、<html> に class と CSS 変数を付ける。
 * 見た目は static/chat.css 側で実装する。
 */

const root = document.documentElement;
let settings: Settings = DEFAULT_SETTINGS;
let customCss: CustomCss = DEFAULT_CUSTOM_CSS;

const marker = createRoleMarker(document, 'chat');
const injectCustomCss = createStyleInjector(document, 'ytcl-custom-css');

function apply() {
  const s = settings;
  const on = s.enabled;
  root.classList.toggle('ytcl-overlay', on && s.preset === 'overlay');
  root.classList.toggle('ytcl-hide-header', on && s.hideChatHeader);
  root.classList.toggle('ytcl-hide-input', on && s.hideChatInput);
  root.classList.toggle('ytcl-hide-ticker', on && s.hideTicker);
  root.classList.toggle('ytcl-font-scaled', on && s.chatFontScale !== 1);
  root.style.setProperty('--ytcl-bg-alpha', String(s.overlayBgAlpha));
  root.style.setProperty('--ytcl-font-scale', String(s.chatFontScale));
  marker.setOverrides(s.selectors);
  marker.refresh();
  injectCustomCss(on ? customCss.chat : '');
}

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (msg.type === 'count-selector' && getRole(msg.role).scope === 'chat') {
    sendResponse(countMatches(document, msg.selector));
  }
});

apply();
loadSettings().then((s) => {
  settings = s;
  apply();
});
onSettingsChanged((s) => {
  settings = s;
  apply();
});
loadCustomCss().then((css) => {
  customCss = css;
  apply();
});
onCustomCssChanged((css) => {
  customCss = css;
  apply();
});

// メッセージの追加で DOM は頻繁に変わるので、視聴ページより間引いて追従する
observeDom(document, () => marker.refresh(), 500);
