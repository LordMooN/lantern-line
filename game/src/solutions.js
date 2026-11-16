// The launches a pilot who knows the water would make: one vector a leg, for each of the five
// sectors, found by flying the real physics in tools/solve.mjs (run it after any change to level.js).
// Each leg starts where the last one ended — the post, then the gate that caught the lantern — and
// every vector is written with its decimals, since a rounded one can miss a gate by a pixel. The
// game itself never reads this file; shots.js does, to stage screenshots of flights that happened.
export const SOLUTIONS = [
  [
    {
      "x": 206.72,
      "y": -100.83
    },
    {
      "x": 618.19,
      "y": 200.86
    },
    {
      "x": 244.16,
      "y": -70.01
    }
  ],
  [
    {
      "x": 159.75,
      "y": 58.14
    },
    {
      "x": 520.7,
      "y": -325.37
    },
    {
      "x": 342,
      "y": 267.2
    },
    {
      "x": 229.98,
      "y": 368.05
    }
  ],
  [
    {
      "x": 447.37,
      "y": -402.82
    },
    {
      "x": 476.36,
      "y": 232.34
    },
    {
      "x": 605.7,
      "y": -322.06
    },
    {
      "x": 375.01,
      "y": 516.15
    },
    {
      "x": -240.42,
      "y": 162.17
    }
  ],
  [
    {
      "x": 161.68,
      "y": 52.53
    },
    {
      "x": 604.77,
      "y": 269.26
    },
    {
      "x": 467.61,
      "y": 339.74
    },
    {
      "x": 195.51,
      "y": 400.86
    }
  ],
  [
    {
      "x": 277.31,
      "y": -232.69
    },
    {
      "x": 531.12,
      "y": 414.96
    },
    {
      "x": 606.77,
      "y": -197.15
    },
    {
      "x": 507.12,
      "y": -425.53
    },
    {
      "x": -113.7,
      "y": -456.04
    }
  ]
];
