const weddingDate = new Date("2024-07-05T16:00:00+03:00").getTime();
const ids = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
};
const countdownCaption = document.getElementById("countdownCaption");
const countdownHeading = document.querySelector(".countdown h2");

function getDayWordRu(num) {
  const n = Math.abs(num) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return "дней";
  if (n1 > 1 && n1 < 5) return "дня";
  if (n1 === 1) return "день";
  return "дней";
}

function updateCountdown() {
  const now = Date.now();
  const rawDiff = weddingDate - now;
  const diff = Math.max(0, rawDiff);
  const total = Math.floor(diff / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  ids.days.textContent = String(days).padStart(2, "0");
  ids.hours.textContent = String(hours).padStart(2, "0");
  ids.minutes.textContent = String(minutes).padStart(2, "0");
  ids.seconds.textContent = String(seconds).padStart(2, "0");

  if (!countdownCaption || !countdownHeading) return;

  if (rawDiff > 0) {
    countdownHeading.textContent = "До нашего дня";
    countdownCaption.textContent = "С нетерпением ждем встречи с вами!";
    return;
  }

  const passedDays = Math.floor((now - weddingDate) / 86400000);
  countdownHeading.textContent = "Наш день уже состоялся";
  countdownCaption.textContent =
    passedDays > 0
      ? `С этого момента прошло ${passedDays} ${getDayWordRu(passedDays)}.`
      : "Сегодня наш особенный день.";
}
updateCountdown();
setInterval(updateCountdown, 1000);

const revealElements = document.querySelectorAll(".reveal");
const timelineItems = document.querySelectorAll(".timeline-item");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("show");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.08, rootMargin: "0px 0px 80px 0px" }
);
revealElements.forEach((el) => observer.observe(el));
timelineItems.forEach((item, idx) => {
  setTimeout(() => observer.observe(item), idx * 140);
});

/** Подбор контраста навигации: под тёмный блок (герой, галерея) — светлые капсулы; иначе — тёмный текст на светлой. */
(() => {
  const html = document.documentElement;
  const NAV_BAND_VY = 52;
  const REGIONS = [
    ["header.hero", "dark"],
    ["#story", "light"],
    [".countdown", "light"],
    [".gallery", "dark"],
    ["#timeline", "light"],
    [".dresscode", "light"],
    ["#place", "light"],
    ["#rsvp", "light"],
    [".footer", "light"],
  ];

  function computeNavSurface() {
    const vy = NAV_BAND_VY;
    for (const [sel, theme] of REGIONS) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (vy >= r.top && vy <= r.bottom) return theme;
    }
    let bestTheme = "light";
    let bestDist = Infinity;
    for (const [sel, theme] of REGIONS) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const dist =
        vy < r.top ? r.top - vy : vy > r.bottom ? vy - r.bottom : 0;
      if (dist < bestDist) {
        bestDist = dist;
        bestTheme = theme;
      }
    }
    return bestTheme;
  }

  let ticking = false;
  function applyNavSurface() {
    ticking = false;
    const surface = computeNavSurface();
    if (surface === "light") html.setAttribute("data-nav-surface", "light");
    else html.removeAttribute("data-nav-surface");
  }

  function scheduleNavSurface() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(applyNavSurface);
  }

  window.addEventListener("scroll", scheduleNavSurface, { passive: true });
  window.addEventListener("resize", scheduleNavSurface);
  applyNavSurface();
})();

