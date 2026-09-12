const SUPABASE_URL="https://ynbazjjyauxcpadupgzq.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_z_J5OQ1beeAHZORD9yIiFw_0WWxwPGW";

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
let selectedRound = null;
let courseFilter = "all";
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
      if (!m[p.name]) {
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

  const last5 = games.slice(0, 5);
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

    last5,
    last10,

    formAvg:
      last5.reduce(
        (a, x) => a + total(x.p),
        0
      ) / last5.length,

    formOverPar:
      last5.reduce(
        (a, x) => a + overPar(x.p, x.r),
        0
      ) / last5.length,

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
  view = "player";

  render();
}

function openRound(index) {
  selectedRound = index;
  view = "round";

  render();
}

function closeDetail() {
  selectedPlayer = null;
  selectedRound = null;
  view = "home";

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

  const groupAvg = ps.length
    ? ps.reduce((a, p) => a + p.avg, 0) / ps.length
    : 0;

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
          ? home(ps, groupAvg, filteredRounds)

          : view === "rounds"
            ? roundsPage(filteredRounds)

            : view === "players"
              ? playersPage(ps)

              : chartsPage(filteredRounds)
      }

    </div>
  `;

  if (view === "charts") {
    requestAnimationFrame(() =>
      renderDashboardCharts(filteredRounds)
    );
  }
}

function home(ps, groupAvg, filteredRounds) {
  const latest = filteredRounds[0];

  return `

    <div class="grid stats-grid">

      <div class="card">
        <div class="muted">Rounds</div>
        <div class="stat">
          ${filteredRounds.length}
        </div>
      </div>

      <div class="card">
        <div class="muted">Players</div>
        <div class="stat">
          ${ps.length}
        </div>
      </div>

      <div class="card">
        <div class="muted">Courses</div>
        <div class="stat">
          ${new Set(
            filteredRounds.map(r => r.course)
          ).size}
        </div>
      </div>

      <div class="card">
        <div class="muted">Group average</div>
        <div class="stat">
          ${groupAvg ? groupAvg.toFixed(1) : "-"}
        </div>
      </div>

    </div>

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

      <table class="table">

        <thead>

          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Rounds</th>
            <th>Average</th>
            <th>Best</th>
            <th>Latest</th>
            <th>Form</th>
            <th>Form +/−</th>
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
                  ${p.avg.toFixed(1)}
                </strong>
              </td>

              <td>
                ${p.best}
              </td>

              <td>

                ${p.latest}

                <span
                  class="par ${parClass(
                    overPar(
                      p.latestRound.p,
                      p.latestRound.r
                    )
                  )}"
                >
                  ${fmtPar(
                    overPar(
                      p.latestRound.p,
                      p.latestRound.r
                    )
                  )}
                </span>

              </td>

              <td>

                ${p.last5.map(x => `

                  <span
                    class="form-dot ${parClass(
                      overPar(x.p, x.r)
                    )}"
                    title="${esc(x.r.date)}"
                  >
                    ${total(x.p)}
                  </span>

                `).join("")}

              </td>

              <td>

                <span
                  class="par ${parClass(
                    p.formOverPar
                  )}"
                >
                  ${fmtPar(
                    Number(p.formOverPar).toFixed(1)
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
              ${p.avg.toFixed(1)}
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
                <strong>${p.formAvg.toFixed(1)}</strong>
              </span>

            </div>

          </button>

        `).join("")}

      </div>

    </div>

  `;
}

function renderPlayer() {
  const p = playerStats(
    selectedPlayer,
    courseFilter
  );

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

      </div>

      <div class="grid stats-grid">

        <div class="card">
          <div class="muted">
            Average
          </div>

          <div class="stat">
            ${p.avg.toFixed(1)}
          </div>
        </div>

        <div class="card">
          <div class="muted">
            Best
          </div>

          <div class="stat">
            ${p.best}
          </div>
        </div>

        <div class="card">
          <div class="muted">
            Latest
          </div>

          <div class="stat">
            ${p.latest}
          </div>
        </div>

        <div class="card">
          <div class="muted">
            Last 5 form
          </div>

          <div class="stat">
            ${p.formAvg.toFixed(1)}
          </div>
        </div>

      </div>

      <div class="card">

        <div class="section-head">

          <div>

            <h2 class="section-title">
              Recent form
            </h2>

            <div class="muted">
              Last 5 rounds
            </div>

          </div>

        </div>

        <div class="big-form">

          ${p.last5.map(x => `

            <div
              class="form-game ${parClass(
                overPar(x.p, x.r)
              )}"
              onclick="openRound(${rounds.indexOf(x.r)})"
            >

              <strong>
                ${total(x.p)}
              </strong>

              <span>
                ${fmtPar(
                  overPar(x.p, x.r)
                )}
              </span>

              <small>
                ${esc(x.r.course)}
              </small>

              <small>
                ${esc(x.r.date)}
              </small>

            </div>

          `).join("")}

        </div>

      </div>

      <br>

      <div class="grid stats-grid">

        <div class="card">

          <div class="muted">
            Form average
          </div>

          <div class="stat">
            ${p.formAvg.toFixed(1)}
          </div>

        </div>

        <div class="card">

          <div class="muted">
            Form +/− par
          </div>

          <div class="stat">

            <span
              class="par ${parClass(
                p.formOverPar
              )}"
            >
              ${fmtPar(
                Number(p.formOverPar).toFixed(1)
              )}
            </span>

          </div>

        </div>

        <div class="card">

          <div class="muted">
            Best +/− par
          </div>

          <div class="stat">

            <span
              class="par ${parClass(
                p.bestOverPar
              )}"
            >
              ${fmtPar(
                p.bestOverPar
              )}
            </span>

          </div>

        </div>

        <div class="card">

          <div class="muted">
            Worst +/− par
          </div>

          <div class="stat">

            <span
              class="par ${parClass(
                p.worstOverPar
              )}"
            >
              ${fmtPar(
                p.worstOverPar
              )}
            </span>

          </div>

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
              All rounds for ${esc(p.name)}
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
    renderPlayerCharts(p)
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

