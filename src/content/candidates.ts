import { queryAll } from '../shared/marker';

/*
 * ピッカーで選んだ要素から、セレクタの候補を作る。
 * YouTube の id は安定しているものが多いので id を軸にし、数字の多い id・class は自動生成とみなして使わない。
 */

const IDENT = /^[A-Za-z][\w-]*$/;
const isStableName = (name: string) => IDENT.test(name) && !/\d{4,}/.test(name);

function stableId(el: Element): string {
  return el.id && isStableName(el.id) ? el.id : '';
}

/** tag または tag#id */
function simple(el: Element): string {
  const id = stableId(el);
  return id ? `${el.localName}#${CSS.escape(id)}` : el.localName;
}

/** tag(#id).class（YouTube のスコープ用 class "style-scope" は除く） */
function withClass(el: Element): string | null {
  const cls = [...el.classList].find((c) => c !== 'style-scope' && isStableName(c));
  return cls ? `${simple(el)}.${CSS.escape(cls)}` : null;
}

function ancestor(el: Element, pred: (a: Element) => boolean): Element | null {
  for (let a = el.parentElement; a && a.localName !== 'body' && a.localName !== 'html'; a = a.parentElement) {
    if (pred(a)) return a;
  }
  return null;
}

/** from から el までの子セレクタの連鎖。同じタグの兄弟がいれば :nth-of-type で区別する */
function childPath(from: Element, el: Element): string {
  const steps: string[] = [];
  for (let cur: Element | null = el; cur && cur !== from; cur = cur.parentElement) {
    let step = simple(cur);
    const parent: Element | null = cur.parentElement;
    if (!stableId(cur) && parent) {
      const same = [...parent.children].filter((c) => c.localName === cur!.localName);
      if (same.length > 1) step += `:nth-of-type(${same.indexOf(cur) + 1})`;
    }
    steps.unshift(step);
  }
  return steps.join(' > ');
}

/**
 * el に一致するセレクタの候補を、具体的なものから順に返す。
 * preferred（現在の設定値や既定値）が el に一致するなら先頭に置く。
 */
export function generateCandidates(el: Element, doc: Document, preferred: string[]): string[] {
  const self = simple(el);
  const cls = withClass(el);
  const idAnc = ancestor(el, (a) => !!stableId(a));
  // YouTube の部品はカスタム要素 (ytd-*, yt-*) なので、タグ名は安定した手掛かりになる
  const ceAnc = ancestor(el, (a) => a.localName.includes('-'));

  const list = [...preferred];
  if (stableId(el)) list.push(`#${CSS.escape(el.id)}`);
  if (ceAnc && idAnc && ceAnc !== idAnc && ceAnc.contains(idAnc)) {
    list.push(`${ceAnc.localName} ${simple(idAnc)} ${self}`);
  }
  if (ceAnc) list.push(`${ceAnc.localName} ${self}`);
  if (idAnc) {
    list.push(`${simple(idAnc)} ${self}`);
    list.push(`${simple(idAnc)} > ${childPath(idAnc, el)}`);
  }
  if (cls) list.push(cls);
  list.push(self);

  return [...new Set(list)].filter((sel) => queryAll(doc, sel)?.includes(el));
}
