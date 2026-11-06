'use strict';
window.EGE_EXAM_CONFIG = Object.freeze({
  version: 1,
  tasks: Object.freeze(Object.fromEntries(Array.from({ length: 26 }, (_, index) => {
    const number = index + 1;
    return [number, Object.freeze({ number, maxPrimary: [8, 22].includes(number) ? 2 : 1 })];
  }))),
  partOneMax: 28,
  examMax: 50,
  // Шкала пользователя, приложенная 06.11.2026. Не прогноз результата полного экзамена.
  conversionSource: 'Шкала из предоставленных скриншотов 4ege.ru',
  conversion: Object.freeze([0,3,5,8,10,12,15,17,20,22,24,27,29,32,34,36,37,39,40,42,43,45,46,48,49,51,52,54,55,57,58,60,61,63,64,66,67,69,70,72,73,75,78,81,83,86,89,91,94,97,100])
});
