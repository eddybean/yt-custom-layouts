import type { CountResult } from './messages';
import { ROLES, roleAttr, type RoleDef, type RoleId, type RoleScope } from './selectors';
import type { SelectorOverrides } from './settings';

/** 不正なセレクタなら null を返す */
export function queryAll(root: ParentNode, selector: string): Element[] | null {
  try {
    return [...root.querySelectorAll(selector)];
  } catch {
    return null;
  }
}

export function countMatches(root: ParentNode, selector: string): CountResult {
  const found = queryAll(root, selector);
  return found ? { count: found.length, valid: true } : { count: 0, valid: false };
}

export function selectorFor(role: RoleDef, overrides: SelectorOverrides): string {
  return overrides[role.id as RoleId]?.trim() || role.defaultSelector;
}

export interface RoleMarker {
  setOverrides(overrides: SelectorOverrides): void;
  /** 各役割のセレクタで要素を探し直し、目印の属性を付け替える */
  refresh(): void;
  first(id: RoleId): Element | null;
}

export function createRoleMarker(doc: Document, scope: RoleScope): RoleMarker {
  const roles: readonly RoleDef[] = ROLES.filter((r) => r.scope === scope);
  const marked = new Map<string, Element[]>();
  let overrides: SelectorOverrides = {};

  return {
    setOverrides(next) {
      overrides = next;
    },
    refresh() {
      for (const role of roles) {
        const attr = roleAttr(role.id as RoleId);
        const next = queryAll(doc, selectorFor(role, overrides)) ?? [];
        for (const el of marked.get(role.id) ?? []) {
          if (!next.includes(el)) el.removeAttribute(attr);
        }
        for (const el of next) {
          if (!el.hasAttribute(attr)) el.setAttribute(attr, '');
        }
        marked.set(role.id, next);
      }
    },
    first: (id) => marked.get(id)?.[0] ?? null,
  };
}

/**
 * DOM の追加・削除に合わせて onChange を間引いて呼ぶ。
 * 目印の属性付けは attributes の変化なので、ここには反応しない（ループしない）。
 */
export function observeDom(doc: Document, onChange: () => void, intervalMs: number): void {
  let timer: number | undefined;
  new MutationObserver(() => {
    timer ??= window.setTimeout(() => {
      timer = undefined;
      onChange();
    }, intervalMs);
  }).observe(doc.documentElement, { childList: true, subtree: true });
}
