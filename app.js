// BTX Prontuário (sem modal/sem tela de entrada) — à prova de trava.
// Tudo na mesma página. Autosave robusto. PDFs sob demanda (jsPDF).
// Autor: você + ChatGPT

const LS_KEY = "btx_prontuario_sem_modal_v1";

const state = loadState() ?? {
  paciente: { nome: "", telefone: "", nascimento: "", documento: "" },
  visita: {
    queixa: "DOR DE DENTE",
    subjetivo: "PACIENTE RELATA DOR NO DENTE 26 QUE INICIOU CERCA DE DOIS DIAS",
    objetivo: "BOM ESTADO GERAL, NEGA COMORBIDADES.\nNEGA ALERGIAS.",
    avaliacao: "PULPITE IRREVERSIVEL",
    conduta: "EXTRAÇÃO DENTARIA",
    receitaTexto: "",
    receitaModelo: "",
    status: "aberto",
    updatedAt: Date.now(),
  },
};

registerSW();
render();
autosaveLoop();

function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="wrap">
      <div class="topbar">
        <div class="brand">
          <div class="badge" aria-hidden="true"></div>
          <div>
            <h1>BTX Prontuário</h1>
            <small>Sem tela de entrada • sem modal • autosave ativo</small>
          </div>
        </div>

        <div class="actions">
          <button class="btn ghost" id="btnNovo" title="Limpa a visita atual e inicia uma nova">Novo</button>
          <button class="btn" id="btnMarcarFalta" title="Alterna entre aberto/falta">Marcar como falta</button>
          <button class="btn primary" id="btnSalvar" title="Força salvar agora">Salvar</button>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h2>Visita / Evolução</h2>

          <div class="field">
            <div class="label"><span>Queixa principal</span><span class="small">${fmtStatus(state.visita.status)}</span></div>
            <input class="input" id="queixa" value="${esc(state.visita.queixa)}" />
          </div>

          <div class="field">
            <div class="label"><span>Subjetivo</span><span class="small">História</span></div>
            <textarea class="textarea" id="subjetivo">${esc(state.visita.subjetivo)}</textarea>
          </div>

          <div class="field">
            <div class="label"><span>Objetivo</span><span class="small">Exame / Achados</span></div>
            <textarea class="textarea" id="objetivo">${esc(state.visita.objetivo)}</textarea>
          </div>

          <div class="field">
            <div class="label"><span>Avaliação</span><span class="small">Hipótese / Diagnóstico</span></div>
            <textarea class="textarea" id="avaliacao">${esc(state.visita.avaliacao)}</textarea>
          </div>

          <div class="field">
            <div class="label"><span>Plano / Conduta</span><span class="small">Tratamento</span></div>
            <textarea class="textarea" id="conduta">${esc(state.visita.conduta)}</textarea>
          </div>

          <div class="hr"></div>

          <div class="kpi">
            <div class="pill"><b>Autosave:</b> ativo</div>
            <div class="pill"><b>Última atualização:</b> ${new Date(state.visita.updatedAt).toLocaleString()}</div>
          </div>
        </div>

        <div class="card">
          <h2>Receita e Documentos</h2>

          <div class="notice">
            <div>🛡️</div>
            <div>
              <div><b style="color:var(--text)">Zero modal. Zero “X”.</b></div>
              <div>Receituário e PDFs ficam sempre aqui — não tem como travar por overlay.</div>
            </div>
          </div>

          <div class="hr"></div>

          <div class="field">
            <div class="label"><span>Receituário rápido</span><span class="small">1 clique</span></div>
            <div class="row" id="chips"></div>
            <div class="small" style="margin-top:8px">Escolha um modelo e ajuste no texto livre.</div>
          </div>

          <div class="field">
            <div class="label"><span>Receita (texto livre)</span><span class="small">vai pro PDF</span></div>
            <textarea class="textarea" id="receitaTexto" placeholder="Escreva a receita aqui...">${esc(state.visita.receitaTexto)}</textarea>
          </div>

          <div class="hr"></div>

          <div class="label"><span>Documentos</span><span class="small">gerados sob demanda</span></div>
          <div class="row">
            <button class="btn" id="btnPdfReceita">PDF Receita</button>
            <button class="btn" id="btnRecibo">Recibo</button>
            <button class="btn" id="btnLaudo">Laudo simples</button>
          </div>

          <div class="small" style="margin-top:10px">
            Os PDFs são gerados na hora (não pesam o banco).
          </div>

          <div class="hr"></div>

          <div class="field">
            <div class="label"><span>Dados do paciente (rápido)</span><span class="small">pra puxar no PDF</span></div>
            <input class="input" id="pnome" placeholder="Nome" value="${esc(state.paciente.nome)}" style="margin-bottom:8px" />
            <input class="input" id="pdoc" placeholder="Documento" value="${esc(state.paciente.documento)}" style="margin-bottom:8px" />
            <input class="input" id="ptel" placeholder="Telefone" value="${esc(state.paciente.telefone)}" style="margin-bottom:8px" />
            <input class="input" id="pnasc" placeholder="Nascimento" value="${esc(state.paciente.nascimento)}" />
          </div>

          <div class="notice" style="margin-top:12px">
            <div>📌</div>
            <div>
              <div><b style="color:var(--text)">Dica:</b> instalar como app</div>
              <div>No Chrome: menu ⋮ → “Instalar app”. Aí ele vira PWA de verdade.</div>
            </div>
          </div>

        </div>
      </div>

      <div class="toast" id="toast"></div>
    </div>
  `;

  mountChips();
  bindEvents();
}

function mountChips(){
  const chipsWrap = document.getElementById("chips");
  const modelos = getModelosReceita();

  chipsWrap.innerHTML = modelos.map(m => `
    <div class="chip ${state.visita.receitaModelo===m.id ? "active":""}" data-id="${m.id}">
      ${m.label}
    </div>
  `).join("");

  chipsWrap.querySelectorAll(".chip").forEach(chip=>{
    chip.addEventListener("click", ()=>{
      const id = chip.getAttribute("data-id");
      const modelo = modelos.find(x=>x.id===id);
      state.visita.receitaModelo = id;

      const atual = (state.visita.receitaTexto || "").trim();
      const textoModelo = (modelo?.texto || "").trim();

      state.visita.receitaTexto = atual
        ? (atual + "\n\n" + textoModelo)
        : textoModelo;

      touch();
      saveState();
      toast("Modelo aplicado na receita.", "ok");
      render();
    });
  });
}

function bindEvents(){
  // Inputs → atualizam estado (autosave imediato)
  onChange("queixa", v => state.visita.queixa = v);
  onChange("subjetivo", v => state.visita.subjetivo = v);
  onChange("objetivo", v => state.visita.objetivo = v);
  onChange("avaliacao", v => state.visita.avaliacao = v);
  onChange("conduta", v => state.visita.conduta = v);
  onChange("receitaTexto", v => state.visita.receitaTexto = v);

  onChange("pnome", v => state.paciente.nome = v);
  onChange("pdoc", v => state.paciente.documento = v);
  onChange("ptel", v => state.paciente.telefone = v);
  onChange("pnasc", v => state.paciente.nascimento = v);

  document.getElementById("btnSalvar").addEventListener("click", ()=>{
    touch(); saveState();
    toast("Salvo localmente ✅", "ok");
    render();
  });

  document.getElementById("btnMarcarFalta").addEventListener("click", ()=>{
    state.visita.status = (state.visita.status === "falta") ? "aberto" : "falta";
    touch(); saveState();
    toast(state.visita.status === "falta" ? "Marcado como falta." : "Voltou para aberto.", "ok");
    render();
  });

  document.getElementById("btnNovo").addEventListener("click", ()=>{
    // Sem modal de confirmação (pra não travar). Se quiser, depois a gente adiciona "desfazer" em 1 clique.
    state.visita = {
      queixa:"", subjetivo:"", objetivo:"", avaliacao:"", conduta:"",
      receitaTexto:"", receitaModelo:"",
      status:"aberto",
      updatedAt: Date.now(),
    };
    saveState();
    toast("Nova visita criada.", "ok");
    render();
  });

  document.getElementById("btnPdfReceita").addEventListener("click", gerarPdfReceita);
  document.getElementById("btnRecibo").addEventListener("click", gerarRecibo);
  document.getElementById("btnLaudo").addEventListener("click", gerarLaudo);
}

function onChange(id, setter){
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener("input", ()=>{
    setter(el.value);
    touch();
    saveState(); // salva sempre, sem frescura
  });
}

function touch(){ state.visita.updatedAt = Date.now(); }

// ---------------- PDFs ----------------
function gerarPdfReceita(){
  try{
    const { jsPDF } = window.jspdf || {};
    if(!jsPDF) throw new Error("jsPDF não carregou (sem internet?)");

    const doc = new jsPDF({ unit:"mm", format:"a4" });
    const m = 14;

    doc.setFont("helvetica","bold");
    doc.setFontSize(14);
    doc.text("RECEITUÁRIO", m, 18);

    doc.setFont("helvetica","normal");
    doc.setFontSize(11);
    doc.text(`Paciente: ${state.paciente.nome || "__________"}`, m, 28);
    doc.text(`Documento: ${state.paciente.documento || "__________"}`, m, 34);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 150, 28);

    // Borda elegante que não "quebra"
    doc.setDrawColor(60);
    doc.rect(m, 40, 210 - m*2, 240);

    const texto = (state.visita.receitaTexto || "").trim() || "—";
    const linhas = doc.splitTextToSize(texto, 210 - m*2 - 8);
    doc.text(linhas, m+4, 50);

    doc.save(`receita_${safeFile(state.paciente.nome)}_${Date.now()}.pdf`);
    toast("PDF de receita gerado.", "ok");
  }catch(e){
    toast(`Erro no PDF: ${e.message}`, "err");
  }
}

function gerarRecibo(){
  try{
    const { jsPDF } = window.jspdf || {};
    if(!jsPDF) throw new Error("jsPDF não carregou (sem internet?)");

    const doc = new jsPDF({ unit:"mm", format:"a4" });
    const m = 14;

    doc.setFont("helvetica","bold");
    doc.setFontSize(14);
    doc.text("RECIBO", m, 18);

    doc.setFont("helvetica","normal");
    doc.setFontSize(11);
    doc.text(`Recebi de: ${state.paciente.nome || "__________"}`, m, 32);
    doc.text(`Documento: ${state.paciente.documento || "__________"}`, m, 38);
    doc.text(`Referente a: Procedimento odontológico`, m, 46);
    doc.text(`Valor: R$ ________`, m, 54);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, m, 64);

    doc.text("Assinatura: ________________________________", m, 90);
    doc.save(`recibo_${safeFile(state.paciente.nome)}_${Date.now()}.pdf`);
    toast("Recibo gerado.", "ok");
  }catch(e){
    toast(`Erro no recibo: ${e.message}`, "err");
  }
}

function gerarLaudo(){
  try{
    const { jsPDF } = window.jspdf || {};
    if(!jsPDF) throw new Error("jsPDF não carregou (sem internet?)");

    const doc = new jsPDF({ unit:"mm", format:"a4" });
    const m = 14;

    doc.setFont("helvetica","bold");
    doc.setFontSize(14);
    doc.text("LAUDO SIMPLES", m, 18);

    doc.setFont("helvetica","normal");
    doc.setFontSize(11);
    doc.text(`Paciente: ${state.paciente.nome || "__________"}`, m, 32);
    doc.text(`Queixa: ${state.visita.queixa || "—"}`, m, 40);

    doc.setFont("helvetica","bold");
    doc.text("Evolução:", m, 52);
    doc.setFont("helvetica","normal");

    const evol = [
      `Subjetivo: ${state.visita.subjetivo || "—"}`,
      `Objetivo: ${state.visita.objetivo || "—"}`,
      `Avaliação: ${state.visita.avaliacao || "—"}`,
      `Conduta: ${state.visita.conduta || "—"}`
    ].join("\n\n");

    const linhas = doc.splitTextToSize(evol, 210 - m*2);
    doc.text(linhas, m, 60);

    doc.save(`laudo_${safeFile(state.paciente.nome)}_${Date.now()}.pdf`);
    toast("Laudo simples gerado.", "ok");
  }catch(e){
    toast(`Erro no laudo: ${e.message}`, "err");
  }
}

// ---------------- Storage / Autosave ----------------
function saveState(){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }catch(e){
    // se localStorage falhar, não travar app
    toast("Falha ao salvar no localStorage.", "err");
  }
}

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{
    return null;
  }
}

function autosaveLoop(){
  // Além do save em cada digitação, salva por intervalo
  setInterval(()=>{ try{ saveState(); }catch{} }, 5000);
}

// ---------------- PWA ----------------
function registerSW(){
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async ()=>{
    try{
      await navigator.serviceWorker.register("./sw.js");
    }catch(e){
      // Não travar
      console.warn("SW falhou:", e);
    }
  });
}

// ---------------- Utils ----------------
function toast(msg, type="ok"){
  const wrap = document.getElementById("toast");
  if(!wrap) return;
  const el = document.createElement("div");
  el.className = `t ${type==="err" ? "err" : "ok"}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=> el.remove(), 2600);
}

