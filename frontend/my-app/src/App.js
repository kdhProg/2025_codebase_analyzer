import Header from "./components/Header";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Home from "./components/Home";
import "./App.css"
import 'bootstrap/dist/css/bootstrap.css';  // <-- need for applying bootstrap css


function App() {
  return (
    <div className="app-entire-container">
      <Header/>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home/>}/>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