const form = document.getElementById("rsvpForm");
const msg = document.getElementById("formMessage");
if (form && msg) {
  function rsvpApiBase() {
    const raw = document.querySelector('meta[name="wedding-rsvp-api"]')?.getAttribute("content") || "";
    return String(raw).trim().replace(/\/$/, "");
  }
  function rsvpUrl(path) {
    const base = rsvpApiBase();
    return base ? `${base}${path}` : path;
  }
  const RSVP_ENDPOINTS = [rsvpUrl("/api/rsvp"), rsvpUrl("/send-rsvp.php")];
  const nameInput = form.elements.namedItem("name");
  const attendanceSelect = form.elements.namedItem("attendance");
  const commentInput = form.elements.namedItem("comment");
  const commentCounter = document.getElementById("commentCounter");

  function getErrorElement(fieldName) {
    return form.querySelector(`.field-error[data-for="${fieldName}"]`);
  }

  function setFieldError(fieldName, text) {
    const field = form.elements.namedItem(fieldName);
    const errorEl = getErrorElement(fieldName);
    if (!(field instanceof HTMLElement) || !errorEl) return;
    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
    errorEl.textContent = text;
  }

  function clearFieldError(fieldName) {
    const field = form.elements.namedItem(fieldName);
    const errorEl = getErrorElement(fieldName);
    if (!(field instanceof HTMLElement) || !errorEl) return;
    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
    errorEl.textContent = "";
  }

  function setFormMessage(text, tone) {
    msg.classList.remove("is-success", "is-error", "is-pending");
    if (tone === "success") msg.classList.add("is-success");
    if (tone === "error") msg.classList.add("is-error");
    if (tone === "pending") msg.classList.add("is-pending");
    msg.textContent = text;
  }

  function validateForm() {
    let isValid = true;
    let firstInvalidField = null;
    const nameValue = nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "";
    const attendanceValue = attendanceSelect instanceof HTMLSelectElement ? attendanceSelect.value : "";
    const commentValue = commentInput instanceof HTMLTextAreaElement ? commentInput.value.trim() : "";

    clearFieldError("name");
    clearFieldError("attendance");
    clearFieldError("comment");

    if (!nameValue) {
      setFieldError("name", "Введите ваше имя.");
      firstInvalidField = firstInvalidField || nameInput;
      isValid = false;
    } else if (nameValue.length < 2) {
      setFieldError("name", "Имя должно быть не короче 2 символов.");
      firstInvalidField = firstInvalidField || nameInput;
      isValid = false;
    }

    if (!attendanceValue) {
      setFieldError("attendance", "Выберите вариант присутствия.");
      firstInvalidField = firstInvalidField || attendanceSelect;
      isValid = false;
    }

    if (commentValue.length > 300) {
      setFieldError("comment", "Комментарий должен быть не длиннее 300 символов.");
      firstInvalidField = firstInvalidField || commentInput;
      isValid = false;
    }

    if (firstInvalidField instanceof HTMLElement) {
      firstInvalidField.focus();
    }

    return isValid;
  }

  function updateCommentCounter() {
    if (!(commentInput instanceof HTMLTextAreaElement) || !commentCounter) return;
    const length = commentInput.value.length;
    commentCounter.textContent = `${length}/300`;
    commentCounter.classList.toggle("is-limit", length >= 280);
  }

  updateCommentCounter();
  if (commentInput instanceof HTMLTextAreaElement) {
    commentInput.addEventListener("input", updateCommentCounter);
  }

  ["name", "attendance", "comment"].forEach((fieldName) => {
    const field = form.elements.namedItem(fieldName);
    if (!(field instanceof HTMLElement)) return;
    field.addEventListener("input", () => clearFieldError(fieldName));
    field.addEventListener("change", () => clearFieldError(fieldName));
  });

  async function submitRsvp(payload) {
    for (const endpoint of RSVP_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const raw = (await response.text()).replace(/^\uFEFF/, "").trim();
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch (_) {
          data = null;
        }
        if (response.ok && data && data.ok === true) return { ok: true };
      } catch (_) {
        /* пробуем следующий эндпоинт */
      }
    }
    return { ok: false };
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      setFormMessage("Кажется, что-то не так с полями — загляните, пожалуйста.", "error");
      return;
    }
    const formData = new FormData(form);
    const name = String(formData.get("name") || "Гость").trim();
    const attendance = String(formData.get("attendance") || "");
    const comment = String(formData.get("comment") || "").trim();
    const submitBtn = form.querySelector("button[type='submit']");
    const originalBtnText = submitBtn?.textContent || "Отправить ответ";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Отправляем...";
    }
    setFormMessage("Отправляем… одну секунду", "pending");
    if (window.location.protocol === "file:") {
      setFormMessage(
        "Страница открыта с диска (file://). Запустите в папке проекта: node server.js и откройте http://localhost:3000 — иначе отправка не работает.",
        "error",
      );
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
      return;
    }
    try {
      const sent = await submitRsvp({
        name,
        attendance,
        comment,
        source: "website",
        submittedAt: new Date().toISOString(),
      });
      if (!sent.ok) {
        setFormMessage(
          "Не удалось отправить. Нужен сервер: в папке проекта выполните node server.js и зайдите на http://localhost:3000. Другой способ (Live Server): в index.html в meta wedding-rsvp-api укажите http://localhost:3000",
          "error",
        );
        return;
      }
      setFormMessage(`${name}, спасибо большое — всё улетело к нам 🎉`, "success");
      form.reset();
      clearFieldError("name");
      clearFieldError("attendance");
      clearFieldError("comment");
      updateCommentCounter();
    } catch (error) {
      setFormMessage("Что-то пошло не так при отправке. Попробуйте ещё раз.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });
}

const fabDock = document.getElementById("fabDock");
const fabMain = document.getElementById("fabMain");
const fabActions = document.getElementById("fabActions");
const contactToggle = document.getElementById("contactToggle");
const contactPanel = document.getElementById("contactPanel");
const soundInvite = document.getElementById("soundInvite");
const SOUND_HERO_KEY = "weddingSoundHero_v3";
const CONTACT_TIP_KEY = "weddingContactTip_v1";
/** Запас, если transitionend на панели не пришёл (синхрон с --contact-morph-dur в styles.css) */
const FAB_CONTACT_PANEL_CLOSE_FALLBACK_MS = 720;
let fabCloseAfterContactsTimer = 0;
let fabContactPanelCloseListener = null;

function clearFabCloseAfterContactsTimer() {
  if (fabCloseAfterContactsTimer) {
    window.clearTimeout(fabCloseAfterContactsTimer);
    fabCloseAfterContactsTimer = 0;
  }
  if (fabContactPanelCloseListener && contactPanel) {
    contactPanel.removeEventListener("transitionend", fabContactPanelCloseListener);
    fabContactPanelCloseListener = null;
  }
}

(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("replaySound")) {
      sessionStorage.removeItem(SOUND_HERO_KEY);
      sessionStorage.removeItem(CONTACT_TIP_KEY);
      params.delete("replaySound");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
      );
    }
  } catch (_) {
    /* ignore */
  }

  window.addEventListener(
    "keydown",
    (event) => {
      const f5Hard =
        (event.key === "F5" || event.code === "F5") && (event.ctrlKey || event.metaKey);
      const rsHard =
        (event.key === "r" || event.key === "R") &&
        event.shiftKey &&
        (event.ctrlKey || event.metaKey);
      if (!f5Hard && !rsHard) return;
      try {
        sessionStorage.removeItem(SOUND_HERO_KEY);
        sessionStorage.removeItem(CONTACT_TIP_KEY);
      } catch (_) {
        /* ignore */
      }
    },
    true,
  );
})();

