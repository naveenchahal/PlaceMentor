import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ✅ Page reload pe bhi theme persist kare
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'light') {
  document.documentElement.classList.add('light')
} else {
  document.documentElement.classList.remove('light')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

