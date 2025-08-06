# 2025 AI-Powered Codebase Analyzer

An intelligent system that analyzes part or all of a codebase to build a knowledge graph, enabling natural language Q&A interactions powered by AI.

---

## Overview

This project provides a seamless way to understand unfamiliar codebases quickly. By generating a **knowledge graph** from source code and training an **AI agent** on that representation, users can ask **natural language questions** about the code and receive meaningful answers.

Whether onboarding a new developer or exploring a legacy system, this tool can drastically reduce the time and effort required to comprehend complex codebases.

---

## Core Features

- Analyze partial or full codebases
- Automatically generate knowledge graphs
- Train AI models on the graph data
- Ask questions in natural language (e.g., "What does this class do?", "Where is the database connection handled?")
- Scalable architecture for large projects

---

## Expected Benefits

- **Significant reduction in developer onboarding time**
- **Minimize the cognitive overhead** when joining or auditing a project
- Enables developers to focus more on building features than understanding legacy code

---

## Screenshots

> _Screenshots will be added soon_

![Screenshot 1 - Knowledge Graph Overview](./images/screenshot1.png)  
![Screenshot 2 - Natural Language Q&A Interface](./images/screenshot2.png)

---

## Installation

```bash
git clone https://github.com/kdhProg 2025_codebase_analyzer
```

### execute
```bash
docker-compose up --build
```

### dev servers
```bash
#frontend    port:3000
cd frontend/my-app
npm install
npm start

#backend   port:8000
cd backend
uvicorn main:app --reload


# DBMS(neo4j) remote interface 
localhost:7687
```