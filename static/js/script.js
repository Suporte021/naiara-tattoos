/* =========================================================
   DADOS INICIAIS
   ========================================================= */

const appDataElement = document.getElementById("app-data");

let appData = {};

try {
    appData = appDataElement
        ? JSON.parse(appDataElement.textContent)
        : {};
} catch (error) {
    console.error("Erro ao ler app-data:", error);
}

let services = appData.services || [];
let works = appData.portfolio || [];
let availability = [];
let blockedDates = [];


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatPrice(price) {
    if (!price) return "Consultar";

    return String(price);
}


/* =========================================================
   NAVEGAÇÃO
   ========================================================= */

function goTo(page) {

    document.querySelectorAll(".page").forEach(function (p) {
        p.classList.remove("active");
    });

    const target = document.getElementById("page-" + page);

    if (!target) {
        console.error("Página não encontrada:", page);
        return;
    }

    target.classList.add("active");

    document.querySelectorAll("[data-nav]").forEach(function (element) {
        element.classList.toggle(
            "active",
            element.dataset.nav === page
        );
    });

    const mobileMenu = document.getElementById("mobileMenu");

    if (mobileMenu) {
        mobileMenu.classList.remove("open");
    }

    const footer = document.getElementById("siteFooter");

    if (footer) {
        footer.style.display = page === "admin" ? "none" : "";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (page === "admin") {
        carregarDashboard();
        carregarAgendamentos();
        carregarClientes();
        carregarServicos();
        carregarPortfolio();
        carregarDisponibilidade();
        carregarConfig();
    }

    if (page === "agendamento") {
        carregarDisponibilidadePublica();
        carregarDatasBloqueadas();
        renderizarServicosAgendamento();
    }
}


document.querySelectorAll("[data-nav]").forEach(function (element) {

    element.addEventListener("click", function (event) {

        event.preventDefault();

        goTo(element.dataset.nav);

    });

});


/* =========================================================
   MENU MOBILE
   ========================================================= */

const burgerBtn = document.getElementById("burgerBtn");
const mobileMenu = document.getElementById("mobileMenu");

if (burgerBtn && mobileMenu) {

    burgerBtn.addEventListener("click", function () {
        mobileMenu.classList.toggle("open");
    });

}


/* =========================================================
   PORTFÓLIO
   ========================================================= */

function workCard(work) {

    const image = work.image || "";

    return `
        <div class="work-card">

            ${
                image
                    ? `
                        <img
                            loading="lazy"
                            src="${escapeHtml(image)}"
                            alt="Tatuagem ${escapeHtml(work.category)}"
                        >
                    `
                    : `
                        <div class="work-placeholder">
                            Sem imagem
                        </div>
                    `
            }

            <div class="cap">
                <span>${escapeHtml(work.category)}</span>
            </div>

        </div>
    `;
}


function renderHomePortfolio() {

    const homeWorks =
        document.getElementById("homeWorks");

    if (!homeWorks) return;

    homeWorks.innerHTML =
        works
            .slice(0, 3)
            .map(workCard)
            .join("");

}


function renderPortfolioFilters() {

    const filtersEl =
        document.getElementById("filters");

    if (!filtersEl) return;

    const categories = [
        "Todos",
        ...new Set(
            works.map(function (work) {
                return work.category;
            })
        )
    ];

    filtersEl.innerHTML =
        categories
            .map(function (category, index) {

                return `
                    <button
                        class="filter-btn ${index === 0 ? "active" : ""}"
                        data-cat="${escapeHtml(category)}"
                        type="button"
                    >
                        ${escapeHtml(category)}
                    </button>
                `;

            })
            .join("");
}


function renderPortfolio(category = "Todos") {

    const portfolioGrid =
        document.getElementById("portfolioGrid");

    if (!portfolioGrid) return;

    const list =
        category === "Todos"
            ? works
            : works.filter(function (work) {
                return work.category === category;
            });

    portfolioGrid.innerHTML =
        list.length
            ? list.map(workCard).join("")
            : `<p>Nenhum trabalho encontrado.</p>`;
}


const filtersEl =
    document.getElementById("filters");

if (filtersEl) {

    filtersEl.addEventListener("click", function (event) {

        const button =
            event.target.closest(".filter-btn");

        if (!button) return;

        filtersEl
            .querySelectorAll(".filter-btn")
            .forEach(function (btn) {
                btn.classList.remove("active");
            });

        button.classList.add("active");

        renderPortfolio(button.dataset.cat);

    });

}


/* =========================================================
   SERVIÇOS PÚBLICOS
   ========================================================= */

function renderServices() {

    const servicesGrid =
        document.getElementById("servicesGrid");

    const pricesGrid =
        document.getElementById("pricesGrid");

    if (servicesGrid) {

        servicesGrid.innerHTML =
            services.length
                ? services.map(function (service) {

                    return `
                        <div class="price-card">

                            <div class="tag">
                                ${escapeHtml(service.category)}
                            </div>

                            <h3>
                                ${escapeHtml(service.name)}
                            </h3>

                            <p>
                                ${escapeHtml(service.description || "")}
                            </p>

                            <div class="meta">

                                <span>
                                    ${escapeHtml(
                                        formatPrice(service.price)
                                    )}
                                </span>

                                <span>
                                    ${escapeHtml(
                                        service.duration || ""
                                    )}
                                </span>

                            </div>

                        </div>
                    `;

                }).join("")
                : `<p>Nenhum serviço cadastrado.</p>`;
    }


    if (pricesGrid) {

        pricesGrid.innerHTML =
            services.length
                ? services.map(function (service) {

                    return `
                        <div class="price-card">

                            <div class="tag">
                                ${escapeHtml(service.category)}
                            </div>

                            <h3>
                                ${escapeHtml(service.name)}
                            </h3>

                            <div class="price">
                                ${escapeHtml(
                                    formatPrice(service.price)
                                )}
                            </div>

                            <p>
                                ${escapeHtml(
                                    service.description || ""
                                )}
                            </p>

                            <div class="meta">

                                <span>
                                    ${escapeHtml(
                                        service.duration || ""
                                    )}
                                </span>

                            </div>

                        </div>
                    `;

                }).join("")
                : `<p>Nenhum serviço cadastrado.</p>`;
    }
}


/* =========================================================
   WIZARD
   ========================================================= */

const wizState = {
    service: null,
    day: null,
    time: null
};


const stepLabels = [
    "Serviço",
    "Data",
    "Horário",
    "Dados",
    "Confirmar"
];


const wizProgress =
    document.getElementById("wizProgress");

const wizLabels =
    document.getElementById("wizLabels");


if (wizProgress) {

    wizProgress.innerHTML =
        stepLabels
            .map(function (_, index) {

                return `
                    <div
                        class="dot"
                        data-i="${index + 1}">
                    </div>
                `;

            })
            .join("");
}


if (wizLabels) {

    wizLabels.innerHTML =
        stepLabels
            .map(function (label) {

                return `<span>${label}</span>`;

            })
            .join("");
}


/* =========================================================
   PROGRESSO
   ========================================================= */

function updateProgress(step) {

    document
        .querySelectorAll("#wizProgress .dot")
        .forEach(function (dot) {

            const index =
                Number(dot.dataset.i);

            dot.classList.toggle(
                "done",
                index < step
            );

            dot.classList.toggle(
                "now",
                index === step
            );

        });

}


/* =========================================================
   SERVIÇOS DO AGENDAMENTO
   ========================================================= */

function renderizarServicosAgendamento() {

    const wizServices =
        document.getElementById("wizServices");

    if (!wizServices) return;

    if (!services.length) {

        wizServices.innerHTML = `
            <div class="admin-panel-note">
                Nenhum serviço está cadastrado.
                Cadastre um serviço no painel administrativo.
            </div>
        `;

        return;
    }

    wizServices.innerHTML =
        services
            .map(function (service) {

                return `
                    <label
                        class="choice"
                        data-id="${service.id}"
                    >

                        <div>

                            <div class="name">
                                ${escapeHtml(service.name)}
                            </div>

                            <div class="sub">
                                ${escapeHtml(
                                    service.category
                                )}
                                ·
                                ${escapeHtml(
                                    service.duration || ""
                                )}
                                ${
                                    service.price
                                        ? " · " +
                                          escapeHtml(service.price)
                                        : ""
                                }
                            </div>

                        </div>

                        <input
                            type="radio"
                            name="wizService"
                        >

                    </label>
                `;

            })
            .join("");
}


const wizServices =
    document.getElementById("wizServices");

if (wizServices) {

    wizServices.addEventListener(
        "click",
        function (event) {

            const choice =
                event.target.closest(".choice");

            if (!choice) return;

            document
                .querySelectorAll("#wizServices .choice")
                .forEach(function (item) {
                    item.classList.remove("selected");
                });

            choice.classList.add("selected");

            const input =
                choice.querySelector("input");

            if (input) {
                input.checked = true;
            }

            wizState.service =
                services.find(function (service) {

                    return String(service.id) ===
                        String(choice.dataset.id);

                });

        }
    );

}


/* =========================================================
   DISPONIBILIDADE
   ========================================================= */

async function carregarDisponibilidadePublica() {

    try {

        const response =
            await fetch("/api/disponibilidade");

        if (!response.ok) {
            throw new Error("Erro ao carregar disponibilidade.");
        }

        availability =
            await response.json();

        renderCalendar();

    } catch (error) {

        console.error(error);

    }
}


async function carregarDatasBloqueadas() {

    try {

        const response =
            await fetch("/api/datas-bloqueadas");

        if (!response.ok) {
            throw new Error("Erro ao carregar datas bloqueadas.");
        }

        blockedDates =
            await response.json();

    } catch (error) {

        console.error(error);

    }
}


/* =========================================================
   CALENDÁRIO REAL (com navegação de meses)
   ========================================================= */

const wizDays = document.getElementById("wizDays");

// Estado do mês que está sendo exibido
let calendarState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() // 0-11
};

