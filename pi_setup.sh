#!/bin/bash

# Regulense Pi Camera Setup Script
# Automates the setup of Raspberry Pi camera for Regulense application

set -e  # Exit on any error

echo "Regulense Pi Camera Setup Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running on Raspberry Pi
check_raspberry_pi() {
    print_step "Checking if running on Raspberry Pi..."
    
    if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
        print_error "This script must be run on a Raspberry Pi!"
        exit 1
    fi
    
    print_status "Raspberry Pi detected"
}

# Check Pi OS version and camera setup method
check_os_version() {
    print_step "Checking Pi OS version and camera setup method..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        print_status "OS: $PRETTY_NAME"
        
        # Check if it's Bookworm (12) or newer
        if [[ "$VERSION_ID" -ge "12" ]] 2>/dev/null; then
            print_status "Pi OS Bookworm or newer detected - using modern camera setup"
            CAMERA_LIB="picamera2"
            CAMERA_SETUP_METHOD="modern"
        # Check if it's Bullseye (11)
        elif [[ "$VERSION_ID" -ge "11" ]] 2>/dev/null; then
            print_status "Pi OS Bullseye detected - using picamera2"
            CAMERA_LIB="picamera2"
            CAMERA_SETUP_METHOD="bullseye"
        else
            print_warning "Older Pi OS detected. Consider upgrading to Bullseye or newer."
            CAMERA_LIB="picamera"
            CAMERA_SETUP_METHOD="legacy"
        fi
    else
        print_warning "Could not detect OS version"
        CAMERA_LIB="picamera"
        CAMERA_SETUP_METHOD="legacy"
    fi
}

# Enable camera interface (method depends on Pi OS version)
enable_camera() {
    print_step "Enabling camera interface..."
    
    if [ "$CAMERA_SETUP_METHOD" = "modern" ]; then
        # For Bookworm and newer - camera is auto-detected, no raspi-config needed
        print_status "Modern Pi OS detected - camera should be auto-detected"
        print_status "Checking if camera is detected..."
        
        # Test if camera is detected by checking for camera devices
        if [ -e /dev/video0 ] || [ -e /dev/video10 ]; then
            print_status "Camera device detected"
        else
            print_warning "Camera device not detected. Please check:"
            print_warning "1. Camera cable is properly connected"
            print_warning "2. Camera is enabled in /boot/firmware/config.txt"
            print_warning "3. Try: sudo reboot"
        fi
        
    elif [ "$CAMERA_SETUP_METHOD" = "bullseye" ]; then
        # For Bullseye - use raspi-config if available
        if command -v raspi-config >/dev/null 2>&1; then
            if raspi-config nonint get_camera 2>/dev/null | grep -q "0"; then
                print_status "Camera interface already enabled"
            else
                print_status "Enabling camera interface via raspi-config..."
                sudo raspi-config nonint do_camera 0
                REBOOT_REQUIRED=true
            fi
        else
            print_status "raspi-config not available, camera should be auto-detected"
        fi
        
    else
        # Legacy method
        if command -v raspi-config >/dev/null 2>&1; then
            if raspi-config nonint get_camera 2>/dev/null | grep -q "0"; then
                print_status "Camera interface already enabled"
            else
                print_status "Enabling camera interface..."
                sudo raspi-config nonint do_camera 0
                REBOOT_REQUIRED=true
            fi
        else
            print_error "raspi-config not available and legacy Pi OS detected"
            exit 1
        fi
    fi
}

# Update system packages
update_system() {
    print_step "Updating system packages..."
    sudo apt update
    sudo apt upgrade -y
    print_status "System updated"
}

# Install required packages
install_packages() {
    print_step "Installing required packages..."
    
    # Base packages
    sudo apt install -y \
        python3 \
        python3-pip \
        python3-flask \
        python3-pillow \
        python3-numpy \
        git \
        curl \
        wget
    
    # Camera library based on OS version
    if [ "$CAMERA_LIB" = "picamera2" ]; then
        print_status "Installing picamera2 (recommended for modern Pi OS)..."
        sudo apt install -y python3-picamera2 --no-install-recommends
        
        # Also install numpy if not already installed (needed for picamera2 array operations)
        python3 -c "import numpy" 2>/dev/null || sudo apt install -y python3-numpy
        
    else
        print_status "Installing picamera (legacy)..."
        sudo apt install -y python3-picamera
    fi
    
    # Additional Python packages
    pip3 install --user flask-cors
    
    print_status "Packages installed successfully"
}

