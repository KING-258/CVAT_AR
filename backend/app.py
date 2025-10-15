import cv2
import numpy as np
from flask import Flask, Response
from flask_cors import CORS
import pyautogui

app = Flask(__name__)
CORS(app)

# Determine direction using updated logic from head_and_movement.py (yellow marker, box layout)
# Returns one of: 'left', 'right', 'up', 'down', 'waiting for decision', 'error'
def get_direction(ball_pos, left_box, right_box, upper_box, lower_box, frame_center):
    x, y = ball_pos
    if left_box[0] - 50 <= x <= left_box[0] + 50 and left_box[1] - 100 <= y <= left_box[1] + 100:
        return 'left'
    elif right_box[0] - 50 <= x <= right_box[0] + 50 and right_box[1] - 100 <= y <= right_box[1] + 100:
        return 'right'
    elif upper_box[0] - 50 <= x <= upper_box[0] + 50 and upper_box[1] - 100 <= y <= upper_box[1] + 100:
        return 'up'
    elif lower_box[0] - 50 <= x <= lower_box[0] + 50 and lower_box[1] - 100 <= y <= lower_box[1] + 100:
        return 'down'
    elif frame_center[0] - 100 <= x <= frame_center[0] + 100 and frame_center[1] - 100 <= y <= frame_center[1] + 100:
        return 'waiting for decision'
    else:
        return 'error'


# Detect the yellow marker and trigger direction detection
# Stream frames as MJPEG for the frontend
def movement_capture():

    cap = cv2.VideoCapture(0)

    # HSV range for yellow marker
    lower_yellow = np.array([15, 60, 60])
    upper_yellow = np.array([45, 255, 255])

    while True:

        ret, frame = cap.read()
        if not ret:
            break

        h, w = frame.shape[:2]
        center_x, center_y = w // 2, h // 2  # (x, y)

        # Guide boxes (white, thickness 2)
        # right box
        cv2.rectangle(frame, (center_x + 100, center_y - 100),
                             (center_x + 200, center_y + 100), (255, 255, 255), 2)
        # left box
        cv2.rectangle(frame, (center_x - 200, center_y - 100),
                             (center_x - 100, center_y + 100), (255, 255, 255), 2)
        # up box
        cv2.rectangle(frame, (center_x - 50, center_y - 150),
                             (center_x + 50, center_y - 100), (255, 255, 255), 2)
        # down box
        cv2.rectangle(frame, (center_x - 50, center_y + 100),
                             (center_x + 50, center_y + 150), (255, 255, 255), 2)

        # HSV-based thresholding for yellow
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, lower_yellow, upper_yellow)
        # Clean small noise
        mask = cv2.morphologyEx(
            mask,
            cv2.MORPH_OPEN,
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
                    dir_str = get_direction(
                        ball_pos=center,
                        left_box=(center_x - 150, center_y),
                        right_box=(center_x + 150, center_y),
                        upper_box=(center_x, center_y - 125),
                        lower_box=(center_x, center_y + 125),
                        frame_center=(center_x, center_y)
                    )
                    # Log direction before triggering pyautogui
                    if dir_str in {"left", "right", "up", "down"}:
                        print(f"Direction: {dir_str}")
                        pyautogui.press(dir_str)
                    elif dir_str != 'waiting for decision':
                        # avoid spamming logs for idle state
                        print(dir_str)

        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        # Press 'q' to quit (useful when running standalone)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    return

@app.route('/video_feed')
def video_feed():
    return Response(movement_capture(), mimetype='multipart/x-mixed-replace; boundary=frame')


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
