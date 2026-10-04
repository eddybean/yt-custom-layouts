import type { Message } from './shared/messages';
import { PRESETS, loadSettings, saveSettings } from './shared/settings';

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'cycle-preset') {
    const { preset } = await loadSettings();
    const ids = PRESETS.map((p) => p.id);
    await saveSettings({ preset: ids[(ids.indexOf(preset) + 1) % ids.length] });
  } else if (command === 'toggle-chat') {
    const target = tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (target?.id !== undefined) {
      const msg: Message = { type: 'toggle-chat' };
      // YouTube 以外のタブではコンテンツスクリプトがいないので失敗を無視する
      chrome.tabs.sendMessage(target.id, msg).catch(() => {});
    }
  }
});