// Quantos meses à frente o usuário pode ir
const MAX_MONTHS_AHEAD = 4;

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function isBlocked(dateString) {
    return blockedDates.some(function (item) {
        return item.date === dateString;
    });
}

function getAvailabilityForDate(date) {
    const dayOfWeek = date.getDay();
    return availability.find(function (item) {
        return Number(item.day_of_week) === dayOfWeek;
    });
}

function isMinMonth() {
    const now = new Date();
    return (
        calendarState.year === now.getFullYear() &&
        calendarState.month === now.getMonth()
    );
}

function isMaxMonth() {
    const now = new Date();
    const max = new Date(now.getFullYear(), now.getMonth() + MAX_MONTHS_AHEAD, 1);
    return (
        calendarState.year === max.getFullYear() &&
        calendarState.month === max.getMonth()
    );
}

function changeMonth(delta) {
    if (delta < 0 && isMinMonth()) return;
    if (delta > 0 && isMaxMonth()) return;

    calendarState.month += delta;

    if (calendarState.month > 11) {
        calendarState.month = 0;
        calendarState.year += 1;
    } else if (calendarState.month < 0) {
        calendarState.month = 11;
        calendarState.year -= 1;
    }

    // Limpa seleção de data/horário ao mudar de mês
    wizState.day = null;
    wizState.time = null;

    if (wizTimes) {
        wizTimes.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;">Escolha uma data primeiro.</p>`;
    }

    renderCalendar();
}

