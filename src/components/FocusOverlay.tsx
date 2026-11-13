import { Icon } from './Icon';

interface FocusOverlayProps {
  paperOpacity: number;
  brightness: number;
  blur: number;
  overlay: number;
  onPaperOpacityChange: (value: number) => void;
  onBrightnessChange: (value: number) => void;
  onBlurChange: (value: number) => void;
  onOverlayChange: (value: number) => void;
  onExit: () => void;
}

export function FocusOverlay({
  paperOpacity,
  brightness,
  blur,
  overlay,
  onPaperOpacityChange,
  onBrightnessChange,
  onBlurChange,
  onOverlayChange,
  onExit,
}: FocusOverlayProps) {
  return (
    <div className="focus-chrome" role="toolbar" aria-label="专注写作控制">
      <button type="button" className="focus-exit" onClick={onExit}>
        <Icon name="close" size={12} />
        退出专注 <kbd>Esc</kbd>
      </button>
      <div className="focus-controls">
        <label>
          <span>纸张 {Math.round(paperOpacity)}%</span>
          <input
            type="range"
            min={60}
            max={100}
            step={1}
            value={paperOpacity}
            onChange={(event) => onPaperOpacityChange(Number(event.target.value))}
          />
        </label>
        <label>
          <span>亮度 {brightness}%</span>
          <input
            type="range"
            min={55}
            max={145}
            step={1}
            value={brightness}
            onChange={(event) => onBrightnessChange(Number(event.target.value))}
          />
        </label>
        <label>
          <span>模糊 {blur}px</span>
          <input
            type="range"
            min={0}
            max={24}
            step={1}
            value={blur}
            onChange={(event) => onBlurChange(Number(event.target.value))}
          />
        </label>
        <label>
          <span>遮罩 {overlay}%</span>
          <input
            type="range"
            min={0}
            max={55}
            step={1}
            value={overlay}
            onChange={(event) => onOverlayChange(Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
