"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  className?: string;
}

export default function AudioPlayer({
  src,
  autoPlay = false,
  className,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekSliderRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    const onCanPlay = () => setIsLoading(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);

    if (autoPlay) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("Auto-play failed:", err);
          setIsLoading(false);
          setIsPlaying(false);
        });
      }
      setIsPlaying(true);
    }

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
    };
  }, [autoPlay, isDragging]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
  };

  const applySeek = useCallback((value: number) => {
    if (audioRef.current && !Number.isNaN(value)) {
      audioRef.current.currentTime = value;
    }
    setIsDragging(false);
  }, []);

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = (
    e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>,
  ) => {
    const time = parseFloat((e.currentTarget as HTMLInputElement).value);
    applySeek(time);
  };

  // В попапе при отпускании мыши над overlay событие приходит не на слайдер — перемотка не применялась.
  // Слушаем mouseup/touchend на document и применяем значение слайдера.
  useEffect(() => {
    if (!isDragging) return;
    const onDocumentPointerEnd = () => {
      const input = seekSliderRef.current;
      if (input) {
        const time = parseFloat(input.value);
        applySeek(time);
      } else {
        setIsDragging(false);
      }
    };
    document.addEventListener("mouseup", onDocumentPointerEnd);
    document.addEventListener("touchend", onDocumentPointerEnd, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mouseup", onDocumentPointerEnd);
      document.removeEventListener("touchend", onDocumentPointerEnd);
    };
  }, [isDragging, applySeek]);

  const formatTime = (time: number) => {
    if (Number.isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`audio-player ${className || ""}`}>
      <audio ref={audioRef} src={src} />

      <div className="audio-controls">
        <div className="flex items-center gap-3 justify-center">
          <button
            className="player-btn volume-btn"
            onClick={toggleMute}
            title={isMuted ? "Включить звук" : "Выключить звук"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button
            className="play-pause-btn"
            onClick={togglePlay}
            disabled={isLoading}
            title={isPlaying ? "Пауза" : "Воспроизвести"}
          >
            {isLoading ? (
              <span className="spinner"></span>
            ) : isPlaying ? (
              "⏸"
            ) : (
              "▶"
            )}
          </button>
          <div className="w-8" /> {/* Spacer to balance volume btn */}
        </div>

        <div className="seek-container">
          <span className="time-label">{formatTime(currentTime)}</span>
          <div className="slider-wrapper">
            <input
              ref={seekSliderRef}
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleSeekChange}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="seek-slider"
            />
            <div
              className="slider-progress"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>
          <span className="time-label">{formatTime(duration)}</span>
        </div>
      </div>

      <style jsx>{`
                .audio-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    width: 100%;
                }
                .player-btn {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 50%;
                    transition: background 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #555;
                }
                .player-btn:hover {
                    background: #f5f5f7;
                    color: #111;
                }
                .play-pause-btn {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    border: none;
                    background: #FFD600;
                    color: black;
                    font-size: 18px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 3px 8px rgba(255, 214, 0, 0.3);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .play-pause-btn:hover:not(:disabled) {
                    transform: scale(1.05);
                    box-shadow: 0 5px 12px rgba(255, 214, 0, 0.4);
                }
                .play-pause-btn:active:not(:disabled) {
                    transform: scale(0.95);
                }
                .play-pause-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    background: #e0e0e0;
                    box-shadow: none;
                }
                .seek-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                }
                .time-label {
                    font-size: 11px;
                    color: #888;
                    font-weight: 600;
                    width: 40px;
                    font-variant-numeric: tabular-nums;
                    text-align: center;
                }
                .slider-wrapper {
                    flex: 1;
                    position: relative;
                    height: 5px;
                    display: flex;
                    align-items: center;
                }
                .seek-slider {
                    width: 100%;
                    height: 100%;
                    -webkit-appearance: none;
                    background: #e0e0e0;
                    border-radius: 3px;
                    outline: none;
                    cursor: pointer;
                    position: relative;
                    z-index: 2;
                    margin: 0;
                }
                .seek-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 12px;
                    height: 12px;
                    background: #111;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    transition: transform 0.1s;
                }
                .seek-slider:hover::-webkit-slider-thumb {
                    transform: scale(1.1);
                }
                .slider-progress {
                    position: absolute;
                    left: 0;
                    top: 0;
                    height: 100%;
                    background: #FFD600;
                    border-radius: 3px;
                    z-index: 1;
                    pointer-events: none;
                }
                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(0,0,0,0.1);
                    border-top: 2px solid #000;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
    </div>
  );
}
