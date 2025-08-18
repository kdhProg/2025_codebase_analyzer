import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../css/statisticsCharts.css';

const StatisticsCharts = ({ fileStructure, analysisResult }) => {
  // 파일 구조에서 언어별 통계 추출
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

  // 파일 크기별 통계
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
        // 파일 크기 정보가 있다면 사용, 없다면 기본값
        const fileSize = node.file_size || 1024; // 기본값 1KB
        
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

  // 디렉토리 깊이별 통계
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

  // 파일 타입별 통계
  const getFileTypeStats = () => {
    const typeCounts = { '파일': 0, '디렉토리': 0 };
    
    const countTypes = (node) => {
      typeCounts[node.type === 'file' ? '파일' : '디렉토리']++;
      
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
      <h3>📊 프로젝트 통계</h3>
      
      <div className="charts-grid">
        {/* 언어별 파일 분포 */}
        <div className="chart-card">
          <h4>🌐 언어별 파일 분포</h4>
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

        {/* 파일 크기별 분포 */}
        <div className="chart-card">
          <h4>📏 파일 크기별 분포</h4>
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

        {/* 디렉토리 깊이별 분포 */}
        <div className="chart-card">
          <h4>📂 디렉토리 깊이별 분포</h4>
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

        {/* 파일 타입별 분포 */}
        <div className="chart-card">
          <h4>📁 파일 타입별 분포</h4>
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

      {/* 요약 통계 */}
      <div className="summary-stats">
        <h4>📋 요약 통계</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">총 파일 수:</span>
            <span className="stat-value">{fileTypeStats.find(s => s.type === '파일')?.count || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">총 디렉토리 수:</span>
            <span className="stat-value">{fileTypeStats.find(s => s.type === '디렉토리')?.count || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">지원 언어 수:</span>
            <span className="stat-value">{languageStats.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">최대 깊이:</span>
            <span className="stat-value">{depthStats.length > 0 ? depthStats[depthStats.length - 1].depth.split(' ')[1] : 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsCharts;

