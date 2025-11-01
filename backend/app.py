import cv2
import numpy as np
from flask import Flask, Response
from flask_cors import CORS
from pynput.keyboard import Controller, Key
from threading import Thread

app = Flask(__name__)
CORS(app)

keyboard = Controller()
current_key = None  # tracks which key is held down


def hold_key(direction):
    """Press and hold a key (only if not already held)."""
    global current_key
    key_map = {
        "left": Key.left,
        "right": Key.right,
        "up": Key.left,
        "down": Key.right
    }
    key_obj = key_map.get(direction)
    if key_obj and current_key != key_obj:
        # release any previously held key first
        if current_key:
            keyboard.release(current_key)
        keyboard.press(key_obj)
        current_key = key_obj


def release_all():
    """Release any currently held key."""
    global current_key
    if current_key:
        keyboard.release(current_key)
        current_key = None


def apply_direction(ball_pos, left_box, right_box, upper_box, lower_box):
    """Check which region the marker is in and hold or release keys accordingly."""
    x, y = ball_pos
    if left_box[0] - 50 <= x <= left_box[0] + 50 and left_box[1] - 100 <= y <= left_box[1] + 100:
        print("Holding LEFT")
        hold_key('left')
    elif right_box[0] - 50 <= x <= right_box[0] + 50 and right_box[1] - 100 <= y <= right_box[1] + 100:
        print("Holding RIGHT")
        hold_key('right')
    elif upper_box[0] - 50 <= x <= upper_box[0] + 50 and upper_box[1] - 100 <= y <= upper_box[1] + 100:
        print("Holding UP")
        hold_key('up')
    elif lower_box[0] - 50 <= x <= lower_box[0] + 50 and lower_box[1] - 100 <= y <= lower_box[1] + 100:
        print("Holding DOWN")
        hold_key('down')
    else:
        # Not in any region
        release_all()


def movement_capture():
    cap = cv2.VideoCapture(0)
    lower_yellow = np.array([168, 151, 48])
    upper_yellow = np.array([179, 251, 148])

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h, w = frame.shape[:2]
        cx, cy = w // 2, h // 2

        # draw guide boxes
        cv2.rectangle(frame, (cx + 100, cy - 100), (cx + 200, cy + 100), (255, 255, 255), 2)
        cv2.rectangle(frame, (cx - 200, cy - 100), (cx - 100, cy + 100), (255, 255, 255), 2)
        cv2.rectangle(frame, (cx - 50, cy - 150), (cx + 50, cy - 100), (255, 255, 255), 2)
        cv2.rectangle(frame, (cx - 50, cy + 100), (cx + 50, cy + 150), (255, 255, 255), 2)

        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, lower_yellow, upper_yellow)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,
                                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        found_marker = False

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 200:
                (x, y), radius = cv2.minEnclosingCircle(cnt)
                peri = cv2.arcLength(cnt, True)
                if peri == 0:
                    continue
                circularity = 4 * np.pi * area / (peri ** 2)
                if 0.7 < circularity < 1.2:
                    found_marker = True
                    center = (int(x), int(y))
                    cv2.circle(frame, center, int(radius), (0, 0, 255), 2)
                    apply_direction(center,
                                    (cx - 150, cy),
                                    (cx + 150, cy),
                                    (cx, cy - 125),
                                    (cx, cy + 125))
                    break

        if not found_marker:
            release_all()

        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    release_all()
    cap.release()
    cv2.destroyAllWindows()


@app.route('/video_feed')
def video_feed():
    return Response(movement_capture(), mimetype='multipart/x-mixed-replace; boundary=frame')


def start_flask():
    app.run(host="0.0.0.0", port=5000, debug=False)


if __name__ == '__main__':
    # start OpenCV movement tracking in a background thread
    Thread(target=movement_capture, daemon=True).start()
    start_flask()
