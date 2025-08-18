import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../css/dependencyMap.css';

const DependencyMap = ({ fileStructure, analysisResult }) => {
  const svgRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (!fileStructure || !svgRef.current) return;

    // 기존 SVG 내용 클리어
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const width = svg.node().getBoundingClientRect().width;
    const height = 600;

    // 줌 기능 설정
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    const g = svg.append("g");

    // 노드 데이터 생성
    const nodes = [];
    const links = [];
    
    const processNode = (node, parentId = null, level = 0) => {
      const nodeId = node.path || node.name;
      const nodeData = {
        id: nodeId,
        name: node.name,
        type: node.type,
        level: level,
        path: node.path,
        children: node.children || []
      };
      
      nodes.push(nodeData);
      
      if (parentId) {
        links.push({
          source: parentId,
          target: nodeId,
          type: 'contains'
        });
      }
      
      // 의존성 링크 생성 (import/require 관계)
      if (node.type === 'file' && analysisResult?.file_analyses) {
        const fileAnalysis = analysisResult.file_analyses.find(fa => fa.file_path === node.path);
        if (fileAnalysis?.dependencies) {
          fileAnalysis.dependencies.forEach(dep => {
            const targetNode = nodes.find(n => n.path === dep);
            if (targetNode) {
              links.push({
                source: nodeId,
                target: targetNode.id,
                type: 'depends_on',
                weight: 1
              });
            }
          });
        }
      }
      
      if (node.children) {
        node.children.forEach(child => processNode(child, nodeId, level + 1));
      }
    };
    
    processNode(fileStructure);

    // 시뮬레이션 설정
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // 링크 그리기
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", d => d.type === 'depends_on' ? "#ff6b6b" : "#888")
      .attr("stroke-width", d => d.type === 'depends_on' ? 2 : 1)
      .attr("stroke-dasharray", d => d.type === 'depends_on' ? "5,5" : "none");

    // 노드 그리기
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // 노드 원형
    node.append("circle")
      .attr("r", d => d.type === 'directory' ? 20 : 15)
      .attr("fill", d => getNodeColor(d))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .on("click", (event, d) => setSelectedNode(d))
      .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke-width", 3);
        showTooltip(event, d);
      })
      .on("mouseout", function(event, d) {
        d3.select(this).attr("stroke-width", 2);
        hideTooltip();
      });

    // 노드 라벨
    node.append("text")
      .text(d => d.name.length > 10 ? d.name.substring(0, 10) + "..." : d.name)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "12px")
      .attr("fill", "#333");

    // 노드 아이콘
    node.append("text")
      .text(d => getNodeIcon(d))
      .attr("text-anchor", "middle")
      .attr("dy", "-1.5em")
      .attr("font-size", "16px");

    // 툴팁
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    function showTooltip(event, d) {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      
      const content = `
        <strong>${d.name}</strong><br/>
        타입: ${d.type === 'directory' ? '디렉토리' : '파일'}<br/>
        경로: ${d.path || '루트'}<br/>
        레벨: ${d.level}
      `;
      
      tooltip.html(content)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    }

    function hideTooltip() {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    }

    // 드래그 이벤트
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // 시뮬레이션 업데이트
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // 정리 함수
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [fileStructure, analysisResult]);

  const getNodeColor = (node) => {
    if (node.type === 'directory') return '#4CAF50';
    
    const extension = node.name.split('.').pop()?.toLowerCase();
    const colorMap = {
      'py': '#3776AB',    // Python
      'js': '#F7DF1E',    // JavaScript
      'jsx': '#61DAFB',   // React
      'ts': '#3178C6',    // TypeScript
      'tsx': '#61DAFB',   // React TSX
      'java': '#ED8B00',  // Java
      'cpp': '#00599C',   // C++
      'c': '#A8B9CC',     // C
      'go': '#00ADD8',    // Go
      'rb': '#CC342D',    // Ruby
      'php': '#777BB4',   // PHP
      'cs': '#239120',    // C#
      'swift': '#FA7343', // Swift
      'kt': '#F18E33',    // Kotlin
      'rs': '#000000',    // Rust
    };
    
    return colorMap[extension] || '#9E9E9E';
  };

  const getNodeIcon = (node) => {
    if (node.type === 'directory') return '📁';
    
    const extension = node.name.split('.').pop()?.toLowerCase();
    const iconMap = {
      'py': '🐍',
      'js': '📜',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'h': '📋',
      'hpp': '📋',
      'go': '🐹',
      'rb': '💎',
      'php': '🐘',
      'cs': '🔷',
      'swift': '🍎',
      'kt': '🤖',
      'rs': '🦀',
    };
    
    return iconMap[extension] || '📄';
  };

  const resetView = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(750).call(
        d3.zoom().transform,
        d3.zoomIdentity
      );
    }
  };

  const fitToView = () => {
    if (svgRef.current && fileStructure) {
      const svg = d3.select(svgRef.current);
      const width = svg.node().getBoundingClientRect().width;
      const height = 600;
      
      // 모든 노드의 경계 계산
      const nodes = d3.select(svgRef.current).selectAll("g").data();
      if (nodes.length > 0) {
        const xExtent = d3.extent(nodes, d => d.x);
        const yExtent = d3.extent(nodes, d => d.y);
        
        const scale = Math.min(
          (width - 100) / (xExtent[1] - xExtent[0]),
          (height - 100) / (yExtent[1] - yExtent[0])
        );
        
        const transform = d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(scale * 0.8);
        
        svg.transition().duration(750).call(
          d3.zoom().transform,
          transform
        );
      }
    }
  };

  if (!fileStructure) {
    return <div className="no-data">의존성 맵을 생성할 데이터가 없습니다.</div>;
  }

  return (
    <div className="dependency-map-container">
      <h3>🔗 프로젝트 의존성 맵</h3>
      
      <div className="map-controls">
        <button onClick={resetView} className="control-button">
          🔍 원래 크기
        </button>
        <button onClick={fitToView} className="control-button">
          📐 화면에 맞춤
        </button>
        <span className="zoom-info">줌: {zoomLevel.toFixed(2)}x</span>
      </div>
      
      <div className="legend">
        <div className="legend-item">
          <span className="legend-color directory"></span>
          <span>디렉토리</span>
        </div>
        <div className="legend-item">
          <span className="legend-color file"></span>
          <span>파일</span>
        </div>
        <div className="legend-item">
          <span className="legend-line dependency"></span>
          <span>의존성</span>
        </div>
        <div className="legend-item">
          <span className="legend-line contains"></span>
          <span>포함 관계</span>
        </div>
      </div>
      
      <div className="map-container">
        <svg ref={svgRef} width="100%" height="600"></svg>
      </div>
      
      {selectedNode && (
        <div className="node-details">
          <h4>선택된 노드 정보</h4>
          <p><strong>이름:</strong> {selectedNode.name}</p>
          <p><strong>타입:</strong> {selectedNode.type === 'directory' ? '디렉토리' : '파일'}</p>
          <p><strong>경로:</strong> {selectedNode.path || '루트'}</p>
          <p><strong>레벨:</strong> {selectedNode.level}</p>
          <button onClick={() => setSelectedNode(null)} className="close-button">
            닫기
          </button>
        </div>
      )}
    </div>
  );
};

export default DependencyMap;

