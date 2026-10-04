import { SEL } from '../shared/selectors';
import type { PresetId } from '../shared/settings';

/**
 * チャットを表示したい位置に差し込む空の枠。
 * チャット本体は YouTube が置いた場所から動かさず、CSS Anchor Positioning で
 * この枠（anchor-name: --ytcl-chat-slot）に重ねて表示する（static/content.css）。
 */
export function createChatSlot(): { place: (preset: PresetId) => boolean } {
  const slot = document.createElement('div');
  slot.id = 'ytcl-chat-slot';

  return {
    /** プリセットに応じた位置へ枠を置く。置けたら true */
    place(preset) {
      if (preset === 'above-comments') {
        const box = document.querySelector(SEL.watchMetadata)?.parentElement;
        if (box) {
          if (slot.previousElementSibling !== box) box.after(slot);
          return true;
        }
      } else if (preset === 'above-related') {
        const related = document.querySelector(SEL.related);
        if (related) {
          if (slot.nextElementSibling !== related) related.before(slot);
          return true;
        }
      }
      slot.remove();
      return false;
    },
  };
}
