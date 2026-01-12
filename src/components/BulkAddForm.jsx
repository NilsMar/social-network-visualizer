import { useState } from 'react';

export function BulkAddForm({ 
  onSubmit, 
  onCancel, 
  preselectedGroup = null,
  customGroups = {}
}) {
  const [names, setNames] = useState('');
  const [group, setGroup] = useState(preselectedGroup || 'friends');
  const [connectToMe, setConnectToMe] = useState(true);
  const [connectionStrength, setConnectionStrength] = useState(5);

  // Merge default and custom groups
  const allGroups = {
    family: { label: 'Family', color: '#c9577a' },
    work: { label: 'Work', color: '#3a9ba5' },
    friends: { label: 'Friends', color: '#7c6bb8' },
    acquaintances: { label: 'Acquaintances', color: '#7a8694' },
    ...customGroups,
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!names.trim()) return;

    // Parse names - split by newlines, commas, or semicolons
    const nameList = names
      .split(/[\n,;]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (nameList.length === 0) {
      alert('Please enter at least one name');
      return;
    }

    onSubmit({
      names: nameList,
      group,
      connectToMe,
      connectionStrength: connectToMe ? connectionStrength : null,
    });

    // Reset form
    setNames('');
    setGroup(preselectedGroup || 'friends');
    setConnectToMe(true);
    setConnectionStrength(5);
  };

  const availableGroups = Object.entries(allGroups).filter(([key]) => key !== 'me');

  // Count names for preview
  const nameList = names
    .split(/[\n,;]+/)
    .map(name => name.trim())
    .filter(name => name.length > 0);

  return (
    <div className="form-overlay">
      <div className="form-modal bulk-add-modal">
        <h2>Add Multiple People</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="names">
              Names 
              {nameList.length > 0 && (
                <span className="name-count">({nameList.length} {nameList.length === 1 ? 'person' : 'people'})</span>
              )}
            </label>
            <textarea
              id="names"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              placeholder="Enter names separated by commas, semicolons, or new lines...&#10;&#10;Example:&#10;John Smith&#10;Jane Doe, Bob Wilson&#10;Alice; Charlie"
              rows={6}
              autoFocus
            />
            <p className="form-hint">
              Separate names with commas, semicolons, or new lines
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="group">Add to Group</label>
            <div className="group-selector">
              {availableGroups.map(([key, groupData]) => (
                <button
                  key={key}
                  type="button"
                  className={`group-option ${group === key ? 'selected' : ''}`}
                  style={{
                    borderColor: group === key ? groupData.color : 'transparent',
                    backgroundColor: group === key ? `${groupData.color}15` : 'transparent',
                  }}
                  onClick={() => setGroup(key)}
                >
                  <span 
                    className="group-dot"
                    style={{ backgroundColor: groupData.color }}
                  />
                  {groupData.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={connectToMe}
                onChange={(e) => setConnectToMe(e.target.checked)}
              />
              <span className="checkbox-text">Connect all to me</span>
            </label>
            
            {connectToMe && (
              <div className="strength-slider">
                <label>Connection strength: <strong>{connectionStrength}</strong></label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={connectionStrength}
                  onChange={(e) => setConnectionStrength(parseInt(e.target.value))}
                />
                <div className="strength-labels">
                  <span>Weak</span>
                  <span>Strong</span>
                </div>
              </div>
            )}
          </div>

          {nameList.length > 0 && (
            <div className="preview-section">
              <label>Preview:</label>
              <div className="names-preview">
                {nameList.slice(0, 10).map((name, i) => (
                  <span key={i} className="name-tag" style={{ borderColor: allGroups[group]?.color }}>
                    {name}
                  </span>
                ))}
                {nameList.length > 10 && (
                  <span className="more-tag">+{nameList.length - 10} more</span>
                )}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={nameList.length === 0}
            >
              Add {nameList.length || ''} {nameList.length === 1 ? 'Person' : 'People'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
