export interface SlotTarget {
  el: Element | null;
  where: 'before' | 'after';
}

/**
 * チャットを表示したい位置に差し込む空の枠。
 * チャット本体は YouTube が置いた場所から動かさず、CSS Anchor Positioning で
 * この枠（anchor-name: --ytcl-chat-slot）に重ねて表示する（static/content.css）。
 */
export function createChatSlot(): { place: (target: SlotTarget | null) => boolean } {
  const slot = document.createElement('div');
  slot.id = 'ytcl-chat-slot';

  return {
    /** 指定位置へ枠を置く。置けたら true。target が null なら取り除く */
    place(target) {
      const el = target?.el;
      if (!el) {
        slot.remove();
        return false;
      }
      if (target.where === 'after' && slot.previousElementSibling !== el) el.after(slot);
      if (target.where === 'before' && slot.nextElementSibling !== el) el.before(slot);
      return true;
    },
  };
}