function renderCalendar() {
    if (!wizDays) return;

    const year = calendarState.year;
    const month = calendarState.month;

    const now = new Date();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthName = new Intl.DateTimeFormat("pt-BR", {
        month: "long"
    }).format(firstDay);

    // Atualiza o subtítulo + botões de navegação
    const subtitle = document.getElementById("calendarSubtitle");
    if (subtitle) {
        subtitle.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                <button type="button" class="btn" id="calPrevBtn"
                    style="padding:.4rem .9rem;font-size:.8rem;"
                    ${isMinMonth() ? "disabled" : ""}>
                    ← Mês anterior
                </button>
                <span style="font-size:.9rem;text-transform:capitalize;">
                    ${monthName} ${year}
                </span>
                <button type="button" class="btn" id="calNextBtn"
                    style="padding:.4rem .9rem;font-size:.8rem;"
                    ${isMaxMonth() ? "disabled" : ""}>
                    Próximo mês →
                </button>
            </div>
            <p style="margin-top:.6rem;color:var(--text-muted);font-size:.8rem;">
                Dias indisponíveis aparecem apagados
            </p>
        `;

        // Listeners dos botões (sempre recriados)
        const prevBtn = document.getElementById("calPrevBtn");
        const nextBtn = document.getElementById("calNextBtn");
        if (prevBtn) {
            prevBtn.onclick = function () { changeMonth(-1); };
        }
        if (nextBtn) {
            nextBtn.onclick = function () { changeMonth(1); };
        }
    }

    const dows = ["D", "S", "T", "Q", "Q", "S", "S"];

    let html = dows
        .map(function (day) {
            return `<div class="dow">${day}</div>`;
        })
        .join("");

    // Espaços vazios antes do dia 1
    for (let i = 0; i < firstDay.getDay(); i++) {
        html += `<div></div>`;
    }

    const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateString = formatDate(date);

        const config = getAvailabilityForDate(date);

        const closed =
            !config ||
            !config.enabled ||
            isBlocked(dateString) ||
            date < today;

        html += `
            <button
                type="button"
                data-date="${dateString}"
                ${closed ? "disabled" : ""}
            >
                ${day}
            </button>
        `;
    }

    wizDays.innerHTML = html;
}

if (wizDays) {
    wizDays.addEventListener(
        "click",
        async function (event) {
            const button = event.target.closest("button");

            if (!button || button.disabled) {
                return;
            }

            wizDays
                .querySelectorAll("button")
                .forEach(function (item) {
                    item.classList.remove("selected");
                });

            button.classList.add("selected");

            wizState.day = button.dataset.date;
            wizState.time = null;

            await carregarHorarios(wizState.day);
        }
    );
}
/* =========================================================
   HORÁRIOS REAIS
   ========================================================= */

const wizTimes =
    document.getElementById("wizTimes");

async function carregarHorarios(dateString) {
    if (!wizTimes) return;

    wizTimes.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;">Carregando horários...</p>`;

    try {
        let url = `/api/horarios?date=${encodeURIComponent(dateString)}`;

        if (wizState.service && wizState.service.id) {
            url += `&service_id=${wizState.service.id}`;
        }

        const response = await fetch(url);
        const horarios = await response.json();

        if (!response.ok) {
            throw new Error("Erro ao carregar horários.");
        }

        if (!Array.isArray(horarios) || horarios.length === 0) {
            wizTimes.innerHTML = `
                <p style="color:var(--text-muted);font-size:.85rem;grid-column:1/-1;">
                    Nenhum horário disponível nesta data.
                </p>`;
            return;
        }

        wizTimes.innerHTML = horarios
            .map(function (time) {
                return `
                    <button type="button" data-t="${time}" class="time-btn">
                        ${time}
                    </button>
                `;
            })
            .join("");

    } catch (error) {
        console.error(error);
        wizTimes.innerHTML = `
            <p style="color:var(--text-muted);font-size:.85rem;grid-column:1/-1;">
                Não foi possível carregar os horários.
            </p>`;
    }
}

// Listener de clique (event delegation) – funciona sempre
if (wizTimes) {
    wizTimes.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-t]");
        if (!button) return;

        // remove seleção anterior
        wizTimes.querySelectorAll("button").forEach(function (btn) {
            btn.classList.remove("selected");
        });

        // adiciona seleção
        button.classList.add("selected");
        wizState.time = button.dataset.t;
    });
}


