// App logic (modular Firebase v9 via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, serverTimestamp, updateDoc, doc, deleteDoc, limit, writeBatch } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const userEmailSpan = document.getElementById('userEmail');
const btnLogout = document.getElementById('btnLogout');
const tabsEl = document.getElementById('tabs');
const qaListEl = document.getElementById('qaList');
const catListDatalist = document.getElementById('catList');
const searchInput = document.getElementById('searchInput');
const btnClear = document.getElementById('btnClear');
const btnReload = document.getElementById('btnReload');
const btnSeed = document.getElementById('btnSeed');

const newForm = document.getElementById('newForm');
const newCategory = document.getElementById('newCategory');
const newQuestion = document.getElementById('newQuestion');
const newAnswer = document.getElementById('newAnswer');

const editDialog = document.getElementById('editDialog');
const editForm = document.getElementById('editForm');
const editId = document.getElementById('editId');
const editCategory = document.getElementById('editCategory');
const editQuestion = document.getElementById('editQuestion');
const editAnswer = document.getElementById('editAnswer');

const posCardDialog = document.getElementById('posCardDialog');
const posCardForm = document.getElementById('posCardForm');
const posCardId = document.getElementById('posCardId');
const posCardSection = document.getElementById('posCardSection');
const posCardVariant = document.getElementById('posCardVariant');
const posCardTitle = document.getElementById('posCardTitle');
const posCardParagraphs = document.getElementById('posCardParagraphs');
const posCardBullets = document.getElementById('posCardBullets');
const posCardNote = document.getElementById('posCardNote');

let currentUser = null;
let currentCategory = 'Todas';
let categories = new Set();
let lastSnapshot = [];
let posCards = [];
let posSeedEnsured = false;
let draggingQaCard = null;
let draggingPosCard = null;

const POS_VENDAS_TAB_LABEL = 'Pós-vendas / Quebras';
const posVendasContent = {
  top: [
    {
      variant: 'case',
      title: 'Reclamação — quebrado, sem foto',
      paragraphs: [
        'Oi, espero que esteja bem. Sinto muito por isso! Para que eu possa te ajudar da melhor forma, você poderia me enviar uma foto do item?',
        'Assim consigo entender melhor o que aconteceu e buscar a melhor solução para você.'
      ]
    },
    {
      variant: 'case',
      title: 'Reclamação — cilindro quebrado — com foto',
      paragraphs: [
        'Oi! Sentimos muito pelo ocorrido. Podemos resolver de três formas:'
      ],
      bullets: [
        'Reembolso parcial — você fica com o produto e recebe parte do valor de volta.',
        'Devolução pelo app da Shopee — reembolso total após o retorno.',
        'Envio de nova peça — sem custo pela peça; você paga apenas o frete e não precisa devolver nada.'
      ],
      note: 'Me avisa qual opção prefere que resolvo tudo por aqui.'
    },
    {
      variant: 'case',
      title: 'Reclamação — arco quebrado — com foto',
      paragraphs: [
        'Tudo bem? Peço mil desculpas pelo ocorrido! Posso te enviar novas peças para repor as que chegaram quebradas. Pode ser?'
      ]
    }
  ],
  bottom: [
    {
      variant: 'option',
      title: 'OPÇÃO 1 — Reembolso parcial (como solicitar)',
      paragraphs: [
        'Para solicitar o reembolso parcial, siga este passo a passo no app:'
      ],
      bullets: [
        "Acesse 'Minhas Compras' na guia 'Eu'.",
        'Selecione o pedido e toque em "Devolver/Reembolsar".',
        "Escolha 'Reembolso parcial' e adicione fotos e a descrição do problema."
      ],
      note: 'Qualquer dúvida, estamos aqui para ajudar.'
    },
    {
      variant: 'option',
      title: 'OPÇÃO 2 — Devolução total (pelo app da Shopee)',
      paragraphs: [
        'As devoluções, trocas e reembolsos acontecem pelo app da Shopee. Faça assim:'
      ],
      bullets: [
        "Vá em 'Eu' > 'Minhas Compras' e selecione o pedido.",
        "Toque em 'Pedido de reembolso'.",
        'Escolha o motivo e anexe as evidências (fotos/vídeos).',
        "Finalize tocando em 'Enviar'."
      ],
      note: 'Depois de enviar, acompanhe pelo app. Estamos por aqui para qualquer dúvida.'
    },
    {
      variant: 'option',
      title: 'OPÇÃO 3 — Envio de nova peça (sem devolver o item)',
      paragraphs: [
        'Para receber uma nova peça sem precisar devolver nada, é só comprar o anúncio simbólico que envio para você.',
        'Ele custa R$2,00 apenas para gerar a etiqueta e você ainda pode usar cupom de frete grátis.'
      ],
      bullets: [
        'Complete a compra do link simbólico para liberar o envio.',
        'Acompanhe o rastreio direto pelo pedido na Shopee.'
      ],
      note: 'Assim você recebe rapidinho a peça nova, de forma prática e segura.'
    }
  ]
};

