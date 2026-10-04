// ダミーのチャット・関連動画・コメントを生成する（実在の人物・作品とは無関係）
const NAMES = ['視聴者A', 'ねこ好き', 'kaze_01', 'みかん', 'tanaka', '初見さん', 'yoru', 'sora', 'ひなた', 'guest_42', 'もも', 'rin', 'ハル', 'nagi'];
const MSGS = [
  'こんばんは！',
  '待ってました',
  '音量ちょうどいいです',
  '8888888',
  '今日も楽しみ',
  '初見です、よろしくお願いします',
  'おつかれさまです',
  '画質きれい',
  'なるほど〜',
  'www',
  'それな',
  '次のコーナー楽しみ',
  'いいね！',
  'おもしろいｗ',
];
const hue = (i) => `linear-gradient(135deg, hsl(${(i * 47) % 360} 55% 55%), hsl(${(i * 47 + 60) % 360} 50% 35%))`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

for (const box of document.querySelectorAll('[data-chat]')) {
  const n = Number(box.dataset.chat);
  for (let i = 0; i < n; i++) {
    const msg = el('div', 'msg');
    const av = el('div', 'av');
    av.style.background = hue(i + 3);
    const body = el('div');
    body.append(el('span', 'n', NAMES[i % NAMES.length]), el('span', '', MSGS[i % MSGS.length]));
    msg.append(av, body);
    box.append(msg);
  }
}

for (const list of document.querySelectorAll('[data-related]')) {
  const n = Number(list.dataset.related);
  for (let i = 0; i < n; i++) {
    const item = el('div', 'rel');
    const thumb = el('div', 'thumb');
    thumb.style.background = hue(i);
    const meta = el('div');
    meta.append(
      el('div', 't', `関連動画のサンプルタイトル ${i + 1}`),
      el('div', 'm', 'サンプルチャンネル'),
      el('div', 'm', `${i + 1}.2万 回視聴・${i + 2} 日前`),
    );
    item.append(thumb, meta);
    list.append(item);
  }
}

for (const list of document.querySelectorAll('[data-comments]')) {
  const n = Number(list.dataset.comments);
  for (let i = 0; i < n; i++) {
    const c = el('div', 'cmt');
    const av = el('div', 'av');
    av.style.background = hue(i + 7);
    const body = el('div');
    const name = el('div', 'n', `@sample_user${i + 1}`);
    name.append(el('span', '', `${i + 1} 時間前`));
    body.append(name, el('div', '', 'ダミーのコメントです。配信おつかれさまでした！'));
    c.append(av, body);
    list.append(c);
  }
}

// 強調枠を対象要素の位置に合わせる: <div class="focus" data-for="#id">
for (const focus of document.querySelectorAll('.focus[data-for]')) {
  const target = document.querySelector(focus.dataset.for);
  const page = focus.offsetParent;
  if (!target || !page) continue;
  const r = target.getBoundingClientRect();
  const p = page.getBoundingClientRect();
  const pad = 8;
  Object.assign(focus.style, {
    left: `${r.left - p.left - pad}px`,
    top: `${r.top - p.top - pad}px`,
    width: `${r.width + pad * 2}px`,
    height: `${r.height + pad * 2}px`,
  });
}