function endSoundHeroFlow() {
  const hadSoundReveal = Boolean(fabDock?.classList.contains("is-sound-reveal"));
  fabDock?.classList.remove("is-sound-reveal");
  if (soundInvite) soundInvite.setAttribute("aria-hidden", "true");
  sessionStorage.setItem(SOUND_HERO_KEY, "1");
  if (hadSoundReveal) scheduleContactTipAfterSoundHero();
}

const contactTipMorph = document.getElementById("contactTipMorph");
const contactTipOk = document.getElementById("contactTipOk");

function scheduleContactTipAfterSoundHero() {
  if (sessionStorage.getItem(CONTACT_TIP_KEY) === "1") return;
  if (!contactTipMorph || !contactToggle || !fabDock) return;
  window.setTimeout(() => {
    if (sessionStorage.getItem(CONTACT_TIP_KEY) === "1") return;
    void openFabAndShowContactTip();
  }, 700);
}

async function openFabAndShowContactTip() {
  setFabOpen(true);
  await new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });
  fabDock?.classList.add("is-contact-tip-reveal", "contact-tip-active");
  contactTipMorph?.setAttribute("aria-hidden", "false");
  await new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });
  contactTipOk?.focus({ preventScroll: true });
}

function hideContactTip() {
  if (!fabDock?.classList.contains("is-contact-tip-reveal")) return;
  fabDock.classList.remove("is-contact-tip-reveal", "contact-tip-active");
  contactTipMorph?.setAttribute("aria-hidden", "true");
  try {
    sessionStorage.setItem(CONTACT_TIP_KEY, "1");
  } catch (_) {
    /* ignore */
  }
}

