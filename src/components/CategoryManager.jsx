import { useState } from 'react';
import { availableColors, defaultGroupLabels, defaultGroupColors } from '../data/initialData';

export function CategoryManager({ 
  customGroups, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory,
  onUpdateDefaultColor,
  defaultColorOverrides = {},
  onClose 
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(availableColors[5]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editingDefaultColor, setEditingDefaultColor] = useState(null);

  // Combine default and custom groups
  const defaultGroups = Object.entries(defaultGroupLabels)
    .filter(([key]) => key !== 'me')
    .map(([key, label]) => ({ key, label, isDefault: true }));

  const customGroupsList = Object.entries(customGroups).map(([key, data]) => ({
    key,
    label: data.label,
    color: data.color,
    isDefault: false,
  }));

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const key = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Check for duplicate
    if (defaultGroupLabels[key] || customGroups[key]) {
      alert('A category with this name already exists!');
      return;
    }

    onAddCategory(key, {
      label: newCategoryName.trim(),
      color: newCategoryColor,
    });

    setNewCategoryName('');
    setNewCategoryColor(availableColors[Math.floor(Math.random() * availableColors.length)]);
  };

  const handleStartEdit = (category) => {
    setEditingCategory(category.key);
    setEditName(category.label);
    setEditColor(category.color || customGroups[category.key]?.color || availableColors[0]);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    
    onUpdateCategory(editingCategory, {
      label: editName.trim(),
      color: editColor,
    });
    
    setEditingCategory(null);
    setEditName('');
    setEditColor('');
  };

  const handleDelete = (key) => {
    if (window.confirm('Delete this category? People in this category will be moved to "Friends".')) {
      onDeleteCategory(key);
    }
  };

  return (
    <div className="form-overlay">
      <div className="form-modal category-manager">
        <div className="modal-header">
          <h2>Manage Categories</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="category-list">
          <h3>Default Categories</h3>
          {defaultGroups.map((cat) => {
            const currentColor = defaultColorOverrides[cat.key] || defaultGroupColors[cat.key];
            return (
              <div key={cat.key} className="category-item default">
                {editingDefaultColor === cat.key ? (
                  <div className="category-edit-row">
                    <span className="category-name">{cat.label}</span>
                    <div className="color-picker-section">
                      <label>Color:</label>
                      <div className="color-picker-inline">
                        {availableColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`color-option ${currentColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => onUpdateDefaultColor(cat.key, color)}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="edit-actions">
                      <button className="btn btn-small btn-secondary" onClick={() => setEditingDefaultColor(null)}>Done</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="category-dot" style={{ backgroundColor: currentColor }} />
                    <span className="category-name">{cat.label}</span>
                    <span className="category-badge">Default</span>
                    <button 
                      className="btn-icon" 
                      onClick={() => setEditingDefaultColor(cat.key)}
                      title="Change color"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="4" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            );
          })}

          {customGroupsList.length > 0 && (
            <>
              <h3>Custom Categories</h3>
              {customGroupsList.map((cat) => (
                <div key={cat.key} className="category-item">
                  {editingCategory === cat.key ? (
                    <div className="category-edit-row">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="category-edit-input"
                      />
                      <div className="color-picker-section">
                        <label>Color:</label>
                        <div className="color-picker-inline">
                          {availableColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`color-option ${editColor === color ? 'selected' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditColor(color)}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="edit-actions">
                        <button className="btn btn-small btn-primary" onClick={handleSaveEdit}>Save</button>
                        <button className="btn btn-small btn-secondary" onClick={() => setEditingCategory(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="category-dot" style={{ backgroundColor: cat.color }} />
                      <span className="category-name">{cat.label}</span>
                      <div className="category-actions">
                        <button 
                          className="btn-icon" 
                          onClick={() => handleStartEdit(cat)}
                          title="Edit"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button 
                          className="btn-icon btn-danger" 
                          onClick={() => handleDelete(cat.key)}
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="add-category-section">
          <h3>Add New Category</h3>
          <form onSubmit={handleAddCategory} className="add-category-form">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name..."
              className="category-name-input"
            />
            <div className="color-picker">
              <label>Color:</label>
              <div className="color-options">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${newCategoryColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCategoryColor(color)}
                  />
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={!newCategoryName.trim()}>
              Add Category
            </button>
          </form>
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
