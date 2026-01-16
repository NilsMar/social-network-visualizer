import { useState } from 'react';
import { availableColors, defaultGroupLabels, defaultGroupColors } from '../data/initialData';

export function CategoryManager({ 
  customGroups, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory,
  onUpdateDefaultColor,
  onDeleteDefaultCategory,
  defaultColorOverrides = {},
  onClose 
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(availableColors[5]);
  
  // Edit states
  const [editingName, setEditingName] = useState(null);
  const [editingColor, setEditingColor] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editColorValue, setEditColorValue] = useState('');

  // Combine default and custom groups
  const defaultGroups = Object.entries(defaultGroupLabels)
    .filter(([key]) => key !== 'me')
    .map(([key, label]) => ({ 
      key, 
      label, 
      color: defaultColorOverrides[key] || defaultGroupColors[key],
      isDefault: true 
    }));

  const customGroupsList = Object.entries(customGroups).map(([key, data]) => ({
    key,
    label: data.label,
    color: data.color,
    isDefault: false,
  }));

  // All categories combined
  const allCategories = [...defaultGroups, ...customGroupsList];

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const key = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
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

  // Name editing
  const handleStartEditName = (cat) => {
    setEditingName(cat.key);
    setEditValue(cat.label);
    setEditingColor(null);
  };

  const handleSaveName = (cat) => {
    if (!editValue.trim()) return;
    
    if (cat.isDefault) {
      // Default categories can't have their name changed
      alert('Default category names cannot be changed.');
    } else {
      onUpdateCategory(cat.key, {
        label: editValue.trim(),
        color: cat.color,
      });
    }
    
    setEditingName(null);
    setEditValue('');
  };

  const handleCancelEditName = () => {
    setEditingName(null);
    setEditValue('');
  };

  // Color editing
  const handleStartEditColor = (cat) => {
    setEditingColor(cat.key);
    setEditColorValue(cat.color);
    setEditingName(null);
  };

  const handleSelectColor = (cat, color) => {
    if (cat.isDefault) {
      onUpdateDefaultColor(cat.key, color);
    } else {
      onUpdateCategory(cat.key, {
        label: cat.label,
        color: color,
      });
    }
    setEditingColor(null);
    setEditColorValue('');
  };

  const handleCancelEditColor = () => {
    setEditingColor(null);
    setEditColorValue('');
  };

  // Delete
  const handleDelete = (cat) => {
    const message = cat.isDefault 
      ? `Delete "${cat.label}"? This will reset it to default settings.`
      : `Delete "${cat.label}"? People in this category will be moved to "Friends".`;
    
    if (window.confirm(message)) {
      if (cat.isDefault) {
        onDeleteDefaultCategory(cat.key);
      } else {
        onDeleteCategory(cat.key);
      }
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
          {allCategories.map((cat) => (
            <div key={cat.key} className={`category-item ${cat.isDefault ? 'default' : ''}`}>
              {editingName === cat.key ? (
                <div className="category-edit-inline">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="category-edit-input"
                    autoFocus
                    disabled={cat.isDefault}
                  />
                  <button className="btn btn-small btn-primary" onClick={() => handleSaveName(cat)}>Save</button>
                  <button className="btn btn-small btn-secondary" onClick={handleCancelEditName}>Cancel</button>
                </div>
              ) : editingColor === cat.key ? (
                <div className="category-edit-inline color-edit">
                  <span className="category-name">{cat.label}</span>
                  <div className="color-picker-inline">
                    {availableColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${cat.color === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleSelectColor(cat, color)}
                      />
                    ))}
                  </div>
                  <button className="btn btn-small btn-secondary" onClick={handleCancelEditColor}>Cancel</button>
                </div>
              ) : (
                <>
                  <span className="category-dot" style={{ backgroundColor: cat.color }} />
                  <span className="category-name">{cat.label}</span>
                  {cat.isDefault && <span className="category-badge">Default</span>}
                  <div className="category-actions">
                    {/* Edit name - only for custom categories */}
                    {!cat.isDefault && (
                      <button 
                        className="btn-icon" 
                        onClick={() => handleStartEditName(cat)}
                        title="Edit name"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                    {/* Edit color */}
                    <button 
                      className="btn-icon" 
                      onClick={() => handleStartEditColor(cat)}
                      title="Change color"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="4" />
                      </svg>
                    </button>
                    {/* Delete */}
                    <button 
                      className="btn-icon btn-danger" 
                      onClick={() => handleDelete(cat)}
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
