import { queryAll } from '../shared/marker';
import { getRole, type RoleDef, type RoleId } from '../shared/selectors';
import { generateCandidates } from './candidates';
import { PICKER_STYLE } from './picker-style';

export interface PickerOptions {
  /** 役割の現在のセレクタ（上書き値または既定値） */
  getSelector: (role: RoleId) => string;
  getChatFrame: () => HTMLIFrameElement | null;
  /** 決定またはキャンセルで呼ばれる。キャンセル時は selector が null */
  onDone: (role: RoleId, selector: string | null) => void;
}

interface Session {
  roleId: RoleId;
  role: RoleDef;
  /** 要素を探すドキュメント。チャット欄の役割ならチャット iframe の中 */
  doc: Document | null;
  frame: HTMLIFrameElement | null;
  hovered: Element | null;
  picked: Element | null;
  candidates: { selector: string; count: number }[];
  matches: Element[];
  valid: boolean;
  teardown: (() => void)[];
}

const BLOCKED_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu'];
const KEY_EVENTS = ['keydown', 'keypress', 'keyup'];

/** 小さな DOM ビルダー（YouTube は Trusted Types を強制しているため innerHTML は使わない） */
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { dataset?: Record<string, string> } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const { dataset, ...rest } = props;
  const el = Object.assign(document.createElement(tag), rest);
  if (dataset) Object.assign(el.dataset, dataset);
  el.append(...children);
  return el;
}

/**
 * uBlock Origin の要素ピッカーのように、ページ上の要素をクリックして役割のセレクタを選ぶ。
 * UI は Shadow DOM に閉じ込め、YouTube のスタイルやキーボードショートカットと干渉しないようにする。
 * チャット iframe は同一オリジンなので、トップフレームから中の要素も直接扱える。
 */
