import { getCurrentWindow } from "@tauri-apps/api/window";

interface TitleBarProps {
  onGoHome: () => void;
}

export function TitleBar({ onGoHome }: TitleBarProps) {
  const appWindow = getCurrentWindow();

  return (
    <div className="title-bar">
      <button className="title-home-btn" onClick={onGoHome} title="Workspace Home">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </button>
      <div
        className="title-bar-drag"
        onMouseDown={(e) => {
          if (e.buttons === 1) {
            e.preventDefault();
            appWindow.startDragging();
          }
        }}
        onDoubleClick={() => appWindow.toggleMaximize()}
      >
        <span className="title-bar-text">Forge</span>
      </div>
      <div className="title-bar-controls">
        <button
          className="title-btn minimize"
          onClick={() => appWindow.minimize()}
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <rect width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          className="title-btn maximize"
          onClick={() => appWindow.toggleMaximize()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </button>
        <button
          className="title-btn close"
          onClick={() => appWindow.close()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
