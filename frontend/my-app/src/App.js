// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;

// frontend/src/App.js
import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  const [backendMessage, setBackendMessage] = useState('');
  const [backendData, setBackendData] = useState('');

  useEffect(() => {
    // 백엔드 기본 경로에서 메시지 가져오기
    fetch('http://localhost:8000/')
      .then(response => response.json())
      .then(data => setBackendMessage(data.message))
      .catch(error => console.error('Error fetching message:', error));

    // 백엔드 /api/data 경로에서 데이터 가져오기
    fetch('http://localhost:8000/api/data')
      .then(response => response.json())
      .then(data => setBackendData(data.data))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        {/* FastAPI 백엔드에서 온 메시지 표시 */}
        <p>Message from FastAPI: {backendMessage}</p>
        <p>Data from FastAPI: {backendData}</p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
