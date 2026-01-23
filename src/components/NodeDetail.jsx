import { groupColors, groupLabels } from '../data/initialData';

// Helper function to format relative time
function formatTimeAgo(dateString) {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  if (diffDays < 730) return '1 year ago';
  return `${Math.floor(diffDays / 365)} years ago`;
}

// Helper to get urgency level based on last contacted
function getContactUrgency(dateString) {
  if (!dateString) return 'never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 7) return 'recent';
  if (diffDays <= 30) return 'moderate';
  if (diffDays <= 90) return 'overdue';
  return 'urgent';
}

export function NodeDetail({ node, connections, onClose, onEdit, onDelete, onEditLink, onSetAsCenter, centeredNodeId, onUpdateLastContacted }) {
  if (!node) return null;

  const sortedConnections = [...connections].sort((a, b) => b.strength - a.strength);
  const lastContactedAgo = formatTimeAgo(node.lastContacted);
  const contactUrgency = getContactUrgency(node.lastContacted);

  const getStrengthLabel = (strength) => {
    if (strength >= 8) return 'Very Strong';
    if (strength >= 6) return 'Strong';
    if (strength >= 4) return 'Moderate';
    if (strength >= 2) return 'Weak';
    return 'Very Weak';
  };

  const handleMarkContacted = () => {
    onUpdateLastContacted(node.id);
  };

  return (
    <div className="node-detail-panel">
      <button className="close-btn" onClick={onClose} aria-label="Close">
        ×
      </button>
      
      <div className="node-header">
        <div 
          className="node-avatar"
          style={{ backgroundColor: groupColors[node.group] }}
        >
          {node.name.charAt(0).toUpperCase()}
        </div>
        <div className="node-title">
          <h2>{node.name}</h2>
          <span 
            className="node-group-badge"
            style={{ backgroundColor: `${groupColors[node.group]}22`, color: groupColors[node.group] }}
          >
            {groupLabels[node.group] || node.group}
          </span>
        </div>
      </div>

      {node.details && (
        <div className="node-details">
          <p>{node.details}</p>
        </div>
      )}

      <div className="node-stats">
        <div className="stat">
          <span className="stat-value">{connections.length}</span>
          <span className="stat-label">Connections</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {connections.length > 0 
              ? (connections.reduce((sum, c) => sum + c.strength, 0) / connections.length).toFixed(1)
              : '0'}
          </span>
          <span className="stat-label">Avg. Strength</span>
        </div>
      </div>

      {node.id !== 'me' && (
        <div className="last-contacted-section">
          <div className="last-contacted-info">
            <div className="last-contacted-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              <span className="last-contacted-label">Last Contacted</span>
            </div>
            <div className={`last-contacted-value urgency-${contactUrgency}`}>
              {lastContactedAgo || 'Never'}
            </div>
          </div>
          <button 
            className="btn btn-contacted"
            onClick={handleMarkContacted}
            title="Mark as contacted today"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20,6 9,17 4,12" />
            </svg>
            Contacted Today
          </button>
        </div>
      )}

      <div className="connections-section">
        <h3>Connections</h3>
        {sortedConnections.length === 0 ? (
          <p className="no-connections">No connections yet</p>
        ) : (
          <ul className="connections-list">
            {sortedConnections.map(({ person, strength }) => (
              <li key={person.id} className="connection-item">
                <div 
                  className="connection-dot"
                  style={{ backgroundColor: groupColors[person.group] }}
                />
                <div className="connection-info">
                  <span className="connection-name">{person.name}</span>
                  <span className="connection-group">{groupLabels[person.group]}</span>
                </div>
                <div className="connection-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill"
                      style={{ 
                        width: `${strength * 10}%`,
                        backgroundColor: groupColors[person.group]
                      }}
                    />
                  </div>
                  <span className="strength-label">{getStrengthLabel(strength)}</span>
                </div>
                <button 
                  className="btn-edit-link"
                  onClick={() => onEditLink(node.id, person.id, strength)}
                  title="Edit relationship strength"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="node-actions">
        {node.id !== centeredNodeId && (
          <button className="btn btn-center" onClick={() => onSetAsCenter(node.id)} title="Place at center of network">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Set as Center
          </button>
        )}
        {node.id === centeredNodeId && node.id !== 'me' && (
          <button className="btn btn-center active" onClick={() => onSetAsCenter('me')} title="Return to your network">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Back to Me
          </button>
        )}
        {node.id !== 'me' && (
          <>
            <button className="btn btn-edit" onClick={() => onEdit(node)}>
              Edit Person
            </button>
            <button className="btn btn-delete" onClick={() => onDelete(node.id)}>
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}
