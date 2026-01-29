# Metrics

## Overview

Metrics are computed per frame and returned to the client. Each metric may include a boolean alert flag and additional fields.

## Metric keys

- face_missing
- eye_closure
- yawn
- head_pose
- gaze
- phone_usage

## Alerts

Any metric field that ends with `\_alert` and is true is treated as an alert.
