import { defaultGroupColors, defaultGroupLabels } from '../data/initialData';

export function Legend({ nodes, selectedGroup, onGroupSelect, customGroups = {}, defaultColorOverrides = {}, deletedDefaultCategories = [] }) {
  // Merge default and custom groups (excluding deleted defaults)
  const allGroupLabels = {
    ...Object.fromEntries(
      Object.entries(defaultGroupLabels).filter(([key]) => !deletedDefaultCategories.includes(key))
    ),
    ...Object.fromEntries(
      Object.entries(customGroups).map(([key, data]) => [key, data.label])
    )
  };
  
  const allGroupColors = {
    ...Object.fromEntries(
      Object.entries(defaultGroupColors).filter(([key]) => !deletedDefaultCategories.includes(key))
    ),
    ...defaultColorOverrides,
    ...Object.fromEntries(
      Object.entries(customGroups).map(([key, data]) => [key, data.color])
    )
  };

  // Count nodes per group
  const groupCounts = nodes.reduce((acc, node) => {
    acc[node.group] = (acc[node.group] || 0) + 1;
    return acc;
  }, {});

  // Order: me first, then by count descending
  const orderedGroups = Object.entries(allGroupLabels)
    .sort((a, b) => {
      if (a[0] === 'me') return -1;
      if (b[0] === 'me') return 1;
      return (groupCounts[b[0]] || 0) - (groupCounts[a[0]] || 0);
    });

  return (
    <div className="legend">
      <h4>Groups</h4>
      <ul className="legend-list">
        {orderedGroups.map(([key, label]) => (
          <li 
            key={key} 
            className={`legend-item ${key !== 'me' ? 'clickable' : ''} ${selectedGroup === key ? 'selected' : ''}`}
            onClick={() => key !== 'me' && onGroupSelect(key)}
            style={selectedGroup === key ? { 
              backgroundColor: `${allGroupColors[key]}15`,
              borderColor: allGroupColors[key]
            } : {}}
          >
            <span 
              className="legend-color"
              style={{ backgroundColor: allGroupColors[key] }}
            />
            <span className="legend-label">{label}</span>
            <span className="legend-count">{groupCounts[key] || 0}</span>
          </li>
        ))}
      </ul>
      <div className="legend-footer">
        <p>Total: {nodes.length} people</p>
        {selectedGroup && (
          <button 
            className="btn-close-group"
            onClick={() => onGroupSelect(null)}
          >
            Close panel
          </button>
        )}
      </div>
    </div>
  );
}