if (contactTipOk && contactTipMorph) {
  contactTipOk.addEventListener("click", (event) => {
    event.stopPropagation();
    hideContactTip();
  });
}

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape") return;
    if (!fabDock?.classList.contains("is-contact-tip-reveal")) return;
    event.preventDefault();
    event.stopPropagation();
    hideContactTip();
  },
  true,
);

const setContactOpen = (isOpen) => {
  if (!fabDock || !contactToggle || !contactPanel) return;
  if (isOpen) {
    clearFabCloseAfterContactsTimer();
  }
  fabDock.classList.toggle("is-contact-open", isOpen);
  contactToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  contactPanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
};

const setFabOpen = (open, opts = {}) => {
  const skipContactPanelClose = opts.skipContactPanelClose === true;
  if (!fabDock || !fabMain) return;
  if (open) {
    clearFabCloseAfterContactsTimer();
  }
  if (!open && fabDock.classList.contains("is-sound-reveal")) {
    endSoundHeroFlow();
  }
  if (!open && fabDock.classList.contains("is-contact-tip-reveal")) {
    hideContactTip();
  }
  if (!open && !skipContactPanelClose) {
    setContactOpen(false);
  }
  fabDock.classList.toggle("is-open", open);
  fabMain.setAttribute("aria-expanded", open ? "true" : "false");
  fabMain.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  const fabRowShown =
    (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 780px)").matches) ||
    open;
  fabActions?.setAttribute("aria-hidden", fabRowShown ? "false" : "true");
  if (open) {
    document.dispatchEvent(new CustomEvent("weddingFabOpened", { bubbles: true }));
  }
};

/**
 * Закрытие FAB: при открытых контактах сначала панель зеркально схлопывается (как открывалась),
 * по transitionend на панели — только потом звук и контакты аккуратно сходятся к кнопке меню.
 */
function requestCloseFabMenu() {
  if (!fabDock || !fabDock.classList.contains("is-open")) return;
  clearFabCloseAfterContactsTimer();
  if (fabDock.classList.contains("is-contact-open")) {
    const panel = contactPanel;
    setContactOpen(false);

    let settled = false;
    const finishCollapseRow = () => {
      if (settled) return;
      settled = true;
      clearFabCloseAfterContactsTimer();
      setFabOpen(false, { skipContactPanelClose: true });
    };

    fabContactPanelCloseListener = (e) => {
      if (!panel || e.target !== panel) return;
      if (e.propertyName !== "transform") return;
      finishCollapseRow();
    };
    if (panel) panel.addEventListener("transitionend", fabContactPanelCloseListener);
    fabCloseAfterContactsTimer = window.setTimeout(finishCollapseRow, FAB_CONTACT_PANEL_CLOSE_FALLBACK_MS);

    return;
  }
  setFabOpen(false);
}

