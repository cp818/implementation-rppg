# Knowlithic

Knowlithic is a web application that uses remote photoplethysmography (rPPG) technology to analyze vital signs through a webcam.

## Features

- Camera-based vital signs monitoring
- Real-time heart rate and respiratory rate measurement
- Pulse and respiratory waveform visualization
- Multiple camera selection support
- Clean, modern user interface

## Technologies Used

- HTML, CSS, JavaScript
- Rouast's VitalLens API for remote photoplethysmography
- Node.js (for local development server)

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A webcam
- Node.js (for running the development server)
- A Rouast VitalLens API key

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/cp818/implementation-rppg.git
   cd implementation-rppg
   ```

2. Start the local development server:
   ```
   node server.js
   ```

3. Open your browser and navigate to http://localhost:3001

## Usage

1. Allow camera access when prompted
2. Select your preferred camera from the dropdown if multiple cameras are available
3. Click the "Start" button to begin analysis
4. Remain still and ensure your face is clearly visible to the camera
5. View your vital signs data in real-time

## Disclaimer

Knowlithic provides measurements for informational purposes only and not for medical use. Always consult healthcare professionals for medical advice.

## License

This project is licensed under the MIT License.
