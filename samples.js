(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HashChainSamples = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return [
  {
    "id": "access",
    "labelKey": "sample.access",
    "columns": [
      "time",
      "room",
      "card",
      "action"
    ],
    "headers": [
      "# kind=fictional-access",
      "# started=09:00",
      "# format=hctt/1"
    ],
    "rows": [
      [
        "09:02",
        "Room-A",
        "C-1001",
        "IN"
      ],
      [
        "09:05",
        "Room-B",
        "C-1002",
        "IN"
      ],
      [
        "09:12",
        "Room-A",
        "C-1001",
        "OUT"
      ],
      [
        "09:20",
        "Room-C",
        "C-1003",
        "IN"
      ],
      [
        "09:25",
        "Room-B",
        "C-1002",
        "OUT"
      ],
      [
        "09:30",
        "Room-A",
        "C-1004",
        "IN"
      ],
      [
        "09:42",
        "Room-C",
        "C-1003",
        "OUT"
      ],
      [
        "09:50",
        "Room-A",
        "C-1004",
        "OUT"
      ]
    ]
  },
  {
    "id": "temperature",
    "labelKey": "sample.temperature",
    "columns": [
      "time",
      "sensor",
      "value",
      "unit"
    ],
    "headers": [
      "# kind=fictional-temperature",
      "# started=10:00",
      "# format=hctt/1"
    ],
    "rows": [
      [
        "10:00",
        "T-A",
        "20.1",
        "C"
      ],
      [
        "10:05",
        "T-A",
        "20.3",
        "C"
      ],
      [
        "10:10",
        "T-A",
        "20.2",
        "C"
      ],
      [
        "10:15",
        "T-A",
        "20.5",
        "C"
      ],
      [
        "10:20",
        "T-A",
        "20.4",
        "C"
      ],
      [
        "10:25",
        "T-A",
        "20.6",
        "C"
      ]
    ]
  }
];
}));
