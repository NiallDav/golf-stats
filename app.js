const SUPABASE_URL="https://ynbazjjyauxcpadupgzq.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_z_J5OQ1beeAHZORD9yIiFw_0WWxwPGW";
const WORKBOOK_DATA_CUTOFF = "2026-09-12";

const hasSupabase =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_");

const sb =
  hasSupabase && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

let rounds = [];
let session = null;
let view = "home";
let selectedPlayer = null;
let selectedComparePlayer = null;
let selectedRound = null;
let courseFilter = "Belhus";
let charts = [];

const app = document.getElementById("app");

const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[c]));

function coursePar(course) {
  return course === "Belhus" ? 69 :
         course === "Cranham" ? 67 :
         72;
}

function total(p) {
  return (p?.scores || []).reduce(
    (a, b) => a + Number(b || 0),
    0
  );
}

function overPar(p, r) {
  return total(p) - coursePar(r.course);
}

function fmtPar(n) {
  n = Number(n);

  if (n === 0) return "E";

  return n > 0 ? `+${n}` : `${n}`;
}

function average(values) {
  return values.length
    ? values.reduce((a, b) => a + Number(b), 0) / values.length
    : null;
}

function formAverage(games) {
  return average(games.map(x => total(x.p)));
}

function formOverParAverage(games) {
  return average(games.map(x => overPar(x.p, x.r)));
}

function isActivePlayer(name) {
  return String(name || "").trim().toLowerCase() !== "lee";
}

function withoutExcludedPlayers(round) {
  return {
    ...round,
    players: (round.players || []).filter(p => isActivePlayer(p.name))
  };
}

function coursePars(course) {
  return course === "Belhus"
    ? [4,4,4,4,4,3,4,3,4,4,3,4,4,3,4,5,3,5]
    : course === "Cranham"
      ? [4,4,3,4,3,4,5,3,4,4,3,5,3,4,4,3,4,3]
      : Array(18).fill(4);
}

function parClass(n) {
  n = Number(n);

  return n < 0 ? "under" :
         n > 0 ? "over" :
         "even";
}

function sortedRounds() {
  return rounds.slice().sort((a, b) => {
    const d = String(b.date).localeCompare(String(a.date));

    return d || String(a.course).localeCompare(String(b.course));
  });
}

function allPlayers() {
  const m = {};

  rounds.forEach(r => {
    (r.players || []).forEach(p => {
      if (isActivePlayer(p.name) && !m[p.name]) {
        m[p.name] = p.name;
      }
    });
  });

  return Object.keys(m).sort();
}

function playerRounds(name, course = "all") {
  return sortedRounds()
    .filter(r =>
      course === "all" ||
      r.course === course
    )
    .map(r => {
      const p = (r.players || []).find(
        x => x.name === name
      );

      return p ? { r, p } : null;
    })
    .filter(Boolean);
}

function playerStats(name, course = "all") {
  const games = playerRounds(name, course);

  if (!games.length) return null;

  const scores = games.map(x => total(x.p));

  const latest = games[0];

  const last3 = games.slice(0, 3);
  const last10 = games.slice(0, 10);

  return {
    name,
    rounds: games.length,

    avg:
      scores.reduce((a, b) => a + b, 0) /
      scores.length,

    best: Math.min(...scores),

    latest: total(latest.p),

    latestRound: latest,

    last3,
    last10,

    form: formAverage(last3),

    formOverPar: formOverParAverage(last3),

    bestOverPar:
      Math.min(
        ...games.map(x => overPar(x.p, x.r))
      ),

    worstOverPar:
      Math.max(
        ...games.map(x => overPar(x.p, x.r))
      )
  };
}

function leaderboardData(course = "all") {
  return allPlayers()
    .map(name => playerStats(name, course))
    .filter(Boolean)
    .sort((a, b) => a.avg - b.avg);
}

function setView(v) {
  view = v;

  selectedPlayer = null;
  selectedRound = null;

  render();
}

function openPlayer(name) {
  selectedPlayer = name;
  selectedComparePlayer = null;
  view = "player";

  render();
}

function setComparePlayer(name) {
  selectedComparePlayer = name || null;
  render();
}

function openRound(index) {
  selectedRound = index;
  view = "round";

  render();
}

function closeDetail() {
  const previousView = view;

  selectedPlayer = null;
  selectedComparePlayer = null;
  selectedRound = null;
  view = previousView === "player" ? "players" : "home";

  render();
}

function setCourseFilter(value) {
  courseFilter = value;

  render();
}

function render() {
  destroyCharts();

  if (view === "login") {
    return renderLogin();
  }

  if (view === "admin" && !session) {
    return renderLogin();
  }

  if (view === "player") {
    return renderPlayer();
  }

  if (view === "round") {
    return renderRound();
  }

  renderMain();
}

