/** ユーザーのカスタム CSS を <style> として差し込む関数を返す。空文字なら取り除く */
export function createStyleInjector(doc: Document, id: string): (css: string) => void {
  let style: HTMLStyleElement | null = null;
  return (css) => {
    if (!css.trim()) {
      style?.remove();
      return;
    }
    style ??= Object.assign(doc.createElement('style'), { id });
    style.textContent = css;
    if (!style.isConnected) (doc.head ?? doc.documentElement).append(style);
  };
}