if (fabMain && fabDock) {
  fabMain.addEventListener("click", (event) => {
    event.stopPropagation();
    if (fabDock.classList.contains("is-open")) {
      requestCloseFabMenu();
    } else {
      setFabOpen(true);
    }
  });
}

(() => {
  if (!fabDock || !fabActions) return;
  const isMobileFab = () =>
    typeof window.matchMedia === "function" && window.matchMedia("(max-width: 780px)").matches;
  const syncFabActionsAria = () => {
    fabActions.setAttribute(
      "aria-hidden",
      isMobileFab() || fabDock.classList.contains("is-open") ? "false" : "true",
    );
  };
  syncFabActionsAria();
  if (typeof window.matchMedia === "function") {
    const m = window.matchMedia("(max-width: 780px)");
    if (typeof m.addEventListener === "function") m.addEventListener("change", syncFabActionsAria);
    else if (typeof m.addListener === "function") m.addListener(syncFabActionsAria);
  }
  window.addEventListener("resize", syncFabActionsAria, { passive: true });
})();

if (fabDock && contactToggle && contactPanel) {
  contactToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = !fabDock.classList.contains("is-contact-open");
    setContactOpen(willOpen);
    setFabOpen(true);
  });

  contactPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  window.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Node)) return;
    if (fabDock.contains(t)) return;
    requestCloseFabMenu();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      requestCloseFabMenu();
    }
  });
}

// Cursor glow effect.
const cursorGlow = document.getElementById("cursorGlow");
if (cursorGlow) {
  window.addEventListener("mousemove", (event) => {
    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
  });
}

const interactiveSelector = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "[role='button']",
  "[role='menuitem']",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const isInteractiveTarget = (target) =>
  target instanceof Element && Boolean(target.closest(interactiveSelector));

window.addEventListener("mouseover", (event) => {
  if (isInteractiveTarget(event.target)) {
    cursorGlow?.classList.add("is-hover");
  }
});

window.addEventListener("mouseout", (event) => {
  if (isInteractiveTarget(event.target)) {
    cursorGlow?.classList.remove("is-hover");
  }
});

window.addEventListener("mousedown", (event) => {
  if (isInteractiveTarget(event.target)) {
    cursorGlow?.classList.add("is-press");
  }
});

window.addEventListener("mouseup", () => {
  cursorGlow?.classList.remove("is-press");
});

