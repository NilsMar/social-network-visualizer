import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';
import { initialNodes, initialLinks } from '../data/initialData';

export function useNetworkData(isAuthenticated) {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
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
          if (data.updatedAt) {
            setLastSaved(new Date(data.updatedAt));
          }
        } catch (err) {
          console.error('Failed to load network data:', err);
          // Fallback to initial data
          setNodes(initialNodes);
          setLinks(initialLinks);
        }
      } else {
        // Not authenticated - use localStorage for demo
        const savedData = localStorage.getItem('social-network-data');
        if (savedData) {
          try {
            const { nodes: savedNodes, links: savedLinks } = JSON.parse(savedData);
            setNodes(savedNodes);
            setLinks(savedLinks);
          } catch (e) {
            setNodes(initialNodes);
            setLinks(initialLinks);
          }
        } else {
          setNodes(initialNodes);
          setLinks(initialLinks);
        }
      }
      setIsLoaded(true);
    };

    loadData();
  }, [isAuthenticated]);

  // Auto-save with debounce when data changes
  const saveToServer = useCallback(async (nodesToSave, linksToSave) => {
    if (!isAuthenticated) {
      // Save to localStorage for non-authenticated users
      localStorage.setItem('social-network-data', JSON.stringify({ 
        nodes: nodesToSave, 
        links: linksToSave 
      }));
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.saveNetworkData(nodesToSave, linksToSave);
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
      saveToServer(nodes, links);
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, links, isLoaded, saveToServer]);

  // Force save (for immediate saves)
  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveToServer(nodes, links);
  }, [nodes, links, saveToServer]);

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
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to reset network data:', err);
      }
    } else {
      setNodes(initialNodes);
      setLinks(initialLinks);
      localStorage.setItem('social-network-data', JSON.stringify({ 
        nodes: initialNodes, 
        links: initialLinks 
      }));
    }
  }, [isAuthenticated]);

  return {
    nodes,
    links,
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
  };
}
