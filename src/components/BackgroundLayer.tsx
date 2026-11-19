import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { BackgroundStyle, EnvironmentAnimationSettings } from '../types';
import { colorWithAlpha } from '../appearance/presets';
import { ProceduralBackground } from '../background/ProceduralBackground';

interface BackgroundLayerProps {
  background: BackgroundStyle;
  animation: EnvironmentAnimationSettings;
  imageUrl: string | null;
  videoUrl: string | null;
  focusMode: boolean;
}

export const BackgroundLayer = memo(function BackgroundLayer({
  background,
  animation,
  imageUrl,
  videoUrl,
  focusMode,
}: BackgroundLayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const filter = useMemo(() => {
    if (background.brightness === 100 && background.blur === 0) return undefined;
    return `brightness(${background.brightness}%) blur(${background.blur}px)`;
  }, [background.brightness, background.blur]);

  const colorStyle = useMemo(() => {
    if (background.kind === 'solid') return { backgroundColor: background.color };
    const linear = `linear-gradient(${background.gradientAngle}deg, ${background.gradientFrom}, ${background.gradientMid ?? background.gradientFrom} 45%, ${background.gradientTo})`;
    return {
      backgroundImage: background.gradientAccent
        ? `radial-gradient(circle at 74% 24%, ${colorWithAlpha(background.gradientAccent, 0.42)} 0%, transparent 38%), ${linear}`
        : linear,
    };
  }, [
    background.gradientAngle,
    background.gradientAccent,
    background.gradientFrom,
    background.gradientMid,
    background.gradientTo,
    background.kind,
    background.color,
  ]);

  const videoAvailable = background.kind === 'video' && Boolean(videoUrl) && !videoError;
  const proceduralActive =
    background.source === 'procedural' && animation.enabled && animation.type !== 'none';

  useEffect(() => {
    setVideoError(false);
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoAvailable) return;
    if (background.videoPaused) {
      video.pause();
    } else {
      void video.play().catch(() => undefined);
    }
  }, [background.videoPaused, videoAvailable, videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoAvailable) return;
    const pause = () => video.pause();
    const resume = () => {
      if (!background.videoPaused && document.visibilityState !== 'hidden') {
        void video.play().catch(() => undefined);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') pause();
      else resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', pause);
    window.addEventListener('focus', resume);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', pause);
      window.removeEventListener('focus', resume);
    };
  }, [background.videoPaused, videoAvailable]);

  return (
    <div
      className={`scene-background${focusMode ? ' is-focus' : ''}`}
      aria-hidden="true"
      data-kind={background.kind}
      data-source={background.source ?? (background.kind === 'video' ? 'video' : 'environment')}
    >
      {!videoAvailable && background.kind === 'image' && imageUrl ? (
        <div
          className="scene-background-image"
          style={{
            backgroundImage: `url("${imageUrl}")`,
            filter,
            transform: background.blur > 0 ? 'scale(1.04)' : undefined,
          }}
        />
      ) : (
        <div className="scene-background-color" style={{ ...colorStyle, filter }} />
      )}
      {!videoAvailable && proceduralActive ? (
        <ProceduralBackground background={background} animation={animation} />
      ) : null}
      {videoAvailable ? (
        <video
          ref={videoRef}
          className="scene-background-video"
          src={videoUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          style={{
            objectFit: background.videoFit ?? 'cover',
            filter,
          }}
          onError={() => setVideoError(true)}
        />
      ) : null}
      <div
        className="scene-background-overlay"
        style={{
          backgroundColor: background.overlayColor,
          opacity: background.overlay / 100,
        }}
      />
      <div
        className="scene-background-vignette"
        style={{ opacity: background.vignette / 100 }}
      />
      {background.kind === 'video' && !videoAvailable ? (
        <div className="scene-background-fallback">视频背景不可用，已回退到静态环境</div>
      ) : null}
    </div>
  );
});
