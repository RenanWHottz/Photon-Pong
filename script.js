const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const effectMessage = document.getElementById("effectMessage");
const startButton = document.getElementById("startButton");
const countdownDisplay = document.getElementById("countdownDisplay");
const overlay = document.getElementById("overlay");
const endMessage = document.getElementById("endMessage");
const endText = document.getElementById("endText");
const restartButton = document.getElementById("restartButton");

const largura = canvas.width;
const altura = canvas.height;

const zonaEsquerda = 80;
const zonaDireita = largura - 80;

const bola = {
  x: largura / 2,
  y: altura / 2,
  raio: 10,
  dirX: 1,
  dirY: 0.6,
  speed: 0,
  baseSpeed: 3.2,
  maxSpeed: 10,
  acceleration: 0.25,
  cor: "#0ff"
};

const jogador = {
  x: 20,
  y: altura / 2 - 40,
  largura: 15,
  altura: 80,
  vel: 6,
  cor: "#0f0"
};

const cpu = {
  x: largura - 35,
  y: altura / 2 - 40,
  largura: 15,
  altura: 80,
  baseVel: 5.5,
  vel: 5.5,
  cor: "#f00",
  errorChance: 0,
  maxError: 25
};

let playerScore = 0;
let cpuScore = 0;
const PONTOS_PARA_VENCER = 7;

let ultimaRaquete = null;

let caixaEspecial = null;
let duracaoCaixa = 8000;
let proximoBoxTimer = Date.now() + 9000;

let multiplicadorProximoPonto = 1;
let pontoDuploAte = 0;

const efeitos = {
  crescerRaquete: 0,
  encolherRaquete: 0,
  lentidaoCPU: 0,
  magnetismo: 0,
  miraPrecisa: 0,
  controlesInvertidos: 0
};

let raqueteCrescida = null;
let raqueteEncolhida = null;

const alturasOriginais = {
  jogador: jogador.altura,
  cpu: cpu.altura
};

let teclaCima = false;
let teclaBaixo = false;

document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp") teclaCima = true;
  if (e.key === "ArrowDown") teclaBaixo = true;
});
document.addEventListener("keyup", e => {
  if (e.key === "ArrowUp") teclaCima = false;
  if (e.key === "ArrowDown") teclaBaixo = false;
});

let gameRunning = false;
let roundActive = false;
let countdownActive = false;

startButton.addEventListener("click", () => {
  startButton.style.display = "none";
  endMessage.style.display = "none";
  startMatch();
});

restartButton.addEventListener("click", () => {
  playerScore = 0;
  cpuScore = 0;
  document.getElementById("playerScore").textContent = 0;
  document.getElementById("cpuScore").textContent = 0;
  endMessage.style.display = "none";
  startButton.style.display = "none";
  startMatch();
});

let ultimoFrame = 0;

function atualizar(timestamp) {
  const deltaTime = ultimoFrame
    ? Math.min((timestamp - ultimoFrame) / (1000 / 60), 2)
    : 1;

  ultimoFrame = timestamp;
  moverJogador(deltaTime);
  moverCPU(deltaTime);
  if (roundActive) moverBola(deltaTime);
  controlarCaixaEspecial();
  atualizarEfeitos();
  desenhar();
  requestAnimationFrame(atualizar);
}



function moverJogador(deltaTime) {
  let direcao = 0;
  if (teclaCima) direcao = -1;
  if (teclaBaixo) direcao = 1;
  if (efeitos.controlesInvertidos > Date.now()) direcao *= -1;

  if (direcao !== 0) {
    jogador.y += direcao * jogador.vel * deltaTime;
    if (jogador.y < 0) jogador.y = 0;
    if (jogador.y + jogador.altura > altura) jogador.y = altura - jogador.altura;
  }
}