/* =========================================================
   ETAPAS
   ========================================================= */

function showStep(step) {

    document
        .querySelectorAll(".wstep")
        .forEach(function (section) {
            section.classList.remove("active");
        });

    const target =
        document.querySelector(
            `.wstep[data-step="${step}"]`
        );

    if (!target) return;

    target.classList.add("active");

    updateProgress(step);
}


function wizNext(current) {

    if (current === 1 && !wizState.service) {

        alert("Escolha um serviço para continuar.");

        return;
    }

    if (current === 2 && !wizState.day) {

        alert("Escolha uma data para continuar.");

        return;
    }

    if (current === 3 && !wizState.time) {

        alert("Escolha um horário para continuar.");

        return;
    }

    if (current === 4) {

        const name =
            document.getElementById("fName")?.value.trim();

        const phone =
            document.getElementById("fPhone")?.value.trim();

        const local =
            document.getElementById("fLocal")?.value.trim();

        const size =
            document.getElementById("fSize")?.value.trim();

        if (!name || !phone || !local || !size) {

            alert(
                "Preencha nome, WhatsApp, local do corpo e tamanho."
            );

            return;
        }

        buildSummary();
    }

    showStep(current + 1);
}


function wizBack(current) {

    if (current <= 1) return;

    showStep(current - 1);
}


/* =========================================================
   RESUMO
   ========================================================= */

function buildSummary() {

    const name =
        document.getElementById("fName")?.value || "—";

    const local =
        document.getElementById("fLocal")?.value || "—";

    const size =
        document.getElementById("fSize")?.value || "—";

    const summary =
        document.getElementById("wizSummary");

    if (!summary) return;

    summary.innerHTML = `

        <div class="row">
            <span>Serviço</span>
            <span>${escapeHtml(
                wizState.service?.name || "—"
            )}</span>
        </div>

        <div class="row">
            <span>Data</span>
            <span>${escapeHtml(
                wizState.day || "—"
            )}</span>
        </div>

        <div class="row">
            <span>Horário</span>
            <span>${escapeHtml(
                wizState.time || "—"
            )}</span>
        </div>

        <div class="row">
            <span>Nome</span>
            <span>${escapeHtml(name)}</span>
        </div>

        <div class="row">
            <span>Local</span>
            <span>${escapeHtml(local)}</span>
        </div>

        <div
            class="row"
            style="border-bottom:none;"
        >
            <span>Tamanho</span>
            <span>${escapeHtml(size)}</span>
        </div>
    `;
}


/* =========================================================
   CONFIRMAR
   ========================================================= */


