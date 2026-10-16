const { CIDADE, SUPABASE_URL, SUPABASE_ANON_KEY } = window.PF_CONFIG;
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
let ME = null;
$("#cidade").textContent = CIDADE; $("#cidadeLogin").textContent = "Sistema Integrado — " + CIDADE;

const fmt = t => new Date(t).toLocaleString("pt-BR");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ok = ({ data, error }) => { if (error) { alert(error.message); throw error; } return data; };
const log = msg => sb.from("logs").insert({ msg });

const MODULOS = {
  ocorrencias: { titulo: "Ocorrências", campos: [["titulo","Título"],["local","Local"],["envolvidos","Envolvidos"],["descricao","Descrição","textarea"],["status","Status","select",["Aberta","Em investigação","Encerrada"]]], col: ["titulo","local","status","autor"] },
  procurados: { titulo: "Procurados", campos: [["nome","Nome"],["rg","RG / Passaporte"],["crimes","Crimes"],["periculosidade","Periculosidade","select",["Baixa","Média","Alta","Extrema"]],["recompensa","Recompensa (R$)"],["status","Status","select",["Procurado","Capturado"]]], col: ["nome","rg","crimes","periculosidade","status"] },
  mandados: { titulo: "Mandados", campos: [["alvo","Alvo"],["tipo","Tipo","select",["Prisão","Busca e Apreensão","Condução Coercitiva"]],["juiz","Juiz responsável"],["motivo","Motivo","textarea"],["status","Status","select",["Ativo","Cumprido","Revogado"]]], col: ["alvo","tipo","juiz","status"] },
  viaturas: { titulo: "Viaturas", campos: [["placa","Placa"],["modelo","Modelo"],["prefixo","Prefixo"],["status","Status","select",["Disponível","Em patrulha","Manutenção"]]], col: ["prefixo","placa","modelo","status"] }
};

$("#fLogin").onsubmit = async e => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
  const { error } = await sb.auth.signInWithPassword({ email: f.email, password: f.pass });
  if (error) return $("#erroLogin").textContent = "E-mail ou senha inválidos";
  iniciar();
};
$("#sair").onclick = async () => { await sb.auth.signOut(); location.reload(); };

async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  ME = ok(await sb.from("profiles").select("*").eq("id", session.user.id).single());
  $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
  $("#meNome").textContent = ME.nome; $("#meCargo").textContent = ME.cargo; abrir("dash");
}

function abrir(p) {
  document.querySelectorAll("nav a").forEach(a => a.classList.toggle("ativo", a.dataset.p === p));
  if (p === "dash") return dash(); if (p === "agentes") return agentes(); lista(p);
}
document.querySelectorAll("nav a").forEach(a => a.onclick = () => abrir(a.dataset.p));

const conta = async (t, f) => { let q = sb.from(t).select("*", { count: "exact", head: true }); if (f) q = q.eq(...f); return (await q).count || 0; };

async function dash() {
  const [oc, pr, ma, vi, ag] = await Promise.all([conta("ocorrencias"), conta("procurados", ["status","Procurado"]), conta("mandados", ["status","Ativo"]), conta("viaturas"), conta("profiles")]);
  const logs = ok(await sb.from("logs").select("*").order("criado", { ascending: false }).limit(10));
  $("#main").innerHTML = `<div class="topo"><h2>Painel — ${esc(CIDADE)}</h2><span>${new Date().toLocaleDateString("pt-BR")}</span></div>
  <div class="stats"><div class="stat"><b>${oc}</b>Ocorrências</div><div class="stat"><b>${pr}</b>Procurados</div>
  <div class="stat"><b>${ma}</b>Mandados ativos</div><div class="stat"><b>${vi}</b>Viaturas</div><div class="stat"><b>${ag}</b>Agentes</div></div>
  <div class="box"><h3>Atividade recente</h3><ul>${logs.map(l => `<li>${fmt(l.criado)} — ${esc(l.autor)} ${esc(l.msg)}</li>`).join("") || "<li>Nenhuma atividade</li>"}</ul></div>`;
}