function nav() {
  return `
    <div class="tabs">

      <button
        class="tab ${view === "home" ? "active" : ""}"
        onclick="setView('home')"
      >
        Dashboard
      </button>

      <button
        class="tab ${view === "rounds" ? "active" : ""}"
        onclick="setView('rounds')"
      >
        Rounds
      </button>

      <button
        class="tab ${view === "players" ? "active" : ""}"
        onclick="setView('players')"
      >
        Players
      </button>

      <button
        class="tab ${view === "charts" ? "active" : ""}"
        onclick="setView('charts')"
      >
        Charts
      </button>

    </div>
  `;
}

function courseFilterHtml() {
  const courses = [
    ...new Set(rounds.map(r => r.course))
  ].sort();

  return `
    <div class="filter-row">

      <span class="muted">
        Course
      </span>

      <select onchange="setCourseFilter(this.value)">

        <option
          value="all"
          ${courseFilter === "all" ? "selected" : ""}
        >
          All courses
        </option>

        ${courses.map(c => `
          <option
            value="${esc(c)}"
            ${courseFilter === c ? "selected" : ""}
          >
            ${esc(c)}
          </option>
        `).join("")}

      </select>

    </div>
  `;
}

function renderMain() {
  const ps = leaderboardData(courseFilter);

  const filteredRounds =
    sortedRounds().filter(
      r =>
        courseFilter === "all" ||
        r.course === courseFilter
    );

  app.innerHTML = `
    <div class="wrap">

      <header class="top">

        <div class="brand">
          ⛳ <span>Golf</span> Stats
        </div>

        <button
          class="secondary"
          onclick="openAdmin()"
        >
          Admin
        </button>

      </header>

      ${nav()}

      ${courseFilterHtml()}

      ${
        view === "home"
          ? home(ps, filteredRounds)

          : view === "rounds"
            ? roundsPage(filteredRounds)

            : view === "players"
              ? playersPage(ps)

              : chartsPage(filteredRounds)
      }

    </div>
  `;

  // The Charts page now uses tables and needs no canvas rendering.
}

function home(ps, filteredRounds) {
  const latest = filteredRounds[0];

  return `

    <div class="card">

      <div class="section-head">

        <div>
          <h2 class="section-title">
            Leaderboard
          </h2>

          <div class="muted">
            Sorted by average score
          </div>
        </div>

      </div>

      ${leaderboard(ps)}

    </div>

    <br>

    <div class="card">

      <div class="section-head">

        <div>

          <h2 class="section-title">
            Latest round
          </h2>

          <div class="muted">
            ${
              latest
                ? `${esc(latest.course)} · ${esc(latest.date)}`
                : "No rounds yet"
            }
          </div>

        </div>

      </div>

      ${
        latest
          ? roundSummary(
              latest,
              filteredRounds.indexOf(latest)
            )
          : '<div class="muted">No rounds yet.</div>'
      }

    </div>

    <br>

    <div class="card">

      <div class="section-head">

        <h2 class="section-title">
          Recent rounds
        </h2>

        <button
          class="secondary small"
          onclick="setView('rounds')"
        >
          View all
        </button>

      </div>

      ${roundList(filteredRounds.slice(0, 8))}

    </div>

  `;
}

function leaderboard(ps) {
  if (!ps.length) {
    return '<div class="muted">No player data.</div>';
  }

  return `
    <div class="table-wrap">

      <table class="table leaderboard-table">

        <thead>

          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Rounds</th>
            <th>Average</th>
            <th>Best</th>
            <th>Latest</th>
            <th>Form</th>
          </tr>

        </thead>

        <tbody>

          ${ps.map((p, i) => `

            <tr
              class="clickable"
              onclick='openPlayer(${JSON.stringify(p.name)})'
            >

              <td class="rank">
                ${i + 1}
              </td>

              <td>
                <strong>
                  ${esc(p.name)}
                </strong>
              </td>

              <td>
                ${p.rounds}
              </td>

              <td>
                <strong>
                  ${Math.round(p.avg)}
                </strong>
              </td>

              <td>
                ${p.best}
              </td>

              <td>

                ${p.latest}

                <span
                  class="par ${parClass(p.latest - p.form)}"
                  title="Compared with 3-round form"
                >
                  ${fmtPar(Math.round(p.latest - p.form))}
                  vs form
                </span>

              </td>

              <td>
                <strong>${Math.round(p.form)}</strong>
              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}

