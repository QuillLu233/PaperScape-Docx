import { memo, useMemo } from 'react';
import type { BackgroundStyle } from '../types';
import { colorWithAlpha } from '../appearance/presets';

interface BackgroundLayerProps {
  background: BackgroundStyle;
  imageUrl: string | null;
  focusMode: boolean;
}

export const BackgroundLayer = memo(function BackgroundLayer({
  background,
  imageUrl,
  focusMode,
}: BackgroundLayerProps) {
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

  return (
    <div
      className={`scene-background${focusMode ? ' is-focus' : ''}`}
      aria-hidden="true"
      data-kind={background.kind}
    >
      {background.kind === 'image' && imageUrl ? (
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
    </div>
  );
});