let proximoUpdateCPU = 0;
let alvoCPU = altura / 2;
function moverCPU(deltaTime) {
  if (efeitos.miraPrecisa > Date.now()) return;

  let velocidadeCPU = efeitos.lentidaoCPU > Date.now()
    ? cpu.baseVel * 0.35
    : cpu.baseVel;

  const agora = Date.now();

  // CPU só pensa a cada 120 a 220 ms
  if (agora > proximoUpdateCPU) {

    const delay = 120 + Math.random() * 100; //120 a 220 ms
    proximoUpdateCPU = agora + delay;

    // Previsão padrão
    alvoCPU = bola.y;

    if (bola.dirX > 0) { //Bola indo pra CPU
      const distancia = cpu.x - bola.x;
      const tempo = distancia / (bola.dirX * bola.speed || 0.001);

      let previsao = bola.y + bola.dirY * bola.speed * tempo;

      //Erro proporcional à velocidade da bola
      const propVel = bola.speed / bola.maxSpeed;

      const margemErro = cpu.maxError * (0.6 + propVel * 2.0);

      const erro = ((Math.random() - 0.5) * 2) * margemErro * (0.6 + propVel); //Direção do erro + ajuste de velocidade novamente
      previsao += erro;

      //Limitar previsão dentro do Canvas
      if (previsao < 0) previsao = 0;
      if (previsao > altura) previsao = altura;

      alvoCPU = previsao;
    }
  }

  // Movendo em direção ao alvo
  const centroCPU = cpu.y + cpu.altura / 2;

  if (centroCPU < alvoCPU - 10) { //10 de tolerância
    cpu.y += velocidadeCPU * deltaTime;
  } else if (centroCPU > alvoCPU + 10) {
    cpu.y -= velocidadeCPU * deltaTime;
  }

  if (cpu.y < 0) cpu.y = 0;//lIMITE DO CANVAS
  if (cpu.y + cpu.altura > altura) cpu.y = altura - cpu.altura;
}


function moverBola(deltaTime) {
  // magnetismo
  if (efeitos.magnetismo > Date.now()) {
    const alvoY = jogador.y + jogador.altura / 2;
    bola.dirY += (alvoY - bola.y) * 0.0009 * deltaTime;
    bola.dirY = Math.max(-3, Math.min(3, bola.dirY));
  }

  bola.x += bola.dirX * bola.speed * deltaTime;
  bola.y += bola.dirY * bola.speed * deltaTime;

  //paredes
  if (bola.y - bola.raio < 0 || bola.y + bola.raio > altura)
    bola.dirY *= -1;

  // ============================
  //COLISÃO COM JOGADOR
  if (
    bola.x - bola.raio < jogador.x + jogador.largura && //verifica se ultrapassou a raquete
    bola.y > jogador.y &&
    bola.y < jogador.y + jogador.altura
  ) {
    const impacto = bola.y - jogador.y;
    const zona = jogador.altura / 3;

    if (impacto < zona) { 
      bola.dirX = 1.2;
    } 
    else if (impacto > zona * 2) { 
      bola.dirX = 0.8;
    } 
    else { 
      bola.dirX = 1;
    }

    bola.speed = Math.min(bola.speed + bola.acceleration, bola.maxSpeed);
    bola.x = jogador.x + jogador.largura + bola.raio; //posiciona ao lado da raquete
    ultimaRaquete = "jogador";
  }

  // ============================
  //COLISÃO COM CPU

  if (
    bola.x + bola.raio > cpu.x && 
    bola.y > cpu.y &&
    bola.y < cpu.y + cpu.altura
  ) {
    const impacto = bola.y - cpu.y;
    const zona = cpu.altura / 3;

    if (impacto < zona) {
      bola.dirX = -1.2;
    } 
    else if (impacto > zona * 2) {
      bola.dirX = -0.8;
    } 
    else {
      bola.dirX = -1;
    }

    bola.speed = Math.min(bola.speed + bola.acceleration, bola.maxSpeed);
    bola.x = cpu.x - bola.raio;
    ultimaRaquete = "cpu";
  }

  if (caixaEspecial && colisaoComCaixa()) {
    if (ultimaRaquete) {
      ativarEfeito(caixaEspecial.type);
    }
    caixaEspecial = null;
  }

  // ponto
  if (bola.x + bola.raio < 0) {
    cpuScore += multiplicadorProximoPonto;
    resetarEfeitos();
    document.getElementById("cpuScore").textContent = cpuScore;
    if (checkMatchEnd()) return;
    iniciarContagemRound();
  }

  if (bola.x - bola.raio > largura) {
    playerScore += multiplicadorProximoPonto;
    resetarEfeitos();
    document.getElementById("playerScore").textContent = playerScore;
    if (checkMatchEnd()) return;
    iniciarContagemRound();
  }
}

function checkMatchEnd() {
  if (playerScore >= PONTOS_PARA_VENCER || cpuScore >= PONTOS_PARA_VENCER) {
    roundActive = false;
    gameRunning = false;
    endText.textContent =
      playerScore >= PONTOS_PARA_VENCER ? "🏆 Você venceu!" : "🤖 A CPU venceu!";
    endMessage.style.display = "block";
    return true;
  }
  return false;
}