# Download camera server script
download_server_script() {
    print_step "Setting up camera server script..."
    
    # Create directory for Regulense
    mkdir -p ~/regulense
    cd ~/regulense
    
    # If script doesn't exist locally, create it
    if [ ! -f "pi_camera_server.py" ]; then
        print_status "Camera server script will be provided separately"
        print_status "Please copy pi_camera_server.py to ~/regulense/"
    fi
    
    # Make script executable
    if [ -f "pi_camera_server.py" ]; then
        chmod +x pi_camera_server.py
        print_status "Camera server script is ready"
    fi
}

# Create systemd service
create_service() {
    print_step "Creating systemd service..."
    
    sudo tee /etc/systemd/system/regulense-camera.service > /dev/null <<EOF
[Unit]
Description=Regulense Pi Camera Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/regulense
ExecStart=/usr/bin/python3 /home/pi/regulense/pi_camera_server.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=/home/pi/.local/lib/python3.9/site-packages

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable regulense-camera.service
    
    print_status "Systemd service created and enabled"
}

# Configure firewall (if ufw is installed)
configure_firewall() {
    print_step "Configuring firewall..."
    
    if command -v ufw >/dev/null 2>&1; then
        sudo ufw allow 5001/tcp
        print_status "Firewall configured to allow port 5001"
    else
        print_status "UFW not installed, skipping firewall configuration"
    fi
}

# Test camera functionality
test_camera() {
    print_step "Testing camera functionality..."
    
    if [ "$CAMERA_LIB" = "picamera2" ]; then
        print_status "Testing with picamera2..."
        python3 -c "
from picamera2 import Picamera2
import time
try:
    print('Initializing camera...')
    picam2 = Picamera2()
    
    # Configure camera
    config = picam2.create_still_configuration()
    picam2.configure(config)
    
    print('Starting camera...')
    picam2.start()
    time.sleep(2)
    
    print('Testing capture...')
    # Test capture_array method
    array = picam2.capture_array()
    print(f'Captured image array shape: {array.shape}')
    
    picam2.stop()
    print('Camera test successful with picamera2!')
     
 except Exception as e:
     print(f'Camera test failed: {e}')
    print('Troubleshooting tips:')
    print('1. Check camera cable connection')
    print('2. Ensure camera is detected: ls /dev/video*')
    print('3. Try rebooting: sudo reboot')
    exit(1)
"
    else
        print_status "Testing with legacy picamera..."
        python3 -c "
import picamera
import time
try:
    print('Testing legacy picamera...')
    with picamera.PiCamera() as camera:
        camera.start_preview()
        time.sleep(2)
        camera.stop_preview()
    print('Camera test successful with picamera!')
 except Exception as e:
     print(f'Camera test failed: {e}')
    exit(1)
"
    fi
    
    print_status "Camera test completed successfully"
}

# Get Pi IP address
get_ip_address() {
    print_step "Getting IP address..."
    
    IP_ADDRESS=$(hostname -I | awk '{print $1}')
    print_status "Pi IP Address: $IP_ADDRESS"
    
    echo ""
    echo "Setup Complete!"
    echo "=================="
    echo "Your Raspberry Pi camera is now configured for Regulense."
    echo ""
    echo "Next Steps:"
    echo "1. Copy pi_camera_server.py to ~/regulense/ if not already done"
    echo "2. Start the camera server:"
    echo "   cd ~/regulense"
    echo "   python3 pi_camera_server.py"
    echo ""
    echo "Or use the systemd service:"
    echo "   sudo systemctl start regulense-camera"
    echo "   sudo systemctl status regulense-camera"
    echo ""
    echo "Connection Details:"
    echo "   Pi IP Address: $IP_ADDRESS"
    echo "   Camera Server Port: 5001"
    echo "   Full URL: http://$IP_ADDRESS:5001"
    echo ""
    echo "In your Regulense app, use IP: $IP_ADDRESS"
    echo ""
    echo "Camera Commands (for testing):"
    if [ "$CAMERA_LIB" = "picamera2" ]; then
        echo "   Test camera: rpicam-hello -t 2000"
        echo "   Take photo: rpicam-still -o test.jpg"
        echo "   Record video: rpicam-vid -t 10000 -o test.h264"
    else
        echo "   Test camera: raspistill -t 2000"
        echo "   Take photo: raspistill -o test.jpg"
        echo "   Record video: raspivid -t 10000 -o test.h264"
    fi
    
    if [ "$REBOOT_REQUIRED" = true ]; then
        echo ""
        print_warning "REBOOT REQUIRED to enable camera interface!"
        echo "Run: sudo reboot"
    fi
}

# Main execution
main() {
    REBOOT_REQUIRED=false
    
    check_raspberry_pi
    check_os_version
    enable_camera
    update_system
    install_packages
    download_server_script
    create_service
    configure_firewall
    test_camera
    get_ip_address
}

# Run main function
main "$@"