import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged, type Settings } from '../shared/settings';

/*
 * /live_chat と /live_chat_replay の iframe 内で動く。
 * 見た目は static/chat.css 側で、ここでは <html> に class と CSS 変数を付けるだけ。
 */

const root = document.documentElement;

function apply(s: Settings) {
  const on = s.enabled;
  root.classList.toggle('ytcl-overlay', on && s.preset === 'overlay');
  root.classList.toggle('ytcl-hide-header', on && s.hideChatHeader);
  root.classList.toggle('ytcl-hide-input', on && s.hideChatInput);
  root.classList.toggle('ytcl-hide-ticker', on && s.hideTicker);
  root.classList.toggle('ytcl-font-scaled', on && s.chatFontScale !== 1);
  root.style.setProperty('--ytcl-bg-alpha', String(s.overlayBgAlpha));
  root.style.setProperty('--ytcl-font-scale', String(s.chatFontScale));
}

apply(DEFAULT_SETTINGS);
loadSettings().then(apply);
onSettingsChanged(apply);