function controlarCaixaEspecial() {
  const agora = Date.now();

  if (caixaEspecial && agora > caixaEspecial.expireAt) caixaEspecial = null;

  if (!caixaEspecial && agora > proximoBoxTimer) {
    criarCaixaEspecial();
    proximoBoxTimer = agora + 8000 + Math.random() * 6000;
  }

  if (pontoDuploAte < agora) {
    multiplicadorProximoPonto = 1;
    if (effectMessage.textContent.startsWith("PONTO:"))
      effectMessage.textContent = "";
  }
}

function criarCaixaEspecial() {
  let x;
  do {
    x = Math.random() * (largura - 120) + 60;
  } while (x < zonaEsquerda || x + 30 > zonaDireita);

  let y = Math.random() * (altura - 80) + 40;

  const tipos = [
    "pontoDuplo",
    "crescerRaquete",
    "encolherRaquete",
    "lentidaoCPU",
    "magnetismo",
    "miraPrecisa",
    "controlesInvertidos"
  ];

  caixaEspecial = {
    x,
    y,
    width: 30,
    height: 30,
    type: tipos[Math.floor(Math.random() * tipos.length)],
    expireAt: Date.now() + duracaoCaixa
  };
}

function colisaoComCaixa() {
  return (
    bola.x + bola.raio > caixaEspecial.x &&
    bola.x - bola.raio < caixaEspecial.x + caixaEspecial.width &&
    bola.y + bola.raio > caixaEspecial.y &&
    bola.y - bola.raio < caixaEspecial.y + caixaEspecial.height
  );
}

function ativarEfeito(tipo) {
  const agora = Date.now();
  const raqueteAfetada = ultimaRaquete;

  if (["crescerRaquete", "encolherRaquete"].includes(tipo) && !raqueteAfetada) {
    return;
  }

  resetarEfeitos();

  let nome = {
    pontoDuplo: "PONTO DUPLO!",
    crescerRaquete: "RAQUETE CRESCE",
    encolherRaquete: "RAQUETE ENCOLHE",
    lentidaoCPU: "LENTIDÃO NA CPU",
    magnetismo: "MAGNETISMO",
    miraPrecisa: "CPU CONGELADA",
    controlesInvertidos: "CONTROLES INVERTIDOS"
  }[tipo] || tipo;

  effectMessage.textContent = nome;

  if (tipo === "pontoDuplo") {
    multiplicadorProximoPonto = 2;
    pontoDuploAte = agora + 7000;
    return;
  }

  if (tipo === "crescerRaquete") {
    efeitos.crescerRaquete = agora + 7000;
    raqueteCrescida = raqueteAfetada;

    if (raqueteAfetada === "jogador") {
      jogador.altura = 120;
    } else {
      cpu.altura = 120;
    }
  }

  if (tipo === "encolherRaquete") {
    efeitos.encolherRaquete = agora + 7000;
    raqueteEncolhida = raqueteAfetada;

    if (raqueteAfetada === "jogador") {
      jogador.altura = 50;
    } else {
      cpu.altura = 50;
    }
  }

  if (tipo === "lentidaoCPU")
    efeitos.lentidaoCPU = agora + 5000;

  if (tipo === "magnetismo")
    efeitos.magnetismo = agora + 6000;

  if (tipo === "miraPrecisa")
    efeitos.miraPrecisa = agora + 2000;

  if (tipo === "controlesInvertidos")
    efeitos.controlesInvertidos = agora + 7000;
}


function resetarEfeitos() {
  jogador.altura = alturasOriginais.jogador;
  cpu.altura = alturasOriginais.cpu;

  Object.keys(efeitos).forEach(efeito => {
    efeitos[efeito] = 0;
  });

  raqueteCrescida = null;
  raqueteEncolhida = null;
  multiplicadorProximoPonto = 1;
  pontoDuploAte = 0;
  effectMessage.textContent = "";
  ultimaRaquete = null;
}


