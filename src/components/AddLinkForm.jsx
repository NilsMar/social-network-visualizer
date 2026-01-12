import { useState, useEffect } from 'react';
import { groupColors } from '../data/initialData';

export function AddLinkForm({ nodes, onSubmit, onCancel, preselectedPerson = null }) {
  const [source, setSource] = useState(preselectedPerson || 'me');
  const [target, setTarget] = useState('');
  const [strength, setStrength] = useState(5);

  useEffect(() => {
    if (preselectedPerson) {
      setSource(preselectedPerson);
    }
  }, [preselectedPerson]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!source || !target || source === target) return;

    onSubmit({
      source,
      target,
      strength: parseInt(strength, 10),
    });

    // Reset form
    setSource(preselectedPerson || 'me');
    setTarget('');
    setStrength(5);
  };

  const getStrengthDescription = (value) => {
    if (value >= 9) return 'Very close relationship';
    if (value >= 7) return 'Strong bond';
    if (value >= 5) return 'Regular contact';
    if (value >= 3) return 'Occasional contact';
    return 'Acquaintance level';
  };

  // Sort nodes: "Me" first, then alphabetically
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.id === 'me') return -1;
    if (b.id === 'me') return 1;
    return a.name.localeCompare(b.name);
  });

  const sourcePerson = nodes.find(n => n.id === source);
  const targetPerson = nodes.find(n => n.id === target);

  return (
    <div className="form-overlay">
      <div className="form-modal">
        <h2>Add Connection</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="source">From</label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
              >
                <option value="">Select person...</option>
                {sortedNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-connector">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <div className="form-group">
              <label htmlFor="target">To</label>
              <select
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
              >
                <option value="">Select person...</option>
                {sortedNodes
                  .filter((node) => node.id !== source)
                  .map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {source && target && sourcePerson && targetPerson && (
            <div className="link-preview">
              <div className="link-preview-person">
                <div 
                  className="preview-avatar"
                  style={{ backgroundColor: groupColors[sourcePerson.group] }}
                >
                  {sourcePerson.name.charAt(0)}
                </div>
                <span>{sourcePerson.name}</span>
              </div>
              <div className="link-preview-line" style={{ backgroundColor: groupColors.friends }} />
              <div className="link-preview-person">
                <div 
                  className="preview-avatar"
                  style={{ backgroundColor: groupColors[targetPerson.group] }}
                >
                  {targetPerson.name.charAt(0)}
                </div>
                <span>{targetPerson.name}</span>
              </div>
            </div>
          )}

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
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!source || !target || source === target}
            >
              Add Connection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
