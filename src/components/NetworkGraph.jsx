import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { defaultGroupColors } from '../data/initialData';

export function NetworkGraph({ nodes, links, selectedNode, onNodeSelect, customGroups = {}, defaultColorOverrides = {}, centeredNodeId = 'me' }) {
  // Merge default and custom group colors
  const groupColors = useMemo(() => ({
    ...defaultGroupColors,
    ...defaultColorOverrides,
    ...Object.fromEntries(
      Object.entries(customGroups).map(([key, data]) => [key, data.color])
    )
  }), [customGroups, defaultColorOverrides]);
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const containerRef = useRef(null);
  const previousNodesRef = useRef(new Map()); // Store previous node positions

  // Calculate bridge nodes and their connected groups
  const bridgeData = useMemo(() => {
    const bridges = new Map(); // nodeId -> Set of connected group names (excluding own group)
    
    nodes.forEach(node => {
      if (node.group === 'me') return; // Skip "me" node
      
      // Find all groups this person is connected to (excluding their own and 'me')
      const connectedGroups = new Set();
      links.forEach(link => {
        const sourceId = link.source?.id || link.source;
        const targetId = link.target?.id || link.target;
        
        if (sourceId === node.id) {
          const targetNode = nodes.find(n => n.id === targetId);
          if (targetNode && targetNode.group !== 'me' && targetNode.group !== node.group) {
            connectedGroups.add(targetNode.group);
          }
        } else if (targetId === node.id) {
          const sourceNode = nodes.find(n => n.id === sourceId);
          if (sourceNode && sourceNode.group !== 'me' && sourceNode.group !== node.group) {
            connectedGroups.add(sourceNode.group);
          }
        }
      });
      
      // If connected to groups other than their own, they're a bridge
      if (connectedGroups.size > 0) {
        bridges.set(node.id, connectedGroups);
      }
    });
    
    return bridges;
  }, [nodes, links]);

  // Calculate node sizes based on connection count
  const getNodeSize = useCallback((nodeId) => {
    const connectionCount = links.filter(
      (l) => l.source === nodeId || l.target === nodeId ||
             l.source?.id === nodeId || l.target?.id === nodeId
    ).length;
    // Base size 12, grows with connections, max 30
    // Centered node gets the largest size
    if (nodeId === centeredNodeId) return 32;
    return Math.min(12 + connectionCount * 2, 28);
  }, [links, centeredNodeId]);

  // Get initial position for a node based on its group
  const getInitialPosition = useCallback((node, width, height) => {
    // Centered node always goes to center
    if (node.id === centeredNodeId) {
      return { x: width / 2, y: height / 2 };
    }
    
    // Check if we have a previous position for this node (but not when switching center)
    const prevPos = previousNodesRef.current.get(node.id);
    if (prevPos) {
      return { x: prevPos.x, y: prevPos.y };
    }
    
    // Group-based positioning with some randomness
    const groupOffsets = {
      me: { x: 0, y: 0 },
      family: { x: -180, y: -120 },
      work: { x: 180, y: -120 },
      friends: { x: 0, y: 120 },
      acquaintances: { x: 0, y: 180 },
    };
    
    // For custom groups, spread them around
    let offset = groupOffsets[node.group];
    if (!offset) {
      // Generate a position based on hash of group name for consistency
      const customGroupKeys = Object.keys(customGroups);
      const idx = customGroupKeys.indexOf(node.group);
      const angle = (idx + 1) * (Math.PI / 3); // Spread around in 60-degree increments
      const radius = 160;
      offset = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    }
    
    const randomOffset = 50; // Add some randomness so nodes don't stack
    
    return {
      x: width / 2 + offset.x + (Math.random() - 0.5) * randomOffset,
      y: height / 2 + offset.y + (Math.random() - 0.5) * randomOffset,
    };
  }, [customGroups, centeredNodeId]);

  useEffect(() => {
    if (!nodes.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Set up SVG dimensions
    svg.attr('width', width).attr('height', height);

    // Create a group for zooming/panning
    const g = svg.append('g');

    // Set up zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Clear previous positions when center changes to allow fresh layout
    previousNodesRef.current.clear();

    // Create deep copies with initial positions
    const nodesCopy = nodes.map(d => {
      const pos = getInitialPosition(d, width, height);
      return { ...d, x: pos.x, y: pos.y };
    });
    const linksCopy = links.map(d => ({ ...d }));

    // Create the force simulation with stronger clustering
    const simulation = d3.forceSimulation(nodesCopy)
      .force('link', d3.forceLink(linksCopy)
        .id(d => d.id)
        .distance(d => {
          // Stronger ties = shorter distance
          const baseDistance = 100;
          return baseDistance - (d.strength * 6);
        })
        .strength(d => d.strength / 12)
      )
      .force('charge', d3.forceManyBody()
        .strength(-350)
        .distanceMax(450)
      )
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide().radius(d => getNodeSize(d.id) + 15))
      // Stronger group clustering forces - centered node stays in middle
      .force('x', d3.forceX(d => {
        if (d.id === centeredNodeId) return width / 2;
        const groupOffsets = {
          family: -180,
          work: 180,
          friends: 0,
          acquaintances: 0,
        };
        return width / 2 + (groupOffsets[d.group] || 0);
      }).strength(d => d.id === centeredNodeId ? 0.5 : 0.12))
      .force('y', d3.forceY(d => {
        if (d.id === centeredNodeId) return height / 2;
        const groupOffsets = {
          family: -120,
          work: -120,
          friends: 120,
          acquaintances: 180,
        };
        return height / 2 + (groupOffsets[d.group] || 0);
      }).strength(d => d.id === centeredNodeId ? 0.5 : 0.12));

    simulationRef.current = simulation;

    // Store node positions when simulation updates
    simulation.on('tick.store', () => {
      nodesCopy.forEach(node => {
        previousNodesRef.current.set(node.id, { x: node.x, y: node.y });
      });
    });

    // Create definitions for gradients and filters
    const defs = svg.append('defs');
    
    // Create muted gradient for each group (reduced saturation/opacity)
    Object.entries(groupColors).forEach(([group, color]) => {
      const gradient = defs.append('radialGradient')
        .attr('id', `gradient-${group}`)
        .attr('cx', '30%')
        .attr('cy', '30%')
        .attr('r', '70%');
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d3.color(color).brighter(0.5))
        .attr('stop-opacity', 0.9);
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.75);
    });

    // Glow filter for "me" node
    const glowFilter = defs.append('filter')
      .attr('id', 'glow-me')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%');
    
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '5')
      .attr('result', 'coloredBlur');
    
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Bridge node glow filter
    const bridgeGlow = defs.append('filter')
      .attr('id', 'glow-bridge')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    bridgeGlow.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');
    
    const bridgeMerge = bridgeGlow.append('feMerge');
    bridgeMerge.append('feMergeNode').attr('in', 'coloredBlur');
    bridgeMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Drop shadow filter
    const dropShadow = defs.append('filter')
      .attr('id', 'drop-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    dropShadow.append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '3')
      .attr('flood-color', 'rgba(0,0,0,0.12)');

    // Create unique bridge gradients for each bridge node
    bridgeData.forEach((connectedGroups, nodeId) => {
      const groupsArray = Array.from(connectedGroups);
      const gradient = defs.append('linearGradient')
        .attr('id', `bridge-gradient-${nodeId}`)
        .attr('gradientUnits', 'userSpaceOnUse');
      
      if (groupsArray.length === 1) {
        // Single connected group - solid color
        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', groupColors[groupsArray[0]]);
        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', groupColors[groupsArray[0]]);
      } else {
        // Multiple groups - create segments
        const segmentSize = 100 / (groupsArray.length * 2);
        groupsArray.forEach((group, i) => {
          const offset1 = (i * 2) * segmentSize;
          const offset2 = (i * 2 + 1) * segmentSize;
          gradient.append('stop')
            .attr('offset', `${offset1}%`)
            .attr('stop-color', groupColors[group]);
          gradient.append('stop')
            .attr('offset', `${offset2}%`)
            .attr('stop-color', groupColors[group]);
        });
        // Complete the pattern
        groupsArray.forEach((group, i) => {
          const offset1 = 50 + (i * 2) * segmentSize;
          const offset2 = 50 + (i * 2 + 1) * segmentSize;
          if (offset2 <= 100) {
            gradient.append('stop')
              .attr('offset', `${offset1}%`)
              .attr('stop-color', groupColors[group]);
            gradient.append('stop')
              .attr('offset', `${offset2}%`)
              .attr('stop-color', groupColors[group]);
          }
        });
      }
    });

    // Create links with curved paths for cross-group connections
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(linksCopy)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', d => 0.5 + (d.strength / 20))
      .attr('stroke-width', d => Math.max(1.5, d.strength / 2.5))
      .attr('stroke-linecap', 'round');

    // Create node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodesCopy)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Add outer ring for bridge nodes with group-specific colors
    node.filter(d => bridgeData.has(d.id))
      .append('circle')
      .attr('class', 'bridge-ring')
      .attr('r', d => getNodeSize(d.id) + 6)
      .attr('fill', 'none')
      .attr('stroke', d => `url(#bridge-gradient-${d.id})`)
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '6,4')
      .attr('opacity', 0.9);

    // Add main circles to nodes
    node.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => getNodeSize(d.id))
      .attr('fill', d => `url(#gradient-${d.group})`)
      .attr('stroke', d => d.id === selectedNode?.id ? '#1e293b' : 'rgba(255,255,255,0.8)')
      .attr('stroke-width', d => d.id === centeredNodeId ? 3 : 2)
      .attr('filter', d => {
        if (d.id === centeredNodeId) return 'url(#glow-me)';
        if (bridgeData.has(d.id)) return 'url(#glow-bridge)';
        return 'url(#drop-shadow)';
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeSelect(d);
      })
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', getNodeSize(d.id) * 1.15)
          .attr('stroke-width', d.id === centeredNodeId ? 4 : 3);
        
        // Also scale the bridge ring if present
        d3.select(this.parentNode).select('.bridge-ring')
          .transition()
          .duration(200)
          .attr('r', getNodeSize(d.id) * 1.15 + 6);
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', getNodeSize(d.id))
          .attr('stroke-width', d.id === centeredNodeId ? 3 : 2);
        
        d3.select(this.parentNode).select('.bridge-ring')
          .transition()
          .duration(200)
          .attr('r', getNodeSize(d.id) + 6);
      });

    // Add inner icon/initial for nodes
    node.append('text')
      .attr('class', 'node-initial')
      .text(d => d.name.charAt(0).toUpperCase())
      .attr('x', 0)
      .attr('y', d => d.id === centeredNodeId ? 1 : 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'white')
      .attr('font-size', d => d.id === centeredNodeId ? '16px' : '12px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.3)');

    // Add labels below nodes
    node.append('text')
      .attr('class', 'node-label')
      .text(d => d.name)
      .attr('x', 0)
      .attr('y', d => getNodeSize(d.id) + 16)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', d => d.id === centeredNodeId ? '13px' : '11px')
      .attr('font-weight', d => d.id === centeredNodeId ? '600' : '500')
      .attr('pointer-events', 'none');

    // Add bridge indicator label
    node.filter(d => bridgeData.has(d.id))
      .append('text')
      .attr('class', 'bridge-label')
      .text('⬡')
      .attr('x', d => getNodeSize(d.id) - 2)
      .attr('y', d => -getNodeSize(d.id) + 4)
      .attr('font-size', '10px')
      .attr('fill', d => {
        const groups = bridgeData.get(d.id);
        if (groups && groups.size > 0) {
          return groupColors[Array.from(groups)[0]];
        }
        return '#64748b';
      })
      .attr('pointer-events', 'none');

    // Add tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'network-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(255, 255, 255, 0.98)')
      .style('color', '#334155')
      .style('padding', '10px 14px')
      .style('border-radius', '10px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 8px 24px rgba(0,0,0,0.12)')
      .style('border', '1px solid #e2e8f0');

    node.selectAll('.node-circle')
      .on('mouseenter.tooltip', function(event, d) {
        const connectedGroups = bridgeData.get(d.id);
        const isBridge = connectedGroups && connectedGroups.size > 0;
        
        let bridgeHtml = '';
        if (isBridge) {
          const groupsList = Array.from(connectedGroups)
            .map(g => `<span style="color: ${groupColors[g]}; font-weight: 500;">${g}</span>`)
            .join(', ');
          bridgeHtml = `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b;">⬡ Connects to: ${groupsList}</div>`;
        }
        
        tooltip
          .style('visibility', 'visible')
          .html(`
            <div style="font-weight: 600; margin-bottom: 4px;">${d.name}</div>
            <div style="color: ${groupColors[d.group]}; font-size: 11px; text-transform: capitalize;">${d.group}</div>
            ${bridgeHtml}
          `);
      })
      .on('mousemove.tooltip', function(event) {
        tooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 15) + 'px');
      })
      .on('mouseleave.tooltip', function() {
        tooltip.style('visibility', 'hidden');
      });

    // Function to calculate curved path for links
    const linkPath = (d) => {
      const sourceNode = typeof d.source === 'object' ? d.source : nodesCopy.find(n => n.id === d.source);
      const targetNode = typeof d.target === 'object' ? d.target : nodesCopy.find(n => n.id === d.target);
      
      if (!sourceNode || !targetNode) return '';
      
      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const dr = Math.sqrt(dx * dx + dy * dy);
      
      // Check if this is a cross-group link (excluding 'me')
      const isCrossGroup = sourceNode.group !== targetNode.group && 
                          sourceNode.group !== 'me' && 
                          targetNode.group !== 'me';
      
      if (isCrossGroup && dr > 50) {
        // Curved path for cross-group connections
        const curve = dr * 0.2;
        return `M${sourceNode.x},${sourceNode.y} Q${(sourceNode.x + targetNode.x) / 2 + curve},${(sourceNode.y + targetNode.y) / 2 - curve} ${targetNode.x},${targetNode.y}`;
      }
      
      // Straight line for same-group connections
      return `M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`;
    };

    // Update positions on each tick
    simulation.on('tick', () => {
      link.attr('d', linkPath);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Click on background to deselect
    svg.on('click', () => {
      onNodeSelect(null);
    });

    // Apply stored zoom transform or set initial
    const initialScale = 0.85;
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(width * (1 - initialScale) / 2, height * (1 - initialScale) / 2)
      .scale(initialScale));

    // Run simulation to completion immediately (no animation)
    simulation.stop();
    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }
    
    // Update positions after simulation completes
    link.attr('d', linkPath);
    node.attr('transform', d => `translate(${d.x},${d.y})`);

    // Cleanup
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [nodes, links, getNodeSize, onNodeSelect, bridgeData, getInitialPosition, centeredNodeId]);

  // Update selected node styling and highlight connected links
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    
    // Update node circles
    svg.selectAll('.node-circle')
      .attr('stroke', d => d.id === selectedNode?.id ? '#1e293b' : 'rgba(255,255,255,0.8)')
      .attr('stroke-width', d => {
        if (d.id === selectedNode?.id) return 4;
        return d.id === centeredNodeId ? 3 : 2;
      });
    
    // Update links - highlight connections to selected node
    svg.selectAll('.links path')
      .attr('stroke', d => {
        if (!selectedNode) return '#94a3b8';
        const sourceId = d.source?.id || d.source;
        const targetId = d.target?.id || d.target;
        if (sourceId === selectedNode.id || targetId === selectedNode.id) {
          return groupColors[selectedNode.group];
        }
        return '#94a3b8';
      })
      .attr('stroke-opacity', d => {
        if (!selectedNode) return 0.5 + (d.strength / 20);
        const sourceId = d.source?.id || d.source;
        const targetId = d.target?.id || d.target;
        if (sourceId === selectedNode.id || targetId === selectedNode.id) {
          return 0.9;
        }
        return 0.2;
      })
      .attr('stroke-width', d => {
        if (!selectedNode) return Math.max(1.5, d.strength / 2.5);
        const sourceId = d.source?.id || d.source;
        const targetId = d.target?.id || d.target;
        if (sourceId === selectedNode.id || targetId === selectedNode.id) {
          return Math.max(2.5, d.strength / 2);
        }
        return Math.max(1, d.strength / 3);
      });
  }, [selectedNode]);

  return (
    <div ref={containerRef} className="network-graph-container">
      <svg ref={svgRef} />
      {bridgeData.size > 0 && (
        <div className="bridge-legend">
          <span className="bridge-icon">⬡</span>
          <span>Bridge connector</span>
        </div>
      )}
    </div>
  );
}