function atualizarEfeitos() {
  const agora = Date.now();

  if (efeitos.crescerRaquete && efeitos.crescerRaquete <= agora) {
    if (raqueteCrescida === "jogador") {
      jogador.altura = alturasOriginais.jogador;
    } else if (raqueteCrescida === "cpu") {
      cpu.altura = alturasOriginais.cpu;
    }
    raqueteCrescida = null;
    efeitos.crescerRaquete = 0;
  }

  if (efeitos.encolherRaquete && efeitos.encolherRaquete <= agora) {
    if (raqueteEncolhida === "jogador") {
      jogador.altura = alturasOriginais.jogador;
    } else if (raqueteEncolhida === "cpu") {
      cpu.altura = alturasOriginais.cpu;
    }
    raqueteEncolhida = null;
    efeitos.encolherRaquete = 0;
  }

  // limpar mensagem se nenhum efeito ativo
  const algumAtivo =
    efeitos.crescerRaquete > agora ||
    efeitos.encolherRaquete > agora ||
    efeitos.lentidaoCPU > agora ||
    efeitos.magnetismo > agora ||
    efeitos.miraPrecisa > agora ||
    efeitos.controlesInvertidos > agora ||
    pontoDuploAte > agora;

  if (!algumAtivo)
    effectMessage.textContent = "";
}

//MATCH
function startMatch() {
  gameRunning = true;
  resetarEfeitos();
  resetarBola(true);
  iniciarContagemRound();
}

function iniciarContagemRound() {
  if (countdownActive) return;

  countdownActive = true;
  roundActive = false;
  countdownDisplay.style.display = "block";

  const steps = ["3", "2", "1", "JÁ!"];
  let i = 0;

  countdownDisplay.textContent = steps[i++];
  const tick = () => {
    if (i < steps.length) {
      setTimeout(() => {
        countdownDisplay.textContent = steps[i++];
        tick();
      }, 700);
    } else {
      setTimeout(() => {
        countdownDisplay.style.display = "none";
        countdownActive = false;
        comecarRound();
      }, 300);
    }
  };
  setTimeout(tick, 700);
}

function comecarRound() {
  resetarBola(true);
  bola.dirX = Math.random() > 0.5 ? 1 : -1;
  bola.dirY = Math.random() > 0.5 ? 1 : -1;
  bola.speed = bola.baseSpeed;
  roundActive = true;
}

function resetarBola(keepStopped = false) {
  bola.x = largura / 2;
  bola.y = altura / 2;
  bola.dirX = Math.random() > 0.5 ? 1 : -1;
  bola.dirY = Math.random() > 0.5 ? 1 : -1;

  if (keepStopped) {
    bola.speed = 0;
    roundActive = false;
  } else {
    bola.speed = bola.baseSpeed;
    roundActive = true;
  }
}

// RENDER
function desenhar() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, largura, altura);

  ctx.strokeStyle = "#0ff";
  ctx.setLineDash([5, 15]);
  ctx.beginPath();
  ctx.moveTo(largura / 2, 0);
  ctx.lineTo(largura / 2, altura);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = jogador.cor;
  ctx.fillRect(jogador.x, jogador.y, jogador.largura, jogador.altura);

  ctx.fillStyle = cpu.cor;
  ctx.fillRect(cpu.x, cpu.y, cpu.largura, cpu.altura);

  ctx.beginPath();
  ctx.arc(bola.x, bola.y, bola.raio, 0, Math.PI * 2);
  ctx.fillStyle = bola.cor;
  ctx.fill();

  if (caixaEspecial) {
    if (caixaEspecial.type === "pontoDuplo") ctx.fillStyle = "#ff0";
    else if (caixaEspecial.type === "crescerRaquete") ctx.fillStyle = "#0f0";
    else if (caixaEspecial.type === "encolherRaquete") ctx.fillStyle = "#f0f";
    else if (caixaEspecial.type === "lentidaoCPU") ctx.fillStyle = "#00a";
    else if (caixaEspecial.type === "magnetismo") ctx.fillStyle = "#0ff";
    else if (caixaEspecial.type === "miraPrecisa") ctx.fillStyle = "#f90";
    else if (caixaEspecial.type === "controlesInvertidos") ctx.fillStyle = "#fff";
    else ctx.fillStyle = "#888";

    ctx.fillRect(caixaEspecial.x, caixaEspecial.y, caixaEspecial.width, caixaEspecial.height);
  }

  if (effectMessage.textContent) {
    ctx.font = "22px Orbitron, sans-serif";
    ctx.fillStyle = "#ff0";
    ctx.textAlign = "center";
    ctx.fillText(effectMessage.textContent, largura / 2, 80);
  }
}

requestAnimationFrame(atualizar);

startButton.style.display = "block";
endMessage.style.display = "none";
countdownDisplay.style.display = "none";
effectMessage.textContent = "";
