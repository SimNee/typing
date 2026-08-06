import { useCallback, useEffect, useMemo, useRef } from "react";

export function useAudioEngine({ muted }) {
  const ctx = useRef(),
    melodyBus = useRef();
  const melodyFamilies = useMemo(
    () => [
      {
        root: 72,
        notes: [0, 4, 7, 11, 7, 4, 2, 7],
        steps: [1, 1, 1, 2, 1, 1, 1, 2],
        wave: "square",
      },
      {
        root: 69,
        notes: [0, 2, 5, 9, 7, 5, 2, 0],
        steps: [1, 1, 1, 1, 1, 1, 1, 2],
        wave: "triangle",
      },
      {
        root: 74,
        notes: [0, 7, 5, 9, 7, 12, 9, 7],
        steps: [1, 1, 1, 1, 1, 2, 1, 2],
        wave: "sine",
      },
      {
        root: 67,
        notes: [0, 4, 2, 7, 5, 9, 7, 4],
        steps: [1, 1, 1, 1, 1, 1, 1, 2],
        wave: "square",
      },
      {
        root: 71,
        notes: [0, 3, 7, 10, 7, 5, 3, 0],
        steps: [1, 1, 1, 2, 1, 1, 1, 2],
        wave: "triangle",
      },
      {
        root: 76,
        notes: [0, -2, 0, 5, 4, 7, 5, 9],
        steps: [1, 1, 1, 1, 1, 1, 1, 2],
        wave: "sine",
      },
      {
        root: 65,
        notes: [0, 5, 9, 7, 12, 9, 7, 5],
        steps: [1, 1, 1, 1, 2, 1, 1, 2],
        wave: "square",
      },
      {
        root: 72,
        notes: [0, 2, 4, 7, 11, 9, 7, 4],
        steps: [1, 1, 1, 1, 1, 1, 1, 2],
        wave: "triangle",
      },
      {
        root: 69,
        notes: [0, 7, 4, 9, 5, 12, 9, 7],
        steps: [1, 1, 1, 1, 1, 2, 1, 2],
        wave: "sine",
      },
      {
        root: 74,
        notes: [0, 4, 9, 7, 5, 11, 9, 12],
        steps: [1, 1, 1, 1, 1, 1, 1, 2],
        wave: "square",
      },
    ],
    [],
  );
  const stopMelody = useCallback(() => {
    const bus = melodyBus.current;
    if (!bus || !ctx.current) return;
    const now = ctx.current.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(0.0001, now, 0.035);
    melodyBus.current = null;
  }, []);
  useEffect(() => {
    if (muted) stopMelody();
  }, [muted, stopMelody]);
  useEffect(
    () => () => {
      stopMelody();
      ctx.current?.close();
    },
    [stopMelody],
  );
  return useMemo(
    () => ({
      stopMelody,
      play(kind) {
        if (muted) return;
        ctx.current ??= new (
          window.AudioContext || window.webkitAudioContext
        )();
        const c = ctx.current,
          now = c.currentTime;
        const notes = {
          click: [520, 0.035, "sine"],
          error: [115, 0.11, "sawtooth"],
          ding: [660, 0.18, "sine"],
          fanfare: [523, 0.45, "triangle"],
        }[kind];
        if (!notes) return;
        (kind === "ding" || kind === "fanfare"
          ? [0, kind === "ding" ? 4 : 7, 12]
          : [0]
        ).forEach((n, i) => {
          const o = c.createOscillator(),
            g = c.createGain();
          o.type = notes[2];
          o.frequency.value = notes[0] * 2 ** (n / 12);
          g.gain.setValueAtTime(0.075, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + notes[1]);
          o.connect(g).connect(c.destination);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + notes[1]);
        });
      },
      playArrival({ lineId, stationIndex }) {
        if (muted || lineId !== "jp-yama") return;
        ctx.current ??= new (
          window.AudioContext || window.webkitAudioContext
        )();
        stopMelody();
        const c = ctx.current,
          start = c.currentTime + 0.025,
          bus = c.createGain(),
          family = melodyFamilies[stationIndex % melodyFamilies.length];
        bus.gain.setValueAtTime(0.14, start);
        bus.connect(c.destination);
        melodyBus.current = bus;
        let beat = 0;
        family.notes.forEach((offset, i) => {
          const at = start + beat * 0.145,
            duration = Math.max(0.16, family.steps[i] * 0.14),
            midi = family.root + offset;
          [
            { wave: family.wave, ratio: 1, gain: 0.48, decay: 0.13 },
            { wave: "sine", ratio: 2, gain: 0.16, decay: 0.22 },
            { wave: "triangle", ratio: 0.5, gain: 0.12, decay: 0.28 },
          ].forEach((layer) => {
            const o = c.createOscillator(),
              g = c.createGain();
            o.type = layer.wave;
            o.frequency.value = 440 * 2 ** ((midi - 69) / 12) * layer.ratio;
            g.gain.setValueAtTime(0.0001, at);
            g.gain.exponentialRampToValueAtTime(layer.gain, at + 0.012);
            g.gain.exponentialRampToValueAtTime(
              0.0001,
              at + duration + layer.decay,
            );
            o.connect(g).connect(bus);
            o.start(at);
            o.stop(at + duration + layer.decay + 0.03);
          });
          beat += family.steps[i];
        });
      },
    }),
    [muted, melodyFamilies, stopMelody],
  );
}