function createRipple(event) {
  const point =
    event.touches?.[0] ||
    event.changedTouches?.[0] ||
    event;
  if (typeof point.clientX !== "number" || typeof point.clientY !== "number") return;

  const size = Math.max(window.innerWidth, window.innerHeight) * 0.24;
  const ripple = document.createElement("span");
  ripple.className = "click-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${point.clientX}px`;
  ripple.style.top = `${point.clientY}px`;
  document.body.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

window.addEventListener("click", createRipple);

// Dresscode: show M/W menu on palette swatches.
(() => {
  const menUrl =
    "https://www.wildberries.ru/catalog/0/search.aspx?page=1&sort=popular&search=%D0%BA%D0%BE%D1%81%D1%82%D1%8E%D0%BC+%D0%BC%D1%83%D0%B6%D1%81%D0%BA%D0%BE%D0%B9%D0%BD%D0%B0+%D1%81%D0%B2%D0%B0%D0%B4%D1%8C%D0%B1%D1%83&f14177449=20214644%3B13600062%3B20214658&meta_charcs=false";
  const womenUrl =
    "https://www.wildberries.ru/catalog/0/search.aspx?page=1&sort=popular&search=%D0%BF%D0%BB%D0%B0%D1%82%D1%8C%D0%B5+%D0%B6%D0%B5%D0%BD%D1%81%D0%BA%D0%B8%D0%B9+%D0%BD%D0%B0+%D1%81%D0%B2%D0%B0%D0%B4%D1%8C%D0%B1%D1%83+%D0%BA+%D0%BF%D0%BE%D0%B4%D1%80%D1%83%D0%B3%D0%B5&f14177449=20214644%3B20214658&meta_charcs=false";

  const swatches = document.querySelectorAll(".palette-swatch");
  if (!swatches.length) return;

  const menu = document.createElement("div");
  menu.className = "dresscode-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <div class="dresscode-menu-title">Еще нет наряда? Мы сделали подборку для вас!<br>Вы девочка или мальчик?</div>
    <button type="button" class="dresscode-menu-men" role="menuitem" aria-label="Мальчик">М</button>
    <button type="button" class="dresscode-menu-women" role="menuitem" aria-label="Девочка">Д</button>
  `;
  document.body.appendChild(menu);

  const openWb = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  let activeSwatch = null;
  let hoverCloseTimer = 0;

  const clearHoverCloseTimer = () => {
    if (hoverCloseTimer) window.clearTimeout(hoverCloseTimer);
    hoverCloseTimer = 0;
  };

  const closeMenu = () => {
    clearHoverCloseTimer();
    activeSwatch = null;
    menu.classList.remove("is-open");
  };

  const positionMenu = (anchor) => {
    const rect = anchor.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const gap = 10;

    let left = rect.left + rect.width / 2 - menuRect.width / 2;
    let top = rect.bottom + gap;

    left = Math.max(10, Math.min(left, window.innerWidth - menuRect.width - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - menuRect.height - 10));

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  const openMenuFor = (swatch) => {
    clearHoverCloseTimer();
    activeSwatch = swatch;
    menu.classList.add("is-open");
    // first paint, then position with correct menu size
    requestAnimationFrame(() => positionMenu(swatch));
  };

  // Desktop hover + keyboard focus.
  swatches.forEach((swatch) => {
    swatch.addEventListener("mouseenter", () => openMenuFor(swatch));
    swatch.addEventListener("mouseleave", () => {
      clearHoverCloseTimer();
      hoverCloseTimer = window.setTimeout(() => {
        if (!menu.matches(":hover")) closeMenu();
      }, 140);
    });
    swatch.addEventListener("focusin", () => openMenuFor(swatch));
  });

  menu.addEventListener("mouseenter", () => clearHoverCloseTimer());
  menu.addEventListener("mouseleave", () => {
    clearHoverCloseTimer();
    hoverCloseTimer = window.setTimeout(() => closeMenu(), 140);
  });

  // Mobile: tap to toggle.
  swatches.forEach((swatch) => {
    swatch.addEventListener("click", (e) => {
      e.preventDefault();
      if (activeSwatch === swatch && menu.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenuFor(swatch);
      }
    });
  });

  menu.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.classList.contains("dresscode-menu-men")) {
      openWb(menUrl);
      closeMenu();
    }
    if (target.classList.contains("dresscode-menu-women")) {
      openWb(womenUrl);
      closeMenu();
    }
  });

  // Close on outside click / escape.
  window.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Node)) return;
    if (menu.contains(t)) return;
    if (activeSwatch && activeSwatch.contains(t)) return;
    closeMenu();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  window.addEventListener("scroll", () => {
    if (activeSwatch && menu.classList.contains("is-open")) positionMenu(activeSwatch);
  });
  window.addEventListener("resize", () => {
    if (activeSwatch && menu.classList.contains("is-open")) positionMenu(activeSwatch);
  });
})();

// Floating particles.
const canvas = document.getElementById("particleCanvas");
const ctx = canvas?.getContext?.("2d");
if (canvas && ctx) {
  let particles = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      a: 0.18 + Math.random() * 0.22,
    };
  }
  particles = Array.from({ length: 60 }, createParticle);

  function renderParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(204, 144, 127, ${p.a})`;
      ctx.fill();
    }
    requestAnimationFrame(renderParticles);
  }
  renderParticles();
}

// Ambient sound toggle (no autoplay — user enables via button after reading invite).
const ambientAudio = document.getElementById("ambientAudio");
const soundToggle = document.getElementById("soundToggle");
const soundInviteClose = document.getElementById("soundInviteClose");
const soundInvitePlay = document.getElementById("soundInvitePlay");