function fmtStatus(s){
  if(s==="falta") return "status: falta";
  return "status: aberto";
}

function esc(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function safeFile(name){
  return (name || "paciente")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");
}

function getModelosReceita(){
  // Observação: modelos são genéricos e devem ser ajustados ao seu protocolo e ao paciente.
  return [
    { id:"ana1", label:"Analgésico 1", texto:`Dipirona 500mg\nTomar 1 comprimido a cada 6 horas se dor, por 3 dias.` },
    { id:"ana2", label:"Analgésico 2", texto:`Paracetamol 750mg\nTomar 1 comprimido a cada 8 horas se dor, por 3 dias.` },
    { id:"anti1", label:"Anti-inflam. 1", texto:`Ibuprofeno 600mg\nTomar 1 comprimido a cada 8 horas por 3 dias, após alimentação.` },
    { id:"anti2", label:"Anti-inflam. 2", texto:`Naproxeno 500mg\nTomar 1 comprimido a cada 12 horas por 3 dias, após alimentação.` },
    { id:"ab1", label:"Antibiótico 1", texto:`Amoxicilina 500mg\nTomar 1 cápsula a cada 8 horas por 7 dias.` },
    { id:"ab2", label:"Antibiótico 2", texto:`Clindamicina 300mg\nTomar 1 cápsula a cada 6 horas por 7 dias.` },
  ];
}
