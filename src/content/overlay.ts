import type { OverlayRect } from '../shared/settings';

const MIN_W = 10;
const MIN_H = 15;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export function clampRect(r: OverlayRect): OverlayRect {
  const w = clamp(r.w, MIN_W, 100);
  const h = clamp(r.h, MIN_H, 100);
  return { w, h, x: clamp(r.x, 0, 100 - w), y: clamp(r.y, 0, 100 - h) };
}

export interface OverlayHandleOptions {
  getRect: () => OverlayRect;
  /** ドラッグ中に毎フレーム呼ばれる（保存はしない） */
  onChange: (rect: OverlayRect) => void;
  /** ドラッグ終了時に呼ばれる（ここで保存する） */
  onCommit: (rect: OverlayRect) => void;
  /** バーのダブルクリックで呼ばれる */
  onReset: () => void;
}

/**
 * オーバーレイ中のチャットに重ねる移動バーとリサイズグリップ。
 * 全画面時は <html> が fullscreen 要素になるため body 直下で問題ない。
 */
export function createOverlayHandles(opts: OverlayHandleOptions): { mount: () => void } {
  const frame = document.createElement('div');
  frame.id = 'ytcl-overlay-frame';
  const bar = document.createElement('div');
  bar.className = 'ytcl-overlay-bar';
  bar.title = 'ドラッグで移動 / ダブルクリックで位置をリセット';
  const grip = document.createElement('div');
  grip.className = 'ytcl-overlay-grip';
  grip.title = 'ドラッグでサイズ変更';
  frame.append(bar, grip);

  bindDrag(bar, 'move', opts);
  bindDrag(grip, 'resize', opts);
  bar.addEventListener('dblclick', () => opts.onReset());

  return {
    mount() {
      if (!frame.isConnected && document.body) document.body.append(frame);
    },
  };
}

function bindDrag(el: HTMLElement, mode: 'move' | 'resize', opts: OverlayHandleOptions) {
  el.addEventListener('pointerdown', (down) => {
    if (down.button !== 0) return;
    down.preventDefault();
    el.setPointerCapture(down.pointerId);
    const root = document.documentElement;
    // ドラッグ中はチャット iframe にポインタを奪われないようにする
    root.classList.add('ytcl-dragging');

    const start = opts.getRect();
    let current = start;

    const onMove = (ev: PointerEvent) => {
      const dx = ((ev.clientX - down.clientX) / window.innerWidth) * 100;
      const dy = ((ev.clientY - down.clientY) / window.innerHeight) * 100;
      current = clampRect(
        mode === 'move'
          ? { ...start, x: start.x + dx, y: start.y + dy }
          : { ...start, w: start.w + dx, h: start.h + dy },
      );
      opts.onChange(current);
    };
    const onEnd = () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onEnd);
      el.removeEventListener('pointercancel', onEnd);
      root.classList.remove('ytcl-dragging');
      opts.onCommit(current);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onEnd);
    el.addEventListener('pointercancel', onEnd);
  });
}
