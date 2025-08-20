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
- Ask questions in natural language (e.g., "What does this function do?")
- Scalable architecture for large projects

---

## Expected Benefits

- **Significant reduction in developer onboarding time**
- **Minimize the cognitive overhead** when joining or auditing a project
- Enables developers to focus more on building features than understanding legacy code

---

## Architecture

<img width="800" height="auto" alt="Image" src="https://github.com/user-attachments/assets/0607f7c4-e93b-4cbc-9b0e-4c5db99d3169" />


---

## Screenshots

- **Main page - project path input box**
<img width="800" height="auto" alt="Image" src="https://github.com/user-attachments/assets/590badef-4eee-4794-91f4-f899ebb107f7" />
<br/>
<br/>
<br/>

- **File Explorer**
<img width="800" height="auto" alt="Image" src="https://github.com/user-attachments/assets/aa17bbb8-9025-4d78-b862-2d614ca0bbf0" />
<br/>
<br/>
<br/>

- **Analysis progress bar**
<img width="800" height="auto" alt="Image" src="https://github.com/user-attachments/assets/fa84d333-6dbc-49cd-8041-0b2e8a0808f5" />
<br/>
<br/>
<br/>

- **Conversation Page 1**
<img width="800" height="auto" alt="Image" src="https://github.com/user-attachments/assets/8d3f2bf3-76ae-482c-92a1-b9d7e6e22f72" />
<br/>
<br/>
<br/>

- **Conversation Page 2**
<img width="800" height="auto" alt="Image" src="https://github.com/user-attachments/assets/4d4de0df-11f2-4c16-acce-1d8cc26b9995" />
<br/>
<br/>
<br/>

- **Chatbubble - evidence nodes**
<img width="800" height="auto" alt="Image" src="https://github.com/user-attachments/assets/fbbf460c-f4ec-43d2-9021-df380239c82e" />
<br/>
<br/>
<br/>

- **Code Analysis Page**
<img width="500" height="auto" alt="Image" src="https://github.com/user-attachments/assets/dccc6da5-cc52-4d30-8ac3-d1200daf996a" />
<br/>
<br/>
<br/>

- **Statistics Page 1 - directory structure**
<img width="800" height="auto" alt="Image" src="https://github.com/user-attachments/assets/2a1b19fb-2164-4670-b79b-24987fcc3da1" />
<br/>
<br/>
<br/>

- **Statistics Page 2 - charts**
<img width="559" height="auto" alt="Image" src="https://github.com/user-attachments/assets/193d3550-b3fd-4757-8fd8-e1cd14e4d0e1" />
<br/>
<br/>
<br/>

- **Statistics Page 3 - dependency graph**
<img width="800" height="auto" alt="Image" src="https://github.com/user-attachments/assets/bb3c3bf7-fc62-4c44-b484-26bec930ee03" />

---

## Installation

```bash
git clone https://github.com/kdhProg2025_codebase_analyzer
```

### build & execute
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