function roundSummary(r, index) {
  const ps =
    (r.players || [])
      .slice()
      .sort((a, b) => total(a) - total(b));

  return `

    <div class="round-summary">

      <div class="round-meta">

        <span class="pill">
          ${esc(r.course)}
        </span>

        <span class="muted">
          ${esc(r.date)}
        </span>

        <span class="muted">
          Par ${coursePar(r.course)}
        </span>

      </div>

      <div class="result-list">

        ${ps.map((p, i) => `

          <div class="result-row">

            <div>

              <span class="rank">
                ${i + 1}
              </span>

              <button
                class="link-button"
                onclick='openPlayer(${JSON.stringify(p.name)})'
              >
                <strong>
                  ${esc(p.name)}
                </strong>
              </button>

            </div>

            <div>

              <strong>
                ${total(p)}
              </strong>

              <span
                class="par ${parClass(
                  overPar(p, r)
                )}"
              >
                ${fmtPar(
                  overPar(p, r)
                )}
              </span>

            </div>

          </div>

        `).join("")}

      </div>

      <button
        class="secondary"
        onclick="openRound(${rounds.indexOf(r)})"
      >
        View round
      </button>

    </div>

  `;
}

function roundList(rs) {
  if (!rs.length) {
    return '<div class="muted">No rounds yet.</div>';
  }

  return `

    <div class="list">

      ${rs.map(r => `

        <div
          class="round clickable"
          onclick="openRound(${rounds.indexOf(r)})"
        >

          <div>

            <strong>
              ${esc(r.course)}
            </strong>

            <span class="pill">
              ${(r.players || []).length}
              player${(r.players || []).length === 1 ? "" : "s"}
            </span>

            <div class="muted">
              ${esc(r.date)}
              · Par ${coursePar(r.course)}
            </div>

          </div>

          <div class="score-pills">

            ${(r.players || [])
              .slice()
              .sort((a, b) => total(a) - total(b))
              .map(p => `

                <span class="pill">

                  ${esc(p.name)}

                  <strong>
                    ${total(p)}
                  </strong>

                  <span
                    class="par ${parClass(
                      overPar(p, r)
                    )}"
                  >
                    ${fmtPar(
                      overPar(p, r)
                    )}
                  </span>

                </span>

              `).join("")}

          </div>

        </div>

      `).join("")}

    </div>

  `;
}

function roundsPage(rs) {
  return `

    <div class="card">

      <div class="section-head">

        <div>

          <h2 class="section-title">
            All rounds
          </h2>

          <div class="muted">
            ${rs.length}
            round${rs.length === 1 ? "" : "s"}
          </div>

        </div>

      </div>

      ${roundList(rs)}

    </div>

  `;
}

function playersPage(ps) {
  return `

    <div class="card">

      <div class="section-head">

        <div>

          <h2 class="section-title">
            Players
          </h2>

          <div class="muted">
            Click a player to view their full profile.
          </div>

        </div>

      </div>

      <div class="player-grid">

        ${ps.map(p => `

          <button
            class="player-card"
            onclick='openPlayer(${JSON.stringify(p.name)})'
          >

            <div class="player-name">
              ${esc(p.name)}
            </div>

            <div class="player-number">
              ${Math.round(p.avg)}
            </div>

            <div class="muted">
              Average
            </div>

            <div class="player-mini">

              <span>
                Best
                <strong>${p.best}</strong>
              </span>

              <span>
                Latest
                <strong>${p.latest}</strong>
              </span>

              <span>
                Form
                <strong>${Math.round(p.form)}</strong>
              </span>

            </div>

          </button>

        `).join("")}

      </div>

    </div>

  `;
}

