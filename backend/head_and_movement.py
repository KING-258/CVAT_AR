import cv2
import numpy as np

def direction(ball_pos, left_box, right_box, upper_box, lower_box, frame_center):
    x, y = ball_pos
    if left_box[0] - 50 <= x <= left_box[0] + 50 and left_box[1] - 100 <= y <= left_box[1] + 100:
        print('left')
    elif right_box[0] - 50 <= x <= right_box[0] + 50 and right_box[1] - 100 <= y <= right_box[1] + 100:
        print('right')
    elif upper_box[0] - 50 <= x <= upper_box[0] + 50 and upper_box[1] - 100 <= y <= upper_box[1] + 100:
        print('up')
    elif lower_box[0] - 50 <= x <= lower_box[0] + 50 and lower_box[1] - 100 <= y <= lower_box[1] + 100:
        print('down')
    elif frame_center[0] - 100 <= x <= frame_center[0] + 100 and frame_center[1] - 100 <= y <= frame_center[1] + 100:
        print('waiting for decision')
    else:
        print('error')

def movement_capture():
    cap = cv2.VideoCapture(0)

    # --- HSV range for YELLOW ---
    # Start with the tighter range; if lighting is tricky, try the broader one below
    lower_yellow = np.array([15, 60, 60])     # lower hue, sat, val
    upper_yellow = np.array([45, 255, 255])   # upper hue, sat, val
    # Broader (optional):
    # lower_yellow = np.array([15, 80, 80])
    # upper_yellow = np.array([40, 255, 255])

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h, w = frame.shape[:2]
        center_x, center_y = w // 2, h // 2  # (x, y)

        # guide boxes (draw with explicit color + thickness)
        # right
        cv2.rectangle(frame, (center_x + 100, center_y - 100),
                             (center_x + 200, center_y + 100), (255, 255, 255), 2)
        # left
        cv2.rectangle(frame, (center_x - 200, center_y - 100),
                             (center_x - 100, center_y + 100), (255, 255, 255), 2)
        # up
        cv2.rectangle(frame, (center_x - 50, center_y - 150),
                             (center_x + 50, center_y - 100), (255, 255, 255), 2)
        # down
        cv2.rectangle(frame, (center_x - 50, center_y + 100),
                             (center_x + 50, center_y + 150), (255, 255, 255), 2)

        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

        # (optional) clean noise a bit
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,
                                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

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
                    radius = int(radius)
                    cv2.circle(frame, center, radius, (0, 0, 255), 2)
                    direction(
                        ball_pos=center,
                        left_box=(center_x - 150, center_y),
                        right_box=(center_x + 150, center_y),
                        upper_box=(center_x, center_y - 125),
                        lower_box=(center_x, center_y + 125),
                        frame_center=(center_x, center_y)
                    )

        cv2.imshow("Yellow Ball Detection", frame)
        # cv2.imshow("Mask", mask)  # helpful for debugging thresholds

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    movement_capture()