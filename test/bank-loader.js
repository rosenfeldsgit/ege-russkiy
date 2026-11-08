'use strict';
(() => {
  const cache = new Map();
  async function load(summary) {
    if (typeof summary.prompt === 'string') return summary;
    const variant = summary.source.variant;
    if (!cache.has(variant)) cache.set(variant, fetch(`doshchinsky-2027/v${variant}.json`).then(response => {
      if (!response.ok) throw new Error('Не удалось загрузить задания. Попробуйте ещё раз.');
      return response.json();
    }).catch(error => {cache.delete(variant); throw error;}));
    const data = await cache.get(variant);
    const q = data.questions.find(q => q.id === summary.id);
    if (!q) throw new Error('Задание не найдено в базе.');
    return {...q,passage:data.passages[q.passageKey]?.text || ''};
  }
  window.EGE_EXAM_LOADER = {load};
})();