function comparisonStat(comparison, value, className = "") {
  if (!comparison) return "";

  return `
    <div class="comparison-stat ${className}">
      <span>${esc(comparison.name)}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function recentFormCards(player) {
  return player.last3.map(x => `
    <div
      class="form-game ${parClass(overPar(x.p, x.r))}"
      onclick="openRound(${rounds.indexOf(x.r)})"
    >
      <strong>${total(x.p)}</strong>
      <span>${fmtPar(overPar(x.p, x.r))}</span>
      <small>${esc(x.r.course)}</small>
      <small>${esc(x.r.date)}</small>
    </div>
  `).join("");
}

function renderPlayer() {
  const p = playerStats(
    selectedPlayer,
    courseFilter
  );

  const compareOptions = leaderboardData(courseFilter)
    .filter(player => player.name !== selectedPlayer);

  const comparison = selectedComparePlayer
    ? playerStats(selectedComparePlayer, courseFilter)
    : null;

  if (!p) {
    view = "home";
    render();
    return;
  }

  app.innerHTML = `

    <div class="wrap">

      <header class="top">

        <button
          class="back"
          onclick="closeDetail()"
        >
          ← Back
        </button>

        <button
          class="secondary"
          onclick="openAdmin()"
        >
          Admin
        </button>

      </header>

      <div class="profile-head">

        <div>

          <div class="eyebrow">
            PLAYER PROFILE
          </div>

          <h1>
            ${esc(p.name)}
          </h1>

          <div class="muted">
            ${p.rounds} rounds
          </div>

        </div>

        <label class="compare-control profile-compare">
          <span>Compare with</span>
          <select onchange="setComparePlayer(this.value)">
            <option value="">Choose player</option>
            ${compareOptions.map(player => `
              <option
                value="${esc(player.name)}"
                ${selectedComparePlayer === player.name ? "selected" : ""}
              >
                ${esc(player.name)}
              </option>
            `).join("")}
          </select>
        </label>

      </div>

      <div class="grid stats-grid">

        <div class="card">
          <div class="muted">
            Average
          </div>

          <div class="stat">
            ${Math.round(p.avg)}
          </div>
          ${comparisonStat(
            comparison,
            comparison ? Math.round(comparison.avg) : ""
          )}
        </div>

        <div class="card">
          <div class="muted">
            Best
          </div>

          <div class="stat">
            ${p.best}
          </div>
          ${comparisonStat(
            comparison,
            comparison ? comparison.best : ""
          )}
        </div>

        <div class="card">
          <div class="muted">
            Latest
          </div>

          <div class="stat">
            ${p.latest}
          </div>
          ${comparisonStat(
            comparison,
            comparison ? comparison.latest : ""
          )}
        </div>

        <div class="card">
          <div class="muted">
            Form (last 3)
          </div>

          <div class="stat form-stat">
            ${Math.round(p.form)}
          </div>
          ${comparisonStat(
            comparison,
            comparison ? Math.round(comparison.form) : ""
          )}
        </div>

      </div>

      <div class="card">

        <div class="section-head">

          <div>

            <h2 class="section-title">
              Recent form
            </h2>

            <div class="muted">
              Last 3 rounds
            </div>

          </div>

        </div>

        <div class="recent-form-comparison">
          <div>
            ${comparison ? `<div class="series-label primary">${esc(p.name)}</div>` : ""}
            <div class="big-form">
              ${recentFormCards(p)}
            </div>
          </div>

          ${comparison ? `
            <div>
              <div class="series-label comparison">${esc(comparison.name)}</div>
              <div class="big-form">
                ${recentFormCards(comparison)}
              </div>
            </div>
          ` : ""}
        </div>

      </div>


      <br>
      <div class="card">

        <div class="section-head">

          <div>

            <h2 class="section-title">
              Score over time
            </h2>

            <div class="muted">
              ${comparison
                ? `${esc(p.name)} compared with ${esc(comparison.name)}`
                : `All rounds for ${esc(p.name)}`
              }
            </div>

          </div>

        </div>

        <div class="chart-box">
          <canvas id="playerScoreChart"></canvas>
        </div>

      </div>

      <br>

      <div class="card">

        <div class="section-head">

          <div>

            <h2 class="section-title">
              Average by hole
            </h2>

            <div class="muted">
              Average strokes on each hole
            </div>

          </div>

        </div>

        <div class="chart-box">
          <canvas id="holeAverageChart"></canvas>
        </div>

      </div>

      <br>

      <div class="card">

        <div class="section-head">

          <div>

            <h2 class="section-title">
              Latest games
            </h2>

            <div class="muted">
              Most recent 10 rounds
            </div>

          </div>

        </div>

        ${playerGamesTable(p.last10)}

      </div>

    </div>

  `;

  requestAnimationFrame(() =>
    renderPlayerCharts(p, comparison)
  );
}

function playerGamesTable(games) {
  if (!games.length) {
    return '<div class="muted">No games.</div>';
  }

  return `

    <div class="table-wrap">

      <table class="table">

        <thead>

          <tr>
            <th>Date</th>
            <th>Course</th>
            <th>Score</th>
            <th>+/- Par</th>
          </tr>

        </thead>

        <tbody>

          ${games.map(x => `

            <tr
              class="clickable"
              onclick="openRound(${rounds.indexOf(x.r)})"
            >

              <td>
                ${esc(x.r.date)}
              </td>

              <td>
                ${esc(x.r.course)}
              </td>

              <td>
                <strong>
                  ${total(x.p)}
                </strong>
              </td>

              <td>

                <span
                  class="par ${parClass(
                    overPar(x.p, x.r)
                  )}"
                >
                  ${fmtPar(
                    overPar(x.p, x.r)
                  )}
                </span>

              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>

  `;
}

function renderPlayerCharts(p, comparison) {
  if (!window.Chart) {
    console.error(
      "Chart.js is not loaded."
    );

    return;
  }

  const primaryGames = playerRounds(p.name, courseFilter);
  const comparisonGames = comparison
    ? playerRounds(comparison.name, courseFilter)
    : [];

  const gameKey = game => `${game.r.date}|${game.r.course}`;

  const timeline = [
    ...primaryGames,
    ...comparisonGames
  ]
    .filter((game, index, list) =>
      list.findIndex(item => gameKey(item) === gameKey(game)) === index
    )
    .sort((a, b) =>
      String(a.r.date).localeCompare(String(b.r.date)) ||
      String(a.r.course).localeCompare(String(b.r.course))
    );

  const scoresByGame = games =>
    new Map(games.map(game => [gameKey(game), total(game.p)]));

  const primaryScores = scoresByGame(primaryGames);
  const comparisonScores = scoresByGame(comparisonGames);

  const pointLabels = {
    id: "pointLabels",

    afterDatasetsDraw(chart) {
      const { ctx } = chart;

      ctx.save();
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);

        meta.data.forEach((point, index) => {
          const value = dataset.data[index];

          if (value === null || value === undefined) return;

          const yOffset = datasetIndex === 0 ? -14 : -26;

          ctx.lineWidth = 3;
          ctx.strokeStyle = "#0f1829";
          ctx.fillStyle = dataset.borderColor;
          ctx.strokeText(String(value), point.x, point.y + yOffset);
          ctx.fillText(String(value), point.x, point.y + yOffset);
        });
      });

      ctx.restore();
    }
  };

  const scoreCanvas =
    document.getElementById(
      "playerScoreChart"
    );

  if (scoreCanvas) {
    const datasets = [{
      label: p.name,
      data: timeline.map(game => primaryScores.get(gameKey(game)) ?? null),
      borderColor: "#5d8cff",
      backgroundColor: "#5d8cff",
      pointBackgroundColor: "#eaf0ff",
      pointBorderColor: "#5d8cff",
      pointBorderWidth: 3,
      pointRadius: 6,
      pointHoverRadius: 9,
      borderWidth: 3,
      tension: 0.22,
      spanGaps: true
    }];

    if (comparison) {
      datasets.push({
        label: comparison.name,
        data: timeline.map(game => comparisonScores.get(gameKey(game)) ?? null),
        borderColor: "#f7be14",
        backgroundColor: "#f7be14",
        pointBackgroundColor: "#fff7d1",
        pointBorderColor: "#f7be14",
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 9,
        borderWidth: 3,
        tension: 0.22,
        spanGaps: true
      });
    }

    const chart = new Chart(
      scoreCanvas,
      {
        type: "line",

        data: {
          labels: timeline.map(game => game.r.date),
          datasets
        },

        plugins: [pointLabels],

        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 22,
              bottom: comparison ? 14 : 4
            }
          },

          interaction: {
            mode: "nearest",
            intersect: false
          },

          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                color: "#cbd5e7",
                usePointStyle: true,
                pointStyle: "circle",
                padding: 18
              }
            }
          },

          scales: {
            x: {
              ticks: {
                color: "#92a0b8",
                maxRotation: 45,
                minRotation: 0,
                autoSkip: true,
                maxTicksLimit: 12
              },
              grid: {
                color: "rgba(130, 144, 168, 0.09)"
              }
            },
            y: {
              beginAtZero: false,
              grace: "12%",
              ticks: {
                color: "#92a0b8",
                precision: 0
              },
              grid: {
                color: "rgba(130, 144, 168, 0.13)"
              }
            }
          }
        }
      }
    );

    charts.push(chart);
  }

  const holeCanvas =
    document.getElementById(
      "holeAverageChart"
    );

  if (holeCanvas) {

    const holeAverages = name => {
      const values = [];

      for (let i = 0; i < 18; i++) {
        const holeScores =
          playerRounds(name, courseFilter)
            .map(x => Number(x.p.scores?.[i]))
            .filter(n => Number.isFinite(n));

        values.push(
          holeScores.length
            ? Math.round(average(holeScores))
            : null
        );
      }

      return values;
    };

    const values = holeAverages(p.name);
    const comparisonValues = comparison
      ? holeAverages(comparison.name)
      : null;

    const chart = new Chart(
      holeCanvas,
      {
        type: "bar",

        data: {
          labels:
            Array.from(
              { length: 18 },
              (_, i) => `Hole ${i + 1}`
            ),

          datasets: [
            {
              label: p.name,
              data: values,
              backgroundColor: "#5d8cff",
              borderColor: "#5d8cff",
              borderWidth: 1,
              borderRadius: 5
            },
            ...(comparison ? [{
              label: comparison.name,
              data: comparisonValues,
              backgroundColor: "#f7be14",
              borderColor: "#f7be14",
              borderWidth: 1,
              borderRadius: 5
            }] : [])
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: {
                color: "#cbd5e7",
                usePointStyle: true,
                padding: 18
              }
            }
          },

          scales: {
            x: {
              ticks: {
                color: "#92a0b8"
              },
              grid: {
                display: false
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: "#92a0b8",
                precision: 0
              },
              grid: {
                color: "rgba(130, 144, 168, 0.13)"
              }
            }
          }
        }
      }
    );

    charts.push(chart);
  }
}