if (ambientAudio && soundToggle) {
  const setSoundUi = (isOn) => {
    soundToggle.classList.toggle("is-off", !isOn);
    soundToggle.setAttribute("aria-pressed", isOn ? "true" : "false");
    soundToggle.title = isOn ? "Выключить звук" : "Включить звук";
    soundToggle.setAttribute("aria-label", isOn ? "Звук: вкл" : "Звук: выкл");
    if (soundInvitePlay) {
      soundInvitePlay.classList.toggle("is-off", !isOn);
      soundInvitePlay.setAttribute("aria-pressed", isOn ? "true" : "false");
    }
  };

  const startSoundHeroFlow = () => {
    if (!fabDock || !soundInvite || sessionStorage.getItem(SOUND_HERO_KEY) === "1") return;
    fabDock.classList.add("is-sound-reveal");
    soundInvite.setAttribute("aria-hidden", "false");
    window.setTimeout(() => {
      soundInvitePlay?.focus({ preventScroll: true });
    }, 720);
  };

  const FADE_TARGET_VOLUME = 0.3;
  const FADE_DURATION_MS = 1200;
  let fadeRaf = 0;

  const stopFade = () => {
    if (fadeRaf) cancelAnimationFrame(fadeRaf);
    fadeRaf = 0;
  };

  const fadeVolumeTo = (target, durationMs) => {
    stopFade();
    const from = Number.isFinite(ambientAudio.volume) ? ambientAudio.volume : 0;
    const start = performance.now();
    const dur = Math.max(1, durationMs);

    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      ambientAudio.volume = from + (target - from) * eased;
      if (t < 1) fadeRaf = requestAnimationFrame(tick);
      else fadeRaf = 0;
    };

    fadeRaf = requestAnimationFrame(tick);
  };

  const tryPlay = async () => {
    try {
      await ambientAudio.play();
    } catch (firstError) {
      ambientAudio.load();
      await ambientAudio.play();
    }
  };

  const enableSound = async () => {
    const wasSoundReveal = Boolean(fabDock?.classList.contains("is-sound-reveal"));
    ambientAudio.muted = false;
    await tryPlay();
    fadeVolumeTo(FADE_TARGET_VOLUME, FADE_DURATION_MS);
    setSoundUi(true);
    endSoundHeroFlow();
    if (wasSoundReveal) requestCloseFabMenu();
  };

  const disableSound = () => {
    stopFade();
    ambientAudio.pause();
    setSoundUi(false);
  };

  ambientAudio.pause();
  ambientAudio.currentTime = 0;
  ambientAudio.muted = false;
  ambientAudio.volume = 0;
  setSoundUi(false);

  const onSoundPrimaryClick = async (event) => {
    event.stopPropagation();
    try {
      if (ambientAudio.paused) {
        await enableSound();
      } else {
        disableSound();
      }
    } catch (error) {
      setSoundUi(false);
    }
  };

  soundToggle.addEventListener("click", onSoundPrimaryClick);

  soundInvitePlay?.addEventListener("click", onSoundPrimaryClick);

  soundInviteClose?.addEventListener("click", (event) => {
    event.stopPropagation();
    endSoundHeroFlow();
    requestCloseFabMenu();
  });

  if (!sessionStorage.getItem(SOUND_HERO_KEY)) {
    window.setTimeout(() => {
      if (sessionStorage.getItem(SOUND_HERO_KEY) === "1") return;
      if (fabDock && fabMain) setFabOpen(true);
    }, 550);
    window.setTimeout(() => {
      if (sessionStorage.getItem(SOUND_HERO_KEY) === "1") return;
      if (!fabDock || !fabMain) return;
      setFabOpen(true);
      window.requestAnimationFrame(() => {
        if (sessionStorage.getItem(SOUND_HERO_KEY) === "1") return;
        startSoundHeroFlow();
      });
    }, 550 + 920);
  }
}
