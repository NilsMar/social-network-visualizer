import { useMemo } from 'react';
import { defaultGroupColors, defaultGroupLabels } from '../data/initialData';

export function NetworkHealthDashboard({ 
  nodes, 
  links, 
  customGroups,
  defaultColorOverrides,
  onClose 
}) {
  const stats = useMemo(() => {
    // Filter out the "me" node for most calculations
    const peopleNodes = nodes.filter(n => n.id !== 'me');
    const totalPeople = peopleNodes.length;
    const totalConnections = links.length;
    
    // Calculate average strength
    const avgStrength = totalConnections > 0 
      ? (links.reduce((sum, l) => sum + (l.strength || 0), 0) / totalConnections).toFixed(1)
      : 0;
    
    // Find neglected connections (weak ties - strength <= 3)
    const neglectedConnections = links
      .filter(l => l.strength <= 3)
      .map(l => {
        const sourceId = l.source?.id || l.source;
        const targetId = l.target?.id || l.target;
        const sourcePerson = nodes.find(n => n.id === sourceId);
        const targetPerson = nodes.find(n => n.id === targetId);
        return {
          source: sourcePerson,
          target: targetPerson,
          strength: l.strength
        };
      })
      .filter(c => c.source && c.target);
    
    // Group distribution
    const groupCounts = {};
    peopleNodes.forEach(node => {
      const group = node.group || 'other';
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    });
    
    // Get group info with colors
    const allGroups = {
      family: { label: defaultGroupLabels.family, color: defaultColorOverrides?.family || defaultGroupColors.family },
      work: { label: defaultGroupLabels.work, color: defaultColorOverrides?.work || defaultGroupColors.work },
      friends: { label: defaultGroupLabels.friends, color: defaultColorOverrides?.friends || defaultGroupColors.friends },
      acquaintances: { label: defaultGroupLabels.acquaintances, color: defaultColorOverrides?.acquaintances || defaultGroupColors.acquaintances },
      ...customGroups
    };
    
    const groupDistribution = Object.entries(groupCounts)
      .filter(([key]) => key !== 'me')
      .map(([key, count]) => ({
        key,
        label: allGroups[key]?.label || key,
        color: allGroups[key]?.color || '#7a8694',
        count,
        percentage: totalPeople > 0 ? ((count / totalPeople) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.count - a.count);
    
    // Network density calculation
    // Density = actual connections / possible connections
    // For a network with n nodes, max possible connections = n * (n-1) / 2
    const maxPossibleConnections = (nodes.length * (nodes.length - 1)) / 2;
    const density = maxPossibleConnections > 0 
      ? ((totalConnections / maxPossibleConnections) * 100).toFixed(1)
      : 0;
    
    // Calculate connections per person (excluding "me")
    const connectionCounts = {};
    links.forEach(l => {
      const sourceId = l.source?.id || l.source;
      const targetId = l.target?.id || l.target;
      connectionCounts[sourceId] = (connectionCounts[sourceId] || 0) + 1;
      connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
    });
    
    const avgConnectionsPerPerson = totalPeople > 0
      ? (Object.entries(connectionCounts)
          .filter(([id]) => id !== 'me')
          .reduce((sum, [, count]) => sum + count, 0) / totalPeople).toFixed(1)
      : 0;
    
    // Find isolated people (no connections)
    const isolatedPeople = peopleNodes.filter(n => !connectionCounts[n.id]);
    
    // Strength distribution
    const strengthBuckets = {
      veryStrong: links.filter(l => l.strength >= 8).length,
      strong: links.filter(l => l.strength >= 6 && l.strength < 8).length,
      moderate: links.filter(l => l.strength >= 4 && l.strength < 6).length,
      weak: links.filter(l => l.strength >= 2 && l.strength < 4).length,
      veryWeak: links.filter(l => l.strength < 2).length,
    };
    
    return {
      totalPeople,
      totalConnections,
      avgStrength,
      neglectedConnections,
      groupDistribution,
      density,
      avgConnectionsPerPerson,
      isolatedPeople,
      strengthBuckets,
      maxPossibleConnections: Math.round(maxPossibleConnections)
    };
  }, [nodes, links, customGroups, defaultColorOverrides]);

  // Generate pie chart SVG path
  const generatePieChart = (distribution) => {
    if (distribution.length === 0) return null;
    
    const total = distribution.reduce((sum, d) => sum + d.count, 0);
    if (total === 0) return null;
    
    let cumulativeAngle = -90; // Start from top
    const radius = 60;
    const centerX = 70;
    const centerY = 70;
    
    return distribution.map((segment, index) => {
      const angle = (segment.count / total) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;
      
      // Convert angles to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Calculate arc points
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);
      
      // Large arc flag
      const largeArc = angle > 180 ? 1 : 0;
      
      // Create path
      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      
      return (
        <path
          key={segment.key}
          d={path}
          fill={segment.color}
          stroke="var(--bg-secondary)"
          strokeWidth="2"
        >
          <title>{segment.label}: {segment.count} ({segment.percentage}%)</title>
        </path>
      );
    });
  };

  const getStrengthLabel = (strength) => {
    if (strength >= 8) return 'Very Strong';
    if (strength >= 6) return 'Strong';
    if (strength >= 4) return 'Moderate';
    if (strength >= 2) return 'Weak';
    return 'Very Weak';
  };

  const getStrengthColor = (strength) => {
    if (strength >= 8) return 'var(--accent-cyan)';
    if (strength >= 6) return 'var(--accent-violet)';
    if (strength >= 4) return 'var(--accent-orange)';
    if (strength >= 2) return 'var(--accent-rose)';
    return 'var(--accent-coral)';
  };

  const allGroups = {
    family: { label: defaultGroupLabels.family, color: defaultColorOverrides?.family || defaultGroupColors.family },
    work: { label: defaultGroupLabels.work, color: defaultColorOverrides?.work || defaultGroupColors.work },
    friends: { label: defaultGroupLabels.friends, color: defaultColorOverrides?.friends || defaultGroupColors.friends },
    acquaintances: { label: defaultGroupLabels.acquaintances, color: defaultColorOverrides?.acquaintances || defaultGroupColors.acquaintances },
    ...customGroups
  };

  return (
    <div className="form-overlay">
      <div className="form-modal dashboard-modal">
        <div className="dashboard-header">
          <h2>Network Health Dashboard</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Key Metrics */}
        <div className="dashboard-metrics">
          <div className="metric-card">
            <span className="metric-value">{stats.totalPeople}</span>
            <span className="metric-label">People</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{stats.totalConnections}</span>
            <span className="metric-label">Connections</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{stats.avgStrength}</span>
            <span className="metric-label">Avg Strength</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{stats.avgConnectionsPerPerson}</span>
            <span className="metric-label">Avg Per Person</span>
          </div>
        </div>

        {/* Network Density */}
        <div className="dashboard-section">
          <h3>Network Density</h3>
          <div className="density-card">
            <div className="density-bar-container">
              <div 
                className="density-bar-fill"
                style={{ width: `${Math.min(stats.density, 100)}%` }}
              />
            </div>
            <div className="density-info">
              <span className="density-value">{stats.density}%</span>
              <span className="density-label">
                {stats.totalConnections} of {stats.maxPossibleConnections} possible connections
              </span>
            </div>
            <p className="density-description">
              {parseFloat(stats.density) < 10 && 'Your network is sparse - consider building more connections between people.'}
              {parseFloat(stats.density) >= 10 && parseFloat(stats.density) < 30 && 'Your network has moderate density - a healthy mix of tight and loose connections.'}
              {parseFloat(stats.density) >= 30 && parseFloat(stats.density) < 50 && 'Your network is well-connected with many relationships between people.'}
              {parseFloat(stats.density) >= 50 && 'Your network is highly interconnected - everyone knows everyone!'}
            </p>
          </div>
        </div>

        {/* Group Distribution */}
        <div className="dashboard-section">
          <h3>Group Distribution</h3>
          <div className="distribution-container">
            {stats.groupDistribution.length > 0 ? (
              <>
                <div className="pie-chart-container">
                  <svg viewBox="0 0 140 140" className="pie-chart">
                    {generatePieChart(stats.groupDistribution)}
                  </svg>
                </div>
                <div className="distribution-legend">
                  {stats.groupDistribution.map(group => (
                    <div key={group.key} className="distribution-item">
                      <span 
                        className="distribution-dot"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="distribution-label">{group.label}</span>
                      <span className="distribution-count">{group.count}</span>
                      <span className="distribution-percent">{group.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="empty-message">No people in your network yet.</p>
            )}
          </div>
        </div>

        {/* Connection Strength Distribution */}
        <div className="dashboard-section">
          <h3>Connection Strength Distribution</h3>
          <div className="strength-distribution">
            <div className="strength-bucket">
              <div className="strength-bucket-bar">
                <div 
                  className="strength-bucket-fill very-strong"
                  style={{ width: `${stats.totalConnections > 0 ? (stats.strengthBuckets.veryStrong / stats.totalConnections) * 100 : 0}%` }}
                />
              </div>
              <span className="strength-bucket-label">Very Strong (8-10)</span>
              <span className="strength-bucket-count">{stats.strengthBuckets.veryStrong}</span>
            </div>
            <div className="strength-bucket">
              <div className="strength-bucket-bar">
                <div 
                  className="strength-bucket-fill strong"
                  style={{ width: `${stats.totalConnections > 0 ? (stats.strengthBuckets.strong / stats.totalConnections) * 100 : 0}%` }}
                />
              </div>
              <span className="strength-bucket-label">Strong (6-7)</span>
              <span className="strength-bucket-count">{stats.strengthBuckets.strong}</span>
            </div>
            <div className="strength-bucket">
              <div className="strength-bucket-bar">
                <div 
                  className="strength-bucket-fill moderate"
                  style={{ width: `${stats.totalConnections > 0 ? (stats.strengthBuckets.moderate / stats.totalConnections) * 100 : 0}%` }}
                />
              </div>
              <span className="strength-bucket-label">Moderate (4-5)</span>
              <span className="strength-bucket-count">{stats.strengthBuckets.moderate}</span>
            </div>
            <div className="strength-bucket">
              <div className="strength-bucket-bar">
                <div 
                  className="strength-bucket-fill weak"
                  style={{ width: `${stats.totalConnections > 0 ? (stats.strengthBuckets.weak / stats.totalConnections) * 100 : 0}%` }}
                />
              </div>
              <span className="strength-bucket-label">Weak (2-3)</span>
              <span className="strength-bucket-count">{stats.strengthBuckets.weak}</span>
            </div>
            <div className="strength-bucket">
              <div className="strength-bucket-bar">
                <div 
                  className="strength-bucket-fill very-weak"
                  style={{ width: `${stats.totalConnections > 0 ? (stats.strengthBuckets.veryWeak / stats.totalConnections) * 100 : 0}%` }}
                />
              </div>
              <span className="strength-bucket-label">Very Weak (1)</span>
              <span className="strength-bucket-count">{stats.strengthBuckets.veryWeak}</span>
            </div>
          </div>
        </div>

        {/* Neglected Connections */}
        <div className="dashboard-section">
          <h3>
            Neglected Connections
            {stats.neglectedConnections.length > 0 && (
              <span className="section-badge warning">{stats.neglectedConnections.length}</span>
            )}
          </h3>
          <p className="section-description">
            Weak ties (strength 3 or below) that might need nurturing
          </p>
          {stats.neglectedConnections.length > 0 ? (
            <ul className="neglected-list">
              {stats.neglectedConnections.slice(0, 10).map((conn, idx) => (
                <li key={idx} className="neglected-item">
                  <div className="neglected-people">
                    <span 
                      className="neglected-avatar"
                      style={{ backgroundColor: allGroups[conn.source?.group]?.color || '#7a8694' }}
                    >
                      {conn.source?.name?.charAt(0).toUpperCase()}
                    </span>
                    <span className="neglected-connector">—</span>
                    <span 
                      className="neglected-avatar"
                      style={{ backgroundColor: allGroups[conn.target?.group]?.color || '#7a8694' }}
                    >
                      {conn.target?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="neglected-info">
                    <span className="neglected-names">
                      {conn.source?.name} & {conn.target?.name}
                    </span>
                    <span 
                      className="neglected-strength"
                      style={{ color: getStrengthColor(conn.strength) }}
                    >
                      Strength: {conn.strength} ({getStrengthLabel(conn.strength)})
                    </span>
                  </div>
                </li>
              ))}
              {stats.neglectedConnections.length > 10 && (
                <li className="neglected-more">
                  +{stats.neglectedConnections.length - 10} more neglected connections
                </li>
              )}
            </ul>
          ) : (
            <div className="empty-state success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
              <span>All connections are healthy!</span>
            </div>
          )}
        </div>

        {/* Isolated People */}
        {stats.isolatedPeople.length > 0 && (
          <div className="dashboard-section">
            <h3>
              Isolated People
              <span className="section-badge">{stats.isolatedPeople.length}</span>
            </h3>
            <p className="section-description">
              People with no connections in your network
            </p>
            <div className="isolated-list">
              {stats.isolatedPeople.map(person => (
                <div key={person.id} className="isolated-item">
                  <span 
                    className="isolated-avatar"
                    style={{ backgroundColor: allGroups[person.group]?.color || '#7a8694' }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="isolated-name">{person.name}</span>
                  <span className="isolated-group">{allGroups[person.group]?.label || person.group}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dashboard-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