function holeStatValue(games, holeIndex, metric) {
  const entries = games
    .map(x => {
      const score = Number(x.p?.scores?.[holeIndex]);
      const par = coursePars(x.r.course)[holeIndex];

      return {
        score,
        par,
        diff: score - par
      };
    })
    .filter(x => Number.isFinite(x.score) && x.score > 0);

  if (!entries.length) return null;

  if (metric === "best") {
    return entries
      .slice()
      .sort((a, b) => a.score - b.score || a.diff - b.diff)[0];
  }

  if (metric === "latest") {
    return entries[0];
  }

  const score = average(entries.map(x => x.score));
  const diff = average(entries.map(x => x.diff));

  return {
    score,
    diff,
    value: metric === "formOverPar" ? diff : score
  };
}

function statNumber(stat, metric) {
  if (!stat) return null;

  return Math.round(
    metric === "formOverPar"
      ? stat.diff
      : stat.score
  );
}

function formatHoleStat(stat, metric) {
  const value = statNumber(stat, metric);

  if (value === null) return "–";

  return metric === "formOverPar"
    ? fmtPar(value)
    : String(value);
}

function holeScoreClass(stat) {
  if (!stat) return "";

  const diff = Math.round(stat.diff);

  if (diff <= -2) return "score-eagle";
  if (diff === -1) return "score-birdie";
  if (diff === 0) return "score-par";

  const score = Math.min(
    10,
    Math.max(4, Math.round(stat.score))
  );

  return `score-${score}`;
}