async function wizConfirm() {
    if (!wizState.service || !wizState.day || !wizState.time) {
        alert("Complete todas as etapas.");
        return;
    }

    const name  = (document.getElementById("fName")?.value || "").trim();
    const phone = (document.getElementById("fPhone")?.value || "").trim();
    const email = (document.getElementById("fEmail")?.value || "").trim();
    const local = (document.getElementById("fLocal")?.value || "").trim();
    const size  = (document.getElementById("fSize")?.value || "").trim();
    const note  = (document.getElementById("fNote")?.value || "").trim();

    if (!name || !phone) {
        alert("Preencha nome e WhatsApp.");
        return;
    }

    const payload = {
        service_id: wizState.service.id,
        date: wizState.day,
        time: wizState.time,
        name, phone, email, local, size, note
    };

    try {
        const response = await fetch("/agendamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            alert(result.error || "Não foi possível realizar o agendamento.");
            return;
        }

        const mensagem =
`Olá, Naiara! 👋

Acabei de solicitar um agendamento pelo site.

📌 *Dados do pedido*
• Nome: ${name}
• WhatsApp: ${phone}
• Serviço: ${wizState.service.name}
• Data: ${wizState.day}
• Horário: ${wizState.time}
• Local do corpo: ${local || "—"}
• Tamanho aproximado: ${size || "—"}
${note ? `• Observação: ${note}` : ""}

O pedido está como *pendente*. Aguardo sua confirmação!`;

        // Lê o número das configurações
        let numero = "";
        try {
            const cfgRes = await fetch("/api/config");
            const cfg = await cfgRes.json();
            numero = String(cfg.whatsapp || "").replace(/\D/g, "");
        } catch (e) {}

        if (numero.length >= 10 && numero.length <= 11) {
            numero = "55" + numero;
        }

        if (numero.length >= 12) {
            const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

            // Abre de forma que o navegador não bloqueie
            const a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else {
            // Só cai aqui se NÃO tiver número configurado
            alert(
                "Agendamento salvo!\n\n" +
                "Configure o WhatsApp no painel (/admin → Configurações) " +
                "com o número só com dígitos (ex: 5571999999999) para abrir automaticamente."
            );
        }

        showStep(6);

    } catch (error) {
        console.error(error);
        alert("Erro ao conectar ao servidor.");
    }
}


/* =========================================================
   RESET
   ========================================================= */

function wizReset() {

    wizState.service = null;
    wizState.day = null;
    wizState.time = null;

    document
        .querySelectorAll(
            ".choice.selected, .day-grid button.selected, .time-grid button.selected"
        )
        .forEach(function (element) {
            element.classList.remove("selected");
        });

    document
        .querySelectorAll(
            'input[name="wizService"]'
        )
        .forEach(function (input) {
            input.checked = false;
        });

    [
        "fName",
        "fPhone",
        "fEmail",
        "fLocal",
        "fSize",
        "fNote"
    ].forEach(function (id) {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }

    });

    showStep(1);
}


/* =========================================================
   ADMIN
   ========================================================= */

function goAdminView(view) {

    document
        .querySelectorAll(".admin-view")
        .forEach(function (element) {
            element.classList.remove("active");
        });

    const target =
        document.querySelector(
            `.admin-view[data-view="${view}"]`
        );

    if (!target) return;

    target.classList.add("active");

    document
        .querySelectorAll("[data-admin]")
        .forEach(function (element) {

            element.classList.toggle(
                "active",
                element.dataset.admin === view
            );

        });


    if (
        view === "agenda" ||
        view === "agendamentos"
    ) {
        carregarAgendamentos();
    }

    if (view === "clientes") {
        carregarClientes();
    }

    if (view === "servicos") {
        carregarServicos();
    }

    if (view === "portfolio") {
        carregarPortfolio();
    }

    if (view === "disponibilidade") {
        carregarDisponibilidade();
    }

    if (view === "config") {
        carregarConfig();
    }
}


document
    .querySelectorAll("[data-admin]")
    .forEach(function (element) {

        element.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                goAdminView(
                    element.dataset.admin
                );
            }
        );
    });


/* =========================================================
   AGENDAMENTOS ADMIN
   ========================================================= */

const badgeMap = {

    pending: ["pending", "Pendente"],

    confirmed: ["confirmed", "Confirmado"],

    completed: ["completed", "Concluído"],

    cancelled: ["cancelled", "Cancelado"]
};


function agendamentoRow(agendamento) {

    const badge =
        badgeMap[agendamento.status];

    const cls =
        badge ? badge[0] : "";

    const label =
        badge ? badge[1] : agendamento.status;


    return `
        <tr>

            <td>${escapeHtml(agendamento.date)}</td>

            <td>${escapeHtml(agendamento.time)}</td>

            <td>${escapeHtml(agendamento.cliente)}</td>

            <td>${escapeHtml(agendamento.servico || "—")}</td>

            <td>
                <span class="badge ${cls}">
                    ${escapeHtml(label)}
                </span>
            </td>

            <td>

                <div class="row-actions">

                    ${
                        agendamento.status === "pending"
                            ? `
                                <button
                                    class="mini-btn"
                                    onclick="alterarStatus(${agendamento.id}, 'confirmed')"
                                >
                                    Confirmar
                                </button>

                                <button
                                    class="mini-btn"
                                    onclick="alterarStatus(${agendamento.id}, 'cancelled')"
                                >
                                    Cancelar
                                </button>
                            `
                            : ""
                    }

                    <button
                        class="mini-btn"
                        onclick="mostrarDetalhes(${agendamento.id})"
                    >
                        Detalhes
                    </button>

                </div>

            </td>

        </tr>
    `;
}


async function carregarAgendamentos() {

    try {

        const response =
            await fetch("/api/agendamentos");

        if (!response.ok) {
            throw new Error("Erro ao carregar agendamentos.");
        }

        const agendamentos =
            await response.json();

        const tabelas = [
            document.getElementById("agendaTable"),
            document.getElementById("agendamentosTable")
        ];

        tabelas.forEach(function (tabela) {

            if (!tabela) return;

            tabela.innerHTML = `

                <tr>

                    <th>Data</th>
                    <th>Horário</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Status</th>
                    <th>Ações</th>

                </tr>

                ${
                    agendamentos.length
                        ? agendamentos
                            .map(agendamentoRow)
                            .join("")
                        : `
                            <tr>
                                <td colspan="6">
                                    Nenhum agendamento.
                                </td>
                            </tr>
                        `
                }

            `;
        });

    } catch (error) {

        console.error(error);

    }
}


