// TalentLens — Next-Gen AI HR Recruitment Assistant Controller
class TalentLensApp {
  constructor() {
    this.activeRound = "round1";
    this.lastPayload = null;
    this.els = {};
  }

  // —— Presets ——
  PRESET_SENIOR_JD = `Role: Senior Agentic AI & Systems Engineer
Experience: 4-6 yrs · Remote/Hybrid

Mission: Lead our agentic platform — LangGraph workflows, RAG retrieval,
and resilient Python microservices.

Must-haves:
- Python, SQL, Bash
- LangChain / LangGraph / RAG / Vector DBs (Chroma, FAISS)
- FastAPI, async, microservices
- PostgreSQL, Redis
- Docker, Kubernetes, Git, CI/CD`;

  PRESET_SENIOR_CV = `Alex Chen — Lead AI & Backend Engineer
San Francisco · alex.chen@example.com

Summary: 5+ yrs shipping Python + Agentic AI systems (LangGraph, RAG) at scale.

Skills: Python, SQL, Bash · LangChain, LangGraph, RAG, Chroma/FAISS
FastAPI/Flask, async · Postgres, Redis, SQLite · Docker/K8s, GitHub Actions

Experience:
- Nova Tech (2022–): Multi-agent routing workflow; RAG engine 120k q/day p95 <180ms; K8s 99.95% uptime.
- Apex Cloud (2019–22): Flask/Postgres APIs; CI/CD; 92% PyTest coverage.

Education: B.S. CS, UC Davis (2019)`;

  PRESET_JUNIOR_JD = `Role: Junior Python Backend Developer
- 1–2 yrs Python & REST APIs
- Postgres/MySQL, Docker, Git, Unit Testing
- Eagerness to learn Agentic AI and microservices architecture`;

  PRESET_JUNIOR_CV = `Priya Sharma — Junior Python Dev
priya.s@example.com · B.Tech CS, Anna Univ (2024)
Skills: Python, JS, SQL · Django/Flask, Pandas · Git, SQLite, Postman
Projects: Flask + SQLite inventory API (JWT); BeautifulSoup campus scraper.`;

  init() {
    this.cacheEls();
    this.bindTheme();
    this.bindPresets();
    this.bindUploader();
    this.bindTracker();
    this.bindTabs();
    this.bindForm();
    this.bindCopy();
    this.fillSenior();
  }

  cacheEls() {
    const $ = (id) => document.getElementById(id);
    this.els = {
      app: $("appContainer"),
      form: $("evaluationForm"),
      name: $("candidateName"),
      role: $("targetRole"),
      jd: $("jobDescription"),
      cv: $("resumeText"),
      file: $("resumePdf"),
      drop: $("dropArea"),
      dropText: $("dropText"),
      submit: $("btnSubmit"),
      tracker: $("pipelineCard"),
      badge: $("pipelineStatusBadge"),
      emptyBox: $("emptyStateBox"),
      results: $("resultsContent"),
      score: $("scoreValue"),
      verdict: $("recBanner"),
      summary: $("candidateSummaryText"),
      ok: $("matchedSkillsRow"),
      gaps: $("missingSkillsRow"),
      questions: $("questionsContainer"),
      copy: $("btnCopyDossier"),
      copyText: $("copyBtnText"),
    };
  }

  // Dark & White / Light Mode Switcher
  bindTheme() {
    const light = document.getElementById("themeLight");
    const dark = document.getElementById("themeDark");
    
    const apply = (t) => {
      document.documentElement.setAttribute("data-theme", t);
      localStorage.setItem("talentlens_theme", t);
      if (light) light.classList.toggle("is-active", t === "light");
      if (dark) dark.classList.toggle("is-active", t === "dark");
    };

    const saved = localStorage.getItem("talentlens_theme") || "dark";
    apply(saved);

    if (light) light.addEventListener("click", () => apply("light"));
    if (dark) dark.addEventListener("click", () => apply("dark"));
  }

  bindPresets() {
    const btnSenior = document.getElementById("btnPresetSenior");
    const btnJunior = document.getElementById("btnPresetJunior");
    const btnReset = document.getElementById("btnReset");

    if (btnSenior) btnSenior.addEventListener("click", () => this.fillSenior());
    if (btnJunior) btnJunior.addEventListener("click", () => this.fillJunior());
    if (btnReset) btnReset.addEventListener("click", () => this.resetForm());
  }

  fillSenior() {
    this.els.name.value = "Alex Chen";
    this.els.role.value = "Senior Agentic AI & Systems Engineer";
    this.els.jd.value = this.PRESET_SENIOR_JD;
    this.els.cv.value = this.PRESET_SENIOR_CV;
    this.clearFileLabel();
    this.showToast("Loaded Senior AI profile preset");
  }

