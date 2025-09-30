// App logic (modular Firebase v9 via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, updateDoc, doc, deleteDoc, limit } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

let currentUser = null;
let currentCategory = 'Todas';
let categories = new Set();
let lastSnapshot = [];

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

async function fetchAll(searchText = '') {
  const qs = query(col, orderBy('category'), orderBy('question'));
  const snap = await getDocs(qs);
  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  lastSnapshot = items;
  categories = new Set(items.map(i => i.category));
  renderTabs();
  renderCatDatalist();
  renderList(searchText);
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
  const filter = (item) => {
    const byCat = (currentCategory === 'Todas' || item.category === currentCategory);
    const bySearch = !searchText || (item.question.toLowerCase().includes(searchText.toLowerCase()) || item.answer.toLowerCase().includes(searchText.toLowerCase()));
    return byCat && bySearch;
  };

  const items = lastSnapshot.filter(filter);
  qaListEl.innerHTML = '';
  if(items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card muted';
    empty.textContent = 'Nenhum item encontrado.';
    qaListEl.appendChild(empty);
    return;
  }

  items.forEach(item => qaListEl.appendChild(renderItem(item)));
}

function renderItem(item) {
  const wrap = document.createElement('article');
  wrap.className = 'qa';

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
    try {
      await navigator.clipboard.writeText(item.answer);
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
  alert('Base carregada com sucesso.');
  await reload();
}

async function reload() {
  await fetchAll(searchInput.value.trim());
}
