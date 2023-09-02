import { useEffect } from "react";
import {
  MemoryRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faCogs } from "@fortawesome/free-solid-svg-icons";

import "./App.css";

import Dashboard from "./pages/dashboard";
import System from "./pages/system";
import SystemSwitch from "./components/systemSwitch";
import Backwash from "./components/backwash";
import Status from "./components/status";
import NetworkConnection from "./components/networkConnection";

export default function App() {
  return (
    <Router>
      <div className="page-header">
        <div className="title">Pool Controller v0.0.1</div>
        <div className="network"><NetworkConnection /></div>
        </div>
      <Status>
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/system" element={<System />} />
          </Routes>
        </div>
        <div className="page-footer">
          <div className="page-footer-pages">
            <NavLink
              to="/"
              style={({ isActive }) => ({ color: isActive ? "#ffffff" : "" })}
            >
              <div className="footer-item touch-button">
                <FontAwesomeIcon icon={faHome} size="2xl" />
                Home
              </div>
            </NavLink>

            <NavLink
              to="/system"
              style={({ isActive }) => ({ color: isActive ? "#ffffff" : "" })}
            >
              <div className="footer-item touch-button">
                <FontAwesomeIcon icon={faCogs} size="2xl" />
                System
              </div>
            </NavLink>
          </div>

          <div className="page-footer-commands">
            <div className="footer-item">
              <Backwash />
            </div>
            <div className="footer-item">
              <SystemSwitch />
            </div>
          </div>
        </div>
      </Status>
    </Router>
  );
}
