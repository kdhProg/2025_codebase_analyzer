import Header from "./components/Header";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Home from "./components/Home";
import "./App.css"
import 'bootstrap/dist/css/bootstrap.css';  // <-- need for applying bootstrap css
import ProjectAnalysis from "./components/ProjectAnalysis";
import CodeInterpretation from "./components/CodeInterpretation";


function App() {
  return (
    <div className="app-entire-container">
      <Header/>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/code-interpretation" element={<CodeInterpretation/>}/>
          <Route path="/project-analysis" element={<ProjectAnalysis/>}/>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