  fillJunior() {
    this.els.name.value = "Priya Sharma";
    this.els.role.value = "Junior Python Developer";
    this.els.jd.value = this.PRESET_JUNIOR_JD;
    this.els.cv.value = this.PRESET_JUNIOR_CV;
    this.clearFileLabel();
    this.showToast("Loaded Junior Developer profile preset");
  }

  resetForm() {
    this.els.name.value = "";
    this.els.role.value = "";
    this.els.jd.value = "";
    this.els.cv.value = "";
    this.clearFileLabel();
    this.resetSteps();
    if (this.els.badge) {
      this.els.badge.className = "tracker__badge";
      this.els.badge.textContent = "Idle";
    }
    if (this.els.emptyBox) this.els.emptyBox.style.display = "flex";
    if (this.els.results) this.els.results.style.display = "none";
    if (this.els.copy) this.els.copy.style.display = "none";
    this.els.name.focus();
    this.showToast("Cleared all inputs");
  }

  clearFileLabel() {
    if (this.els.dropText) {
      this.els.dropText.innerHTML = "<strong>Choose PDF File</strong> or drag &amp; drop here";
    }
    if (this.els.file) this.els.file.value = "";
  }

  bindUploader() {
    const { drop, file, dropText } = this.els;
    if (!drop || !file) return;

    drop.addEventListener("click", (e) => {
      if (e.target !== file) {
        file.click();
      }
    });

    drop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        file.click();
      }
    });

    file.addEventListener("change", () => {
      if (file.files && file.files.length > 0) {
        const f = file.files[0];
        dropText.innerHTML = `Loaded: <strong>${this.esc(f.name)}</strong> (${Math.round(f.size / 1024)} KB)`;
      }
    });

    ["dragenter", "dragover"].forEach((ev) => {
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach((ev) => {
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.remove("is-dragover");
      });
    });

    drop.addEventListener("drop", (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        file.files = e.dataTransfer.files;
        const f = e.dataTransfer.files[0];
        dropText.innerHTML = `Loaded: <strong>${this.esc(f.name)}</strong> (${Math.round(f.size / 1024)} KB)`;
      }
    });
  }

  bindTracker() {
    const head = document.getElementById("pipelineHeader");
    const card = document.getElementById("pipelineCard");
    if (head && card) {
      head.addEventListener("click", () => card.classList.toggle("is-collapsed"));
    }
  }

  bindTabs() {
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        this.activeRound = btn.dataset.round;
        this.renderQuestions();
      });
    });
  }

  bindCopy() {
    if (!this.els.copy) return;
    this.els.copy.addEventListener("click", async () => {
      if (!this.lastPayload?.dossier_markdown) return;
      await navigator.clipboard.writeText(this.lastPayload.dossier_markdown);
      
      const prev = this.els.copyText ? this.els.copyText.textContent : "Copy Dossier";
      if (this.els.copyText) this.els.copyText.textContent = "Copied to Clipboard!";
      this.showToast("Dossier copied to clipboard!");
      setTimeout(() => {
        if (this.els.copyText) this.els.copyText.textContent = prev;
      }, 2000);
    });
  }

  bindForm() {
    if (this.els.form) {
      this.els.form.addEventListener("submit", (e) => this.onSubmit(e));
    }
  }

  async onSubmit(e) {
    e.preventDefault();
    
    // Check validation
    const candidateName = this.els.name.value.trim();
    const targetRole = this.els.role.value.trim();
    const jd = this.els.jd.value.trim();
    const cvText = this.els.cv.value.trim();
    const hasPdf = this.els.file.files && this.els.file.files.length > 0;

    if (!jd) {
      alert("Please enter a Job Description.");
      return;
    }

    if (!cvText && !hasPdf) {
      alert("Please attach a Resume PDF or paste plain text resume content.");
      return;
    }

    const fd = new FormData();
    fd.append("candidate_name", candidateName || "Candidate");
    fd.append("target_role", targetRole || "Software Engineer");
    fd.append("job_description", jd);
    if (cvText) {
      fd.append("resume_text", cvText);
    }
    if (hasPdf) {
      fd.append("resume_pdf", this.els.file.files[0]);
    }
    
    this.els.submit.disabled = true;
    this.els.submit.innerHTML = `
      <span class="btn__spinner"></span>
      <span class="btn__text">Analyzing Profile &amp; JD...</span>
    `;

    // Reset workflow steps
    if (this.els.tracker) this.els.tracker.classList.remove("is-collapsed");
    this.resetSteps();
    this.setStep("step1", "is-active");
    if (this.els.badge) {
      this.els.badge.className = "tracker__badge is-running";
      this.els.badge.textContent = "Running";
    }

    const t1 = setTimeout(() => { this.setStep("step1", "is-done"); this.setStep("step2", "is-active"); }, 750);
    const t2 = setTimeout(() => { this.setStep("step2", "is-done"); this.setStep("step3", "is-active"); }, 1650);
    const t3 = setTimeout(() => { this.setStep("step3", "is-done"); this.setStep("step4", "is-active"); }, 2850);

    try {
      const res = await fetch("/api/evaluate", { method: "POST", body: fd });
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server returned status ${res.status}`);
      }

      const data = await res.json();
      this.lastPayload = data;

      for (let i = 1; i <= 5; i++) this.setStep(`step${i}`, "is-done");
      if (this.els.badge) {
        this.els.badge.className = "tracker__badge is-done";
        this.els.badge.textContent = "Completed";
      }

      this.renderResults(data);
      this.showToast("Assessment complete! Dossier ready.");
    } catch (err) {
      this.resetSteps();
      if (this.els.badge) {
        this.els.badge.className = "tracker__badge is-failed";
        this.els.badge.textContent = "Failed";
      }
      this.showToast(`Error: ${err.message}`);
      alert(`Assessment Notice: ${err.message}`);
    } finally {
      this.els.submit.disabled = false;
      this.els.submit.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span class="btn__text">Execute AI Assessment</span>
      `;
    }
  }

  resetSteps() {
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`step${i}`);
      if (el) el.className = "tracker__step";
    }
  }

  setStep(id, state) {
    const el = document.getElementById(id);
    if (el) el.className = `tracker__step ${state}`;
  }

  animateScore(target) {
    let current = 0;
    const duration = 900;
    const stepTime = 25;
    const steps = duration / stepTime;
    const increment = target / steps;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      if (this.els.score) {
        this.els.score.textContent = `${Math.round(current)}%`;
      }
    }, stepTime);
  }

  renderResults(data) {
    if (this.els.emptyBox) this.els.emptyBox.style.display = "none";
    if (this.els.results) this.els.results.style.display = "block";
    if (this.els.copy) this.els.copy.style.display = "inline-flex";

    const m = data.metrics || {};
    const finalScore = m.overall_score ?? 0;
    this.animateScore(finalScore);

    const rec = m.recommendation || data.hiring_recommendation || "Review Required";
    this.els.verdict.textContent = `Verdict: ${rec}`;
    this.els.summary.textContent = data.candidate_summary || "Candidate evaluation generated based on profile analysis and spec alignment.";

    // Render Matched Skills
    const ok = this.els.ok;
    ok.innerHTML = "";
    const matched = m.matched_skills || [];
    if (matched.length) {
      matched.forEach((s) => {
        const span = document.createElement("span");
        span.className = "chip chip--ok";
        span.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> ${this.esc(s)}`;
        ok.appendChild(span);
      });
    } else {
      ok.innerHTML = '<span class="chip chip--muted">No direct skill matches identified</span>';
    }

    // Render Missing Skills / Gaps
    const gaps = this.els.gaps;
    gaps.innerHTML = "";
    const missing = m.missing_skills || [];
    if (missing.length) {
      missing.forEach((s) => {
        const span = document.createElement("span");
        span.className = "chip chip--warn";
        span.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${this.esc(s)}`;
        gaps.appendChild(span);
      });
    } else {
      gaps.innerHTML = '<span class="chip chip--ok">Full Coverage — No Critical Gaps</span>';
    }

    this.renderQuestions();
  }

  renderQuestions() {
    if (!this.lastPayload?.rounds) return;
    const map = {
      round1: "round1_screening",
      round2: "round2_technical",
      round3: "round3_system_design",
      round4: "round4_behavioral"
    };
    const key = map[this.activeRound];
    const list = this.lastPayload.rounds[key] || [];
    const box = this.els.questions;
    box.innerHTML = "";

    if (!list.length) {
      box.innerHTML = '<div style="color:var(--text-muted);font-size:.85rem;padding:14px;text-align:center">No questions generated for this round.</div>';
      return;
    }

    list.forEach((q, i) => {
      const el = document.createElement("div");
      el.className = "qcard";
      el.innerHTML = `
        <div class="qcard__head">
          <div class="qcard__q">Q${i + 1}: ${this.esc(q.question)}</div>
          <span class="qcard__tag">${this.esc(q.focus || "Core")}</span>
        </div>
        <div class="qcard__rubric">
          <strong>Evaluation Rubric:</strong> ${this.esc(q.rubric || "Assess candidate depth, technical precision, and communication clarity.")}
        </div>
      `;
      box.appendChild(el);
    });
  }

  showToast(msg) {
    const existing = document.querySelector(".toast-notice");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast-notice";
    toast.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
      <span>${this.esc(msg)}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  esc(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

document.addEventListener("DOMContentLoaded", () => new TalentLensApp().init());
