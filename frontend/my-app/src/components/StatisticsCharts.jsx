import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../css/statisticsCharts.css';

const StatisticsCharts = ({ fileStructure, analysisResult }) => {
  // Extract language statistics from the file structure
  const getLanguageStats = () => {
    const languageCounts = {};
    
    const countLanguages = (node) => {
      if (node.type === 'file') {
        const extension = node.name.split('.').pop()?.toLowerCase();
        if (extension) {
          const language = getLanguageFromExtension(extension);
          languageCounts[language] = (languageCounts[language] || 0) + 1;
        }
      }
      
      if (node.children) {
        node.children.forEach(countLanguages);
      }
    };
    
    if (fileStructure) {
      countLanguages(fileStructure);
    }
    
    return Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Statistics by file size
  const getFileSizeStats = () => {
    const sizeRanges = [
      { range: '0-1KB', min: 0, max: 1024, count: 0 },
      { range: '1-10KB', min: 1024, max: 10240, count: 0 },
      { range: '10-100KB', min: 10240, max: 102400, count: 0 },
      { range: '100KB-1MB', min: 102400, max: 1048576, count: 0 },
      { range: '1MB+', min: 1048576, max: Infinity, count: 0 }
    ];
    
    const countBySize = (node) => {
      if (node.type === 'file') {
        // Use file size if available, otherwise use a default value
        const fileSize = node.file_size || 1024; // Default to 1KB
        
        for (const range of sizeRanges) {
          if (fileSize >= range.min && fileSize < range.max) {
            range.count++;
            break;
          }
        }
      }
      
      if (node.children) {
        node.children.forEach(countBySize);
      }
    };
    
    if (fileStructure) {
      countBySize(fileStructure);
    }
    
    return sizeRanges.filter(range => range.count > 0);
  };

  // Statistics by directory depth
  const getDepthStats = () => {
    const depthCounts = {};
    
    const countDepth = (node, depth = 0) => {
      depthCounts[depth] = (depthCounts[depth] || 0) + 1;
      
      if (node.children) {
        node.children.forEach(child => countDepth(child, depth + 1));
      }
    };
    
    if (fileStructure) {
      countDepth(fileStructure);
    }
    
    return Object.entries(depthCounts)
      .map(([depth, count]) => ({ depth: `Level ${depth}`, count: parseInt(count) }))
      .sort((a, b) => parseInt(a.depth.split(' ')[1]) - parseInt(b.depth.split(' ')[1]));
  };

  // Statistics by file type
  const getFileTypeStats = () => {
    const typeCounts = { 'File': 0, 'Directory': 0 };
    
    const countTypes = (node) => {
      typeCounts[node.type === 'file' ? 'File' : 'Directory']++;
      
      if (node.children) {
        node.children.forEach(countTypes);
      }
    };
    
    if (fileStructure) {
      countTypes(fileStructure);
    }
    
    return Object.entries(typeCounts).map(([type, count]) => ({ type, count }));
  };

  const getLanguageFromExtension = (extension) => {
    const languageMap = {
      'py': 'Python',
      'js': 'JavaScript',
      'jsx': 'React JSX',
      'ts': 'TypeScript',
      'tsx': 'React TSX',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'h': 'C Header',
      'hpp': 'C++ Header',
      'go': 'Go',
      'rb': 'Ruby',
      'php': 'PHP',
      'cs': 'C#',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'rs': 'Rust',
      'json': 'JSON',
      'xml': 'XML',
      'yml': 'YAML',
      'yaml': 'YAML',
      'toml': 'TOML',
      'md': 'Markdown',
      'txt': 'Text',
      'css': 'CSS'
    };
    return languageMap[extension] || extension.toUpperCase();
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

  const languageStats = getLanguageStats();
  const fileSizeStats = getFileSizeStats();
  const depthStats = getDepthStats();
  const fileTypeStats = getFileTypeStats();

  return (
    <div className="statistics-charts-container">
      <h3>📊 Project Statistics</h3>
      
      <div className="charts-grid">
        {/* File Distribution by Language */}
        <div className="chart-card">
          <h4>🌐 File Distribution by Language</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={languageStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ language, count }) => `${language}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {languageStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* File Distribution by Size */}
        <div className="chart-card">
          <h4>📏 File Distribution by Size</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fileSizeStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Directory Depth Distribution */}
        <div className="chart-card">
          <h4>📂 Directory Depth Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={depthStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="depth" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* File Type Distribution */}
        <div className="chart-card">
          <h4>📁 File Type Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={fileTypeStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, count }) => `${type}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {fileTypeStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="summary-stats">
        <h4>📋 Summary Statistics</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Total Files:</span>
            <span className="stat-value">{fileTypeStats.find(s => s.type === 'File')?.count || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Directories:</span>
            <span className="stat-value">{fileTypeStats.find(s => s.type === 'Directory')?.count || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Supported Languages:</span>
            <span className="stat-value">{languageStats.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Max Depth:</span>
            <span className="stat-value">{depthStats.length > 0 ? depthStats[depthStats.length - 1].depth.split(' ')[1] : 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsCharts;
