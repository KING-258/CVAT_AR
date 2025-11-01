#!/usr/bin/env python3
"""
Color Picker: Click on the video feed to sample a color and print suggested HSV bounds
(lower_yellow, upper_yellow) suitable for OpenCV inRange().

- Left click: sample a 7x7 patch around the cursor, compute median HSV, and print bounds.
- Press 'q' to quit.

Tune H_DELTA/S_DELTA/V_DELTA below if needed.
"""
import cv2
import numpy as np

# Tolerances for HSV bounds (OpenCV ranges: H=[0,179], S=[0,255], V=[0,255])
H_DELTA = 10
S_DELTA = 50
V_DELTA = 50

# Globals for callback access
_latest_frame_bgr = None
_last_click_info = None  # (pos, lower, upper, hsv_median)


def _compute_bounds_from_patch(bgr_patch: np.ndarray):
    hsv_patch = cv2.cvtColor(bgr_patch, cv2.COLOR_BGR2HSV)
    h_med = int(np.median(hsv_patch[:, :, 0]))
    s_med = int(np.median(hsv_patch[:, :, 1]))
    v_med = int(np.median(hsv_patch[:, :, 2]))

    lower = np.array([
        max(0, h_med - H_DELTA),
        max(0, s_med - S_DELTA),
        max(0, v_med - V_DELTA),
    ])
    upper = np.array([
        min(179, h_med + H_DELTA),
        min(255, s_med + S_DELTA),
        min(255, v_med + V_DELTA),
    ])
    return lower, upper, (h_med, s_med, v_med)


def _mouse_cb(event, x, y, flags, param):
    global _latest_frame_bgr, _last_click_info
    if event == cv2.EVENT_LBUTTONDOWN and _latest_frame_bgr is not None:
        h, w = _latest_frame_bgr.shape[:2]
        # 7x7 patch around the click, clamped to image bounds
        x0, x1 = max(0, x - 3), min(w, x + 4)
        y0, y1 = max(0, y - 3), min(h, y + 4)
        if x1 <= x0 or y1 <= y0:
            return
        patch = _latest_frame_bgr[y0:y1, x0:x1]
        lower, upper, hsv_med = _compute_bounds_from_patch(patch)
        _last_click_info = ((x, y), lower, upper, hsv_med)

        # Print ready-to-copy lines matching app.py style
        print(f"Clicked at ({x}, {y}) | HSV median: {list(hsv_med)}")
        print(
            f"lower_yellow = np.array([{lower[0]}, {lower[1]}, {lower[2]}])"
        )
        print(
            f"upper_yellow = np.array([{upper[0]}, {upper[1]}, {upper[2]}])"
        )


def main():
    global _latest_frame_bgr, _last_click_info

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Could not open camera 0")

    win = "Color Picker"
    cv2.namedWindow(win)
    cv2.setMouseCallback(win, _mouse_cb)

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        _latest_frame_bgr = frame

        # Overlay last selection info
        if _last_click_info is not None:
            (cx, cy), lower, upper, hsv_med = _last_click_info
            cv2.circle(frame, (cx, cy), 5, (0, 0, 255), -1)
            cv2.putText(
                frame,
                f"HSV median: {list(hsv_med)}",
                (10, 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )
            cv2.putText(
                frame,
                f"lower: {lower.tolist()}",
                (10, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )
            cv2.putText(
                frame,
                f"upper: {upper.tolist()}",
                (10, 75),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )

        cv2.imshow(win, frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
