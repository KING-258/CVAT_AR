import cv2
import numpy as np
from flask import Flask, Response
from flask_cors import CORS
from evdev import UInput, ecodes as e

app = Flask(__name__)
CORS(app)

# --------------------------------------------------------------------
# Setup: create a virtual keyboard device
# --------------------------------------------------------------------
ui = UInput()

def press_key(key):
    """Simulate a keyboard key press using evdev."""
    key_map = {
        "left": e.KEY_LEFT,
        "right": e.KEY_RIGHT,
        "up": e.KEY_UP,
        "down": e.KEY_DOWN
    }

    if key in key_map:
        ui.write(e.EV_KEY, key_map[key], 1)   # Key down
        ui.write(e.EV_KEY, key_map[key], 0)   # Key up
        ui.syn()
# --------------------------------------------------------------------


# Determine direction from marker position and trigger key events
def apply_direction(ball_pos, left_box, right_box, upper_box, lower_box, frame_center):
    x, y = ball_pos
    if left_box[0] - 50 <= x <= left_box[0] + 50 and left_box[1] - 100 <= y <= left_box[1] + 100:
        print("Left\n")
        press_key('left')
    elif right_box[0] - 50 <= x <= right_box[0] + 50 and right_box[1] - 100 <= y <= right_box[1] + 100:
        print("Right\n")
        press_key('right')
    elif upper_box[0] - 50 <= x <= upper_box[0] + 50 and upper_box[1] - 100 <= y <= upper_box[1] + 100:
        print("UP\n")
        press_key('up')
    elif lower_box[0] - 50 <= x <= lower_box[0] + 50 and lower_box[1] - 100 <= y <= lower_box[1] + 100:
        print("Down\n")
        press_key('down')
    # Otherwise: do nothing


# Detect yellow marker, trigger key events, and stream frames
def movement_capture():
    cap = cv2.VideoCapture(0)

    lower_yellow = np.array([168, 151, 48])
    upper_yellow = np.array([179, 251, 148])

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h, w = frame.shape[:2]
        center_x, center_y = w // 2, h // 2

        # Draw guide boxes
        cv2.rectangle(frame, (center_x + 100, center_y - 100),
                             (center_x + 200, center_y + 100), (255, 255, 255), 2)
        cv2.rectangle(frame, (center_x - 200, center_y - 100),
                             (center_x - 100, center_y + 100), (255, 255, 255), 2)
        cv2.rectangle(frame, (center_x - 50, center_y - 150),
                             (center_x + 50, center_y - 100), (255, 255, 255), 2)
        cv2.rectangle(frame, (center_x - 50, center_y + 100),
                             (center_x + 50, center_y + 150), (255, 255, 255), 2)

        # HSV mask for yellow
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, lower_yellow, upper_yellow)
        mask = cv2.morphologyEx(
            mask, cv2.MORPH_OPEN,
            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        )

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 200:
                (x, y), radius = cv2.minEnclosingCircle(cnt)
                peri = cv2.arcLength(cnt, True)
                if peri == 0:
                    continue
                circularity = 4 * np.pi * area / (peri ** 2)
                if 0.7 < circularity < 1.2:
                    center = (int(x), int(y))
                    cv2.circle(frame, center, int(radius), (0, 0, 255), 2)
                    apply_direction(
                        ball_pos=center,
                        left_box=(center_x - 150, center_y),
                        right_box=(center_x + 150, center_y),
                        upper_box=(center_x, center_y - 125),
                        lower_box=(center_x, center_y + 125),
                        frame_center=(center_x, center_y)
                    )

        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    ui.close()


@app.route('/video_feed')
def video_feed():
    return Response(movement_capture(), mimetype='multipart/x-mixed-replace; boundary=frame')


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