async function alterarStatus(id, status) {

    const confirmacao =
        confirm(
            status === "confirmed"
                ? "Confirmar este agendamento?"
                : "Cancelar este agendamento?"
        );

    if (!confirmacao) return;

    try {

        const response =
            await fetch(
                `/api/agendamentos/${id}/status`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        status: status
                    })
                }
            );

        const result =
            await response.json();

        if (!response.ok || !result.success) {

            alert(
                result.error ||
                "Não foi possível alterar o status."
            );

            return;
        }

        carregarAgendamentos();

    } catch (error) {

        console.error(error);

        alert("Erro ao conectar ao servidor.");

    }
}


async function mostrarDetalhes(id) {

    try {

        const response =
            await fetch(
                `/api/agendamentos/${id}`
            );

        const data =
            await response.json();

        if (!response.ok) {

            alert(data.error || "Erro.");

            return;
        }

        alert(`
AGENDAMENTO

Cliente: ${data.name || "—"}

WhatsApp: ${data.phone || "—"}

E-mail: ${data.email || "—"}

Serviço: ${data.service_name || "—"}

Data: ${data.date || "—"}

Horário: ${data.time || "—"}

Local: ${data.local || "—"}

Tamanho: ${data.size || "—"}

Observação:
${data.note || "—"}

Status: ${data.status || "—"}
        `);

    } catch (error) {

        console.error(error);

        alert("Erro ao carregar detalhes.");

    }
}


/* =========================================================
   CLIENTES
   ========================================================= */

async function carregarClientes() {

    try {

        const response =
            await fetch("/api/clientes");

        const clientes =
            await response.json();

        const tabela =
            document.getElementById("clientesTable");

        if (!tabela) return;

        tabela.innerHTML = `

            <tr>
                <th>Nome</th>
                <th>WhatsApp</th>
                <th>E-mail</th>
                <th>Agendamentos</th>
            </tr>

            ${
                clientes.length
                    ? clientes.map(function (cliente) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(cliente.nome)}
                                </td>

                                <td>
                                    ${escapeHtml(cliente.whatsapp)}
                                </td>

                                <td>
                                    ${escapeHtml(cliente.email || "—")}
                                </td>

                                <td>
                                    ${cliente.agendamentos || 0}
                                </td>

                            </tr>
                        `;

                    }).join("")
                    : `
                        <tr>
                            <td colspan="4">
                                Nenhum cliente.
                            </td>
                        </tr>
                    `
            }

        `;

    } catch (error) {

        console.error(error);

    }
}


/* =========================================================
   SERVIÇOS ADMIN
   ========================================================= */

async function carregarServicos() {

    try {

        const response =
            await fetch("/api/servicos");

        services =
            await response.json();

        renderServices();
        renderizarServicosAgendamento();

        const tabela =
            document.getElementById("servicosTable");

        if (!tabela) return;

        tabela.innerHTML = `

            <tr>

                <th>Serviço</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Duração</th>
                <th>Status</th>
                <th>Ações</th>

            </tr>

            ${
                services.length
                    ? services.map(function (service) {

                        return `

                            <tr>

                                <td>
                                    ${escapeHtml(service.name)}
                                </td>

                                <td>
                                    ${escapeHtml(service.category)}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        service.price || "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        service.duration || "—"
                                    )}
                                </td>

                                <td>

                                    <span class="badge ${
                                        service.active
                                            ? "confirmed"
                                            : "cancelled"
                                    }">

                                        ${
                                            service.active
                                                ? "Ativo"
                                                : "Inativo"
                                        }

                                    </span>

                                </td>

                                <td>

                                    <div class="row-actions">

                                        <button
                                            class="mini-btn"
                                            onclick="editarServico(${service.id})"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            class="mini-btn"
                                            onclick="toggleServico(${service.id})"
                                        >
                                            ${
                                                service.active
                                                    ? "Desativar"
                                                    : "Ativar"
                                            }
                                        </button>

                                    </div>

                                </td>

                            </tr>
                        `;

                    }).join("")
                    : `
                        <tr>
                            <td colspan="6">
                                Nenhum serviço cadastrado.
                            </td>
                        </tr>
                    `
            }

        `;

    } catch (error) {

        console.error(error);

    }
}


async function criarServico() {

    const name =
        prompt("Nome do serviço:");

    if (!name) return;

    const category =
        prompt("Categoria:");

    if (!category) return;

    const description =
        prompt("Descrição:");

    const price =
        prompt("Preço:");

    const duration =
        prompt("Duração:");

    try {

        const response =
            await fetch("/api/servicos", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    category,
                    description,
                    price,
                    duration
                })
            });

        const result =
            await response.json();

        if (!response.ok || !result.success) {

            alert(result.error || "Erro.");

            return;
        }

        carregarServicos();

    } catch (error) {

        console.error(error);

        alert("Erro ao criar serviço.");

    }
}


async function editarServico(id) {

    const service =
        services.find(function (item) {
            return String(item.id) === String(id);
        });

    if (!service) return;

    const name =
        prompt("Nome:", service.name);

    if (name === null) return;

    const category =
        prompt("Categoria:", service.category);

    if (category === null) return;

    const description =
        prompt(
            "Descrição:",
            service.description || ""
        );

    if (description === null) return;

    const price =
        prompt(
            "Preço:",
            service.price || ""
        );

    if (price === null) return;

    const duration =
        prompt(
            "Duração:",
            service.duration || ""
        );

    if (duration === null) return;

    try {

        const response =
            await fetch(
                `/api/servicos/${id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name,
                        category,
                        description,
                        price,
                        duration
                    })
                }
            );

        const result =
            await response.json();

        if (!response.ok || !result.success) {

            alert(result.error || "Erro.");

            return;
        }

        carregarServicos();

    } catch (error) {

        console.error(error);

        alert("Erro ao editar serviço.");

    }
}


