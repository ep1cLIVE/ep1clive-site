/* ep1cLIVE — the site reads two things: the data block in index.html and
   status.json. Everything it prints is real: no fake counters, no fake dates. */

(function (root) {
  "use strict";

  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  /* ---------- time zone maths -------------------------------------------
     There is no date library here on purpose. We convert a wall-clock time in
     the streamer's zone into a UTC instant using Intl, so DST is handled by the
     browser instead of by a hardcoded offset. */
  function partsIn(date, tz) {
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false, weekday: "short",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    var out = {}, parts = dtf.formatToParts(date);
    for (var i = 0; i < parts.length; i++) out[parts[i].type] = parts[i].value;
    return out;
  }

  function wallMs(p) {
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  }

  /* difference between the zone's wall clock and real UTC, at that instant */
  function offsetMs(date, tz) {
    return wallMs(partsIn(date, tz)) - (date.getTime() - date.getMilliseconds());
  }

  /* take a wall-clock instant (as UTC ms) and resolve it to a real instant */
  function fromWall(wall, tz) {
    var off = offsetMs(new Date(wall), tz);
    off = offsetMs(new Date(wall - off), tz);
    return wall - off;
  }

  function nextOccurrence(slot, from, tz) {
    var p = partsIn(from, tz);
    var hm = slot.time.split(":");
    var nowWall = wallMs(p);
    var curDow = DOW.indexOf(p.weekday);
    var day = new Date(nowWall + ((slot.dow - curDow + 7) % 7) * 86400000);
    var target = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(),
      +hm[0], +hm[1], 0);
    if (target <= nowWall) target += 7 * 86400000;
    return new Date(fromWall(target, tz));
  }

  function upcoming(slots, from, tz) {
    return slots
      .map(function (s) { return { slot: s, start: nextOccurrence(s, from, tz) }; })
      .sort(function (a, b) { return a.start - b.start; });
  }

  function fmtTime(date, tz) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", minute: "2-digit"
    }).format(date);
  }

  function dayDiff(aWall, bWall) { return Math.round((bWall - aWall) / 86400000); }

  function fmtDur(ms) {
    var m = Math.max(0, Math.floor(ms / 60000));
    var d = Math.floor(m / 1440), h = Math.floor(m / 60) % 60;
    if (d) return d + "d " + h + "h";
    if (h) return h + "h " + (m % 60) + "m";
    return m + "m";
  }

  function pad(n, w) {
    var s = String(Math.max(0, Math.floor(n)));
    while (s.length < (w || 2)) s = "0" + s;
    return s;
  }

  /* ---------- the page -------------------------------------------------- */
  function init() {
    var dataEl = document.getElementById("ep1c-data");
    if (!dataEl) return;
    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }

    var tz = data.tz || "America/Chicago";
    var slots = data.schedule || [];
    var state = { live: false };

    var el = {
      week: document.getElementById("week"),
      nextDay: document.getElementById("next-day"),
      nextSlot: document.getElementById("next-slot"),
      cd: document.getElementById("countdown"),
      tally: document.getElementById("tally-text"),
      roState: document.getElementById("readout-state"),
      roNow: document.getElementById("readout-now"),
      roGame: document.getElementById("ro-game"),
      roViewers: document.getElementById("ro-viewers"),
      roUptime: document.getElementById("ro-uptime"),
      roClock: document.getElementById("ro-clock"),
      embed: document.getElementById("embed"),
      embedMsg: document.getElementById("embed-msg"),
      badge: document.getElementById("embed-badge"),
      odo: document.getElementById("odometer")
    };

    function setVal(node, text) {
      if (!node) return;
      if (text === null || text === undefined || text === "") {
        node.textContent = "\u2014";
        node.setAttribute("data-empty", "true");
      } else {
        node.textContent = text;
        node.removeAttribute("data-empty");
      }
    }

    /* --- hit counter: real, and honestly scoped to this one browser ------
       There is no server on GitHub Pages, so a global visitor count cannot be
       honest. This counts the visits made from this browser and says so. */
    function renderCounter() {
      if (!el.odo) return;
      var n = 0;
      try {
        n = parseInt(root.localStorage.getItem("ep1c-hits") || "0", 10) || 0;
        n += 1;
        root.localStorage.setItem("ep1c-hits", String(n));
      } catch (e) { n = 1; }
      var s2 = ("000000" + n).slice(-6);
      el.odo.innerHTML = "";
      for (var i = 0; i < s2.length; i++) {
        var b = document.createElement("span");
        b.textContent = s2.charAt(i);
        el.odo.appendChild(b);
      }
      el.odo.setAttribute("aria-label", "About " + n + " visits from this browser");
    }

    /* --- schedule grid: built from the data block so there is one source --- */
    function renderWeek(now) {
      if (!el.week) return;
      var p = partsIn(now, tz);
      var todayDow = DOW.indexOf(p.weekday);
      var order = upcoming(slots, now, tz);
      var nextKey = order.length ? order[0].slot.dow : -1;
      var byDow = {};
      slots.forEach(function (s) { byDow[s.dow] = s; });

      el.week.innerHTML = "";
      for (var d = 0; d < 7; d++) {
        var cell = document.createElement("div");
        var slot = byDow[d];
        cell.className = "day" + (slot ? "" : " day--off") + (d === nextKey ? " day--next" : "");
        if (d === todayDow) cell.setAttribute("data-today", "");

        var name = document.createElement("span");
        name.className = "day__name";
        name.textContent = DOW[d];
        cell.appendChild(name);

        var time = document.createElement("span");
        time.className = "day__time";
        time.textContent = slot ? slot.label : "Off";
        cell.appendChild(time);

        var game = document.createElement("span");
        game.className = "day__game";
        game.textContent = slot ? slot.game : "No stream";
        cell.appendChild(game);

        var tag = document.createElement("span");
        tag.className = "day__tag";
        tag.textContent = slot ? slot.tag : "";
        cell.appendChild(tag);

        el.week.appendChild(cell);
      }
    }

    function setCountdown(ms, labels, negativeOk) {
      var s = Math.floor(Math.abs(ms) / 1000);
      var d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24,
          m = Math.floor(s / 60) % 60, sec = s % 60;
      var nodes = [document.getElementById("cd-d"), document.getElementById("cd-h"),
                   document.getElementById("cd-m"), document.getElementById("cd-s")];
      var vals = [d, h, m, sec];
      for (var i = 0; i < 4; i++) if (nodes[i]) nodes[i].textContent = pad(vals[i]);
      if (labels && el.cd) {
        var spans = el.cd.querySelectorAll("span");
        for (var j = 0; j < spans.length && j < labels.length; j++) spans[j].textContent = labels[j];
      }
    }

    function tick() {
      var now = new Date();
      if (el.roClock) {
        var p = partsIn(now, tz);
        el.roClock.textContent = pad(+p.hour % 24) + ":" + p.minute + ":" + p.second;
      }

      if (state.live) {
        var started = state.startedAt ? new Date(state.startedAt) : null;
        if (started && !isNaN(started)) {
          var up = now - started;
          setCountdown(up, ["days", "hours", "min", "sec"]);
          setVal(el.roUptime, fmtDur(up));
        }
        return;
      }

      var order = upcoming(slots, now, tz);
      if (!order.length) return;
      var next = order[0];
      setCountdown(next.start - now);

      var p2 = partsIn(now, tz);
      var diff = dayDiff(wallMs(p2), wallMs(partsIn(next.start, tz)));
      if (el.nextDay) {
        el.nextDay.textContent = diff === 0 ? "Today"
          : diff === 1 ? "Tomorrow"
          : DOW_LONG[next.slot.dow];
      }
      if (el.nextSlot) {
        el.nextSlot.textContent = next.slot.label + " \u00b7 " + next.slot.game;
      }
    }

    /* --- status.json drives the on-air state; no keys in the browser ---- */
    function apply(st) {
      state = st || { live: false };
      var live = !!state.live;
      document.body.classList.toggle("is-live", live);
      document.body.classList.toggle("is-offline", !live);

      if (el.tally) el.tally.textContent = live ? "On air" : "Off air";
      if (el.badge) el.badge.textContent = live ? "LIVE" : "OFFLINE";
      if (el.roState) el.roState.textContent = live ? "On air" : "Off air";

      setVal(el.roGame, live ? state.game : null);
      setVal(el.roViewers, live && state.viewers ? state.viewers.toLocaleString() : null);
      setVal(el.roUptime, null);

      if (live) {
        if (el.roNow) el.roNow.textContent = state.title || "Live now.";
        if (el.nextDay) el.nextDay.textContent = state.game || "Live";
        if (el.nextSlot) {
          var started = state.startedAt ? new Date(state.startedAt) : null;
          el.nextSlot.textContent = started && !isNaN(started)
            ? "Started " + fmtTime(started, tz) + " \u00b7 studio time"
            : "Broadcasting now";
        }
        if (el.cd) el.cd.setAttribute("aria-label", "How long the stream has been live");
      } else {
        if (el.roNow) el.roNow.textContent =
          state.note || "Nothing live right now. Next stream is on the schedule below.";
        if (el.cd) el.cd.setAttribute("aria-label", "Time until the next stream");
      }

      buildEmbed(live);
      renderWeek(new Date());
      tick();
    }

    function buildEmbed(live) {
      if (!el.embed) return;
      if (live && data.twitchParent && !el.embed.querySelector("iframe")) {
        var iframe = document.createElement("iframe");
        iframe.src = "https://player.twitch.tv/?channel=" + encodeURIComponent(data.twitch) +
          "&parent=" + encodeURIComponent(data.twitchParent) + "&autoplay=false&muted=true";
        iframe.title = "ep1cLIVE live on Twitch";
        iframe.allowFullscreen = true;
        iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
        el.embed.innerHTML = "";
        el.embed.appendChild(iframe);
      } else if (!live) {
        el.embed.innerHTML = "";
        var msg = document.createElement("p");
        msg.className = "embed__msg";
        msg.textContent = "The player shows up here when the channel is live. Until then the archive is open.";
        el.embed.appendChild(msg);
      }
    }

    function loadStatus() {
      fetch("./status.json?t=" + Date.now(), { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("status " + r.status);
          return r.json();
        })
        .then(apply)
        .catch(function () {
          /* Offline-hosted copies (file://) still need to render. */
          apply({ live: false });
        });
    }

    renderCounter();
    loadStatus();
    setInterval(loadStatus, 60000);
    setInterval(tick, 1000);
    renderWeek(new Date());
    tick();
  }

  var api = {
    partsIn: partsIn, offsetMs: offsetMs, fromWall: fromWall,
    nextOccurrence: nextOccurrence, upcoming: upcoming, DOW: DOW
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.EP1CTime = api;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
