'use strict';
// The task index is tiny; full content is fetched only for selected variants.
window.EGE_EXAM_MANIFEST = Array.from({length:34},(_,i)=>i+3).flatMap(variant =>
  Array.from({length:26},(_,i) => {
    const task=i+1;
    return {id:`doshchinsky-2027-v${variant}-q${task}`,displayId:(variant-1)*26+task,task,maxPrimary:[8,22].includes(task)?2:1,source:{title:'Сборник Дощинского 2027',variant}};
  })
);
