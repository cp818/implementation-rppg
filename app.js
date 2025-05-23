document.addEventListener('DOMContentLoaded', () => {
  // Constants
  const API_KEY = 'iwMRKQOI1S80X3b1o4RTG3koYHeGHwvJ5h6oRiTe';
  
  // Elements
  const heartRateValue = document.getElementById('heart-rate-value');
  const heartRateConfidence = document.getElementById('heart-rate-confidence');
  const respiratoryRateValue = document.getElementById('respiratory-rate-value');
  const respiratoryRateConfidence = document.getElementById('respiratory-rate-confidence');
  const statusMessage = document.getElementById('status-message');
  const cameraStatus = document.getElementById('camera-status');
  const pulseWaveformCanvas = document.getElementById('pulse-waveform');
  const respiratoryWaveformCanvas = document.getElementById('respiratory-waveform');
  const vitallensWidget = document.getElementById('vitallens-widget');
  const cameraSelect = document.getElementById('camera-select');
  const startButton = document.getElementById('start-button');
  const stopButton = document.getElementById('stop-button');

  // Canvas contexts for waveforms
  const pulseCtx = pulseWaveformCanvas.getContext('2d');
  const respiratoryCtx = respiratoryWaveformCanvas.getContext('2d');

  // Variables to store waveform data
  let pulseWaveformData = [];
  let respiratoryWaveformData = [];
  let availableCameras = [];
  let selectedCameraId = null;
  let isMonitoring = false;

  // Update UI functions
  function updateHeartRate(value, confidence) {
    if (value && !isNaN(value)) {
      heartRateValue.textContent = Math.round(value);
      const confidencePercent = Math.min(100, Math.max(0, confidence * 100));
      heartRateConfidence.style.width = `${confidencePercent}%`;
      heartRateConfidence.style.backgroundColor = getConfidenceColor(confidence);
    }
  }

  function updateRespiratoryRate(value, confidence) {
    if (value && !isNaN(value)) {
      respiratoryRateValue.textContent = value.toFixed(1);
      const confidencePercent = Math.min(100, Math.max(0, confidence * 100));
      respiratoryRateConfidence.style.width = `${confidencePercent}%`;
      respiratoryRateConfidence.style.backgroundColor = getConfidenceColor(confidence);
    }
  }

  function updateStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'var(--danger)' : 'inherit';
  }

  function getConfidenceColor(confidence) {
    if (confidence >= 0.7) {
      return 'var(--secondary)';
    } else if (confidence >= 0.4) {
      return 'orange';
    } else {
      return 'var(--danger)';
    }
  }

  // Draw waveform function
  function drawWaveform(canvas, ctx, data, color = 'var(--primary)') {
    if (!data || data.length < 2) return;

    const width = canvas.width;
    const height = canvas.height;
    const dataLength = data.length;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate min and max for normalization
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;  // Avoid division by zero
    
    // Draw path
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    for (let i = 0; i < dataLength; i++) {
      // Normalize the data to fit canvas height (leaving some padding)
      const x = (i / (dataLength - 1)) * width;
      const normalizedValue = ((data[i] - min) / range);
      const y = height - (normalizedValue * (height * 0.8) + height * 0.1);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }

  // Update waveforms
  function updateWaveforms() {
    drawWaveform(pulseWaveformCanvas, pulseCtx, pulseWaveformData, 'var(--primary)');
    drawWaveform(respiratoryWaveformCanvas, respiratoryCtx, respiratoryWaveformData, 'var(--secondary)');
  }

  // Function to set up event listeners for the widget
  function setupWidgetEventListeners() {
    // Remove any existing event listeners to prevent duplicates
    vitallensWidget.removeEventListener('vitals', handleVitalsEvent);
    vitallensWidget.removeEventListener('error', handleErrorEvent);
    
    // Add event listeners
    vitallensWidget.addEventListener('vitals', handleVitalsEvent);
    vitallensWidget.addEventListener('error', handleErrorEvent);
    
    console.log('Widget event listeners set up');
  }
  
  // Handle vitals events from the widget
  function handleVitalsEvent(event) {
    try {
      const vitalData = event.detail;
      
      // Hide camera status overlay once we start getting data
      cameraStatus.style.display = 'none';
      
      if (vitalData && vitalData.vital_signs) {
        // Update heart rate
        if (vitalData.vital_signs.heart_rate) {
          updateHeartRate(
            vitalData.vital_signs.heart_rate.value,
            vitalData.vital_signs.heart_rate.confidence
          );
        }
        
        // Update respiratory rate if available
        if (vitalData.vital_signs.respiratory_rate) {
          updateRespiratoryRate(
            vitalData.vital_signs.respiratory_rate.value,
            vitalData.vital_signs.respiratory_rate.confidence
          );
        }
        
        // Update pulse waveform
        if (vitalData.vital_signs.ppg_waveform && vitalData.vital_signs.ppg_waveform.data) {
          pulseWaveformData = vitalData.vital_signs.ppg_waveform.data.slice(-100);  // Keep last 100 points
        }
        
        // Update respiratory waveform if available
        if (vitalData.vital_signs.respiratory_waveform && vitalData.vital_signs.respiratory_waveform.data) {
          respiratoryWaveformData = vitalData.vital_signs.respiratory_waveform.data.slice(-100);  // Keep last 100 points
        }
        
        updateWaveforms();
        updateStatus('Knowlithic is analyzing your vital signs...');
      }
    } catch (error) {
      console.error('Error processing vital signs data:', error);
      updateStatus('Error processing data. Please try restarting the analysis.', true);
    }
  }
  
  // Handle error events from the widget
  function handleErrorEvent(event) {
    console.error('VitalLens error:', event.detail);
    
    // Map common error messages to more user-friendly ones
    let errorMessage = event.detail.message || 'Unknown error';
    
    if (errorMessage.includes('permission') || errorMessage.includes('Permission') || 
        errorMessage.includes('denied') || errorMessage.includes('access')) {
      errorMessage = 'Camera access is required. Please refresh the page and allow camera access when prompted.';
    }
    
    updateStatus(`Error: ${errorMessage}`, true);
    resetControls();
  }
  
  // Call to set up the event listeners when the page loads
  setupWidgetEventListeners();

  // Handle window resize to update canvas dimensions
  function resizeCanvases() {
    pulseWaveformCanvas.width = pulseWaveformCanvas.offsetWidth;
    respiratoryWaveformCanvas.width = respiratoryWaveformCanvas.offsetWidth;
    updateWaveforms();
  }

  window.addEventListener('resize', resizeCanvases);
  resizeCanvases(); // Initial size

  // Check if running on iOS device
  function isIOS() {
    return (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) || 
           (navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform));
  }

  // Check if this is a mobile device
  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Function to enumerate cameras - simplified to just enable the start button
  async function listCameras() {
    try {
      // Reset the camera dropdown
      cameraSelect.innerHTML = '';
      
      // Add a default camera option - simplest approach
      const option = document.createElement('option');
      option.value = 'default';
      option.text = 'Default Camera';
      cameraSelect.appendChild(option);
      
      // Set default selection
      selectedCameraId = 'default';
      cameraSelect.value = selectedCameraId;
      
      // On iOS or other mobile, disable camera selection as it's unreliable
      if (isIOS() || isMobile()) {
        cameraSelect.disabled = true;
      } else {
        // Try to enumerate cameras on desktop browsers
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cameras = devices.filter(device => device.kind === 'videoinput');
          
          if (cameras.length > 0) {
            // Clear the select and add all cameras
            cameraSelect.innerHTML = '';
            cameras.forEach((camera, index) => {
              const opt = document.createElement('option');
              opt.value = camera.deviceId || `camera-${index}`;
              opt.text = camera.label || `Camera ${index + 1}`;
              cameraSelect.appendChild(opt);
            });
            
            // Select first camera
            selectedCameraId = cameras[0].deviceId || 'default';
            cameraSelect.value = selectedCameraId;
            cameraSelect.disabled = false;
          }
        } catch (enumError) {
          console.log('Camera enumeration failed, using default', enumError);
          // Keep the default option if enumeration fails
        }
      }
      
      // ALWAYS enable the start button regardless of camera detection
      startButton.disabled = false;
      
      updateStatus('Ready. Click Start to begin Knowlithic analysis.');
    } catch (error) {
      console.error('Error in camera setup:', error);
      // Even if there's an error, enable the start button with default camera
      startButton.disabled = false;
      updateStatus('Camera setup ready. Click Start to begin.');
    }
  }
  
  // Function to start monitoring - extremely simplified version
  async function startMonitoring() {
    try {
      // Update UI
      startButton.disabled = true;
      stopButton.disabled = false;
      cameraSelect.disabled = true;
      cameraStatus.style.display = 'none';
      updateStatus('Initializing Knowlithic vital signs analysis...');
      
      // Simplest approach possible - create a new widget directly in place
      try {
        // First try to clean up any existing instances
        const container = document.getElementById('camera-widget-container');
        container.innerHTML = ''; // Clear everything
        
        // Create a fresh widget
        const widget = document.createElement('vitallens-webcam-widget');
        widget.id = 'vitallens-widget';
        widget.setAttribute('api-key', API_KEY);
        
        // Add to container
        container.appendChild(widget);
        
        // Get a reference to the widget
        vitallensWidget = widget;
        
        // Set up listeners
        widget.addEventListener('vitals', handleVitalsEvent);
        widget.addEventListener('error', handleErrorEvent);
        
        // Simple delay to let things initialize
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Start monitoring
        await widget.startMonitoring();
        isMonitoring = true;
        
        updateStatus('Knowlithic is analyzing your vital signs. Please keep your face visible to the camera.');
      } catch (err) {
        console.error('Error with widget:', err);
        throw new Error('Please allow camera access to use Knowlithic.');
      }
    } catch (error) {
      console.error('Error in startMonitoring:', error);
      updateStatus(`Error: ${error.message || 'Failed to start monitoring'}`, true);
      resetControls();
    }
  }
  
  // Function to stop monitoring
  async function stopMonitoring() {
    try {
      // Stop the widget
      if (vitallensWidget && typeof vitallensWidget.stopMonitoring === 'function') {
        await vitallensWidget.stopMonitoring();
      } else {
        console.warn('VitalLens widget not properly initialized when stopping');
      }
      
      // Ensure all camera tracks are stopped
      try {
        const streams = await navigator.mediaDevices.getUserMedia({ video: true });
        if (streams && streams.getTracks) {
          streams.getTracks().forEach(track => track.stop());
        }
      } catch (e) {
        // Ignore errors when trying to clean up streams
        console.log('Could not get current streams for cleanup');
      }
      
      isMonitoring = false;
      
      // Reset UI
      resetControls();
      updateStatus('Analysis stopped. Click Start to begin another Knowlithic session.');
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      // Even if there's an error, try to reset the UI
      resetControls();
      updateStatus(`Error during shutdown: ${error.message || 'Unknown error'}. You can try again.`, true);
    }
  }
  
  // Function to reset controls
  function resetControls() {
    startButton.disabled = false;
    stopButton.disabled = true;
    cameraSelect.disabled = false;
  }

  // Event listeners for camera controls
  cameraSelect.addEventListener('change', (event) => {
    selectedCameraId = event.target.value;
  });
  
  startButton.addEventListener('click', startMonitoring);
  stopButton.addEventListener('click', stopMonitoring);
  
  // Initialize the widget when the page loads - simplified version
  function initializeWidget() {
    // We'll only create a placeholder - the actual widget will be created when Start is clicked
    // This avoids early camera permission requests that might confuse users
    const widgetContainer = document.getElementById('camera-widget-container');
    
    // Create a placeholder message
    const placeholder = document.createElement('div');
    placeholder.className = 'widget-placeholder';
    placeholder.innerHTML = '<p>Click Start to begin camera access and analysis</p>';
    
    // Add the placeholder to the container
    widgetContainer.innerHTML = '';
    widgetContainer.appendChild(placeholder);
    
    console.log('Widget container prepared');
  }
  
  // Initialize cameras and widget when the page loads
  listCameras();
  initializeWidget();
  
  // Handle permission changes (e.g., if user changes camera permissions)
  navigator.permissions?.query({ name: 'camera' }).then((permissionStatus) => {
    permissionStatus.onchange = () => {
      if (permissionStatus.state === 'granted') {
        listCameras();
      } else {
        updateStatus('Camera permission denied. Please enable camera access.', true);
      }
    };
  }).catch(() => {
    // Some browsers don't support permission API, fall back to device enumeration
    navigator.mediaDevices.addEventListener('devicechange', listCameras);
  });
  
  // Initial status
  updateStatus('Initializing Knowlithic system...');
});
