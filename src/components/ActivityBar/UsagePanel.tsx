import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

interface ClaudeUsageStats {
  totalSessions: number;
  totalMessages: number;
  firstSessionDate: string | null;
  dailyActivity: DailyActivity[];
  modelUsage: Record<string, ModelUsage>;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(toLocalDate(d));
  }
  return dates;
}

function getLast14Days(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(toLocalDate(d));
  }
  return dates;
}

export function UsagePanel() {
  const [stats, setStats] = useState<ClaudeUsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<ClaudeUsageStats>("get_claude_usage_stats")
      .then(setStats)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="usage-panel">
        <h3 className="usage-panel-title">Claude Usage</h3>
        <div className="usage-panel-empty">No usage data found</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="usage-panel">
        <h3 className="usage-panel-title">Claude Usage</h3>
        <div className="usage-panel-empty">Loading...</div>
      </div>
    );
  }

  const activityMap = new Map(stats.dailyActivity.map((d) => [d.date, d]));
  const today = getToday();
  const todayData = activityMap.get(today);
  const weekDates = getWeekDates();
  const weekMessages = weekDates.reduce(
    (sum, d) => sum + (activityMap.get(d)?.messageCount || 0),
    0
  );
  const weekSessions = weekDates.reduce(
    (sum, d) => sum + (activityMap.get(d)?.sessionCount || 0),
    0
  );

  const totalTokens = Object.values(stats.modelUsage).reduce(
    (sum, m) => sum + m.inputTokens + m.outputTokens + m.cacheReadInputTokens + m.cacheCreationInputTokens,
    0
  );

  // Mini activity chart — last 14 days
  const last14 = getLast14Days().reverse();
  const dayMessages = last14.map((d) => activityMap.get(d)?.messageCount || 0);
  const maxMsg = Math.max(...dayMessages, 1);

  return (
    <div className="usage-panel">
      <h3 className="usage-panel-title">Claude Usage</h3>

      {/* Current Window */}
      <div className="usage-section">
        <div className="usage-section-label">Today</div>
        <div className="usage-row">
          <span className="usage-row-value">{todayData?.messageCount || 0}</span>
          <span className="usage-row-label">messages</span>
        </div>
        <div className="usage-row">
          <span className="usage-row-value">{todayData?.sessionCount || 0}</span>
          <span className="usage-row-label">sessions</span>
        </div>
        <div className="usage-row">
          <span className="usage-row-value">{todayData?.toolCallCount || 0}</span>
          <span className="usage-row-label">tool calls</span>
        </div>
      </div>

      <div className="usage-section">
        <div className="usage-section-label">This Week</div>
        <div className="usage-row">
          <span className="usage-row-value">{weekMessages}</span>
          <span className="usage-row-label">messages</span>
        </div>
        <div className="usage-row">
          <span className="usage-row-value">{weekSessions}</span>
          <span className="usage-row-label">sessions</span>
        </div>
      </div>

      {/* Session usage meter */}
      <div className="usage-section">
        <div className="usage-section-label">Session Window</div>
        <div className="usage-meter-container">
          <div className="usage-meter-label">
            <span>5h window</span>
            <span className="usage-meter-hint">
              {todayData?.messageCount || 0} msgs
            </span>
          </div>
          <div className="usage-meter-track">
            <div
              className="usage-meter-fill"
              style={{
                width: `${Math.min(100, ((todayData?.messageCount || 0) / 200) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Activity chart */}
      <div className="usage-section">
        <div className="usage-section-label">14-Day Activity</div>
        <div className="usage-chart">
          {dayMessages.map((count, i) => (
            <div key={last14[i]} className="usage-chart-bar-wrap" title={`${last14[i]}: ${count} msgs`}>
              <div
                className="usage-chart-bar"
                style={{ height: `${Math.max(2, (count / maxMsg) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="usage-chart-labels">
          <span>{last14[0].slice(5)}</span>
          <span>{last14[last14.length - 1].slice(5)}</span>
        </div>
      </div>

      {/* All-time stats */}
      <div className="usage-section">
        <div className="usage-section-label">All Time</div>
        <div className="usage-row">
          <span className="usage-row-value">{stats.totalSessions}</span>
          <span className="usage-row-label">sessions</span>
        </div>
        <div className="usage-row">
          <span className="usage-row-value">{stats.totalMessages.toLocaleString()}</span>
          <span className="usage-row-label">messages</span>
        </div>
        <div className="usage-row">
          <span className="usage-row-value">{formatTokens(totalTokens)}</span>
          <span className="usage-row-label">tokens</span>
        </div>
        {stats.firstSessionDate && (
          <div className="usage-row">
            <span className="usage-row-value">
              {new Date(stats.firstSessionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="usage-row-label">first session</span>
          </div>
        )}
      </div>

      {/* Model breakdown */}
      <div className="usage-section">
        <div className="usage-section-label">Models</div>
        {Object.entries(stats.modelUsage).map(([model, usage]) => {
          const shortName = model
            .replace("claude-", "")
            .replace(/-\d{8}$/, "");
          const tokens = usage.inputTokens + usage.outputTokens;
          return (
            <div key={model} className="usage-model-row">
              <span className="usage-model-name">{shortName}</span>
              <span className="usage-model-tokens">{formatTokens(tokens)} tokens</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
