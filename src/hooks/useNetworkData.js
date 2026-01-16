import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';
import { initialNodes, initialLinks, defaultGroupColors, defaultGroupLabels } from '../data/initialData';

export function useNetworkData(isAuthenticated) {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [customGroups, setCustomGroups] = useState({});
  const [defaultColorOverrides, setDefaultColorOverrides] = useState({});
  const [deletedDefaultCategories, setDeletedDefaultCategories] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimeoutRef = useRef(null);
  const pendingChangesRef = useRef(false);

  // Load data on mount or auth change
  useEffect(() => {
    const loadData = async () => {
      setIsLoaded(false);
      
      if (isAuthenticated) {
        // Load from server
        try {
          const data = await apiClient.getNetworkData();
          setNodes(data.nodes || []);
          setLinks(data.links || []);
          setCustomGroups(data.customGroups || {});
          setDefaultColorOverrides(data.defaultColorOverrides || {});
          setDeletedDefaultCategories(data.deletedDefaultCategories || []);
          if (data.updatedAt) {
            setLastSaved(new Date(data.updatedAt));
          }
        } catch (err) {
          console.error('Failed to load network data:', err);
          // Fallback to initial data
          setNodes(initialNodes);
          setLinks(initialLinks);
          setCustomGroups({});
          setDefaultColorOverrides({});
          setDeletedDefaultCategories([]);
        }
      } else {
        // Not authenticated - use localStorage for demo
        const savedData = localStorage.getItem('social-network-data');
        if (savedData) {
          try {
            const { nodes: savedNodes, links: savedLinks, customGroups: savedGroups, defaultColorOverrides: savedOverrides, deletedDefaultCategories: savedDeleted } = JSON.parse(savedData);
            setNodes(savedNodes);
            setLinks(savedLinks);
            setCustomGroups(savedGroups || {});
            setDefaultColorOverrides(savedOverrides || {});
            setDeletedDefaultCategories(savedDeleted || []);
          } catch (e) {
            setNodes(initialNodes);
            setLinks(initialLinks);
            setCustomGroups({});
            setDefaultColorOverrides({});
            setDeletedDefaultCategories([]);
          }
        } else {
          setNodes(initialNodes);
          setLinks(initialLinks);
          setCustomGroups({});
          setDefaultColorOverrides({});
          setDeletedDefaultCategories([]);
        }
      }
      setIsLoaded(true);
    };

    loadData();
  }, [isAuthenticated]);

  // Auto-save with debounce when data changes
  const saveToServer = useCallback(async (nodesToSave, linksToSave, groupsToSave, colorOverridesToSave, deletedDefaultsToSave) => {
    if (!isAuthenticated) {
      // Save to localStorage for non-authenticated users
      localStorage.setItem('social-network-data', JSON.stringify({ 
        nodes: nodesToSave, 
        links: linksToSave,
        customGroups: groupsToSave,
        defaultColorOverrides: colorOverridesToSave,
        deletedDefaultCategories: deletedDefaultsToSave
      }));
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.saveNetworkData(nodesToSave, linksToSave, groupsToSave, colorOverridesToSave, deletedDefaultsToSave);
      setLastSaved(new Date());
      pendingChangesRef.current = false;
    } catch (err) {
      console.error('Failed to save network data:', err);
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated]);

  // Debounced save effect
  useEffect(() => {
    if (!isLoaded || (nodes.length === 0 && links.length === 0)) return;

    // Mark that we have pending changes
    pendingChangesRef.current = true;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1.5 seconds after last change)
    saveTimeoutRef.current = setTimeout(() => {
      saveToServer(nodes, links, customGroups, defaultColorOverrides, deletedDefaultCategories);
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, links, customGroups, defaultColorOverrides, deletedDefaultCategories, isLoaded, saveToServer]);

  // Force save (for immediate saves)
  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveToServer(nodes, links, customGroups, defaultColorOverrides, deletedDefaultCategories);
  }, [nodes, links, customGroups, defaultColorOverrides, deletedDefaultCategories, saveToServer]);

  // Add a new person
  const addPerson = useCallback((person) => {
    const newPerson = {
      ...person,
      id: person.id || `person-${Date.now()}`,
    };
    setNodes((prev) => [...prev, newPerson]);
    return newPerson.id;
  }, []);

  // Update an existing person
  const updatePerson = useCallback((id, updates) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, ...updates } : node))
    );
  }, []);

  // Delete a person and their connections
  const deletePerson = useCallback((id) => {
    if (id === 'me') {
      alert("You can't delete yourself from your own network!");
      return;
    }
    setNodes((prev) => prev.filter((node) => node.id !== id));
    setLinks((prev) =>
      prev.filter((link) => {
        const sourceId = link.source?.id || link.source;
        const targetId = link.target?.id || link.target;
        return sourceId !== id && targetId !== id;
      })
    );
  }, []);

  // Add a new relationship
  const addLink = useCallback((link) => {
    // Check if link already exists
    const exists = links.some((l) => {
      const lSourceId = l.source?.id || l.source;
      const lTargetId = l.target?.id || l.target;
      return (
        (lSourceId === link.source && lTargetId === link.target) ||
        (lSourceId === link.target && lTargetId === link.source)
      );
    });
    if (exists) {
      alert('This relationship already exists!');
      return false;
    }
    setLinks((prev) => [...prev, link]);
    return true;
  }, [links]);

  // Update link strength
  const updateLink = useCallback((source, target, strength) => {
    setLinks((prev) =>
      prev.map((link) => {
        const linkSourceId = link.source?.id || link.source;
        const linkTargetId = link.target?.id || link.target;
        if (
          (linkSourceId === source && linkTargetId === target) ||
          (linkSourceId === target && linkTargetId === source)
        ) {
          return { ...link, strength };
        }
        return link;
      })
    );
  }, []);

  // Delete a relationship
  const deleteLink = useCallback((source, target) => {
    setLinks((prev) =>
      prev.filter((link) => {
        const linkSourceId = link.source?.id || link.source;
        const linkTargetId = link.target?.id || link.target;
        return !(
          (linkSourceId === source && linkTargetId === target) ||
          (linkSourceId === target && linkTargetId === source)
        );
      })
    );
  }, []);

  // Get connections for a specific person
  const getConnections = useCallback(
    (personId) => {
      const connectedLinks = links.filter((link) => {
        const sourceId = link.source?.id || link.source;
        const targetId = link.target?.id || link.target;
        return sourceId === personId || targetId === personId;
      });
      return connectedLinks.map((link) => {
        const sourceId = link.source?.id || link.source;
        const targetId = link.target?.id || link.target;
        const otherId = sourceId === personId ? targetId : sourceId;
        const otherPerson = nodes.find((n) => n.id === otherId);
        return {
          person: otherPerson,
          strength: link.strength,
        };
      }).filter(c => c.person);
    },
    [nodes, links]
  );

  // Reset to initial/default data
  const resetData = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const data = await apiClient.resetNetworkData();
        setNodes(data.nodes);
        setLinks(data.links);
        setCustomGroups({});
        setDefaultColorOverrides({});
        setDeletedDefaultCategories([]);
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to reset network data:', err);
      }
    } else {
      setNodes(initialNodes);
      setLinks(initialLinks);
      setCustomGroups({});
      setDefaultColorOverrides({});
      setDeletedDefaultCategories([]);
      localStorage.setItem('social-network-data', JSON.stringify({ 
        nodes: initialNodes, 
        links: initialLinks,
        customGroups: {},
        defaultColorOverrides: {},
        deletedDefaultCategories: []
      }));
    }
  }, [isAuthenticated]);

  // Add a custom category
  const addCategory = useCallback((key, categoryData) => {
    setCustomGroups(prev => ({
      ...prev,
      [key]: categoryData
    }));
  }, []);

  // Update a custom category
  const updateCategory = useCallback((key, categoryData) => {
    setCustomGroups(prev => ({
      ...prev,
      [key]: { ...prev[key], ...categoryData }
    }));
  }, []);

  // Delete a custom category (moves people to 'friends')
  const deleteCategory = useCallback((key) => {
    // Move all people in this category to 'friends'
    setNodes(prev => prev.map(node => 
      node.group === key ? { ...node, group: 'friends' } : node
    ));
    // Remove the category
    setCustomGroups(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // Update a default category's color
  const updateDefaultColor = useCallback((key, color) => {
    setDefaultColorOverrides(prev => ({
      ...prev,
      [key]: color
    }));
  }, []);

  // Delete a default category (hides it and moves people to 'friends')
  const deleteDefaultCategory = useCallback((key) => {
    // Move all people in this category to 'friends'
    setNodes(prev => prev.map(node => 
      node.group === key ? { ...node, group: 'friends' } : node
    ));
    // Add to deleted list
    setDeletedDefaultCategories(prev => 
      prev.includes(key) ? prev : [...prev, key]
    );
    // Remove any color override
    setDefaultColorOverrides(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // Restore a deleted default category
  const restoreDefaultCategory = useCallback((key) => {
    setDeletedDefaultCategories(prev => prev.filter(k => k !== key));
  }, []);

  // Get all groups (default + custom)
  const getAllGroups = useCallback(() => {
    return {
      me: { label: 'Me', color: defaultColorOverrides.me || defaultGroupColors.me },
      family: { label: 'Family', color: defaultColorOverrides.family || defaultGroupColors.family },
      work: { label: 'Work', color: defaultColorOverrides.work || defaultGroupColors.work },
      friends: { label: 'Friends', color: defaultColorOverrides.friends || defaultGroupColors.friends },
      acquaintances: { label: 'Acquaintances', color: defaultColorOverrides.acquaintances || defaultGroupColors.acquaintances },
      ...customGroups
    };
  }, [customGroups, defaultColorOverrides]);

  // Bulk add people
  const bulkAddPeople = useCallback((peopleData) => {
    const { names, group, connectToMe, connectionStrength } = peopleData;
    const newNodes = [];
    const newLinks = [];

    names.forEach(name => {
      const id = `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      newNodes.push({
        id,
        name,
        group,
        details: '',
      });

      if (connectToMe) {
        newLinks.push({
          source: 'me',
          target: id,
          strength: connectionStrength || 5,
        });
      }
    });

    setNodes(prev => [...prev, ...newNodes]);
    if (newLinks.length > 0) {
      setLinks(prev => [...prev, ...newLinks]);
    }

    return newNodes.length;
  }, []);

  return {
    nodes,
    links,
    customGroups,
    defaultColorOverrides,
    isLoaded,
    isSaving,
    lastSaved,
    hasPendingChanges: pendingChangesRef.current,
    addPerson,
    updatePerson,
    deletePerson,
    addLink,
    updateLink,
    deleteLink,
    getConnections,
    resetData,
    forceSave,
    addCategory,
    updateCategory,
    deleteCategory,
    updateDefaultColor,
    deleteDefaultCategory,
    deletedDefaultCategories,
    restoreDefaultCategory,
    getAllGroups,
    bulkAddPeople,
  };
}
