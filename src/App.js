import React from 'react'
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom'
import GoogleMapsExtractor from './components/GoogleMapsExtractor'
import ImageUploader from './components/ImageUploader'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'

const App = () => {
  return (
    <Router>
      <div>
        <nav className='navbar navbar-expand-lg navbar-light bg-light'>
          <a className='navbar-brand' href='#'>
            Squoosh Clone
          </a>
          <div className='collapse navbar-collapse'>
            <ul className='navbar-nav mr-auto'>
              <li className='nav-item'>
                <Link className='nav-link' to='/maps'>
                  Google Maps Info Extractor
                </Link>
              </li>
              <li className='nav-item'>
                <Link className='nav-link' to='/compressor'>
                  Image Compressor
                </Link>
              </li>
            </ul>
          </div>
        </nav>
        <main role='main' className='container mt-4'>
          <Routes>
            <Route path='/maps' element={<GoogleMapsExtractor />} />
            <Route path='/compressor' element={<ImageUploader />} />
            <Route path='/' element={<GoogleMapsExtractor />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
