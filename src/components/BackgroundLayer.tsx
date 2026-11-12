import { useMemo } from 'react';
import type { BackgroundStyle } from '../types';

interface BackgroundLayerProps {
  background: BackgroundStyle;
  imageUrl: string | null;
  focusMode: boolean;
}

export function BackgroundLayer({ background, imageUrl, focusMode }: BackgroundLayerProps) {
  const filter = useMemo(
    () => `brightness(${background.brightness}%) blur(${background.blur}px)`,
    [background.brightness, background.blur],
  );

  const colorStyle = useMemo(() => {
    if (background.kind === 'solid') return { backgroundColor: background.color };
    return {
      backgroundImage: `linear-gradient(${background.gradientAngle}deg, ${background.gradientFrom}, ${background.gradientTo})`,
    };
  }, [
    background.gradientAngle,
    background.gradientFrom,
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
            transform: background.blur > 0 ? 'scale(1.04)' : 'scale(1.005)',
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
}
