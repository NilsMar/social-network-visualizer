import { useState } from 'react';
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
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
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

export function GroupPanel({ 
  group, 
  nodes, 
  links, 
  onClose, 
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onEditLink,
  onAddLink,
  onUpdateLastContacted
}) {
  const [expandedPerson, setExpandedPerson] = useState(null);
  
  // Get all people in this group
  const groupMembers = nodes.filter(n => n.group === group);
  
  // Get connections for a person
  const getConnections = (personId) => {
    return links
      .filter(l => {
        const sourceId = l.source?.id || l.source;
        const targetId = l.target?.id || l.target;
        return sourceId === personId || targetId === personId;
      })
      .map(l => {
        const sourceId = l.source?.id || l.source;
        const targetId = l.target?.id || l.target;
        const otherId = sourceId === personId ? targetId : sourceId;
        const otherPerson = nodes.find(n => n.id === otherId);
        return {
          person: otherPerson,
          strength: l.strength,
          linkSource: sourceId,
          linkTarget: targetId
        };
      })
      .filter(c => c.person); // Filter out any undefined
  };

  const getStrengthLabel = (strength) => {
    if (strength >= 8) return 'Very Strong';
    if (strength >= 6) return 'Strong';
    if (strength >= 4) return 'Moderate';
    if (strength >= 2) return 'Weak';
    return 'Very Weak';
  };

  const toggleExpanded = (personId) => {
    setExpandedPerson(expandedPerson === personId ? null : personId);
  };

  return (
    <div className="group-panel">
      <div className="group-panel-header">
        <div className="group-panel-title">
          <span 
            className="group-panel-dot"
            style={{ backgroundColor: groupColors[group] }}
          />
          <h2>{groupLabels[group]}</h2>
          <span className="group-panel-count">{groupMembers.length} people</span>
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="group-panel-content">
        {groupMembers.length === 0 ? (
          <div className="group-empty">
            <p>No people in this group yet.</p>
          </div>
        ) : (
          <ul className="group-members-list">
            {groupMembers.map(person => {
              const connections = getConnections(person.id);
              const isExpanded = expandedPerson === person.id;
              
              return (
                <li key={person.id} className={`group-member ${isExpanded ? 'expanded' : ''}`}>
                  <div 
                    className="group-member-header"
                    onClick={() => toggleExpanded(person.id)}
                  >
                    <div 
                      className="member-avatar"
                      style={{ backgroundColor: groupColors[group] }}
                    >
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="member-info">
                      <span className="member-name">{person.name}</span>
                      <span className="member-connections">
                        {connections.length} connection{connections.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {person.id !== 'me' && (
                      <span className={`member-last-contact urgency-${getContactUrgency(person.lastContacted)}`}>
                        {formatTimeAgo(person.lastContacted) || 'Never'}
                      </span>
                    )}
                    <svg 
                      className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                  
                  {isExpanded && (
                    <div className="group-member-details">
                      {person.details && (
                        <p className="member-details-text">{person.details}</p>
                      )}
                      
                      <div className="member-connections-section">
                        <div className="section-header">
                          <h4>Connections</h4>
                          <button 
                            className="btn-small btn-add"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddLink(person.id);
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add
                          </button>
                        </div>
                        
                        {connections.length === 0 ? (
                          <p className="no-connections-text">No connections yet</p>
                        ) : (
                          <ul className="member-connections-list">
                            {connections.map(({ person: connectedPerson, strength }) => (
                              <li key={connectedPerson.id} className="member-connection">
                                <span 
                                  className="connection-dot"
                                  style={{ backgroundColor: groupColors[connectedPerson.group] }}
                                />
                                <span className="connection-name">{connectedPerson.name}</span>
                                <div className="connection-strength-mini">
                                  <div className="strength-bar-mini">
                                    <div 
                                      className="strength-fill-mini"
                                      style={{ 
                                        width: `${strength * 10}%`,
                                        backgroundColor: groupColors[connectedPerson.group]
                                      }}
                                    />
                                  </div>
                                  <span className="strength-value">{strength}</span>
                                </div>
                                <button 
                                  className="btn-icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditLink(person.id, connectedPerson.id, strength);
                                  }}
                                  title="Edit connection"
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
                      
                      {person.id !== 'me' && (
                        <div className="member-last-contacted-section">
                          <button 
                            className="btn btn-small btn-contacted"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateLastContacted(person.id);
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20,6 9,17 4,12" />
                            </svg>
                            Contacted Today
                          </button>
                        </div>
                      )}
                      
                      <div className="member-actions">
                        <button 
                          className="btn btn-small btn-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPerson(person);
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-small btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePerson(person.id);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="group-panel-footer">
        <button 
          className="btn btn-primary btn-full"
          onClick={() => onAddPerson(group)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="7" r="4" />
            <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
          Add to {groupLabels[group]}
        </button>
      </div>
    </div>
  );
}
