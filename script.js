(() => {
    const SELECTOR  = '[data-tug="true"]';
    const DEAD_ZONE = 3;

    const DEFAULTS = { move: 12, scale: 1.5, diag: 1.1, pull: 0.5 };

    const DRAG_SPRING    = { k: 700, zeta: 0.95 };
    const RELEASE_SPRING = { k: 320, zeta: 0.57 };

    const css = document.createElement("style");
    css.textContent = `${SELECTOR} { touch-action: none; }`;
    document.head.appendChild(css);

    const states = new WeakMap();
    const active = new Map();

    const tugTarget = (node) => (node instanceof Element ? node.closest(SELECTOR) : null);
    const num = (v, fallback) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : fallback);

    function getState(el) {
        let st = states.get(el);
        if (!st) {
            st = {
                el,
                pos: { x: 0, y: 0 },
                vel: { x: 0, y: 0 },
                target: { x: 0, y: 0 },
                down: { x: 0, y: 0 },
                rest: null,
                opts: null,
                saved: null,
                dragging: false,
                raf: null,
                last: 0,
            };
            states.set(el, st);
        }
        return st;
    }

    function readOptions(el) {
        const d = el.dataset;
        const move = num(d.tugMove, DEFAULTS.move);
        const maxScale = num(d.tugScale, DEFAULTS.scale);
        const diag = num(d.tugDiag, DEFAULTS.diag);
        const pull = num(d.tugPull, DEFAULTS.pull);

        let falloff = 1;
        if (maxScale > 1 && diag > 1) {
            const ratio = Math.min(1, (diag - 1) / (maxScale - 1));
            falloff = Math.log(ratio) / Math.log(Math.SQRT1_2);
        }
        return { move, maxScale, pull, falloff };
    }

    document.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        const el = tugTarget(e.target);
        if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;

        const st = getState(el);
        if (st.dragging) return;

        if (st.raf === null) {
            st.saved = {
                transition: el.style.transition,
                zIndex: el.style.zIndex,
                userSelect: el.style.userSelect,
            };
        }

        const rect = el.getBoundingClientRect();
        const w = el.offsetWidth || rect.width;
        const h = el.offsetHeight || rect.height;
        const cx = rect.left + rect.width / 2 - st.pos.x;
        const cy = rect.top + rect.height / 2 - st.pos.y;

        st.rest = { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2 };
        st.down = { x: e.clientX, y: e.clientY };
        st.opts = readOptions(el);
        st.dragging = true;

        active.set(e.pointerId, st);
        el.setPointerCapture(e.pointerId);

        el.style.transition = "none";
        el.style.zIndex = "10";
        el.style.userSelect = "none";
        startLoop(st);
    });

    document.addEventListener("pointermove", (e) => {
        const st = active.get(e.pointerId);
        if (!st) return;

        const { move, pull } = st.opts;
        const rx = e.clientX - st.down.x;
        const ry = e.clientY - st.down.y;
        const dist = Math.hypot(rx, ry);
        const eff = Math.max(0, dist - DEAD_ZONE);

        if (eff === 0) {
            st.target.x = st.target.y = 0;
            return;
        }

        const stretch = move * (1 - Math.exp((-pull * eff) / move));
        st.target.x = (rx / dist) * stretch;
        st.target.y = (ry / dist) * stretch;
    });

    function release(e) {
        const st = active.get(e.pointerId);
        if (!st) return;

        active.delete(e.pointerId);
        st.dragging = false;
        st.target.x = st.target.y = 0;

        if (st.el.hasPointerCapture(e.pointerId)) st.el.releasePointerCapture(e.pointerId);
        if (e.type === "pointerup") {
            const r = st.rest;
            const inside =
                e.clientX >= r.left && e.clientX <= r.right &&
                e.clientY >= r.top && e.clientY <= r.bottom;

            if (!inside) {
                const swallow = (ev) => {
                    ev.stopImmediatePropagation();
                    ev.preventDefault();
                };
                window.addEventListener("click", swallow, { capture: true, once: true });
                setTimeout(() => window.removeEventListener("click", swallow, true), 50);
            }
        }
        startLoop(st);
    }

    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    document.addEventListener("dragstart", (e) => {
        if (tugTarget(e.target)) e.preventDefault();
    });

    function startLoop(st) {
        if (st.raf !== null) return;
        st.last = performance.now();
        st.raf = requestAnimationFrame((t) => step(st, t));
    }

    function step(st, now) {
        const { pos, vel, target, el } = st;
        const dt = Math.min((now - st.last) / 1000, 1 / 30);
        st.last = now;

        const { k, zeta } = st.dragging ? DRAG_SPRING : RELEASE_SPRING;
        const c = 2 * zeta * Math.sqrt(k);

        vel.x += (k * (target.x - pos.x) - c * vel.x) * dt;
        vel.y += (k * (target.y - pos.y) - c * vel.y) * dt;
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;

        const settled =
            !st.dragging &&
            Math.hypot(pos.x, pos.y) < 0.05 &&
            Math.hypot(vel.x, vel.y) < 0.5;

        if (settled) {
            pos.x = pos.y = vel.x = vel.y = 0;
            el.style.translate = "";
            el.style.scale = "";
            if (st.saved) {
                el.style.transition = st.saved.transition;
                el.style.zIndex = st.saved.zIndex;
                el.style.userSelect = st.saved.userSelect;
            }
            st.raf = null;
            return;
        }

        render(st);
        st.raf = requestAnimationFrame((t) => step(st, t));
    }

    function render(st) {
        const { pos, el } = st;
        const { move, maxScale, falloff } = st.opts;

        const dist = Math.hypot(pos.x, pos.y);
        if (dist < 0.001) {
            el.style.translate = "0px 0px";
            el.style.scale = "1 1";
            return;
        }

        const t = Math.min(1, dist / move);
        const dx = Math.abs(pos.x) / dist;
        const dy = Math.abs(pos.y) / dist;

        const scaleX = 1 + (maxScale - 1) * t * Math.pow(dx, falloff);
        const scaleY = 1 + (maxScale - 1) * t * Math.pow(dy, falloff);

        el.style.translate = `${pos.x}px ${pos.y}px`;
        el.style.scale = `${scaleX} ${scaleY}`;
    }
})();