function holeStatsTable(title, description, metric, filteredRounds) {
  const names = allPlayers().filter(name =>
    filteredRounds.some(r =>
      (r.players || []).some(p => p.name === name)
    )
  );

  const rows = names.map(name => {
    const games = filteredRounds
      .map(r => {
        const p = (r.players || []).find(x => x.name === name);
        return p ? { r, p } : null;
      })
      .filter(Boolean);

    const source = metric === "form" || metric === "formOverPar"
      ? games.slice(0, 3)
      : metric === "latest"
        ? games.slice(0, 1)
        : games;

    const values = Array.from(
      { length: 18 },
      (_, i) => holeStatValue(source, i, metric)
    );

    const numeric = values.filter(value => value !== null);

    const totalValue = numeric.length
      ? Math.round(
          numeric.reduce(
            (sum, value) =>
              sum + (
                metric === "formOverPar"
                  ? value.diff
                  : value.score
              ),
            0
          )
        )
      : null;

    return { name, values, totalValue };
  });

  return `
    <div class="card stat-table-card">
      <div class="section-head">
        <div>
          <h2 class="section-title">${title}</h2>
          <div class="muted">${description}</div>
        </div>
      </div>

      <div class="table-wrap">
        <table class="table hole-stats-table">
          <thead>
            <tr>
              <th>Player</th>
              ${Array.from({ length: 18 }, (_, i) => `<th>${i + 1}</th>`).join("")}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td>
                  <button
                    class="link-button"
                    onclick='openPlayer(${JSON.stringify(row.name)})'
                  >
                    <strong>${esc(row.name)}</strong>
                  </button>
                </td>
                ${row.values.map(value => `
                  <td class="${holeScoreClass(value)}">${formatHoleStat(value, metric)}</td>
                `).join("")}
                <td><strong>${
                  row.totalValue === null
                    ? "–"
                    : metric === "formOverPar"
                      ? fmtPar(row.totalValue)
                      : row.totalValue
                }</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function chartsPage(filteredRounds) {
  if (!filteredRounds.length) {
    return '<div class="card"><div class="muted">No round data.</div></div>';
  }

  return `
    <div class="stats-tables">
      ${holeStatsTable(
        "Average",
        "Average score on every hole",
        "average",
        filteredRounds
      )}
      ${holeStatsTable(
        "Form",
        "Average score on every hole across the latest 3 rounds",
        "form",
        filteredRounds
      )}
      ${holeStatsTable(
        "Form over par",
        "Average against par on every hole across the latest 3 rounds",
        "formOverPar",
        filteredRounds
      )}
      ${holeStatsTable(
        "Best",
        "Best score each player has ever recorded on every hole",
        "best",
        filteredRounds
      )}
      ${holeStatsTable(
        "Latest",
        "Score on every hole in each player's latest round",
        "latest",
        filteredRounds
      )}
    </div>
  `;
}

function renderRound() {
  const r = rounds[selectedRound];

  if (!r) {
    view = "home";
    render();
    return;
  }

  const players =
    (r.players || [])
      .slice()
      .sort(
        (a, b) =>
          total(a) - total(b)
      );

  const pars =
    r.course === "Belhus"
      ? [4,4,4,4,4,3,4,3,4,4,3,4,4,3,4,5,3,5]
      : r.course === "Cranham"
        ? [4,4,3,4,3,4,5,3,4,4,3,5,3,4,4,3,4,3]
        : Array(18).fill(4);

  app.innerHTML = `

    <div class="wrap">

      <header class="top">

        <button
          class="back"
          onclick="closeDetail()"
        >
          ← Back
        </button>

        <button
          class="secondary"
          onclick="openAdmin()"
        >
          Admin
        </button>

      </header>

      <div class="card">

        <div class="profile-head">

          <div>

            <div class="eyebrow">
              ROUND
            </div>

            <h1>
              ${esc(r.course)}
            </h1>

            <div class="muted">
              ${esc(r.date)}
              · Par ${coursePar(r.course)}
            </div>

          </div>

        </div>

        <div class="result-list">

          ${players.map((p, i) => `

            <div class="result-row">

              <div>

                <span class="rank">
                  ${i + 1}
                </span>

                <button
                  class="link-button"
                  onclick='openPlayer(${JSON.stringify(p.name)})'
                >
                  <strong>
                    ${esc(p.name)}
                  </strong>
                </button>

              </div>

              <div>

                <strong>
                  ${total(p)}
                </strong>

                <span
                  class="par ${parClass(
                    overPar(p, r)
                  )}"
                >
                  ${fmtPar(
                    overPar(p, r)
                  )}
                </span>

              </div>

            </div>

          `).join("")}

        </div>

      </div>

      <br>

      <div class="card">

        <div class="section-head">

          <div>

            <h2 class="section-title">
              Hole by hole
            </h2>

            <div class="muted">
              Par ${coursePar(r.course)}
            </div>

          </div>

        </div>

        <div class="table-wrap">

          <table class="table hole-table">

            <thead>

              <tr>

                <th>
                  Player
                </th>

                ${pars.map((par, i) => `

                  <th>
                    ${i + 1}
                    <br>
                    <span class="muted">
                      ${par}
                    </span>
                  </th>

                `).join("")}

                <th>
                  Total
                </th>

                <th>
                  +/−
                </th>

              </tr>

            </thead>

            <tbody>

              ${players.map(p => `

                <tr>

                  <td>

                    <button
                      class="link-button"
                      onclick='openPlayer(${JSON.stringify(p.name)})'
                    >
                      <strong>
                        ${esc(p.name)}
                      </strong>
                    </button>

                  </td>

                  ${(p.scores || [])
                    .slice(0,18)
                    .map((score, i) => {

                      const n =
                        Number(score);

                      const diff =
                        n - pars[i];

                      const cls =
                        diff < 0
                          ? "good"
                          : diff > 0
                            ? "bad"
                            : "";

                      return `

                        <td class="${cls}">
                          ${n}
                        </td>

                      `;

                    }).join("")}

                  <td>
                    <strong>
                      ${total(p)}
                    </strong>
                  </td>

                  <td>

                    <span
                      class="par ${parClass(
                        overPar(p, r)
                      )}"
                    >
                      ${fmtPar(
                        overPar(p, r)
                      )}
                    </span>

                  </td>

                </tr>

              `).join("")}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  `;
}

function renderLogin() {
  app.innerHTML = `

    <div class="wrap">

      <div class="login card">

        <button
          class="back"
          onclick="setView('home')"
        >
          ← Back
        </button>

        <h1>
          Admin login
        </h1>

        <p class="muted">
          Sign in to add or update rounds.
        </p>

        <form
          class="form"
          onsubmit="login(event)"
        >

          <input
            id="email"
            type="email"
            placeholder="Email"
            required
          >

          <input
            id="password"
            type="password"
            placeholder="Password"
            required
          >

          <button>
            Login
          </button>

        </form>

        <div id="loginMsg"></div>

      </div>

    </div>

  `;
}

function renderAdmin() {
  app.innerHTML = `

    <div class="wrap">

      <header class="top">

        <div>

          <button
            class="back"
            onclick="setView('home')"
          >
            ← Back
          </button>

          <h1>
            Admin
          </h1>

        </div>

        <button
          class="danger"
          onclick="logout()"
        >
          Logout
        </button>

      </header>

      <div class="card">

        <h2 class="section-title">
          Add round
        </h2>

        <form
          class="form"
          onsubmit="addRound(event)"
        >

          <input
            id="course"
            placeholder="Course name"
            value="Belhus"
            required
          >

          <input
            id="date"
            type="date"
            value="${new Date()
              .toISOString()
              .slice(0,10)}"
            required
          >

          <div id="playersForm"></div>

          <button
            type="button"
            class="secondary"
            onclick="addPlayerRow()"
          >
            + Add player
          </button>

          <button>
            Save round
          </button>

          <div id="adminMsg"></div>

        </form>

      </div>

      <br>

      <div class="card">

        <h2 class="section-title">
          Existing rounds
        </h2>

        ${roundList(sortedRounds())}

      </div>

    </div>

  `;

  addPlayerRow();
  addPlayerRow();
}

function addPlayerRow(name = "") {
  const c =
    document.getElementById(
      "playersForm"
    );

  if (!c) return;

  const d =
    document.createElement("div");

  d.className = "player-row";

  d.innerHTML = `

    <div class="form">

      <input
        class="pname"
        placeholder="Player name"
        value="${esc(name)}"
        required
      >

      <div class="score-grid">

        ${Array.from(
          { length: 18 },
          (_, i) => `

            <input
              class="score"
              type="number"
              min="1"
              max="20"
              placeholder="${i + 1}"
              required
            >

          `
        ).join("")}

      </div>

    </div>

  `;

  c.appendChild(d);
}

async function addRound(e) {
  e.preventDefault();

  const msg =
    document.getElementById(
      "adminMsg"
    );

  const rows =
    [
      ...document.querySelectorAll(
        ".player-row"
      )
    ];

  const ps =
    rows.map(row => ({
      name:
        row.querySelector(
          ".pname"
        ).value.trim(),

      scores:
        [
          ...row.querySelectorAll(
            ".score"
          )
        ].map(
          x => Number(x.value)
        )
    }));

  if (!ps.length) {
    msg.textContent =
      "Add at least one player.";

    return;
  }

  const r = {
    course:
      document.getElementById(
        "course"
      ).value.trim(),

    date:
      document.getElementById(
        "date"
      ).value,

    players: ps
  };

  if (sb) {

    const {
      data,
      error
    } =
      await sb
        .from("rounds")
        .upsert(
          r,
          {
            onConflict:
              "course,date"
          }
        )
        .select()
        .single();

    if (error) {

      msg.className =
        "msg error";

      msg.textContent =
        error.message;

      return;
    }

    rounds = [
      ...rounds.filter(
        x =>
          !(
            x.course === r.course &&
            x.date === r.date
          )
      ),

      withoutExcludedPlayers(data)
    ];

  } else {

    const i =
      rounds.findIndex(
        x =>
          x.course === r.course &&
          x.date === r.date
      );

    if (i >= 0) {
      rounds[i] = withoutExcludedPlayers(r);
    } else {
      rounds.push(withoutExcludedPlayers(r));
    }

  }

  msg.className = "msg";

  msg.textContent =
    "Round saved.";

  setTimeout(
    renderAdmin,
    500
  );
}

async function login(e) {
  e.preventDefault();

  if (!sb) {

    document.getElementById(
      "loginMsg"
    ).innerHTML =
      '<div class="msg error">Supabase is not configured.</div>';

    return;
  }

  const {
    data,
    error
  } =
    await sb.auth.signInWithPassword({
      email:
        document.getElementById(
          "email"
        ).value,

      password:
        document.getElementById(
          "password"
        ).value
    });

  if (error) {

    document.getElementById(
      "loginMsg"
    ).innerHTML =
      `<div class="msg error">
        ${esc(error.message)}
      </div>`;

    return;
  }

  session =
    data.session;

  view = "admin";

  renderAdmin();
}

async function logout() {
  if (sb) {
    await sb.auth.signOut();
  }

  session = null;

  view = "home";

  render();
}

function openAdmin() {
  view = "login";

  render();
}

function destroyCharts() {
  charts.forEach(c => {
    try {
      c.destroy();
    } catch (e) {}
  });

  charts = [];
}

async function load() {
  let workbookRounds = [];

  try {
    const response = await fetch(
      "rounds.json?v=20260912-1",
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`Score data returned ${response.status}`);
    }

    workbookRounds = await response.json();
  } catch (error) {
    console.error("Workbook data error:", error);
  }

  let newerDatabaseRounds = [];

  if (sb) {
    const {
      data,
      error
    } =
      await sb
        .from("rounds")
        .select("*")
        .gt("date", WORKBOOK_DATA_CUTOFF)
        .order(
          "date",
          {
            ascending: false
          }
        );

    if (error) {
      console.error("Supabase error:", error);
    } else {
      newerDatabaseRounds = data || [];
    }

    const {
      data: {
        session: s
      }
    } =
      await sb.auth.getSession();

    session = s;
  }

  rounds = [
    ...workbookRounds,
    ...newerDatabaseRounds
  ].map(withoutExcludedPlayers);

  if (!rounds.length) {
    app.innerHTML = `
      <div style="padding:30px;font-family:Arial">
        <h2>Score data unavailable</h2>
        <p>Please refresh the page.</p>
      </div>
    `;

    return;
  }

  render();
}

window.setView =
  setView;

window.openPlayer =
  openPlayer;

window.openRound =
  openRound;

window.openAdmin =
  openAdmin;

window.login =
  login;

window.logout =
  logout;

window.addRound =
  addRound;

window.addPlayerRow =
  addPlayerRow;

window.setCourseFilter =
  setCourseFilter;

window.setComparePlayer =
  setComparePlayer;

load();