async function toggleServico(id) {

    try {

        const response =
            await fetch(
                `/api/servicos/${id}/toggle`,
                {
                    method: "PUT"
                }
            );

        const result =
            await response.json();

        if (!response.ok || !result.success) {

            alert(result.error || "Erro.");

            return;
        }

        carregarServicos();

    } catch (error) {

        console.error(error);

        alert("Erro ao alterar serviço.");

    }
}

async function excluirServico(id) {
    if (!confirm(
        "Tem certeza que deseja APAGAR este serviço?\n\n" +
        "Essa ação não pode ser desfeita.\n" +
        "Se o serviço tiver agendamentos, não será possível apagar."
    )) return;

    try {
        const res = await fetch(`/api/servicos/${id}`, {
            method: "DELETE"
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            alert(data.error || "Erro ao apagar serviço.");
            return;
        }

        await carregarServicos();
        alert("Serviço apagado com sucesso ✅");
    } catch (e) {
        console.error(e);
        alert("Erro de conexão.");
    }
}

/* =========================================================
   NOVO SERVIÇO
   ========================================================= */

const novoServicoBtn =
    document.getElementById("novoServicoBtn");

if (novoServicoBtn) {

    novoServicoBtn.addEventListener(
        "click",
        criarServico
    );

}


/* =========================================================
   PORTFÓLIO ADMIN
   ========================================================= */

async function carregarPortfolio() {

    try {

        const response =
            await fetch("/api/portfolio");

        works =
            await response.json();

        renderHomePortfolio();
        renderPortfolioFilters();
        renderPortfolio();

        const grid =
            document.getElementById("adminPortfolioGrid");

        if (!grid) return;

        grid.innerHTML =
            works.length
                ? works.map(function (work) {

                    return `

                        <div class="work-card">

                            <img
                                loading="lazy"
                                src="${escapeHtml(work.image)}"
                                alt="${escapeHtml(work.category)}"
                            >

                            <div class="cap">

                                <span>
                                    ${escapeHtml(work.category)}
                                </span>

                                <div class="row-actions">

                                    <button
                                        class="mini-btn"
                                        onclick="editarPortfolio(${work.id})"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        class="mini-btn"
                                        onclick="excluirPortfolio(${work.id})"
                                    >
                                        Excluir
                                    </button>

                                </div>

                            </div>

                        </div>

                    `;

                }).join("")
                : `<p>Nenhuma imagem cadastrada.</p>`;

    } catch (error) {

        console.error(error);

    }
}


async function editarPortfolio(id) {

    const work =
        works.find(function (item) {
            return String(item.id) === String(id);
        });

    if (!work) return;

    const category =
        prompt(
            "Categoria:",
            work.category
        );

    if (category === null) return;

    const image =
        prompt(
            "URL da imagem:",
            work.image
        );

    if (image === null) return;

    try {

        const response =
            await fetch(
                `/api/portfolio/${id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        category,
                        image
                    })
                }
            );

        const result =
            await response.json();

        if (!response.ok || !result.success) {

            alert(result.error || "Erro.");

            return;
        }

        carregarPortfolio();

    } catch (error) {

        console.error(error);

        alert("Erro ao editar portfólio.");

    }
}


async function excluirPortfolio(id) {

    if (!confirm("Excluir esta imagem?")) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/portfolio/${id}`,
                {
                    method: "DELETE"
                }
            );

        const result =
            await response.json();

        if (!response.ok || !result.success) {

            alert(result.error || "Erro.");

            return;
        }

        carregarPortfolio();

    } catch (error) {

        console.error(error);

        alert("Erro ao excluir.");

    }
}


/* =========================================================
   DISPONIBILIDADE ADMIN
   ========================================================= */

async function carregarDisponibilidade() {

    try {

        const response =
            await fetch("/api/disponibilidade");

        const rows =
            await response.json();

        const tabela =
            document.getElementById("dispoTable");

        if (!tabela) return;

        const nomes = [
            "Domingo",
            "Segunda",
            "Terça",
            "Quarta",
            "Quinta",
            "Sexta",
            "Sábado"
        ];

        tabela.innerHTML = `

            <tr>
                <th>Dia</th>
                <th>Horário</th>
                <th>Status</th>
                <th>Ação</th>
            </tr>

            ${
                rows.map(function (row) {

                    return `

                        <tr>

                            <td>
                                ${nomes[row.day_of_week]}
                            </td>

                            <td>
                                ${
                                    row.enabled
                                        ? `${row.start_time} – ${row.end_time}`
                                        : "Fechado"
                                }
                            </td>

                            <td>
                                ${
                                    row.enabled
                                        ? "Aberto"
                                        : "Fechado"
                                }
                            </td>

                            <td>

                                <button
                                    class="mini-btn"
                                    onclick="editarDisponibilidade(
                                        ${row.id},
                                        ${row.enabled},
                                        '${row.start_time || ""}',
                                        '${row.end_time || ""}'
                                    )"
                                >
                                    Editar
                                </button>

                            </td>

                        </tr>
                    `;

                }).join("")
            }

        `;

    } catch (error) {

        console.error(error);

    }
}


