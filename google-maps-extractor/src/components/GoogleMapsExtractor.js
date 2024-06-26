import React, { useState } from 'react'

const extractGoogleMapsInfo = (url) => {
  const latLngPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/
  const placeIdPattern = /!1s0x[^:]+:0x([^!]+)/

  const latLngMatch = url.match(latLngPattern)
  const latitude = latLngMatch ? latLngMatch[1] : 'Not found'
  const longitude = latLngMatch ? latLngMatch[2] : 'Not found'

  const placeIdMatch = url.match(placeIdPattern)
  const placeId = placeIdMatch ? decodeURIComponent(placeIdMatch[1]) : 'Not found'

  return { latitude, longitude, placeId }
}

const GoogleMapsExtractor = () => {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState({ latitude: '', longitude: '', placeId: '' })

  const handleSubmit = (event) => {
    event.preventDefault()
    const extractedInfo = extractGoogleMapsInfo(url)
    setResult(extractedInfo)
  }

  return (
    <div>
      <h1>Google Maps Info Extractor</h1>
      <form onSubmit={handleSubmit}>
        <input type='text' placeholder='Enter Google Maps URL' value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type='submit'>Extract Info</button>
      </form>
      <div className='result mt-4'>
        <h2>Extracted Information</h2>
        <p>
          <strong>Latitude:</strong> {result.latitude}
        </p>
        <p>
          <strong>Longitude:</strong> {result.longitude}
        </p>
        <p>
          <strong>Place ID:</strong> {result.placeId}
        </p>
      </div>
    </div>
  )
}

export default GoogleMapsExtractor