// --- Auth ---
document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch(err) {
    alert('Erro ao entrar: ' + err.message);
  }
});

document.getElementById('btnRegister').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if(!email || !password) return alert('Preencha e-mail e senha');
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert('Conta criada com sucesso! Você já está logado.');
  } catch(err) {
    alert('Erro ao criar conta: ' + err.message);
  }
});

btnLogout.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if(user) {
    userEmailSpan.textContent = user.email || '';
    authSection.style.display = 'none';
    appSection.style.display = 'block';
    btnLogout.style.display = 'inline-flex';
    await reload();
  } else {
    authSection.style.display = 'block';
    appSection.style.display = 'none';
    btnLogout.style.display = 'none';
  }
});

// --- Firestore helpers ---
const col = collection(db, 'faqs');
const posCol = collection(db, 'posVendasCards');

async function fetchAll() {
  const snap = await getDocs(col);
  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  lastSnapshot = items
    .map(item => ({ ...item, orderIndex: typeof item.orderIndex === 'number' ? item.orderIndex : Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => {
      const orderDiff = (a.orderIndex ?? Number.MAX_SAFE_INTEGER) - (b.orderIndex ?? Number.MAX_SAFE_INTEGER);
      if (orderDiff !== 0) return orderDiff;
      const catDiff = (a.category || '').localeCompare(b.category || '');
      if (catDiff !== 0) return catDiff;
      return (a.question || '').localeCompare(b.question || '');
    });
  categories = new Set(items.map(i => i.category));
}

async function fetchPosCards() {
  const snap = await getDocs(posCol);
  if (snap.empty && !posSeedEnsured) {
    await ensurePosSeed();
    posSeedEnsured = true;
    return fetchPosCards();
  }
  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  posCards = items
    .map(card => ({
      ...card,
      orderIndex: typeof card.orderIndex === 'number' ? card.orderIndex : Number.MAX_SAFE_INTEGER,
      section: card.section || 'top'
    }))
    .sort((a, b) => {
      const sectionDiff = (a.section || '').localeCompare(b.section || '');
      if (sectionDiff !== 0) return sectionDiff;
      const orderDiff = (a.orderIndex ?? Number.MAX_SAFE_INTEGER) - (b.orderIndex ?? Number.MAX_SAFE_INTEGER);
      if (orderDiff !== 0) return orderDiff;
      return (a.title || '').localeCompare(b.title || '');
    });
}

function renderTabs() {
  tabsEl.innerHTML = '';
  const makeTab = (name) => {
    const b = document.createElement('button');
    b.className = 'tab' + (name === currentCategory ? ' active' : '');
    b.textContent = name;
    b.addEventListener('click', () => { currentCategory = name; renderList(searchInput.value.trim()); });
    return b;
  };
  tabsEl.appendChild(makeTab('Todas'));
  Array.from(categories).sort().forEach(cat => tabsEl.appendChild(makeTab(cat)));
  tabsEl.appendChild(makeTab(POS_VENDAS_TAB_LABEL));
}

function renderCatDatalist() {
  catListDatalist.innerHTML = '';
  Array.from(categories).sort().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    catListDatalist.appendChild(opt);
  });
}

