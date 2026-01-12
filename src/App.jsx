import { useState, useCallback } from 'react';
import { NetworkGraph } from './components/NetworkGraph';
import { NodeDetail } from './components/NodeDetail';
import { AddPersonForm } from './components/AddPersonForm';
import { AddLinkForm } from './components/AddLinkForm';
import { EditLinkForm } from './components/EditLinkForm';
import { Legend } from './components/Legend';
import { GroupPanel } from './components/GroupPanel';
import { AuthPage } from './components/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useNetworkData } from './hooks/useNetworkData';
import './App.css';

function NetworkApp() {
  const { user, isAuthenticated, logout } = useAuth();
  
  const {
    nodes,
    links,
    isLoaded,
    isSaving,
    lastSaved,
    addPerson,
    updatePerson,
    deletePerson,
    addLink,
    updateLink,
    deleteLink,
    getConnections,
    resetData,
  } = useNetworkData(isAuthenticated);

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [preselectedGroup, setPreselectedGroup] = useState(null);
  const [preselectedPerson, setPreselectedPerson] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
    setSelectedGroup(null);
  }, []);

  const handleGroupSelect = useCallback((group) => {
    setSelectedGroup(group);
    setSelectedNode(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleCloseGroupPanel = useCallback(() => {
    setSelectedGroup(null);
  }, []);

  const handleAddPerson = useCallback((person) => {
    if (person.id) {
      updatePerson(person.id, person);
    } else {
      addPerson(person);
    }
    setShowAddPerson(false);
    setEditingPerson(null);
    setPreselectedGroup(null);
  }, [addPerson, updatePerson]);

  const handleEditPerson = useCallback((person) => {
    setEditingPerson(person);
    setPreselectedGroup(null);
    setShowAddPerson(true);
  }, []);

  const handleDeletePerson = useCallback((id) => {
    if (window.confirm('Are you sure you want to remove this person from your network?')) {
      deletePerson(id);
      setSelectedNode(null);
    }
  }, [deletePerson]);

  const handleAddLink = useCallback((link) => {
    const success = addLink(link);
    if (success) {
      setShowAddLink(false);
      setPreselectedPerson(null);
    }
  }, [addLink]);

  const handleEditLink = useCallback((sourceId, targetId, currentStrength) => {
    setEditingLink({ sourceId, targetId, currentStrength });
  }, []);

  const handleUpdateLink = useCallback((sourceId, targetId, strength) => {
    updateLink(sourceId, targetId, strength);
    setEditingLink(null);
  }, [updateLink]);

  const handleDeleteLink = useCallback((sourceId, targetId) => {
    deleteLink(sourceId, targetId);
    setEditingLink(null);
  }, [deleteLink]);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset your network? This will remove all people and connections.')) {
      resetData();
      setSelectedNode(null);
      setSelectedGroup(null);
    }
  }, [resetData]);

  const handleAddPersonToGroup = useCallback((group) => {
    setPreselectedGroup(group);
    setEditingPerson(null);
    setShowAddPerson(true);
  }, []);

  const handleAddLinkFromPerson = useCallback((personId) => {
    setPreselectedPerson(personId);
    setShowAddLink(true);
  }, []);

  const handleLogout = useCallback(() => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
      setShowUserMenu(false);
    }
  }, [logout]);

  if (!isLoaded) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Loading your network...</p>
      </div>
    );
  }

  const connections = selectedNode ? getConnections(selectedNode.id) : [];

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = now - lastSaved;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastSaved.toLocaleTimeString();
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Social Network</h1>
          <span className="subtitle">Visualize your connections</span>
        </div>
        <div className="header-actions">
          {isSaving && (
            <span className="save-status saving">
              <span className="spinner-tiny" />
              Saving...
            </span>
          )}
          {!isSaving && lastSaved && (
            <span className="save-status saved">
              ✓ Saved {formatLastSaved()}
            </span>
          )}
          <button 
            className="btn btn-primary"
            onClick={() => {
              setEditingPerson(null);
              setPreselectedGroup(null);
              setShowAddPerson(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="7" r="4" />
              <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            Add Person
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setPreselectedPerson(null);
              setShowAddLink(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Add Link
          </button>
          <button 
            className="btn btn-ghost"
            onClick={handleReset}
            title="Reset network"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          
          {isAuthenticated && (
            <div className="user-menu-container">
              <button 
                className="btn btn-user"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="user-avatar">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
              </button>
              {showUserMenu && (
                <>
                  <div className="user-menu-backdrop" onClick={() => setShowUserMenu(false)} />
                  <div className="user-menu">
                    <div className="user-menu-header">
                      <span className="user-menu-name">{user?.name}</span>
                      <span className="user-menu-email">{user?.email}</span>
                    </div>
                    <div className="user-menu-divider" />
                    <button className="user-menu-item" onClick={handleLogout}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16,17 21,12 16,7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="graph-area">
          <NetworkGraph
            nodes={nodes}
            links={links}
            selectedNode={selectedNode}
            onNodeSelect={handleNodeSelect}
          />
          <Legend 
            nodes={nodes} 
            selectedGroup={selectedGroup}
            onGroupSelect={handleGroupSelect}
          />
        </div>

        {selectedGroup && (
          <GroupPanel
            group={selectedGroup}
            nodes={nodes}
            links={links}
            onClose={handleCloseGroupPanel}
            onAddPerson={handleAddPersonToGroup}
            onEditPerson={handleEditPerson}
            onDeletePerson={handleDeletePerson}
            onEditLink={handleEditLink}
            onAddLink={handleAddLinkFromPerson}
          />
        )}

        {selectedNode && !selectedGroup && (
          <NodeDetail
            node={selectedNode}
            connections={connections}
            onClose={handleCloseDetail}
            onEdit={handleEditPerson}
            onDelete={handleDeletePerson}
            onEditLink={handleEditLink}
          />
        )}
      </main>

      {showAddPerson && (
        <AddPersonForm
          onSubmit={handleAddPerson}
          onCancel={() => {
            setShowAddPerson(false);
            setEditingPerson(null);
            setPreselectedGroup(null);
          }}
          editPerson={editingPerson}
          preselectedGroup={preselectedGroup}
        />
      )}

      {showAddLink && (
        <AddLinkForm
          nodes={nodes}
          onSubmit={handleAddLink}
          onCancel={() => {
            setShowAddLink(false);
            setPreselectedPerson(null);
          }}
          preselectedPerson={preselectedPerson}
        />
      )}

      {editingLink && (
        <EditLinkForm
          sourceId={editingLink.sourceId}
          targetId={editingLink.targetId}
          currentStrength={editingLink.currentStrength}
          nodes={nodes}
          onSubmit={handleUpdateLink}
          onDelete={handleDeleteLink}
          onCancel={() => setEditingLink(null)}
        />
      )}

      <footer className="app-footer">
        <p>
          <strong>Tip:</strong> Drag nodes to rearrange • Scroll to zoom • Click a node or group for details
        </p>
      </footer>
    </div>
  );
}

function AppWithAuth() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <NetworkApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}

export default App;
