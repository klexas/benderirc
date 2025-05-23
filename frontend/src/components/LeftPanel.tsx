import React from 'react';
import './LeftPanel.css'; // We'll create this CSS file in the next step

// Mock data for channels and DMs
const mockChannels = [
  { id: 'c1', name: 'general', type: 'channel' },
  { id: 'c2', name: 'random', type: 'channel' },
  { id: 'c3', name: 'dev-talk', type: 'channel' },
];

const mockDMs = [
  { id: 'd1', name: 'Alice', type: 'dm' },
  { id: 'd2', name: 'Bob', type: 'dm' },
  { id: 'd3', name: 'Charlie', type: 'dm' },
];

const LeftPanel: React.FC = () => {
  return (
    <div className="left-panel">
      <div className="server-list">
        {/* Placeholder for server icons - typically on the very left */}
        <div className="server-icon active">G</div> {/* Example: Guild Icon */}
        <div className="server-icon">S</div>
        <hr className="server-separator" />
        <div className="server-icon dm-icon">DM</div> {/* Example: DM Icon */}
      </div>
      <div className="channel-list">
        <div className="list-header">Channels</div>
        {mockChannels.map(channel => (
          <div key={channel.id} className="channel-item">
            <span className="channel-icon">#</span>
            {channel.name}
          </div>
        ))}
        <div className="list-header">Direct Messages</div>
        {mockDMs.map(dm => (
          <div key={dm.id} className="channel-item">
            <span className="dm-avatar-placeholder"></span> {/* Placeholder for avatar */}
            {dm.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeftPanel;
