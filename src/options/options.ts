import type { CountResult, Message } from '../shared/messages';
import { ROLES, type RoleDef, type RoleId } from '../shared/selectors';
import {
  loadCustomCss,
  loadSettings,
  onSettingsChanged,
  saveCustomCss,
  saveSelector,
  saveSettings,
  type SelectorOverrides,
} from '../shared/settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const rolesEl = $<HTMLDivElement>('roles');
const targetTab = $<HTMLSpanElement>('targetTab');
const cssPage = $<HTMLTextAreaElement>('cssPage');
const cssChat = $<HTMLTextAreaElement>('cssChat');
const cssStatus = $<HTMLSpanElement>('cssStatus');

/** 一致数の確認とピッカーの対象にする YouTube の視聴ページのタブ（最後に使ったもの） */
let target: chrome.tabs.Tab | undefined;

interface RoleRow {
  role: RoleDef;
  input: HTMLInputElement;
  count: HTMLSpanElement;
  pick: HTMLButtonElement;
}
const rows = new Map<RoleId, RoleRow>();

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElement & HTMLInputElement & HTMLButtonElement> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node: HTMLElementTagNameMap[K] = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

function buildRoles() {
  const groups: [string, RoleDef[]][] = [
    ['視聴ページ', ROLES.filter((r) => r.scope === 'page')],
    ['チャット欄（iframe の中。チャットを表示した状態で確認できます）', ROLES.filter((r) => r.scope === 'chat')],
  ];
  for (const [label, roles] of groups) {
    rolesEl.append(el('div', { className: 'group' }, label));
    for (const role of roles) {
      const id = role.id as RoleId;
      const input = el('input', { className: 'sel', placeholder: role.defaultSelector, spellcheck: false });
      const count = el('span', { className: 'count' });
      const pick = el('button', { type: 'button' }, 'ページから選ぶ');
      const reset = el('button', { type: 'button' }, '既定に戻す');
      rolesEl.append(
        el(
          'div',
          { className: 'role' },
          el('div', { className: 'role-head' }, el('strong', {}, role.label), el('span', { className: 'hint' }, role.hint)),
          el('div', { className: 'role-body' }, input, count, pick, reset),
        ),
      );
      rows.set(id, { role, input, count, pick });

      let timer: number | undefined;
      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = window.setTimeout(() => updateCount(id), 300);
      });
      // 既定値と同じなら上書きとして保存しない
      input.addEventListener('change', () => {
        const value = input.value.trim();
        void saveSelector(id, value === role.defaultSelector ? '' : value);
      });
      reset.addEventListener('click', () => void saveSelector(id, ''));
      pick.addEventListener('click', () => void startPicker(id));
    }
  }
}

function renderSelectors(overrides: SelectorOverrides) {
  for (const [id, row] of rows) {
    // 入力中の欄は書き換えない
    if (document.activeElement !== row.input) row.input.value = overrides[id] ?? '';
    row.input.classList.toggle('overridden', !!overrides[id]);
    void updateCount(id);
  }
}

async function findTarget() {
  const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/watch*' });
  tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  target = tabs[0];
  targetTab.textContent = target
    ? `確認対象のタブ: ${target.title}`
    : 'YouTube の視聴ページが開かれていません。一致数の確認と「ページから選ぶ」には、視聴ページを開いてください。';
  for (const row of rows.values()) row.pick.disabled = !target;
}

async function updateCount(id: RoleId) {
  const row = rows.get(id)!;
  const selector = row.input.value.trim() || row.role.defaultSelector;
  let result: CountResult | undefined;
  if (target?.id !== undefined) {
    const msg: Message = { type: 'count-selector', role: id, selector };
    result = await chrome.tabs.sendMessage<Message, CountResult>(target.id, msg).catch(() => undefined);
  }
  if (!result) {
    row.count.className = 'count';
    row.count.textContent = '確認できません';
  } else if (!result.valid) {
    row.count.className = 'count bad';
    row.count.textContent = 'セレクタが不正';
  } else {
    const n = result.count;
    row.count.className = `count ${n === 0 ? 'bad' : row.role.single && n > 1 ? 'warn' : 'good'}`;
    row.count.textContent = `${n}件に一致`;
  }
}

async function recountAll() {
  await findTarget();
  for (const id of rows.keys()) void updateCount(id);
}

async function startPicker(role: RoleId) {
  await findTarget();
  if (target?.id === undefined) return;
  const msg: Message = { type: 'start-picker', role };
  await chrome.tabs.sendMessage(target.id, msg).catch(() => {});
  await chrome.tabs.update(target.id, { active: true });
  if (target.windowId !== undefined) await chrome.windows.update(target.windowId, { focused: true });
}

// ピッカーが終わったら設定画面に戻る
chrome.runtime.onMessage.addListener((msg: Message) => {
  if (msg.type !== 'picker-done') return;
  chrome.tabs.getCurrent((tab) => {
    if (tab?.id !== undefined) void chrome.tabs.update(tab.id, { active: true });
    if (tab?.windowId !== undefined) void chrome.windows.update(tab.windowId, { focused: true });
  });
  void recountAll();
});

$('recount').addEventListener('click', () => void recountAll());
$('resetAll').addEventListener('click', () => void saveSettings({ selectors: {} }));
window.addEventListener('focus', () => void recountAll());

$('saveCss').addEventListener('click', async () => {
  await saveCustomCss({ page: cssPage.value, chat: cssChat.value });
  cssStatus.textContent = '保存しました';
  setTimeout(() => (cssStatus.textContent = ''), 2000);
});

async function init() {
  buildRoles();
  await findTarget();
  renderSelectors((await loadSettings()).selectors);
  onSettingsChanged((s) => renderSelectors(s.selectors));
  const css = await loadCustomCss();
  cssPage.value = css.page;
  cssChat.value = css.chat;
}

void init();
