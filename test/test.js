'use strict';
(() => {
  const managed = window.EGE_MANAGED || {exams:[],disabled:[],tasks:{}};
  const config = {...window.EGE_EXAM_CONFIG, tasks:{...window.EGE_EXAM_CONFIG.tasks,...managed.tasks}};
  const overrides = new Map(managed.exams.map(q=>[q.id,q]));
  const existing = [...(window.EGE_EXAM_BANK || []), ...(window.EGE_EXAM_MANIFEST || [])];
  let preparing = false;
  const bank = [...existing.filter(q=>!managed.disabled.includes(q.id)).map(q=>overrides.get(q.id)||q),...managed.exams.filter(q=>!existing.some(old=>old.id===q.id))];
  const $ = id => document.getElementById(id);
  let session = null;
  let interval = null;
  const randomItem = items => items[Math.floor(Math.random() * items.length)];
  const time = ms => {
    const seconds = Math.floor(ms / 1000);
    return [Math.floor(seconds / 60), seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
  };
  const normalize = value => value.toLowerCase().replace(/ё/g, 'е').replace(/[\s,;]/g, '');
  function score(question, value) {
    const answer = normalize(value);
    if (!answer) return 0;
    if (question.answerType === 'matching') {
      if (!/^[1-9]{1,5}$/.test(answer)) return 0;
      const errors = [...question.answers[0]].filter((digit, i) => digit !== answer[i]).length;
      return errors === 0 ? 2 : errors <= 2 ? 1 : 0;
    }
    if (question.answerType === 'set') {
      if (!/^\d+$/.test(answer) || new Set(answer).size !== answer.length) return 0;
      return question.answers.some(expected => [...answer].sort().join('') === [...expected].sort().join('')) ? question.maxPrimary : 0;
    }
    return question.answers.some(expected => normalize(expected) === answer) ? question.maxPrimary : 0;
  }
  function selection() {
    return [...$('task-picker').querySelectorAll('input:checked')].map(input => Number(input.value));
  }
  function updateSelection() {
    const numbers = selection();
    const points = numbers.reduce((sum, n) => sum + config.tasks[n].maxPrimary, 0);
    $('selection-summary').textContent = `Выбрано заданий — ${numbers.length}. Максимум — ${points} первичных баллов.`;
    $('start').disabled = !numbers.length;
  }
  function saveTime() {
    if (!session || session.finished) return;
    const now = performance.now();
    session.elapsed[session.index] += now - session.enteredAt;
    session.enteredAt = now;
  }
  function updateClock() {
    if (!session || session.finished) return;
    const now = performance.now();
    $('total-time').textContent = time(now - session.startedAt);
    $('task-time').textContent = time(session.elapsed[session.index] + now - session.enteredAt);
  }
  function updateNavigation() {
    for (const button of $('task-nav').children) {
      const index = Number(button.dataset.index);
      button.classList.toggle('answered', Boolean(session.answers[index].trim()));
      if (index === session.index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.setAttribute('aria-label', `Задание ${session.questions[index].task}${session.answers[index].trim() ? ', ответ записан' : ''}`);
    }
  }
  function formattedText(node, text) {
    node.replaceChildren();
    text.split('**').forEach((part, index) => {
      const element = index % 2 ? document.createElement('strong') : document.createTextNode(part);
      if (index % 2) element.textContent = part;
      node.append(element);
    });
  }
  function renderQuestion(node,question) {
    const match=question.answerType==='matching' && question.prompt.match(/^([\s\S]+?)\n\n(Грамматические ошибки|Предложения)\n([\s\S]+?)\n\n(Предложения|Средства выразительности)\n([\s\S]+)$/);
    if (!match) {formattedText(node,question.prompt);return;}
    node.replaceChildren();
    const intro=document.createElement('p');intro.textContent=match[1];node.append(intro);
    const columns=document.createElement('div');columns.className='matching-columns';
    for (const [title,text] of [[match[2],match[3]],[match[4],match[5]]]) {
      const column=document.createElement('section');
      const heading=document.createElement('h3');heading.textContent=title;
      const body=document.createElement('div');formattedText(body,text);
      column.append(heading,body);columns.append(column);
    }
    node.append(columns);
  }
  function showQuestion(index, focus = true) {
    saveTime();
    session.index = index;
    const question = session.questions[index];
    $('question-title').textContent = `Задание ${question.task} · #${question.displayId}`;
    $('weight').textContent = `${question.maxPrimary} ${question.maxPrimary === 1 ? 'балл' : 'балла'}`;
    $('source').textContent = question.source.title;
    formattedText($('passage'), question.passage || '');
    $('passage').hidden = !question.passage;
    renderQuestion($('question'),question);
    $('answer').value = session.answers[index];
    $('answer').inputMode = question.answerType === 'word' ? 'text' : 'numeric';
    $('answer-help').textContent = question.answerType === 'matching' ? 'Пять цифр в порядке А, Б, В, Г, Д.' : question.answerType === 'word' ? 'Слово или сочетание слов.' : 'Запишите цифры без пробелов и запятых.';
    $('previous').disabled = index === 0;
    $('next').textContent = index === session.questions.length - 1 ? 'К завершению' : 'Далее';
    $('finish-confirm').hidden = true;
    updateNavigation();
    updateClock();
    if (focus) $('question-title').focus();
  }
  async function start() {
    const numbers = selection();
    if (!numbers.length) return;
    // Номера, опирающиеся на один текст, получают общий вариант источника.
    const variants = {};
    const selected = numbers.map(task => {
      const group = task <= 3 ? 'text-1-3' : task >= 23 && task <= 26 ? 'text-23-26' : String(task);
      const related = numbers.filter(n => task <= 3 ? n <= 3 : task >= 23 && task <= 26 ? n >= 23 && n <= 26 : n === task);
      const candidates = bank.filter(q => q.task === task && related.every(n => bank.some(other => other.task === n && other.source.variant === q.source.variant)));
      if (!candidates.length) throw new Error('Нет полного комплекта заданий для общего текста');
      if (!variants[group]) variants[group] = randomItem(candidates).source.variant;
      return randomItem(candidates.filter(q => q.source.variant === variants[group]));
    });
    const questions = await Promise.all(selected.map(window.EGE_EXAM_LOADER.load));
    const now = performance.now();
    session = { questions, answers: questions.map(() => ''), elapsed: questions.map(() => 0), index: 0, startedAt: now, enteredAt: now, finished: false };
    $('setup').hidden = true;
    $('results').hidden = true;
    $('session').hidden = false;
    $('task-nav').replaceChildren();
    questions.forEach((question, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = question.task;
      button.dataset.index = index;
      button.addEventListener('click', () => showQuestion(index));
      $('task-nav').append(button);
    });
    showQuestion(0);
    clearInterval(interval);
    interval = setInterval(updateClock, 250);
  }
  function confirmFinish() {
    const missing = session.answers.filter(answer => !answer.trim()).length;
    $('finish-message').textContent = missing ? `Заданий без ответа — ${missing}. Завершить пробник?` : 'Проверить ответы и показать результат?';
    $('finish-confirm').hidden = false;
    $('confirm-finish').focus();
  }
  function finish() {
    if (!session || session.finished) return;
    saveTime();
    const duration = performance.now() - session.startedAt;
    session.finished = true;
    clearInterval(interval);
    let total = 0;
    let maximum = 0;
    $('result-rows').replaceChildren();
    session.questions.forEach((question, index) => {
      const points = score(question, session.answers[index]);
      total += points;
      maximum += question.maxPrimary;
      const row = document.createElement('tr');
      const values = [String(question.task), session.answers[index] || '—', question.answers.join(' / '), `${points} / ${question.maxPrimary}`, time(session.elapsed[index])];
      values.forEach((value, column) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        if (column === 0) {
          const source = document.createElement('small');
          source.textContent = `${question.source.title} · #${question.displayId}`;
          cell.append(source);
        }
        if (column === 3) cell.className = points === question.maxPrimary ? 'score-full' : points ? 'score-partial' : 'score-zero';
        row.append(cell);
      });
      const detailRow = document.createElement('tr');
      detailRow.hidden = true;
      const detailCell = document.createElement('td');
      detailCell.colSpan = 5;
      const review = document.createElement('article');
      review.className = 'review-question';
      for (const [key,text] of [["passage",question.passage], ["prompt",question.prompt]]) {
        if (!text) continue;
        const block = document.createElement('div');
        block.className = 'question';
        if (key==='prompt') renderQuestion(block,question); else formattedText(block,text);
        review.append(block);
      }
      const correctAnswer = document.createElement('p');
      correctAnswer.className = 'review-answer';
      correctAnswer.textContent = 'Ответ: ' + question.answers.join(' / ');
      review.append(correctAnswer);
      const explanation = document.createElement('p');
      explanation.className = 'review-explanation';
      explanation.textContent = question.explanation || 'Ответ проверен по ключу сборника. Подробный разбор пока не добавлен.';
      review.append(explanation);
      detailCell.append(review);
      detailRow.append(detailCell);
      detailRow.id = 'review-' + question.displayId;
      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'rule-toggle';
      info.textContent = 'ⓘ';
      info.setAttribute('aria-label', 'Задание и объяснение #' + question.displayId);
      info.setAttribute('aria-expanded', 'false');
      info.setAttribute('aria-controls', detailRow.id);
      info.addEventListener('click', () => {
        detailRow.hidden = !detailRow.hidden;
        info.setAttribute('aria-expanded', String(!detailRow.hidden));
      });
      row.children[0].append(info);
      $('result-rows').append(row, detailRow);
    });
    $('result-summary').textContent = `${total} из ${maximum} первичных баллов · ${time(duration)}`;
    $('conversion').textContent = `По предоставленной шкале ${total} первичных → ${config.conversion[total]} тестовых из 100. Учтены только выбранные задания, сочинение — 0 баллов. Максимум части 1 — 28 первичных → 55 тестовых.`;
    $('session').hidden = true;
    $('results').hidden = false;
    $('result-title').focus();
  }
  for (const task of Object.values(config.tasks)) {
    const label = document.createElement('label');
    label.className = 'task-choice';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = task.number;
    input.checked = true;
    input.disabled = !bank.some(question => question.task === task.number);
    if (input.disabled) input.checked = false;
    input.setAttribute('aria-label', `Задание ${task.number}, максимум ${task.maxPrimary}`);
    input.addEventListener('change', updateSelection);
    const number = document.createElement('span');
    number.textContent = task.number;
    const weight = document.createElement('small');
    weight.textContent = `${task.maxPrimary} б.`;
    label.append(input, number, weight);
    $('task-picker').append(label);
  }
  $('select-all').addEventListener('click', () => {
    $('task-picker').querySelectorAll('input:not(:disabled)').forEach(input => input.checked = true);
    updateSelection();
  });
  $('clear-all').addEventListener('click', () => {
    $('task-picker').querySelectorAll('input').forEach(input => input.checked = false);
    updateSelection();
  });
  $('start').addEventListener('click', async () => {
    if (preparing) return;
    preparing=true;$('start').disabled=true;$('start').textContent='Подготовка…';
    try {await start();} catch(error) {$('selection-summary').textContent=error.message;}
    finally {preparing=false;$('start').textContent='Начать пробник';updateSelection();}
  });
  $('answer').addEventListener('input', () => {
    session.answers[session.index] = $('answer').value;
    updateNavigation();
  });
  $('previous').addEventListener('click', () => showQuestion(session.index - 1));
  $('next').addEventListener('click', () => session.index < session.questions.length - 1 ? showQuestion(session.index + 1) : confirmFinish());
  $('finish').addEventListener('click', confirmFinish);
  $('cancel-finish').addEventListener('click', () => $('finish-confirm').hidden = true);
  $('confirm-finish').addEventListener('click', finish);
  $('restart').addEventListener('click', () => {
    session = null;
    $('answer').value = '';
    $('result-rows').replaceChildren();
    $('result-summary').textContent = '';
    $('conversion').textContent = '';
    $('results').hidden = true;
    $('setup').hidden = false;
    $('start').focus();
  });
  updateSelection();
})();

