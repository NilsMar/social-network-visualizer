import { groupColors, groupLabels } from '../data/initialData';

export function NodeDetail({ node, connections, onClose, onEdit, onDelete, onEditLink, onCenterNode }) {
  if (!node) return null;

  const sortedConnections = [...connections].sort((a, b) => b.strength - a.strength);

  const getStrengthLabel = (strength) => {
    if (strength >= 8) return 'Very Strong';
    if (strength >= 6) return 'Strong';
    if (strength >= 4) return 'Moderate';
    if (strength >= 2) return 'Weak';
    return 'Very Weak';
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
        <button className="btn btn-center" onClick={() => onCenterNode(node.id)} title="Center on graph">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
          </svg>
          Center
        </button>
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