function renderPlayerCharts(p) {
  if (!window.Chart) {
    console.error(
      "Chart.js is not loaded."
    );

    return;
  }

  const games = p.last10
    .slice()
    .reverse();

  const scoreCanvas =
    document.getElementById(
      "playerScoreChart"
    );

  if (scoreCanvas) {

    const chart = new Chart(
      scoreCanvas,
      {
        type: "line",

        data: {
          labels: games.map(
            x => `${x.r.date} · ${x.r.course}`
          ),

          datasets: [{
            label: "Score",

            data: games.map(
              x => total(x.p)
            ),

            tension: 0.25
          }]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            legend: {
              display: true
            }
          },

          scales: {
            y: {
              beginAtZero: false
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

    const values = [];

    for (let i = 0; i < 18; i++) {

      const holeScores =
        playerRounds(
          p.name,
          courseFilter
        )
        .map(x =>
          Number(
            x.p.scores?.[i]
          )
        )
        .filter(
          n => Number.isFinite(n)
        );

      values.push(
        holeScores.length
          ? holeScores.reduce(
              (a, b) => a + b,
              0
            ) / holeScores.length
          : null
      );
    }

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

          datasets: [{
            label: "Average strokes",

            data: values
          }]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      }
    );

    charts.push(chart);
  }
}

function chartsPage(filteredRounds) {
  return `

    <div class="grid">

      <div class="card">

        <h2 class="section-title">
          Group average
        </h2>

        <div class="muted">
          Average score per round
        </div>

        <div class="chart-box">
          <canvas id="groupAverageChart"></canvas>
        </div>

      </div>

      <div class="card">

        <h2 class="section-title">
          Player comparison
        </h2>

        <div class="muted">
          Average score by player
        </div>

        <div class="chart-box">
          <canvas id="playerAverageChart"></canvas>
        </div>

      </div>

    </div>

  `;
}

function renderDashboardCharts(filteredRounds) {
  if (!window.Chart) {
    console.error(
      "Chart.js is not loaded."
    );

    return;
  }

  const groupCanvas =
    document.getElementById(
      "groupAverageChart"
    );

  if (groupCanvas) {

    const data = filteredRounds
      .slice()
      .reverse()
      .map(r => {

        const ps =
          (r.players || [])
            .map(p => total(p));

        const avg = ps.length
          ? ps.reduce(
              (a, b) => a + b,
              0
            ) / ps.length
          : null;

        return {
          date: r.date,
          course: r.course,
          avg
        };
      });

    const chart = new Chart(
      groupCanvas,
      {
        type: "line",

        data: {
          labels: data.map(
            x => `${x.date} · ${x.course}`
          ),

          datasets: [{
            label: "Group average",

            data: data.map(
              x => x.avg
            ),

            tension: 0.25
          }]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          scales: {
            y: {
              beginAtZero: false
            }
          }
        }
      }
    );

    charts.push(chart);
  }

  const playerCanvas =
    document.getElementById(
      "playerAverageChart"
    );

  if (playerCanvas) {

    const ps =
      leaderboardData(courseFilter);

    const chart = new Chart(
      playerCanvas,
      {
        type: "bar",

        data: {
          labels: ps.map(
            p => p.name
          ),

          datasets: [{
            label: "Average score",

            data: ps.map(
              p => p.avg
            )
          }]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          scales: {
            y: {
              beginAtZero: false
            }
          }
        }
      }
    );

    charts.push(chart);
  }
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

      data
    ];

  } else {

    const i =
      rounds.findIndex(
        x =>
          x.course === r.course &&
          x.date === r.date
      );

    if (i >= 0) {
      rounds[i] = r;
    } else {
      rounds.push(r);
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

  if (sb) {

    const {
      data,
      error
    } =
      await sb
        .from("rounds")
        .select("*")
        .order(
          "date",
          {
            ascending: false
          }
        );

    if (error) {

      console.error(
        "Supabase error:",
        error
      );

      app.innerHTML = `

        <div
          style="
            padding:30px;
            font-family:Arial
          "
        >

          <h2>
            Supabase Error
          </h2>

          <p>
            ${esc(error.message)}
          </p>

        </div>

      `;

      return;
    }

    rounds =
      data || [];

    const {
      data: {
        session: s
      }
    } =
      await sb.auth.getSession();

    session = s;

  } else {

    rounds = [];

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

load();