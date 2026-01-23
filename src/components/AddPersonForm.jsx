import { useState, useEffect } from 'react';

export function AddPersonForm({ 
  onSubmit, 
  onCancel, 
  editPerson = null, 
  preselectedGroup = null,
  customGroups = {},
  defaultStrength = 5
}) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState(preselectedGroup || 'friends');
  const [details, setDetails] = useState('');
  const [connectToMe, setConnectToMe] = useState(true);
  const [connectionStrength, setConnectionStrength] = useState(defaultStrength);
  const [lastContacted, setLastContacted] = useState('');

  const isEditing = !!editPerson;

  // Merge default and custom groups
  const allGroups = {
    family: { label: 'Family', color: '#c9577a' },
    work: { label: 'Work', color: '#3a9ba5' },
    friends: { label: 'Friends', color: '#7c6bb8' },
    acquaintances: { label: 'Acquaintances', color: '#7a8694' },
    ...customGroups,
  };

  useEffect(() => {
    if (editPerson) {
      setName(editPerson.name);
      setGroup(editPerson.group);
      setDetails(editPerson.details || '');
      setConnectToMe(false); // Don't show connect option when editing
      // Convert ISO date to YYYY-MM-DD for input
      setLastContacted(editPerson.lastContacted 
        ? new Date(editPerson.lastContacted).toISOString().split('T')[0] 
        : '');
    } else {
      setName('');
      setGroup(preselectedGroup || 'friends');
      setDetails('');
      setConnectToMe(true);
      setConnectionStrength(defaultStrength);
      setLastContacted('');
    }
  }, [editPerson, preselectedGroup, defaultStrength]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      id: editPerson?.id,
      name: name.trim(),
      group,
      details: details.trim(),
      connectToMe: !isEditing && connectToMe,
      connectionStrength: connectToMe ? connectionStrength : null,
      lastContacted: lastContacted ? new Date(lastContacted).toISOString() : null,
    });

    // Reset form
    setName('');
    setGroup(preselectedGroup || 'friends');
    setDetails('');
    setConnectToMe(true);
    setConnectionStrength(defaultStrength);
    setLastContacted('');
  };

  const availableGroups = Object.entries(allGroups).filter(([key]) => key !== 'me');

  return (
    <div className="form-overlay">
      <div className="form-modal">
        <h2>{isEditing ? 'Edit Person' : 'Add New Person'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="group">Group</label>
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
            <label htmlFor="details">Details (optional)</label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="How do you know them? Any notes..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastContacted">Last Contacted (optional)</label>
            <input
              type="date"
              id="lastContacted"
              value={lastContacted}
              onChange={(e) => setLastContacted(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {!isEditing && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={connectToMe}
                  onChange={(e) => setConnectToMe(e.target.checked)}
                />
                <span className="checkbox-text">Connect this person to me</span>
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
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Save Changes' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
