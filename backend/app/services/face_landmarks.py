"""
Facial landmark coordinates.
"""

LEFT_EYE: list[int] = [
    33,
    246,
    161,
    160,
    159,
    158,
    157,
    173,
    133,
    155,
    154,
    153,
    145,
    144,
    163,
    7,
]

RIGHT_EYE: list[int] = [
    263,
    466,
    388,
    387,
    386,
    385,
    384,
    398,
    362,
    382,
    381,
    380,
    374,
    373,
    390,
    249,
]

INNER_LIP: list[int] = [
    78,
    191,
    80,
    81,
    82,
    13,
    312,
    311,
    310,
    415,
    308,
    324,
    318,
    402,
    317,
    14,
    87,
    178,
    88,
    95,
]

OUTER_LIP: list[int] = [
    61,
    185,
    40,
    39,
    37,
    0,
    267,
    269,
    270,
    409,
    291,
    375,
    321,
    405,
    314,
    17,
    84,
    181,
    91,
    146,
]

NOSE: list[int] = [4, 1, 195]


def combine_landmarks(*groups: list[int]) -> list[int]:
    """Combine multiple landmark lists into a unique list."""
    seen = set()
    result = []
    for group in groups:
        for idx in group:
            if idx not in seen:
                seen.add(idx)
                result.append(idx)
    return result


ESSENTIAL_LANDMARKS: list[int] = combine_landmarks(
    LEFT_EYE, RIGHT_EYE, INNER_LIP, OUTER_LIP, NOSE
)