async function editarDisponibilidade(
    id,
    enabled,
    start,
    end
) {

    const aberto =
        confirm(
            "OK = aberto\nCancelar = fechado"
        );

    let startTime = start;
    let endTime = end;

    if (aberto) {

        startTime =
            prompt(
                "Horário inicial:",
                start || "09:00"
            );

        if (startTime === null) return;

        endTime =
            prompt(
                "Horário final:",
                end || "18:00"
            );

        if (endTime === null) return;
    }

    try {

        const response =
            await fetch(
                `/api/disponibilidade/${id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        enabled: aberto,
                        start_time: aberto ? startTime : null,
                        end_time: aberto ? endTime : null
                    })
                }
            );

        const result =
            await response.json();

        if (!response.ok || !result.success) {

            alert(result.error || "Erro.");

            return;
        }

        carregarDisponibilidade();
        carregarDisponibilidadePublica();

    } catch (error) {

        console.error(error);

    }
}


/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

async function carregarConfig() {

    try {

        const response =
            await fetch("/api/config");

        const config =
            await response.json();

        const artist =
            document.getElementById("configArtist");

        const whatsapp =
            document.getElementById("configWhatsapp");

        const instagram =
            document.getElementById("configInstagram");

        const duration =
            document.getElementById("configDuration");

        const description =
            document.getElementById("configDescription");

        if (artist)
            artist.value =
                config.artist_name || "";

        if (whatsapp)
            whatsapp.value =
                config.whatsapp || "";

        if (instagram)
            instagram.value =
                config.instagram || "";

        if (duration)
            duration.value =
                config.default_duration || "";

        if (description)
            description.value =
                config.description || "";

    } catch (error) {

        console.error(error);

    }
}


async function salvarConfig() {

    const data = {

        artist_name:
            document.getElementById(
                "configArtist"
            )?.value,

        whatsapp:
            document.getElementById(
                "configWhatsapp"
            )?.value,

        instagram:
            document.getElementById(
                "configInstagram"
            )?.value,

        default_duration:
            document.getElementById(
                "configDuration"
            )?.value,

        description:
            document.getElementById(
                "configDescription"
            )?.value
    };


    try {

        const response =
            await fetch(
                "/api/config",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(data)
                }
            );

        const result =
            await response.json();

        if (!response.ok || !result.success) {

            alert(result.error || "Erro.");

            return;
        }

        alert("Configurações salvas. ✅");

    } catch (error) {

        console.error(error);

        alert("Erro ao salvar configurações.");

    }
}


const salvarConfigBtn =
    document.getElementById("salvarConfigBtn");

if (salvarConfigBtn) {

    salvarConfigBtn.addEventListener(
        "click",
        salvarConfig
    );

}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function carregarDashboard() {

    try {

        const response =
            await fetch("/api/dashboard");

        const data =
            await response.json();

        const hoje =
            document.getElementById("dashboardHoje");

        const pendentes =
            document.getElementById("dashboardPendentes");

        const confirmados =
            document.getElementById("dashboardConfirmados");

        const cancelados =
            document.getElementById("dashboardCancelados");

        if (hoje)
            hoje.textContent = data.hoje;

        if (pendentes)
            pendentes.textContent = data.pendentes;

        if (confirmados)
            confirmados.textContent = data.confirmados;

        if (cancelados)
            cancelados.textContent = data.cancelados;

    } catch (error) {

        console.error(error);

    }
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

renderHomePortfolio();
renderPortfolioFilters();
renderPortfolio();
renderServices();
renderizarServicosAgendamento();

updateProgress(1);

console.log(
    "✅ Sistema Naiara Tattoo carregado."
);