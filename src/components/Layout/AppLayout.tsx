import { ReactNode } from "react";
import { TitleBar } from "./TitleBar";
import { ActivityBar } from "../ActivityBar/ActivityBar";

interface AppLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  projectPath: string | null;
  onRunSkill: (skillName: string) => void;
  onGoHome: () => void;
  openSkillsBrowse?: boolean;
  onSkillsBrowseConsumed?: () => void;
}

export function AppLayout({ sidebar, main, projectPath, onRunSkill, onGoHome, openSkillsBrowse, onSkillsBrowseConsumed }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <TitleBar onGoHome={onGoHome} />
      <div className="app-content">
        <aside className="app-sidebar">{sidebar}</aside>
        <main className="app-main">{main}</main>
        <ActivityBar
          projectPath={projectPath}
          onRunSkill={onRunSkill}
          openSkillsBrowse={openSkillsBrowse}
          onSkillsBrowseConsumed={onSkillsBrowseConsumed}
        />
      </div>
    </div>
  );
}