export function createPicker(opts: PickerOptions): { start: (role: RoleId) => void } {
  let s: Session | null = null;
  let raf = 0;

  const host = h('div', { id: 'ytcl-picker' });
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;';
  const shadow = host.attachShadow({ mode: 'open' });
  const boxes = h('div', { className: 'boxes' });
  const title = h('div', { className: 'title' });
  const hint = h('div', { className: 'hint' });
  const list = h('ol', { className: 'cands' });
  const input = h('input', { className: 'sel', spellcheck: false, placeholder: 'CSS セレクタ' });
  const count = h('span', { className: 'count' });
  const editRow = h('div', { className: 'edit' }, input, count);
  const btn = (act: string, label: string, className = '') =>
    h('button', { type: 'button', className, dataset: { act } }, label);
  const okButton = btn('ok', '決定', 'primary');
  const pickedButtons = [btn('parent', '親要素へ'), btn('repick', '選び直す')];
  const buttons = h(
    'div',
    { className: 'buttons' },
    ...pickedButtons,
    btn('side', '左右に移動'),
    h('span', { className: 'spacer' }),
    btn('cancel', 'キャンセル'),
    okButton,
  );
  const panel = h('div', { className: 'panel' }, title, hint, list, editRow, buttons);
  shadow.append(h('style', {}, PICKER_STYLE), boxes, panel);

  const isOurs = (e: Event) => e.composedPath().includes(host);

  function targetOf(e: Event): Element | null {
    const t = e.target as Node | null;
    if (!s || !t || t.nodeType !== Node.ELEMENT_NODE) return null;
    const el = t as Element;
    if (el.ownerDocument === document) return s.role.scope === 'page' ? el : null;
    // チャット iframe の中。ページ側の役割なら iframe 要素そのものを対象にする
    return s.role.scope === 'chat' ? el : s.frame;
  }

  function listen(win: Window) {
    const onBlock = (e: Event) => {
      if (isOurs(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type === 'click') {
        const el = targetOf(e);
        if (el) pick(el);
      }
    };
    const onMove = (e: Event) => {
      if (s && !s.picked) s.hovered = isOurs(e) ? null : targetOf(e);
    };
    const onKey = (e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.type === 'keydown') finish(null);
      } else if (isOurs(e)) {
        // パネルへの入力を YouTube のショートカット（k, f, スペースなど）に渡さない
        e.stopImmediatePropagation();
      }
    };
    for (const type of BLOCKED_EVENTS) win.addEventListener(type, onBlock, true);
    for (const type of KEY_EVENTS) win.addEventListener(type, onKey, true);
    win.addEventListener('mousemove', onMove, true);
    s!.teardown.push(() => {
      for (const type of BLOCKED_EVENTS) win.removeEventListener(type, onBlock, true);
      for (const type of KEY_EVENTS) win.removeEventListener(type, onKey, true);
      win.removeEventListener('mousemove', onMove, true);
    });
  }

  function start(roleId: RoleId) {
    end();
    const role = getRole(roleId);
    const frame = opts.getChatFrame();
    const frameDoc = frame?.contentDocument ?? null;
    s = {
      roleId,
      role,
      doc: role.scope === 'chat' ? frameDoc : document,
      frame,
      hovered: null,
      picked: null,
      candidates: [],
      matches: [],
      valid: false,
      teardown: [],
    };
    listen(window);
    if (frameDoc?.defaultView) listen(frameDoc.defaultView);
    document.documentElement.append(host);
    render();
    raf = requestAnimationFrame(draw);
  }

  function end() {
    cancelAnimationFrame(raf);
    s?.teardown.forEach((fn) => fn());
    s = null;
    host.remove();
  }

  function finish(selector: string | null) {
    if (!s) return;
    const roleId = s.roleId;
    end();
    opts.onDone(roleId, selector);
  }

  function pick(el: Element) {
    if (!s?.doc) return;
    const doc = s.doc;
    s.picked = el;
    s.hovered = null;
    s.candidates = generateCandidates(el, doc, [opts.getSelector(s.roleId), s.role.defaultSelector]).map(
      (selector) => ({ selector, count: queryAll(doc, selector)?.length ?? 0 }),
    );
    const best = s.candidates.find((c) => judge(c.count) === 'good') ?? s.candidates[0];
    setSelector(best?.selector ?? '');
  }

  function setSelector(selector: string) {
    input.value = selector;
    updateMatches();
  }

  function updateMatches() {
    if (!s?.doc) return;
    const selector = input.value.trim();
    const found = selector ? queryAll(s.doc, selector) : null;
    s.valid = !!found;
    s.matches = found ?? [];
    render();
  }

  /** 一致数の評価。1 要素だけに一致すべき役割で複数に一致したら注意 */
  function judge(n: number): 'good' | 'warn' | 'bad' {
    if (n === 0) return 'bad';
    return s?.role.single && n > 1 ? 'warn' : 'good';
  }

  function render() {
    if (!s) return;
    const { role, picked, doc } = s;
    title.textContent = `「${role.label}」を選択`;
    const where = role.scope === 'chat' ? 'チャット欄の中で' : 'ページ上で';
    hint.textContent = !doc
      ? 'チャット欄が見つかりません。チャットを表示してから、もう一度お試しください。'
      : picked
        ? '候補から選ぶか、セレクタを直接編集してください。'
        : `${where}対象の要素をクリックしてください（Esc でキャンセル）。${role.hint}`;

    const current = input.value.trim();
    list.replaceChildren(
      ...(picked ? s.candidates : []).map((c) =>
        h(
          'li',
          { className: c.selector === current ? 'selected' : '', dataset: { selector: c.selector } },
          h('code', {}, c.selector),
          h('span', { className: `n ${judge(c.count)}` }, `${c.count}件`),
        ),
      ),
    );
    editRow.hidden = !picked;
    pickedButtons.forEach((b) => (b.hidden = !picked));
    const n = s.matches.length;
    count.className = `count ${s.valid ? judge(n) : 'bad'}`;
    count.textContent = s.valid ? `${n}件に一致` : 'セレクタが正しくありません';
    okButton.disabled = !picked || !s.valid || n === 0;
  }

  function rectOf(el: Element): DOMRect {
    const r = el.getBoundingClientRect();
    if (el.ownerDocument === document || !s?.frame) return r;
    const f = s.frame.getBoundingClientRect();
    return new DOMRect(r.x + f.x + s.frame.clientLeft, r.y + f.y + s.frame.clientTop, r.width, r.height);
  }

  /** ハイライト枠を毎フレーム描き直す（スクロールやレイアウト変化に追従させる） */
  function draw() {
    if (!s) return;
    const { picked, hovered, matches } = s;
    const targets = picked ? [...new Set([...matches.slice(0, 50), picked])] : hovered ? [hovered] : [];
    while (boxes.children.length < targets.length) boxes.append(h('div', { className: 'box' }));
    [...boxes.children].forEach((node, i) => {
      const box = node as HTMLElement;
      const el = targets[i];
      box.hidden = !el;
      if (!el) return;
      const r = rectOf(el);
      Object.assign(box.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });
      box.classList.toggle('picked', el === picked);
      box.classList.toggle('unmatched', el === picked && !matches.includes(el));
      box.dataset.label = picked ? '' : el.localName + (el.id ? `#${el.id}` : '');
    });
    raf = requestAnimationFrame(draw);
  }

  panel.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const li = target.closest('li');
    if (li?.dataset.selector) return setSelector(li.dataset.selector);
    switch (target.closest('button')?.dataset.act) {
      case 'ok':
        return finish(input.value.trim());
      case 'cancel':
        return finish(null);
      case 'parent': {
        const parent = s?.picked?.parentElement;
        if (parent && parent.localName !== 'body' && parent.localName !== 'html') pick(parent);
        return;
      }
      case 'repick':
        if (s) {
          s.picked = null;
          s.matches = [];
          render();
        }
        return;
      case 'side':
        panel.classList.toggle('left');
        return;
    }
  });
  input.addEventListener('input', updateMatches);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !okButton.disabled) finish(input.value.trim());
  });

  return { start };
}
