from math import hypot
from typing import Sequence


def euclidean_dist(a: tuple[float, float], b: tuple[float, float]) -> float:
    """
    Compute Euclidean distance between two points.

    Args:
        a: First point as (x, y) tuple
        b: Second point as (x, y) tuple

    Returns:
        Euclidean distance between points
    """
    return hypot(a[0] - b[0], a[1] - b[1])


def average_point(points: Sequence[tuple[float, float]]) -> tuple[float, float]:
    """
    Compute the average (centroid) of a sequence of 2D points.

    Args:
        points: A sequence of (x, y) tuples.

    Returns:
        A tuple (x, y) representing the average point.

    Raises:
        ValueError: If the points sequence is empty.
    """
    if not points:
        raise ValueError("points must not be empty")

    sum_x = sum(p[0] for p in points)
    sum_y = sum(p[1] for p in points)

    n = len(points)
    return sum_x / n, sum_y / n
