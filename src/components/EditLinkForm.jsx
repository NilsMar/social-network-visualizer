import { useState } from 'react';
import { groupColors } from '../data/initialData';

export function EditLinkForm({ sourceId, targetId, currentStrength, nodes, onSubmit, onDelete, onCancel }) {
  const [strength, setStrength] = useState(currentStrength);

  const sourcePerson = nodes.find(n => n.id === sourceId);
  const targetPerson = nodes.find(n => n.id === targetId);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(sourceId, targetId, parseInt(strength, 10));
  };

  const handleDelete = () => {
    if (window.confirm(`Remove the connection between ${sourcePerson?.name} and ${targetPerson?.name}?`)) {
      onDelete(sourceId, targetId);
    }
  };

  const getStrengthDescription = (value) => {
    if (value >= 9) return 'Very close relationship';
    if (value >= 7) return 'Strong bond';
    if (value >= 5) return 'Regular contact';
    if (value >= 3) return 'Occasional contact';
    return 'Acquaintance level';
  };

  return (
    <div className="form-overlay">
      <div className="form-modal">
        <h2>Edit Relationship</h2>
        
        <div className="edit-link-people">
          <div className="edit-link-person">
            <div 
              className="person-avatar"
              style={{ backgroundColor: groupColors[sourcePerson?.group] }}
            >
              {sourcePerson?.name.charAt(0).toUpperCase()}
            </div>
            <span>{sourcePerson?.name}</span>
          </div>
          
          <div className="edit-link-connector">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 12h8M12 8l4 4-4 4" />
              <path d="M16 12H8M12 16l-4-4 4-4" />
            </svg>
          </div>
          
          <div className="edit-link-person">
            <div 
              className="person-avatar"
              style={{ backgroundColor: groupColors[targetPerson?.group] }}
            >
              {targetPerson?.name.charAt(0).toUpperCase()}
            </div>
            <span>{targetPerson?.name}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="strength">
              Tie Strength: <strong>{strength}</strong>
            </label>
            <input
              type="range"
              id="strength"
              min="1"
              max="10"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              className="strength-slider"
              style={{
                background: `linear-gradient(to right, ${groupColors.friends} 0%, ${groupColors.friends} ${strength * 10}%, #e2e8f0 ${strength * 10}%, #e2e8f0 100%)`,
              }}
            />
            <div className="strength-labels">
              <span>Weak</span>
              <span className="strength-description">{getStrengthDescription(strength)}</span>
              <span>Strong</span>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-delete" onClick={handleDelete}>
              Remove Link
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