async function lista(col, filtro = "") {
  const m = MODULOS[col];
  const itens = ok(await sb.from(col).select("*").order("criado", { ascending: false }));
  const vis = itens.filter(i => JSON.stringify(i).toLowerCase().includes(filtro.toLowerCase()));
  $("#main").innerHTML = `<div class="topo"><h2>${m.titulo}</h2><div style="display:flex;gap:8px"><input class="busca" id="busca" placeholder="Pesquisar..." value="${esc(filtro)}"><button id="novo">+ Novo</button></div></div>
  <table><tr>${m.col.map(c => `<th>${m.campos.find(x => x[0] === c)?.[1] || "Autor"}</th>`).join("")}<th>Data</th><th></th></tr>
  ${vis.map(i => `<tr>${m.col.map(c => `<td>${c === "status" ? `<span class="tag ${esc(i[c])}">${esc(i[c])}</span>` : esc(i[c])}</td>`).join("")}<td>${fmt(i.criado)}</td>
  <td><button data-ed="${i.id}">Editar</button> <button class="del" data-del="${i.id}">X</button></td></tr>`).join("") || `<tr><td colspan="9">Nenhum registro</td></tr>`}</table>`;
  $("#busca").oninput = e => { clearTimeout(window._b); window._b = setTimeout(() => lista(col, e.target.value), 300); };
  $("#novo").onclick = () => form(col);
  document.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => form(col, itens.find(i => i.id == b.dataset.ed)));
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Remover registro?")) return;
    ok(await sb.from(col).delete().eq("id", b.dataset.del)); log("removeu item de " + col); lista(col, filtro);
  });
}

function form(col, item = {}) {
  const m = MODULOS[col];
  $("#fModal").innerHTML = `<h3>${item.id ? "Editar" : "Novo"} — ${m.titulo}</h3>` + m.campos.map(([k, l, t, ops]) =>
    t === "select" ? `<label>${l}<select name="${k}">${ops.map(o => `<option ${item[k] === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>`
    : t === "textarea" ? `<label>${l}<textarea name="${k}" rows="4">${esc(item[k])}</textarea></label>`
    : `<label>${l}<input name="${k}" value="${esc(item[k])}"></label>`).join("") +
    `<div style="display:flex;gap:8px"><button>Salvar</button><button type="button" class="sec" id="cancelar">Cancelar</button></div>`;
  $("#modal").classList.remove("hidden");
  $("#cancelar").onclick = () => $("#modal").classList.add("hidden");
  $("#fModal").onsubmit = async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    if (item.id) ok(await sb.from(col).update(d).eq("id", item.id));
    else { ok(await sb.from(col).insert({ ...d, autor: ME.nome })); log("registrou em " + col); }
    $("#modal").classList.add("hidden"); lista(col);
  };
}

const CARGOS = ["Agente","Escrivão","Perito","Papiloscopista","Delegado","Superintendente","Diretor-Geral"];
async function agentes() {
  const ag = ok(await sb.from("profiles").select("*").order("nome"));
  const admin = ME.role === "admin";
  $("#main").innerHTML = `<div class="topo"><h2>Agentes</h2></div>
  ${admin ? '<p style="margin-bottom:12px;color:#667">Para cadastrar um agente: Supabase → Authentication → Add user. Ele aparece aqui e você define nome, cargo e permissão.</p>' : ""}
  <table><tr><th>Nome</th><th>E-mail</th><th>Cargo</th><th>Permissão</th><th></th></tr>
  ${ag.map(a => `<tr><td>${esc(a.nome)}</td><td>${esc(a.email)}</td><td>${esc(a.cargo)}</td><td>${a.role}</td><td>${admin ? `<button data-ed="${a.id}">Editar</button>` : ""}</td></tr>`).join("")}</table>`;
  document.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => {
    const a = ag.find(x => x.id === b.dataset.ed);
    $("#fModal").innerHTML = `<h3>Editar agente</h3><input name="nome" value="${esc(a.nome)}" placeholder="Nome">
    <select name="cargo">${CARGOS.map(c => `<option ${a.cargo === c ? "selected" : ""}>${c}</option>`).join("")}</select>
    <select name="role"><option value="agente">Agente</option><option value="admin" ${a.role === "admin" ? "selected" : ""}>Administrador</option></select>
    <div style="display:flex;gap:8px"><button>Salvar</button><button type="button" class="sec" id="cancelar">Cancelar</button></div>`;
    $("#modal").classList.remove("hidden");
    $("#cancelar").onclick = () => $("#modal").classList.add("hidden");
    $("#fModal").onsubmit = async e => { e.preventDefault(); ok(await sb.from("profiles").update(Object.fromEntries(new FormData(e.target))).eq("id", a.id)); $("#modal").classList.add("hidden"); agentes(); };
  });
}

iniciar();
