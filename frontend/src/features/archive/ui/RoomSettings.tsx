"use client";
import { useEffect, useRef, useState } from "react";
import { useArchiveStore } from "../store";
import { archiveDirector } from "../director";
import { ArchiveAmbience } from "../ambience";

export function RoomSettings() {
  const quiet = useArchiveStore((s) => s.quietReading);
  const light = useArchiveStore((s) => s.lightMode);
  const [sound, setSound] = useState(false);
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 18;
    try {
      const saved = Number(
        JSON.parse(localStorage.getItem("pensieve-room") ?? "{}").volume ?? 18,
      );
      return Number.isFinite(saved) ? Math.max(0, Math.min(100, saved)) : 18;
    } catch {
      return 18;
    }
  });
  const [audioError, setAudioError] = useState(false);
  const audio = useRef<ArchiveAmbience | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("pensieve-room") ?? "{}");
      if (saved.quiet !== undefined)
        useArchiveStore.getState().setQuietReading(Boolean(saved.quiet));
      if (saved.light !== undefined)
        useArchiveStore.getState().setLightMode(Boolean(saved.light));
    } catch {
      /* The room also works without local storage. */
    }
    return () => {
      void audio.current?.stop();
    };
  }, []);
  useEffect(() => {
    function visibility() {
      void audio.current
        ?.visibility(document.hidden)
        .catch(() => setSound(false));
    }
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    const unsubscribe = useArchiveStore.subscribe((state, previous) => {
      if (state.isBusy && state.requestId !== previous.requestId)
        audio.current?.play("question");
      if (
        state.activeCitationId &&
        state.activeCitationId !== previous.activeCitationId
      )
        audio.current?.play("evidence");
      if (state.divePhase !== previous.divePhase)
        audio.current?.setImmersed(
          state.divePhase === "within" || state.divePhase === "waiting",
        );
    });
    const stir = () => audio.current?.play("stir");
    const crossing = () => audio.current?.play("crossing");
    const arrival = () => audio.current?.play("arrival");
    window.addEventListener("pensieve-stir", stir);
    window.addEventListener("pensieve-crossing", crossing);
    window.addEventListener("pensieve-arrival", arrival);
    return () => {
      unsubscribe();
      window.removeEventListener("pensieve-stir", stir);
      window.removeEventListener("pensieve-crossing", crossing);
      window.removeEventListener("pensieve-arrival", arrival);
    };
  }, []);
  function save(q: boolean, l: boolean) {
    try {
      localStorage.setItem(
        "pensieve-room",
        JSON.stringify({ quiet: q, light: l, volume }),
      );
    } catch {
      /* Optional preference. */
    }
  }
  async function toggleSound() {
    const engine = audio.current ?? (audio.current = new ArchiveAmbience());
    if (sound) {
      await engine.stop();
      setSound(false);
      return;
    }
    try {
      await engine.start(volume / 100);
      const phase = useArchiveStore.getState().divePhase;
      engine.setImmersed(phase === "within" || phase === "waiting");
      setSound(true);
      setAudioError(false);
    } catch {
      await engine.stop();
      setAudioError(true);
    }
  }
  return (
    <div className="room-settings" aria-label="Room preferences">
      <button
        type="button"
        aria-pressed={quiet}
        onClick={() => {
          useArchiveStore.getState().setQuietReading(!quiet);
          if (!quiet) archiveDirector.settleMotion();
          save(!quiet, light);
        }}
      >
        Quiet reading
      </button>
      <button
        type="button"
        aria-pressed={light}
        onClick={() => {
          useArchiveStore.getState().setLightMode(!light);
          if (!light) archiveDirector.settleMotion();
          save(quiet, !light);
        }}
      >
        Light mode
      </button>
      <div className="sound-control">
        <button
          type="button"
          aria-pressed={sound}
          onClick={() => {
            void toggleSound();
          }}
        >
          <span aria-hidden="true">{sound ? "♫" : "♩"}</span> Ambient sound
        </button>
        {sound && (
          <label className="sound-volume">
            Volume
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              aria-label="Ambient volume"
              onChange={(event) => {
                const v = Number(event.target.value);
                setVolume(v);
                audio.current?.setVolume(v / 100);
                try {
                  localStorage.setItem(
                    "pensieve-room",
                    JSON.stringify({ quiet, light, volume: v }),
                  );
                } catch {
                  /* Optional preference. */
                }
              }}
            />
          </label>
        )}
        {audioError && (
          <span role="status" className="audio-error">
            Sound is unavailable in this browser.
          </span>
        )}
      </div>
    </div>
  );
}
