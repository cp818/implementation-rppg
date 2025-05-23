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

  // Listen for vitals events from the widget
  vitallensWidget.addEventListener('vitals', (event) => {
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
        updateStatus('Measuring vital signs...');
      }
    } catch (error) {
      console.error('Error processing vital signs data:', error);
      updateStatus('Error processing data', true);
    }
  });

  // Listen for errors from the widget
  vitallensWidget.addEventListener('error', (event) => {
    console.error('VitalLens error:', event.detail);
    updateStatus(`Error: ${event.detail.message || 'Unknown error'}`, true);
  });

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

  // Function to enumerate cameras
  async function listCameras() {
    try {
      // Reset the camera dropdown
      cameraSelect.innerHTML = '';
      cameraSelect.disabled = true;
      
      // Special handling for iOS devices
      if (isIOS()) {
        console.log('iOS device detected, using simplified camera access');
        // On iOS, we can't enumerate cameras properly before requesting access
        // Add a default camera option
        const option = document.createElement('option');
        option.value = 'default';
        option.text = 'Default Camera';
        cameraSelect.appendChild(option);
        
        selectedCameraId = 'default';
        cameraSelect.value = selectedCameraId;
        cameraSelect.disabled = true; // Disable selection on iOS as switching is problematic
        startButton.disabled = false;
        
        updateStatus('Camera ready. Click Start to begin Knowlithic analysis.');
        return;
      }
      
      // For non-iOS devices, proceed with normal enumeration
      // First request camera access to ensure we get labeled devices
      if (isMobile()) {
        // For mobile, use a simpler approach
        await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      // Get list of available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      availableCameras = devices.filter(device => device.kind === 'videoinput');
      
      if (availableCameras.length === 0) {
        // Fallback if no cameras found
        const option = document.createElement('option');
        option.value = 'default';
        option.text = 'Default Camera';
        cameraSelect.appendChild(option);
        
        selectedCameraId = 'default';
        cameraSelect.value = selectedCameraId;
        startButton.disabled = false;
        
        updateStatus('Using default camera. Click Start to begin Knowlithic analysis.');
        return;
      }
      
      // Add cameras to dropdown
      availableCameras.forEach((camera, index) => {
        const option = document.createElement('option');
        option.value = camera.deviceId;
        option.text = camera.label || `Camera ${index + 1}`;
        cameraSelect.appendChild(option);
      });
      
      // Select the first camera by default
      selectedCameraId = availableCameras[0].deviceId;
      cameraSelect.value = selectedCameraId;
      cameraSelect.disabled = false;
      startButton.disabled = false;
      
      updateStatus('Camera detected. Click Start to begin Knowlithic analysis.');
    } catch (error) {
      console.error('Error listing cameras:', error);
      // Fallback for errors
      cameraSelect.innerHTML = '';
      const option = document.createElement('option');
      option.value = 'default';
      option.text = 'Default Camera';
      cameraSelect.appendChild(option);
      
      selectedCameraId = 'default';
      cameraSelect.value = selectedCameraId;
      cameraSelect.disabled = true;
      startButton.disabled = false;
      
      updateStatus('Camera access ready. Click Start to begin.');
    }
  }
  
  // Function to start monitoring
  async function startMonitoring() {
    try {
      if (!selectedCameraId) {
        updateStatus('No camera selected', true);
        return;
      }
      
      // Update UI
      startButton.disabled = true;
      stopButton.disabled = false;
      cameraSelect.disabled = true;
      cameraStatus.style.display = 'none';
      updateStatus('Initializing Knowlithic vital signs analysis...');
      
      // Handle default camera differently
      if (selectedCameraId === 'default') {
        // For iOS and fallback cases, don't set a specific camera ID
        // and let the browser choose the default camera
        console.log('Using default camera');  
        
        // Start the widget without specifying a camera
        try {
          // Make sure we have camera permissions
          await navigator.mediaDevices.getUserMedia({ video: true });
          await vitallensWidget.startMonitoring();
          isMonitoring = true;
        } catch (mediaError) {
          console.error('Media access error:', mediaError);
          throw new Error('Camera access denied. Please allow camera access to use Knowlithic.');
        }
      } else {
        // For non-iOS devices with specific camera selection
        // Configure the VitalLens widget with selected camera
        vitallensWidget.setAttribute('camera-id', selectedCameraId);
        
        // Start the widget
        await vitallensWidget.startMonitoring();
        isMonitoring = true;
      }
      
      updateStatus('Knowlithic is analyzing your vital signs. Please keep your face visible to the camera.');
    } catch (error) {
      console.error('Error starting monitoring:', error);
      updateStatus(`Error: ${error.message || 'Failed to start monitoring'}`, true);
      resetControls();
    }
  }
  
  // Function to stop monitoring
  async function stopMonitoring() {
    try {
      // Stop the widget
      await vitallensWidget.stopMonitoring();
      isMonitoring = false;
      
      // Reset UI
      resetControls();
      updateStatus('Analysis stopped. Click Start to begin another Knowlithic session.');
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      updateStatus(`Error: ${error.message || 'Failed to stop monitoring'}`, true);
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
  
  // Initialize: list cameras when the page loads
  listCameras();
  
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
