import { useState, useEffect } from 'react';
import { groupColors, groupLabels } from '../data/initialData';

export function AddPersonForm({ onSubmit, onCancel, editPerson = null, preselectedGroup = null }) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState(preselectedGroup || 'friends');
  const [details, setDetails] = useState('');

  const isEditing = !!editPerson;

  useEffect(() => {
    if (editPerson) {
      setName(editPerson.name);
      setGroup(editPerson.group);
      setDetails(editPerson.details || '');
    } else {
      setName('');
      setGroup(preselectedGroup || 'friends');
      setDetails('');
    }
  }, [editPerson, preselectedGroup]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      id: editPerson?.id,
      name: name.trim(),
      group,
      details: details.trim(),
    });

    // Reset form
    setName('');
    setGroup(preselectedGroup || 'friends');
    setDetails('');
  };

  const availableGroups = Object.entries(groupLabels).filter(([key]) => key !== 'me');

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
              {availableGroups.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`group-option ${group === key ? 'selected' : ''}`}
                  style={{
                    borderColor: group === key ? groupColors[key] : 'transparent',
                    backgroundColor: group === key ? `${groupColors[key]}15` : 'transparent',
                  }}
                  onClick={() => setGroup(key)}
                >
                  <span 
                    className="group-dot"
                    style={{ backgroundColor: groupColors[key] }}
                  />
                  {label}
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
