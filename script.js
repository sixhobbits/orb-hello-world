(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const canvas = document.querySelector("#cosmos");
  const activateButton = document.querySelector("#activate");
  const activateLabel = activateButton.querySelector(".activate__label");
  const sequence = document.querySelector("#sequence");
  const sequenceStatus = document.querySelector("#sequence-status");
  const announcement = document.querySelector("#announcement");
  const phaseReadout = document.querySelector('[data-telemetry="phase"]');
  const signalReadout = document.querySelector('[data-telemetry="signal"]');
  const clock = document.querySelector("#signal-time");
  const signalLabel = document.querySelector(".signal__label");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const pointer = {
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
  };

  let state = "dormant";
  let activationTimers = [];

  const updateClock = () => {
    const now = new Date();
    clock.textContent = `${now.toLocaleTimeString("en-GB", {
      hour12: false,
      timeZone: "UTC",
    })} UTC`;
  };

  updateClock();
  window.setInterval(updateClock, 1000);

  class Starfield {
    constructor(element) {
      this.canvas = element;
      this.context = element.getContext("2d", { alpha: true });
      this.width = 0;
      this.height = 0;
      this.pixelRatio = 1;
      this.stars = [];
      this.frame = 0;
      this.lastTime = 0;
      this.visible = true;
      this.active = false;
      this.shootingStar = null;
      this.nextShootingStar = 0;
      this.resize = this.resize.bind(this);
      this.draw = this.draw.bind(this);

      this.resize();
      window.addEventListener("resize", this.resize, { passive: true });
      document.addEventListener("visibilitychange", () => {
        this.visible = !document.hidden;
        if (this.visible && !reducedMotion.matches) {
          this.lastTime = performance.now();
          this.frame = requestAnimationFrame(this.draw);
        } else if (!this.visible) {
          cancelAnimationFrame(this.frame);
        }
      });

      if (reducedMotion.matches) {
        this.render(0);
      } else {
        this.frame = requestAnimationFrame(this.draw);
      }
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, rect.width);
      this.height = Math.max(1, rect.height);
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(this.width * this.pixelRatio);
      this.canvas.height = Math.round(this.height * this.pixelRatio);
      this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

      const starCount = Math.round(Math.min(220, Math.max(90, (this.width * this.height) / 7200)));
      this.stars = Array.from({ length: starCount }, (_, index) => this.createStar(index));

      if (reducedMotion.matches) this.render(0);
    }

    createStar(index) {
      const depth = 0.18 + Math.random() * 0.82;
      return {
        x: Math.random(),
        y: Math.random(),
        depth,
        size: index % 29 === 0 ? 1.25 + Math.random() : 0.25 + Math.random() * 0.7,
        alpha: 0.18 + Math.random() * 0.66,
        phase: Math.random() * Math.PI * 2,
        speed: 0.00015 + Math.random() * 0.00035,
        temperature: Math.random(),
      };
    }

    awaken() {
      this.active = true;
      this.nextShootingStar = performance.now() + 650;
      if (reducedMotion.matches) this.render(0);
    }

    launchShootingStar(time) {
      this.shootingStar = {
        x: this.width * (0.48 + Math.random() * 0.36),
        y: -20,
        length: 90 + Math.random() * 100,
        life: 0,
        maxLife: 850 + Math.random() * 350,
      };
      this.nextShootingStar = time + 6500 + Math.random() * 9000;
    }

    draw(time) {
      if (!this.visible || reducedMotion.matches) return;
      if (this.lastTime && time - this.lastTime < 30) {
        this.frame = requestAnimationFrame(this.draw);
        return;
      }
      const delta = Math.min(32, time - (this.lastTime || time));
      this.lastTime = time;
      this.render(time, delta);
      this.frame = requestAnimationFrame(this.draw);
    }

    render(time, delta = 16) {
      const context = this.context;
      context.clearRect(0, 0, this.width, this.height);

      pointer.currentX += (pointer.targetX - pointer.currentX) * 0.045;
      pointer.currentY += (pointer.targetY - pointer.currentY) * 0.045;

      for (const star of this.stars) {
        star.y += star.speed * (delta || 16) * (this.active ? 1.2 : 0.7);
        if (star.y > 1.02) star.y = -0.02;

        const x = star.x * this.width + pointer.currentX * star.depth * 18;
        const y = star.y * this.height + pointer.currentY * star.depth * 13;
        const twinkle = reducedMotion.matches ? 0.78 : 0.68 + Math.sin(time * 0.0012 + star.phase) * 0.28;
        const alpha = star.alpha * twinkle * (this.active ? 1.16 : 0.84);
        const radius = star.size * (0.55 + star.depth * 0.7);

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = star.temperature > 0.78
          ? `rgba(174, 245, 235, ${alpha})`
          : `rgba(213, 219, 229, ${alpha})`;
        context.fill();

        if (star.size > 1.5) {
          context.strokeStyle = `rgba(174, 245, 235, ${alpha * 0.35})`;
          context.lineWidth = 0.5;
          context.beginPath();
          context.moveTo(x - radius * 4, y);
          context.lineTo(x + radius * 4, y);
          context.moveTo(x, y - radius * 4);
          context.lineTo(x, y + radius * 4);
          context.stroke();
        }
      }

      if (this.active) this.drawConstellation(context, time);

      if (this.active && !reducedMotion.matches && time > this.nextShootingStar && !this.shootingStar) {
        this.launchShootingStar(time);
      }

      if (this.shootingStar) this.drawShootingStar(context, delta);
    }

    drawConstellation(context, time) {
      const points = [
        [0.08, 0.68], [0.16, 0.57], [0.23, 0.64], [0.31, 0.48],
        [0.21, 0.36], [0.12, 0.43], [0.38, 0.31],
      ];
      const visibility = Math.min(0.17, Math.max(0.07, 0.1 + Math.sin(time * 0.0004) * 0.03));

      context.beginPath();
      points.forEach(([pointX, pointY], index) => {
        const x = pointX * this.width + pointer.currentX * 5;
        const y = pointY * this.height + pointer.currentY * 4;
        if (index === 0 || index === 4 || index === 6) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = `rgba(143, 217, 211, ${visibility})`;
      context.lineWidth = 0.65;
      context.stroke();
    }

    drawShootingStar(context, delta) {
      const shot = this.shootingStar;
      shot.life += delta;
      shot.x -= delta * 0.38;
      shot.y += delta * 0.27;
      const progress = shot.life / shot.maxLife;
      const opacity = Math.sin(Math.min(1, progress) * Math.PI);
      const gradient = context.createLinearGradient(shot.x, shot.y, shot.x + shot.length, shot.y - shot.length * 0.72);
      gradient.addColorStop(0, `rgba(210, 255, 246, ${opacity * 0.8})`);
      gradient.addColorStop(1, "rgba(135, 164, 221, 0)");
      context.beginPath();
      context.moveTo(shot.x, shot.y);
      context.lineTo(shot.x + shot.length, shot.y - shot.length * 0.72);
      context.strokeStyle = gradient;
      context.lineWidth = 1;
      context.stroke();

      if (progress >= 1) this.shootingStar = null;
    }
  }

  const starfield = new Starfield(canvas);

  const setPointer = (clientX, clientY) => {
    pointer.targetX = (clientX / window.innerWidth - 0.5) * 2;
    pointer.targetY = (clientY / window.innerHeight - 0.5) * 2;
    root.style.setProperty("--aurora-shift-x", `${(pointer.targetX * -10).toFixed(2)}px`);
    root.style.setProperty("--aurora-shift-y", `${(pointer.targetY * -8).toFixed(2)}px`);
    root.style.setProperty("--orb-shift-x", `${(pointer.targetX * -7).toFixed(2)}px`);
    root.style.setProperty("--orb-shift-y", `${(pointer.targetY * -7).toFixed(2)}px`);
    root.style.setProperty("--light-x", `${66 + pointer.targetX * 9}%`);
    root.style.setProperty("--light-y", `${34 + pointer.targetY * 7}%`);
  };

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    setPointer(event.clientX, event.clientY);
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
    root.style.setProperty("--aurora-shift-x", "0px");
    root.style.setProperty("--aurora-shift-y", "0px");
    root.style.setProperty("--orb-shift-x", "0px");
    root.style.setProperty("--orb-shift-y", "0px");
    root.style.setProperty("--light-x", "68%");
    root.style.setProperty("--light-y", "36%");
  });

  activateButton.addEventListener("pointermove", (event) => {
    const bounds = activateButton.getBoundingClientRect();
    activateButton.style.setProperty("--button-x", `${event.clientX - bounds.left}px`);
    activateButton.style.setProperty("--button-y", `${event.clientY - bounds.top}px`);
  });

  const clearActivationTimers = () => {
    activationTimers.forEach(window.clearTimeout);
    activationTimers = [];
  };

  const setActivationState = (nextState) => {
    state = nextState;
    body.dataset.state = nextState;
  };

  const finishActivation = () => {
    setActivationState("active");
    sequence.setAttribute("aria-hidden", "true");
    phaseReadout.textContent = "Awake";
    signalReadout.innerHTML = '9.824 <small>μV</small>';
    signalLabel.textContent = "Connected";
    activateLabel.textContent = "Pulse the universe";
    activateButton.removeAttribute("aria-disabled");
    announcement.textContent = "Connection established. The universe is awake.";
    starfield.awaken();
  };

  const activate = () => {
    if (state === "activating") return;
    clearActivationTimers();
    const wasActive = state === "active";

    if (reducedMotion.matches) {
      finishActivation();
      return;
    }

    setActivationState("activating");
    sequence.setAttribute("aria-hidden", "false");
    activateButton.setAttribute("aria-disabled", "true");
    phaseReadout.textContent = "Opening";
    signalLabel.textContent = wasActive ? "Reconnecting" : "Calling";
    announcement.textContent = "Activation sequence started.";

    const phases = [
      [0, "Opening the aperture", "0.184"],
      [620, "Folding local spacetime", "1.337"],
      [1310, "Teaching light to remember", "4.812"],
      [2070, "A voice is answering", "8.506"],
    ];

    phases.forEach(([delay, message, signal]) => {
      activationTimers.push(window.setTimeout(() => {
        sequenceStatus.textContent = message;
        signalReadout.innerHTML = `${signal} <small>μV</small>`;
      }, delay));
    });

    activationTimers.push(window.setTimeout(finishActivation, 2800));
  };

  activateButton.addEventListener("click", activate);

  reducedMotion.addEventListener("change", (event) => {
    cancelAnimationFrame(starfield.frame);
    starfield.frame = 0;
    if (event.matches && state === "activating") {
      clearActivationTimers();
      finishActivation();
    } else if (event.matches) {
      starfield.render(0);
    } else {
      starfield.lastTime = performance.now();
      starfield.frame = requestAnimationFrame(starfield.draw);
    }
  });
})();