function renderList(searchText='') {
  qaListEl.classList.remove('pos-vendas-mode');
  qaListEl.innerHTML = '';
  if(currentCategory === POS_VENDAS_TAB_LABEL) {
    renderPosVendas();
    return;
  }
  const filter = (item) => {
    const byCat = (currentCategory === 'Todas' || item.category === currentCategory);
    const bySearch = !searchText || (item.question.toLowerCase().includes(searchText.toLowerCase()) || item.answer.toLowerCase().includes(searchText.toLowerCase()));
    return byCat && bySearch;
  };

  const items = lastSnapshot.filter(filter);
  if(items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card muted';
    empty.textContent = 'Nenhum item encontrado.';
    qaListEl.appendChild(empty);
    return;
  }

  items.forEach(item => qaListEl.appendChild(renderItem(item)));
  setupQaDragAndDrop();
}

function renderItem(item) {
  const wrap = document.createElement('article');
  wrap.className = 'qa';
  wrap.dataset.id = item.id;

  const head = document.createElement('div');
  head.className = 'qa-head';

  const info = document.createElement('div');
  info.className = 'qa-info';

  const chip = document.createElement('span');
  chip.className = 'qa-chip';
  chip.textContent = item.category || 'Sem categoria';

  const question = document.createElement('h4');
  question.className = 'qa-question';
  question.textContent = item.question;

  info.appendChild(chip);
  info.appendChild(question);

  const actions = document.createElement('div');
  actions.className = 'qa-actions';

  const btnCopy = document.createElement('button');
  btnCopy.className = 'btn btn-ghost btn-icon';
  btnCopy.innerHTML = '<span class="material-symbols-rounded">content_copy</span><span>Copiar</span>';

  const btnEdit = document.createElement('button');
  btnEdit.className = 'btn btn-secondary';
  btnEdit.textContent = 'Editar';
  btnEdit.addEventListener('click', () => openEdit(item));

  const btnDel = document.createElement('button');
  btnDel.className = 'btn btn-danger';
  btnDel.textContent = 'Excluir';
  btnDel.addEventListener('click', () => onDelete(item));

  actions.appendChild(btnCopy);
  actions.appendChild(btnEdit);
  actions.appendChild(btnDel);

  head.appendChild(info);
  head.appendChild(actions);

  const body = document.createElement('div');
  body.className = 'qa-body';

  const answer = document.createElement('p');
  answer.className = 'qa-answer';
  answer.textContent = item.answer;

  const feedback = document.createElement('div');
  feedback.className = 'copy-feedback';
  feedback.style.display = 'none';
  feedback.innerHTML = '<span class="material-symbols-rounded">check</span><span>Resposta copiada</span>';

  body.appendChild(answer);
  body.appendChild(feedback);

  btnCopy.addEventListener('click', async () => {
    const answerText = (answer.textContent || '').trim();
    if (!answerText) {
      alert('Não há resposta para copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(answerText);
      btnCopy.innerHTML = '<span class="material-symbols-rounded">done</span><span>Copiado</span>';
      feedback.style.display = 'flex';
      setTimeout(() => {
        btnCopy.innerHTML = '<span class="material-symbols-rounded">content_copy</span><span>Copiar</span>';
        feedback.style.display = 'none';
      }, 2000);
    } catch (err) {
      alert('Não foi possível copiar a resposta automaticamente.');
      console.error(err);
    }
  });

  wrap.appendChild(head);
  wrap.appendChild(body);
  return wrap;
}

function renderPosVendas() {
  qaListEl.classList.add('pos-vendas-mode');

  const topRow = document.createElement('div');
  topRow.className = 'pos-vendas-row';
  topRow.dataset.section = 'top';

  const bottomRow = document.createElement('div');
  bottomRow.className = 'pos-vendas-row pos-vendas-row--options';
  bottomRow.dataset.section = 'bottom';

  const topCards = posCards.filter(card => (card.section || 'top') === 'top');
  const bottomCards = posCards.filter(card => (card.section || 'top') === 'bottom');

  if (!topCards.length && !bottomCards.length) {
    const empty = document.createElement('div');
    empty.className = 'card muted';
    empty.textContent = 'Nenhum card cadastrado para Pós-vendas / Quebras.';
    qaListEl.appendChild(empty);
    return;
  }

  topCards.forEach(card => topRow.appendChild(createPosCard(card)));

  const flow = document.createElement('div');
  flow.className = 'pos-vendas-flow';
  topCards.forEach(() => {
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = 'arrow_downward';
    flow.appendChild(icon);
  });

  bottomCards.forEach(card => bottomRow.appendChild(createPosCard(card)));

  qaListEl.appendChild(topRow);
  if (topCards.length && bottomCards.length) {
    qaListEl.appendChild(flow);
  }
  qaListEl.appendChild(bottomRow);

  setupPosDragAndDrop(topRow, bottomRow);
}

function createPosCard(card) {
  const article = document.createElement('article');
  article.className = 'pos-card' + (card.variant ? ` pos-card--${card.variant}` : '');
  article.dataset.id = card.id;

  const head = document.createElement('div');
  head.className = 'pos-card__head';

  const info = document.createElement('div');
  info.className = 'pos-card__info';

  const chip = document.createElement('span');
  chip.className = 'pos-card__chip';
  chip.textContent = 'PÓS-VENDAS • Quebras';

  const title = document.createElement('h4');
  title.className = 'pos-card__title';
  title.textContent = card.title;

  info.appendChild(chip);
  info.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'pos-card__actions';

  const btnCopy = document.createElement('button');
  btnCopy.className = 'btn btn-ghost btn-icon';
  btnCopy.innerHTML = '<span class="material-symbols-rounded">content_copy</span><span>Copiar</span>';

  const btnEdit = document.createElement('button');
  btnEdit.className = 'btn btn-secondary';
  btnEdit.textContent = 'Editar';
  btnEdit.addEventListener('click', () => openPosEdit(card));

  const btnDelete = document.createElement('button');
  btnDelete.className = 'btn btn-danger';
  btnDelete.textContent = 'Excluir';
  btnDelete.addEventListener('click', () => deletePosCard(card));

  actions.appendChild(btnCopy);
  actions.appendChild(btnEdit);
  actions.appendChild(btnDelete);

  head.appendChild(info);
  head.appendChild(actions);

  const body = document.createElement('div');
  body.className = 'pos-card__body';

  (card.paragraphs || []).forEach(text => {
    const p = document.createElement('p');
    p.textContent = text;
    body.appendChild(p);
  });

  if(card.bullets && card.bullets.length) {
    const ul = document.createElement('ul');
    ul.className = 'pos-card__list';
    card.bullets.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    body.appendChild(ul);
  }

  if(card.note) {
    const note = document.createElement('p');
    note.className = 'pos-card__note';
    note.textContent = card.note;
    body.appendChild(note);
  }

  const feedback = document.createElement('div');
  feedback.className = 'copy-feedback';
  feedback.style.display = 'none';
  feedback.innerHTML = '<span class="material-symbols-rounded">check</span><span>Conteúdo copiado</span>';

  body.appendChild(feedback);

  const copyLines = [
    ...(card.paragraphs || []),
    ...((card.bullets || []).map(item => `• ${item}`)),
    card.note || null
  ].map(text => (text || '').trim()).filter(Boolean);

  btnCopy.addEventListener('click', async () => {
    if (!copyLines.length) {
      alert('Não há conteúdo de resposta para copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(copyLines.join('\n'));
      btnCopy.innerHTML = '<span class="material-symbols-rounded">done</span><span>Copiado</span>';
      feedback.style.display = 'flex';
      setTimeout(() => {
        btnCopy.innerHTML = '<span class="material-symbols-rounded">content_copy</span><span>Copiar</span>';
        feedback.style.display = 'none';
      }, 2000);
    } catch(err) {
      alert('Não foi possível copiar o conteúdo automaticamente.');
      console.error(err);
    }
  });

  article.appendChild(head);
  article.appendChild(body);

  return article;
}

function setupQaDragAndDrop() {
  if (qaListEl.classList.contains('pos-vendas-mode')) return;
  const cards = Array.from(qaListEl.querySelectorAll('.qa'));
  if (!cards.length) return;
  cards.forEach(card => {
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', onQaDragStart);
    card.addEventListener('dragend', onQaDragEnd);
  });
}

function onQaDragStart(event) {
  draggingQaCard = event.currentTarget;
  draggingQaCard.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function onQaDragEnd() {
  if (!draggingQaCard) return;
  draggingQaCard.classList.remove('dragging');
  draggingQaCard = null;
}

qaListEl.addEventListener('dragover', (event) => {
  if (!draggingQaCard) return;
  event.preventDefault();
  const afterElement = getDragAfterElement(qaListEl, event.clientY, '.qa');
  if (!afterElement) {
    qaListEl.appendChild(draggingQaCard);
  } else if (afterElement !== draggingQaCard) {
    qaListEl.insertBefore(draggingQaCard, afterElement);
  }
});

qaListEl.addEventListener('drop', async (event) => {
  if (!draggingQaCard) return;
  event.preventDefault();
  const ids = Array.from(qaListEl.querySelectorAll('.qa')).map(el => el.dataset.id);
  draggingQaCard.classList.remove('dragging');
  draggingQaCard = null;
  await persistQaOrder(ids);
});

function getDragAfterElement(container, y, selector) {
  const elements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

async function persistQaOrder(ids) {
  if (!ids.length) return;
  const batch = writeBatch(db);
  ids.forEach((id, index) => {
    const ref = doc(db, 'faqs', id);
    batch.update(ref, {
      orderIndex: index,
      updatedAt: serverTimestamp()
    });
  });
  await batch.commit();
  await reload();
}

function setupPosDragAndDrop(topRow, bottomRow) {
  const rows = [topRow, bottomRow];
  rows.forEach(row => {
    row.querySelectorAll('.pos-card').forEach(card => {
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', onPosDragStart);
      card.addEventListener('dragend', onPosDragEnd);
    });
    row.addEventListener('dragover', (event) => onPosDragOver(event, row));
    row.addEventListener('drop', (event) => onPosDrop(event, rows));
  });
}

function onPosDragStart(event) {
  draggingPosCard = event.currentTarget;
  draggingPosCard.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function onPosDragEnd() {
  if (!draggingPosCard) return;
  draggingPosCard.classList.remove('dragging');
  draggingPosCard = null;
}

function onPosDragOver(event, row) {
  if (!draggingPosCard) return;
  event.preventDefault();
  const afterElement = getDragAfterElement(row, event.clientY, '.pos-card');
  if (!afterElement) {
    row.appendChild(draggingPosCard);
  } else if (afterElement !== draggingPosCard) {
    row.insertBefore(draggingPosCard, afterElement);
  }
}

async function onPosDrop(event, rows) {
  if (!draggingPosCard) return;
  event.preventDefault();
  const targetRow = event.currentTarget;
  if (draggingPosCard.parentElement !== targetRow) {
    targetRow.appendChild(draggingPosCard);
  }
  draggingPosCard.classList.remove('dragging');
  const order = rows.reduce((acc, row) => {
    const section = row.dataset.section || 'top';
    acc[section] = Array.from(row.querySelectorAll('.pos-card')).map(el => el.dataset.id);
    return acc;
  }, {});
  draggingPosCard = null;
  await persistPosOrder(order);
}

async function persistPosOrder(order) {
  const batch = writeBatch(db);
  Object.entries(order).forEach(([section, ids]) => {
    ids.forEach((id, index) => {
      const ref = doc(db, 'posVendasCards', id);
      batch.update(ref, {
        section,
        orderIndex: index,
        updatedAt: serverTimestamp()
      });
    });
  });
  await batch.commit();
  await reload();
}

function openPosEdit(card) {
  posCardId.value = card.id;
  posCardSection.value = card.section || 'top';
  posCardVariant.value = card.variant || 'case';
  posCardTitle.value = card.title || '';
  posCardParagraphs.value = (card.paragraphs || []).join('\n');
  posCardBullets.value = (card.bullets || []).join('\n');
  posCardNote.value = card.note || '';
  posCardDialog.showModal();
}

async function deletePosCard(card) {
  if (!confirm('Excluir este card de Pós-vendas?')) return;
  await deleteDoc(doc(db, 'posVendasCards', card.id));
  await reload();
}

function toList(value) {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

posCardForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = posCardId.value;
  if (!id) return;
  const ref = doc(db, 'posVendasCards', id);
  await updateDoc(ref, {
    section: posCardSection.value || 'top',
    variant: posCardVariant.value || 'case',
    title: posCardTitle.value.trim(),
    paragraphs: toList(posCardParagraphs.value),
    bullets: toList(posCardBullets.value),
    note: posCardNote.value.trim(),
    updatedAt: serverTimestamp()
  });
  posCardDialog.close();
  await reload();
});

posCardDialog?.addEventListener('close', () => {
  posCardForm.reset();
  posCardId.value = '';
});

async function ensurePosSeed() {
  const snap = await getDocs(query(posCol, limit(1)));
  if(!snap.empty) return;
  const batch = writeBatch(db);
  posVendasContent.top.forEach((card, index) => {
    const ref = doc(posCol);
    batch.set(ref, {
      ...card,
      section: 'top',
      orderIndex: index,
      createdBy: currentUser?.uid || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
  posVendasContent.bottom.forEach((card, index) => {
    const ref = doc(posCol);
    batch.set(ref, {
      ...card,
      section: 'bottom',
      orderIndex: index,
      createdBy: currentUser?.uid || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
  await batch.commit();
  posSeedEnsured = true;
}

// --- Actions ---
btnReload.addEventListener('click', reload);
btnClear.addEventListener('click', () => { searchInput.value=''; renderList(''); });
searchInput.addEventListener('input', (e) => renderList(e.target.value.trim()));

newForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    category: newCategory.value.trim() || 'Sem categoria',
    question: newQuestion.value.trim(),
    answer: newAnswer.value,
    createdBy: currentUser?.uid || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    orderIndex: lastSnapshot.length
  };
  if(!payload.question || !payload.answer) return alert('Preencha pergunta e resposta.');
  await addDoc(col, payload);
  newForm.reset();
  await reload();
});

async function onDelete(item) {
  if(!confirm('Excluir este Q&A?')) return;
  await deleteDoc(doc(db, 'faqs', item.id));
  await reload();
}

function openEdit(item) {
  editId.value = item.id;
  editCategory.value = item.category;
  editQuestion.value = item.question;
  editAnswer.value = item.answer;
  editDialog.showModal();
}

document.getElementById('btnSaveEdit').addEventListener('click', async (e) => {
  e.preventDefault();
  const id = editId.value;
  if(!id) return;
  const ref = doc(db, 'faqs', id);
  await updateDoc(ref, {
    category: editCategory.value.trim() || 'Sem categoria',
    question: editQuestion.value.trim(),
    answer: editAnswer.value,
    updatedAt: serverTimestamp()
  });
  editDialog.close();
  await reload();
});

// Seed exact user-provided content (only adds if collection is empty)
const seedPayload = [{"category": "Entrega & Prazo", "question": "MUDANÇA DE PRAZO", "answer": "Oii, tudo bem? Peço desculpas por isso, essas mudanças \ntambém nos afetam, infelizmente como a entrega e \n\nfeita pela shopee nos não temos controle da mesma.  \nMas não se preocupe, estou do seu lado! Já acionei a \n\nShopee para que deem prioridade ao seu pedido e \nagilizem a entrega."}, {"category": "Entrega & Prazo", "question": "Não entregue, parado — TEM COMO CHEGAR ATÉ ESSA DATA?", "answer": "Oii tudo bem? Eu acredito que chega sim, mas infelizmente não consigo te dar data \nexata de chegada, pois todas nossas entregas são feitas pela shopee express, nos \n\nnão temos controle da mesma.\n\nSinto muito pelo problema com a entrega, entendo o quanto isso pode ser \nfrustrante. Infelizmente, como a Shopee é responsável pelo processo de \nenvio, não tenho controle direto sobre a situação, mas estou aqui para \n\najudar no que for possível!\n\nPara agilizar a solução, já abri um chamado reforçando a urgência do seu \ncaso. Além disso, você pode entrar em contato diretamente com o suporte \nda Shopee pelo aplicativo. Basta acessar o app, ir até a seção de 'Ajuda' e \n\niniciar um chat com a equipe de suporte.\n\nSe precisar de algo mais, estarei à disposição!"}, {"category": "Frete, Endereço & Rastreio", "question": "COBRANDO FRETE", "answer": "Bom dia tudo bem? peço desculpa, mas infelizmente o frete gratis não e ofertado pelos vendedores e sim pela propria plataforma shopee para algumas regiões, por \nconta disso não temos controle sobre o valor cobrado."}, {"category": "Frete, Endereço & Rastreio", "question": "MUDAR ENDEREÇO", "answer": "Oii, tudo bem? Peço desculpas, eu não tenho acesso para trocar endereço de entrega, o único que pode fazer isso e o shopee, ou cancelando o pedido e \nrefazendo."}, {"category": "Frete, Endereço & Rastreio", "question": "COBRANDO TAXA", "answer": "Oii tudo bem? A shopee não cobra nada fora do aplicativo, qualquer coisa cobrada fora do aplicativo shopee e golpe, peço que denuncie."}, {"category": "Frete, Endereço & Rastreio", "question": "Quero o rastreio do pedido", "answer": "Oii tudo bem? Já foi enviado, para fazer o rastreio e só entrar dentro do seu pedido, na propria shopee, os envios são feitos pela shopee \nexpress"}, {"category": "Frete, Endereço & Rastreio", "question": "Envia por onde?", "answer": "Oii tudo bem? Os envios são feitos pela shopee express"}, {"category": "Frete, Endereço & Rastreio", "question": "Quanto fica o frete?", "answer": "Oii tudo bem? O calculo do frete e feito dentro do proprio anuncio"}, {"category": "Pós-venda & Reclamações", "question": "Devoluções, trocas e reembolso", "answer": "As devoluções, trocas e reembolso são feitas pela shopee. E preciso \ndevolver todo o kit. Para fazer isso, vá até “A caminho” em “Minhas \n\ncompras” através da guia “Eu“ > selecione o pedido > clique em \n“Pedido de Reembolso“. Em seguida, selecione o motivo de \n\ndevolução/reembolso > escolha a “Razão” > forneça evidência e \ndescrição (se aplicável) > clique em ”Enviar”."}, {"category": "Pós-venda & Reclamações", "question": "OPÇÃO 3 – Envio nova peça", "answer": "Para a opção 3 envio de uma nova peça sem precisar devolver nada, Só precisa \ncomprar este anúncio simbólico de R$ 2,00 que estou te enviando, nele você \n\nconsegue verificar o valor do frete. Ele serve apenas para gerar a etiqueta de envio \nda sua nova peça, caso tenha um cupom da Shopee, pode usar para ganhar frete \n\ngrátis. Depois disso, é só acompanhar o rastreio direto pelo pedido na Shopee. \nAssim você recebe rapidinho a peça nova, de forma prática e segura. 💖"}, {"category": "Pós-venda & Reclamações", "question": "Reclamação — quebrado, sem foto", "answer": "Oii, espero que esteja bem. Sinto muito por isso! Para que eu possa te ajudar \nda melhor forma, você poderia me enviar uma foto do item? Assim consigo \n\nentender melhor o que aconteceu e buscar a melhor solução para você."}, {"category": "Pós-venda & Reclamações", "question": "Reclamação cilindro quebrado — com foto", "answer": "Olá! Sentimos muito pelo ocorrido. Podemos resolver de 3 formas:\n 1 Reembolso parcial — você fica com o produto e recebe parte do valor de volta.\n\n2 Devolução pelo app da Shopee — com reembolso total após o retorno.\n3 Envio de nova peça — sem custo pela peça, você paga apenas o frete, e não \n\nprecisa devolver nada.\nMe avisa qual opção prefere que resolvo tudo por aqui!"}, {"category": "Pós-venda & Reclamações", "question": "Reclamação arco quebrado — com foto", "answer": "Oii, tudo bem? Peço mil desculpas. Posso te enviar peças \nnovas para repor as quebradas. Pode ser?"}, {"category": "Pós-venda & Reclamações", "question": "OPÇÃO 1 – Reembolso parcial (como solicitar)", "answer": "Olá! Para solicitar o reembolso parcial, siga estes passos: 1- Acesse \nMinhas Compras no app da Shopee 2- Selecione o pedido 3- Clique \nem Devolver/Reembolsar 4- Escolha Reembolso Parcial e adicione \n\nfotos e descrição do problema. Qualquer dúvida, estamos aqui para \najudar!. "}, {"category": "Itens faltando & Brindes", "question": "FALTA brinde", "answer": "Olá tudo bem? Peço desculpas \nem nome da Casa Rosa pelo \nnosso erro, eu posso estar te \n\nenviando o brinde, ou se \npreferir posso te dar um \n\ncupom de 30% de desconto \npara a proxima compra."}, {"category": "Itens faltando & Brindes", "question": "FALTA cilindro", "answer": "Olá, tudo bem? Quero pedir desculpas pelo transtorno. \nInfelizmente, as outras peças parecem ter sido extraviado pela \n\ntransportadora devido ao tamanho. Para resolver isso \nrapidamente, posso reembolsar o valor referente ao kit que \n\nfaltou, permitindo que você compre outro e receba o produto o \nquanto antes.\n\nPara agilizar o processo, por favor, abra um pedido de \nreembolso e informe que se trata de um reembolso parcial, \n\nconforme descrito no próprio pedido. Assim que isso for feito, \nliberarei o valor para você.\n\nSe tiver qualquer dúvida ou precisar de mais alguma coisa, \nestou aqui para ajudar!"}, {"category": "Itens faltando & Brindes", "question": "PEÇA FALTANDO", "answer": "Olá tudo bem? Peço desculpas em \nnome da Casa Rosa pelo nosso erro, \neu posso estar te enviando as peças \nque faltaram pode ser? Só me passa \n\ncertinho quais foram as peças"}, {"category": "Informações de Produto", "question": "Medidas – Mini painel e arcos", "answer": "Mini painel brinde dos cilindros tem 28cm x 28cmMINI\nO arco redondo P tem 80cm x 80cm no arco e com o suporte ele fica com 1.50m de alturaP5\nO arco romano com borda tem 1.85m x 91cm, e também pode ser montado com 1,10x91P3\n\nP4 O arco redondo G tem 1.50m x 1.50m no arco e com o suporte ele fica com 2.00m de altura\n\nA11 O arco romano sem borda tem 1.75m x 91cm, e também pode ser montado com 1,10x91\n\nT6 Trio de Cilindros; G 80CM X 50CM / M 58cm x 43cm / P 45cm x 36cm"}];

btnSeed.addEventListener('click', async () => {
  await ensureSeed();
});

async function ensureSeed() {
  const snap = await getDocs(query(col, limit(1)));
  if(!snap.empty) {
    alert('A coleção já possui dados. Nenhuma ação realizada.');
    return;
  }
  for (const item of seedPayload) {
    await addDoc(col, {
      ...item,
      createdBy: currentUser?.uid || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await ensurePosSeed();
  alert('Base carregada com sucesso.');
  await reload();
}

async function reload() {
  await Promise.all([
    fetchAll(),
    fetchPosCards()
  ]);
  renderTabs();
  renderCatDatalist();
  renderList(searchInput.value.trim());
}
