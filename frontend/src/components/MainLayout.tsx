import React from 'react';
import './MainLayout.css'; // We'll create this CSS file next

interface MainLayoutProps {
  leftPanel: React.ReactNode;
  middlePanel: React.ReactNode;
  rightPanel?: React.ReactNode; // Optional right panel
}

const MainLayout: React.FC<MainLayoutProps> = ({ leftPanel, middlePanel, rightPanel }) => {
  return (
    <div className="main-layout">
      <div className="layout-left-panel">
        {leftPanel}
      </div>
      <div className="layout-middle-panel">
        {middlePanel}
      </div>
      {rightPanel && (
        <div className="layout-right-panel">
          {rightPanel}
        </div>
      )}
    </div>
  );
};

export default MainLayout;
