// #/about — About the project (Hermes). Bilingual text kept here; EN is the base, PT when LANG === "pt".

import { esc } from "../util.js";
import { LANG } from "../i18n.js";
import { NavBar } from "../components/small.js";

const T = {
  en: {
    eyebrow: "About the project",
    title: "Project Hermes",
    lede: "A messenger between Earth and space: citizens observe our planet and send back what they find to help prepare for the Moon and Mars.",
    sections: [
      {
        h: "Why “Hermes”",
        p: [
          "In Greek mythology, Hermes is the messenger who carries word between worlds. The name reflects the core of this project: citizen science. Anyone can explore the Earth, find a place that may rehearse lunar or Martian conditions, and send that message to the scientific community through our open, collaborative database.",
        ],
      },
      {
        h: "The problem",
        p: [
          "Our field of study is the selection of future landing sites and lunar bases. That choice depends on many factors, including topography, geology, environment and available resources.",
          "Places on Earth with characteristics similar to the Moon or Mars — such as the Atacama Desert, Haughton Crater and Death Valley — let mission teams test equipment and methods before flight. However, these terrestrial analogs are not fully well characterized.",
          "Our challenge is to use open Earth, Moon and Mars data from NASA and other space agencies to identify and characterize new terrestrial analogs for future bases or landing sites — deserts, polar regions, volcanic and arid terrain, caves and other environments that share conditions with the lunar or Martian surface — and to present the findings on a map, visualization or other tool.",
        ],
      },
      {
        h: "1. One giant leap for mankind",
        quote: "“That's one small step for [a] man, one giant leap for mankind.” — Neil Armstrong, 20 July 1969",
        p: [
          "When Neil Armstrong became the first person to walk on the lunar surface, humanity crossed a frontier that had seemed impassable. Now it is time for us to walk together.",
          "Eight years earlier, on 12 April 1961, Soviet cosmonaut Yuri Gagarin became the first human to leave the planet and see the Earth from outside — remembered for the words “The Earth is blue.” His observation changed how we understand our own planet.",
          "Our proposal starts from the inverse premise: instead of looking from space to understand the Earth, we use citizen science to observe the Earth and contribute to what we know about space.",
        ],
      },
      {
        h: "2. What Hermes does",
        p: [
          "Our solution aims not only to expand the database of Earth analogs for exercises and simulations, but also to bring current scientific research closer to both specialists and the general public. Hermes connects Moon and Mars analog environments on Earth — known and new — through a simulation of real activities carried out by NASA, explaining how they work and serving as a database.",
          "The experience is educational and gamified. Visitors learn the criteria used to select viable sites for simulating extraterrestrial conditions, and how to recognize the conditions that make a place on Earth suitable for controlled simulations and equipment tests for space exploration.",
        ],
        steps: [
          ["Learn", "Explore the analog campaigns NASA has already run, documented in its own records, and build knowledge about the topic step by step."],
          ["Explore", "Choose a coordinate you believe is viable and check it in real time against NASA open data and APIs."],
          ["Contribute", "Submit your site to the collaborative map, give your discovery a name and join a shared effort to map Moon and Mars analogs on Earth."],
        ],
      },
      {
        h: "3. Citizen science",
        p: [
          "Hermes strengthens the link between citizens and active participation in science, inspired by citizen-science projects such as Foldit, AI4Mars and Planet Hunters TESS. Through crowdsourcing, users help grow a large collaborative database of candidate analog sites.",
          "Community submissions are proposals, not scientific conclusions: each one shows which criteria the open data supports and which still need evidence.",
        ],
      },
    ],
    cta: [
      ["#/", "Start learning"],
      ["#/explore", "Be an explorer"],
      ["#/sources", "Sources & method"],
    ],
  },
  pt: {
    eyebrow: "Sobre o projeto",
    title: "Projeto Hermes",
    lede: "Um mensageiro entre a Terra e o espaço: cidadãos observam o nosso planeta e enviam o que encontram para ajudar a preparar as missões à Lua e a Marte.",
    sections: [
      {
        h: "Por que “Hermes”",
        p: [
          "Na mitologia grega, Hermes é o mensageiro que leva recados entre mundos. O nome traduz o centro do projeto: a ciência cidadã. Qualquer pessoa pode explorar a Terra, encontrar um lugar que possa simular condições lunares ou marcianas e enviar essa mensagem à comunidade científica por meio do nosso banco de dados aberto e colaborativo.",
        ],
      },
      {
        h: "O problema",
        p: [
          "Nossa pesquisa tem como campo de estudo a seleção de futuros locais de pouso e bases lunares. Essa seleção depende de muitos fatores, incluindo topografia, geologia, ambiente e recursos disponíveis.",
          "Locais na Terra com características análogas às da Lua ou de Marte — como o Deserto do Atacama, a Cratera Haughton e o Vale da Morte — permitem que as equipes de missão testem equipamentos e métodos antes do voo. No entanto, esses análogos terrestres não são totalmente bem caracterizados.",
          "Nosso desafio nasce da busca de usar dados abertos da Terra, da Lua e de Marte, fornecidos pela NASA e outras agências espaciais, para identificar e caracterizar novos análogos terrestres para futuras bases ou locais de pouso — desertos, regiões polares, terrenos vulcânicos e áridos, cavernas e outros ambientes que compartilham condições com a superfície lunar ou marciana — e apresentar as descobertas em um mapa, visualização ou outra ferramenta.",
        ],
      },
      {
        h: "1. Um grande passo para a humanidade",
        quote: "“That's one small step for [a] man, one giant leap for mankind.” — Neil Armstrong, 20 de julho de 1969",
        p: [
          "Quando Neil Armstrong se tornou o primeiro ser humano a caminhar na superfície lunar, a humanidade rompeu uma fronteira até então insuperável. Agora é a hora de caminharmos juntos.",
          "Oito anos antes, em 12 de abril de 1961, o cosmonauta soviético Yuri Gagarin tornou-se o primeiro ser humano a sair do planeta e ver a Terra de fora — lembrado pela frase “A Terra é azul”. Sua observação transformou a nossa concepção sobre o planeta.",
          "Nossa proposta parte da premissa inversa: em vez de olhar do espaço para compreender a Terra, usamos a ciência cidadã para observar a Terra e contribuir com o conhecimento sobre o espaço.",
        ],
      },
      {
        h: "2. O que o Hermes faz",
        p: [
          "Nossa solução busca não apenas ampliar o banco de dados de lugares análogos para exercícios e simulações na Terra, mas estreitar os laços entre os estudos científicos atuais e o público especialista e leigo. O Hermes conecta ambientes análogos à Lua e a Marte na Terra, novos e conhecidos, por meio de uma simulação de atividades realmente promovidas pela NASA, explicando ao público como funcionam e servindo de banco de dados.",
          "A experiência é educativa e gamificada. O visitante aprende os critérios usados na seleção de lugares viáveis para simular condições extraterrestres e passa a identificar as condições que tornam um local na Terra adequado para simulações controladas e testes de equipamentos voltados à exploração espacial.",
        ],
        steps: [
          ["Aprender", "Conheça as campanhas em análogos que a NASA já realizou, documentadas nos seus próprios registros, e construa conhecimento sobre o tema passo a passo."],
          ["Explorar", "Escolha uma coordenada que você acredita ser viável e verifique-a em tempo real com dados abertos e APIs da NASA."],
          ["Contribuir", "Envie seu local para o mapa colaborativo, dê um nome à sua descoberta e entre para um esforço coletivo de mapear análogos da Lua e de Marte na Terra."],
        ],
      },
      {
        h: "3. Ciência cidadã",
        p: [
          "O Hermes fortalece o vínculo do cidadão com a participação ativa na construção científica, inspirado em iniciativas de ciência cidadã como Foldit, AI4Mars e Planet Hunters TESS. Por meio de crowdsourcing, os usuários ajudam a alimentar um vasto banco de dados colaborativo de locais candidatos a análogos.",
          "As contribuições da comunidade são propostas, não conclusões científicas: cada uma mostra quais critérios os dados abertos sustentam e quais ainda precisam de evidência.",
        ],
      },
    ],
    cta: [
      ["#/", "Começar a aprender"],
      ["#/explore", "Seja um explorador"],
      ["#/sources", "Fontes e método"],
    ],
  },
};

export function About(root) {
  const t = T[LANG] || T.en;
  const sections = t.sections
    .map(
      (s) => `<section class="about-sec">
        <h2>${esc(s.h)}</h2>
        ${s.quote ? `<blockquote class="about-quote">${esc(s.quote)}</blockquote>` : ""}
        ${s.p.map((p) => `<p>${esc(p)}</p>`).join("")}
        ${
          s.steps
            ? `<ol class="about-steps">${s.steps
                .map(([h, d], i) => `<li><span class="eyebrow-mono">0${i + 1}</span><h3 class="h3">${esc(h)}</h3><p>${esc(d)}</p></li>`)
                .join("")}</ol>`
            : ""
        }
      </section>`
    )
    .join("");

  root.innerHTML = `<div class="page-wrap">${NavBar("about")}
    <main class="page about">
      <p class="eyebrow-mono">${esc(t.eyebrow)}</p>
      <h1>${esc(t.title)}</h1>
      <p class="about-lede">${esc(t.lede)}</p>
      ${sections}
      <p class="about-cta">${t.cta.map(([href, label]) => `<a class="btn" href="${href}">${esc(label)} →</a>`).join("")}</p>
    </main>
  </div>`;
}
