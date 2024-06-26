import React, { useState, useEffect } from 'react'
import imageCompression from 'browser-image-compression'
import CompareImage from 'react-compare-image'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import 'bootstrap/dist/css/bootstrap.min.css'
import Spinner from 'react-bootstrap/Spinner'
import ExifReader from 'exifreader'

const debounce = (func, delay) => {
  let debounceTimer
  return function (...args) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => func.apply(this, args), delay)
  }
}

const ImageUploader = () => {
  const [files, setFiles] = useState([])
  const [images, setImages] = useState([])
  const [resizeWidth, setResizeWidth] = useState(1024)
  const [resizeHeight, setResizeHeight] = useState(768)
  const [globalQuality, setGlobalQuality] = useState(0.5)
  const [imageFormat, setImageFormat] = useState('webp')
  const [metadata, setMetadata] = useState({})
  const [rename, setRename] = useState({})
  const [individualQualities, setIndividualQualities] = useState({})
  const [loading, setLoading] = useState({})

  const handleImageUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files)
    setFiles(uploadedFiles)

    const imagePreviews = await Promise.all(
      uploadedFiles.map(async (file) => {
        const imgMetadata = await getMetadata(file)
        return {
          original: URL.createObjectURL(file),
          processed: null,
          name: file.name,
          size: file.size,
          compressedSize: 0,
          quality: globalQuality, // Default to global quality
          metadata: imgMetadata,
        }
      })
    )

    setImages(imagePreviews)
    setMetadata(imagePreviews.reduce((acc, img) => ({ ...acc, [img.name]: img.metadata }), {}))
    uploadedFiles.forEach((file) => processImage(file, globalQuality, resizeWidth, resizeHeight))
  }

  const getMetadata = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const data = ExifReader.load(arrayBuffer)
    return {
      title: data['Title'] ? data['Title'].description : '',
      subject: data['Subject'] ? data['Subject'].description : '',
      rating: data['Rating'] ? data['Rating'].description : '',
      tags: data['Tags'] ? data['Tags'].description : '',
      comments: data['Comments'] ? data['Comments'].description : '',
      authors: data['Authors'] ? data['Authors'].description : '',
      copyright: data['Copyright'] ? data['Copyright'].description : '',
    }
  }

  const processImage = async (file, quality, width, height) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: Math.max(width, height),
      initialQuality: quality,
      useWebWorker: true,
    }

    try {
      setLoading((prevLoading) => ({ ...prevLoading, [file.name]: true }))
      const compressedFile = await imageCompression(file, options)
      const resizedFile = await resizeImage(compressedFile, width, height)
      setLoading((prevLoading) => ({ ...prevLoading, [file.name]: false }))
      setImages((prevImages) =>
        prevImages.map((img) =>
          img.name === file.name
            ? {
                ...img,
                processed: URL.createObjectURL(resizedFile),
                compressedSize: resizedFile.size,
              }
            : img
        )
      )
    } catch (error) {
      setLoading((prevLoading) => ({ ...prevLoading, [file.name]: false }))
      console.error('Error compressing image:', error)
    }
  }

  const resizeImage = (file, width, height) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: file.type }))
        }, file.type)
      }
    })
  }

  const debouncedProcessImage = debounce((file, quality, width, height) => {
    processImage(file, quality, width, height)
  }, 300)

  useEffect(() => {
    if (files.length > 0) {
      files.forEach((file) => {
        const individualQuality = individualQualities[file.name]
        if (individualQuality === undefined) {
          debouncedProcessImage(file, globalQuality, resizeWidth, resizeHeight)
        }
      })
    }
  }, [globalQuality, resizeWidth, resizeHeight, imageFormat])

  const handleGlobalQualityChange = (quality) => {
    setGlobalQuality(quality)
    files.forEach((file) => {
      const individualQuality = individualQualities[file.name]
      if (individualQuality === undefined) {
        processImage(file, quality, resizeWidth, resizeHeight)
      }
    })
  }

  const handleIndividualQualityChange = (name, quality) => {
    setIndividualQualities((prevQualities) => ({
      ...prevQualities,
      [name]: quality,
    }))
    const file = files.find((file) => file.name === name)
    if (file) {
      debouncedProcessImage(file, quality, resizeWidth, resizeHeight)
    }
  }

  const handleMetadataChange = (e, name) => {
    const { id, value } = e.target
    setMetadata((prevMetadata) => ({
      ...prevMetadata,
      [name]: {
        ...prevMetadata[name],
        [id]: value,
      },
    }))
  }

  const handleRenameChange = (e, name) => {
    const { value } = e.target
    setRename((prevRename) => ({
      ...prevRename,
      [name]: value,
    }))
  }

  const downloadImage = async (img) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const image = new Image()
    image.src = img.processed || img.original
    const quality = individualQualities[img.name] || globalQuality
    image.onload = () => {
      canvas.width = image.width
      canvas.height = image.height
      ctx.drawImage(image, 0, 0)
      canvas.toBlob(
        (blob) => {
          const filename = rename[img.name] ? `${rename[img.name]}.${imageFormat}` : img.name.replace(/\.\w+$/, `.${imageFormat}`)
          saveAs(blob, filename)
        },
        `image/${imageFormat}`,
        quality
      )
    }
  }

  const downloadAllImages = async () => {
    const zip = new JSZip()
    const promises = images.map(
      (img) =>
        new Promise((resolve) => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          const image = new Image()
          image.src = img.processed || img.original
          const quality = individualQualities[img.name] || globalQuality
          image.onload = () => {
            canvas.width = resizeWidth
            canvas.height = resizeHeight
            ctx.drawImage(image, 0, 0, resizeWidth, resizeHeight)
            canvas.toBlob(
              (blob) => {
                const filename = rename[img.name] ? `${rename[img.name]}.${imageFormat}` : img.name.replace(/\.\w+$/, `.${imageFormat}`)
                zip.file(filename, blob)
                resolve()
              },
              `image/${imageFormat}`,
              quality
            )
          }
        })
    )

    await Promise.all(promises)
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveAs(zipBlob, 'compressed_images.zip')
  }

  return (
    <div className='container d-flex'>
      <div className='image-container flex-grow-1'>
        <h1>Image Compressor and Metadata Editor</h1>
        <input type='file' accept='image/*' multiple onChange={handleImageUpload} />
        <div className='row mt-4'>
          {images.map((img) => (
            <div className='col-md-6 mb-4' key={img.name}>
              <h5>Original: {img.name}</h5>
              {img.processed && <h5>Processed: {rename[img.name] || img.name}</h5>}
              <div className='image-wrapper' style={{ width: '100%', height: '300px', position: 'relative', textAlign: 'center' }}>
                {loading[img.name] && (
                  <Spinner
                    animation='border'
                    role='status'
                    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <span className='visually-hidden'>Loading...</span>
                  </Spinner>
                )}
                {!loading[img.name] && (
                  <CompareImage
                    leftImage={img.original}
                    rightImage={img.processed || img.original}
                    sliderLineWidth={3}
                    sliderLineColor='#FF0000'
                    containerStyle={{ width: '100%', height: '100%' }}
                  />
                )}
              </div>
              <div className='mt-2'>
                <p>Original Size: {(img.size / 1024).toFixed(2)} KB</p>
                <p>Compressed Size: {(img.compressedSize / 1024).toFixed(2)} KB</p>
              </div>
              <div className='mt-2'>
                <label>Rename:</label>
                <input type='text' className='form-control' value={rename[img.name] || ''} onChange={(e) => handleRenameChange(e, img.name)} />
              </div>
              <div className='mt-2'>
                <h5>Metadata</h5>
                {['title', 'subject', 'rating', 'tags', 'comments', 'authors', 'copyright'].map((field) => (
                  <div className='form-group' key={field}>
                    <label>{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
                    <input
                      type='text'
                      className='form-control'
                      id={field}
                      value={(metadata[img.name] && metadata[img.name][field]) || ''}
                      onChange={(e) => handleMetadataChange(e, img.name)}
                    />
                  </div>
                ))}
              </div>
              <div className='mt-2'>
                <label>Quality: {Math.round((individualQualities[img.name] || globalQuality) * 100)}%</label>
                <input
                  type='range'
                  className='form-control-range'
                  min='0'
                  max='1'
                  step='0.01'
                  value={individualQualities[img.name] || globalQuality}
                  onChange={(e) => handleIndividualQualityChange(img.name, parseFloat(e.target.value))}
                />
              </div>
              <button className='btn btn-primary mt-2' onClick={() => downloadImage(img)}>
                Download Image
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className='adjustment-controls p-3' style={{ minWidth: '300px', borderLeft: '1px solid #ccc' }}>
        <div className='mt-4'>
          <h3>Resize Options</h3>
          <div className='form-group'>
            <label>Width:</label>
            <input type='number' className='form-control' value={resizeWidth} onChange={(e) => setResizeWidth(parseInt(e.target.value))} />
          </div>
          <div className='form-group'>
            <label>Height:</label>
            <input type='number' className='form-control' value={resizeHeight} onChange={(e) => setResizeHeight(parseInt(e.target.value))} />
          </div>
        </div>
        <div className='mt-4'>
          <h3>Global Compression Quality</h3>
          <div className='form-group'>
            <label>Quality: {Math.round(globalQuality * 100)}%</label>
            <input
              type='range'
              className='form-control-range'
              min='0'
              max='1'
              step='0.01'
              value={globalQuality}
              onChange={(e) => handleGlobalQualityChange(parseFloat(e.target.value))}
            />
            <input
              type='number'
              className='form-control'
              min='0'
              max='1'
              step='0.01'
              value={globalQuality}
              onChange={(e) => handleGlobalQualityChange(parseFloat(e.target.value))}
            />
          </div>
        </div>
        <div className='mt-4'>
          <h3>Image Format</h3>
          <div className='form-group'>
            <label>Format:</label>
            <select className='form-control' value={imageFormat} onChange={(e) => setImageFormat(e.target.value)}>
              <option value='jpeg'>JPEG</option>
              <option value='png'>PNG</option>
              <option value='webp'>WebP</option>
            </select>
          </div>
        </div>
        <button className='btn btn-success mt-4' onClick={downloadAllImages}>
          Download All Images
        </button>
      </div>
    </div>
  )
}

export default ImageUploader
