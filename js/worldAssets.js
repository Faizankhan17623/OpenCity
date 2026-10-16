// Approved authored world collision and GLB socket positions in metres, Y up, +Z forward.
// Socket metadata keeps service anchors stable before visual models finish streaming.
export const worldAssets = {
  "oc_apartments_01": {
    "url": "assets/buildings/oc_apartments_01.glb",
    "bounds": {
      "min": [
        -9.651,
        0,
        -7.1
      ],
      "max": [
        6.8,
        16.8,
        10.2
      ]
    },
    "collision": {
      "asset_id": "oc_apartments_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Body",
          "min": [
            -6.5,
            0,
            -7
          ],
          "max": [
            6.5,
            14,
            7
          ]
        },
        {
          "name": "COL_Fin",
          "min": [
            -1.55,
            3.2,
            7
          ],
          "max": [
            -1.05,
            15.2,
            7.9
          ]
        },
        {
          "name": "COL_StairTower",
          "min": [
            -5.9,
            14,
            -6.6
          ],
          "max": [
            -3.1,
            16.8,
            -3.6
          ]
        }
      ]
    },
    "sockets": {
      "socket_entrance": [
        -1.3,
        0,
        8.4
      ],
      "socket_roof": [
        1.5,
        14,
        0
      ],
      "socket_roof_door": [
        -2.7,
        14,
        -5
      ]
    }
  },
  "oc_bank_harbour_mutual_01": {
    "url": "assets/buildings/oc_bank_harbour_mutual_01.glb",
    "bounds": {
      "min": [
        -8.15,
        0,
        -6
      ],
      "max": [
        8.15,
        11,
        7.6
      ]
    },
    "collision": {
      "asset_id": "oc_bank_harbour_mutual_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_ATM",
          "min": [
            2.8,
            0,
            3.35
          ],
          "max": [
            4,
            1.8,
            4.05
          ]
        },
        {
          "name": "COL_Bench",
          "min": [
            -7.4,
            0,
            3.45
          ],
          "max": [
            -4.2,
            1,
            4.3
          ]
        },
        {
          "name": "COL_Counter",
          "min": [
            -7,
            0,
            -4.8
          ],
          "max": [
            2,
            1.2,
            -3.8
          ]
        },
        {
          "name": "COL_FrontL",
          "min": [
            -8,
            0,
            5.65
          ],
          "max": [
            -1.6,
            8,
            6
          ]
        },
        {
          "name": "COL_FrontR",
          "min": [
            1.6,
            0,
            5.65
          ],
          "max": [
            8,
            8,
            6
          ]
        },
        {
          "name": "COL_LoanOffice",
          "min": [
            3.6,
            0,
            -1.86
          ],
          "max": [
            7.4,
            2.6,
            -1.8
          ]
        },
        {
          "name": "COL_LoanSide",
          "min": [
            3.6,
            0,
            -4.8
          ],
          "max": [
            3.66,
            2.6,
            -1.8
          ]
        },
        {
          "name": "COL_Roof",
          "min": [
            -8,
            7.7,
            -6
          ],
          "max": [
            8,
            8.5,
            6
          ]
        },
        {
          "name": "COL_Vault",
          "min": [
            7.2,
            0,
            -0.4
          ],
          "max": [
            7.65,
            3.4,
            2.2
          ]
        },
        {
          "name": "COL_WallBack",
          "min": [
            -8,
            0,
            -6
          ],
          "max": [
            8,
            8,
            -5.65
          ]
        },
        {
          "name": "COL_WallL",
          "min": [
            -8,
            0,
            -6
          ],
          "max": [
            -7.65,
            8,
            6
          ]
        },
        {
          "name": "COL_WallR",
          "min": [
            7.65,
            0,
            -6
          ],
          "max": [
            8,
            8,
            6
          ]
        }
      ]
    },
    "sockets": {
      "socket_atm": [
        3.4,
        0.12,
        4.6
      ],
      "socket_entrance": [
        0,
        0.12,
        7.2
      ],
      "socket_loan_desk": [
        5.5,
        0.12,
        -2.35
      ],
      "socket_rates_board": [
        -6.85,
        0.12,
        -0.3
      ],
      "socket_teller_1": [
        -5.5,
        0.12,
        -3.2
      ],
      "socket_teller_2": [
        -2.5,
        0.12,
        -3.2
      ],
      "socket_teller_3": [
        0.5,
        0.12,
        -3.2
      ]
    }
  },
  "oc_hotel_flamingo_01": {
    "url": "assets/buildings/oc_hotel_flamingo_01.glb",
    "bounds": {
      "min": [
        -14,
        0,
        -15
      ],
      "max": [
        14,
        25.3,
        15
      ]
    },
    "collision": {
      "asset_id": "oc_hotel_flamingo_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Body",
          "min": [
            -14,
            0,
            -15
          ],
          "max": [
            14,
            18.5,
            13
          ]
        },
        {
          "name": "COL_FrontL",
          "min": [
            -14,
            0,
            13
          ],
          "max": [
            -3,
            18.5,
            15
          ]
        },
        {
          "name": "COL_FrontR",
          "min": [
            3,
            0,
            13
          ],
          "max": [
            14,
            18.5,
            15
          ]
        },
        {
          "name": "COL_OverNotch",
          "min": [
            -3,
            3.2,
            13
          ],
          "max": [
            3,
            18.5,
            15
          ]
        },
        {
          "name": "COL_Tower",
          "min": [
            -5,
            18.5,
            5
          ],
          "max": [
            5,
            25.3,
            12
          ]
        }
      ]
    },
    "sockets": {
      "socket_dropoff": [
        0,
        0,
        21
      ],
      "socket_entrance": [
        0,
        0,
        15.5
      ],
      "socket_roof": [
        0,
        18.5,
        -3
      ],
      "socket_sign": [
        0,
        11,
        16
      ]
    }
  },
  "oc_mendez_garage_01": {
    "url": "assets/buildings/oc_mendez_garage_01.glb",
    "bounds": {
      "min": [
        -11.351,
        0,
        -7.2
      ],
      "max": [
        9.2,
        8.5,
        13
      ]
    },
    "collision": {
      "asset_id": "oc_mendez_garage_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Office",
          "min": [
            -9,
            0,
            -7
          ],
          "max": [
            -4.2,
            7.4,
            7
          ]
        },
        {
          "name": "COL_PierL",
          "min": [
            -4.2,
            0,
            6.6
          ],
          "max": [
            -3.6,
            6.2,
            7
          ]
        },
        {
          "name": "COL_PierMid",
          "min": [
            0.4,
            0,
            6.6
          ],
          "max": [
            1.4,
            6.2,
            7
          ]
        },
        {
          "name": "COL_PierR",
          "min": [
            5.4,
            0,
            6.6
          ],
          "max": [
            9,
            6.2,
            7
          ]
        },
        {
          "name": "COL_Rear",
          "min": [
            -4.2,
            0,
            -7
          ],
          "max": [
            9,
            6.2,
            -6.7
          ]
        },
        {
          "name": "COL_RoofLintel",
          "min": [
            -4.2,
            4.7,
            -7
          ],
          "max": [
            9,
            6.2,
            7
          ]
        },
        {
          "name": "COL_SideR",
          "min": [
            8.7,
            0,
            -7
          ],
          "max": [
            9,
            6.2,
            7
          ]
        },
        {
          "name": "COL_Stair",
          "min": [
            -10.3,
            0,
            -5.6
          ],
          "max": [
            -9,
            4.1,
            2.6
          ]
        }
      ]
    },
    "sockets": {
      "socket_bay_1": [
        -1.6,
        0,
        1.5
      ],
      "socket_bay_2": [
        3.4,
        0,
        1.5
      ],
      "socket_counter": [
        -7.3,
        0,
        6.4
      ],
      "socket_office_door": [
        -5.1,
        0,
        7.6
      ],
      "socket_roof": [
        2,
        6.2,
        0
      ],
      "socket_upstairs_door": [
        -9.6,
        4.1,
        -4.75
      ],
      "socket_workshop_pad": [
        0.9,
        0,
        9.8
      ]
    }
  },
  "oc_shop_row_01": {
    "url": "assets/buildings/oc_shop_row_01.glb",
    "bounds": {
      "min": [
        -21,
        0,
        -7.17
      ],
      "max": [
        21.04,
        7.2,
        10
      ]
    },
    "collision": {
      "asset_id": "oc_shop_row_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Pediment0",
          "min": [
            -18,
            5.4,
            5.8
          ],
          "max": [
            -10,
            7.2,
            7
          ]
        },
        {
          "name": "COL_Pediment1",
          "min": [
            -4,
            5.4,
            5.8
          ],
          "max": [
            4,
            7.2,
            7
          ]
        },
        {
          "name": "COL_Pediment2",
          "min": [
            10,
            5.4,
            5.8
          ],
          "max": [
            18,
            7.2,
            7
          ]
        },
        {
          "name": "COL_Row",
          "min": [
            -21,
            0,
            -7
          ],
          "max": [
            21,
            5.4,
            7
          ]
        }
      ]
    },
    "sockets": {
      "socket_roof": [
        0,
        5.4,
        0
      ],
      "socket_shop_1": [
        -14,
        0,
        8
      ],
      "socket_shop_2": [
        0,
        0,
        8
      ],
      "socket_shop_3": [
        14,
        0,
        8
      ]
    }
  },
  "oc_bench_01": {
    "url": "assets/props/oc_bench_01.glb",
    "bounds": {
      "min": [
        -0.9,
        0,
        -0.3
      ],
      "max": [
        0.9,
        0.9,
        0.28
      ]
    },
    "collision": {
      "asset_id": "oc_bench_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Bench",
          "min": [
            -0.9,
            0,
            -0.3
          ],
          "max": [
            0.9,
            0.9,
            0.3
          ]
        }
      ]
    }
  },
  "oc_bin_01": {
    "url": "assets/props/oc_bin_01.glb",
    "bounds": {
      "min": [
        -0.3,
        0,
        -0.3
      ],
      "max": [
        0.3,
        1,
        0.3
      ]
    },
    "collision": {
      "asset_id": "oc_bin_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Bin",
          "min": [
            -0.3,
            0,
            -0.3
          ],
          "max": [
            0.3,
            1,
            0.3
          ]
        }
      ]
    }
  },
  "oc_bollard_01": {
    "url": "assets/props/oc_bollard_01.glb",
    "bounds": {
      "min": [
        -0.095,
        0,
        -0.1
      ],
      "max": [
        0.095,
        0.9,
        0.1
      ]
    },
    "collision": {
      "asset_id": "oc_bollard_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Bollard",
          "min": [
            -0.1,
            0,
            -0.1
          ],
          "max": [
            0.1,
            0.9,
            0.1
          ]
        }
      ]
    }
  },
  "oc_fountain_01": {
    "url": "assets/props/oc_fountain_01.glb",
    "bounds": {
      "min": [
        -2.08,
        0,
        -2.08
      ],
      "max": [
        2.08,
        1.6,
        2.08
      ]
    },
    "collision": {
      "asset_id": "oc_fountain_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Pedestal",
          "min": [
            -0.3,
            0,
            -0.3
          ],
          "max": [
            0.3,
            1.3,
            0.3
          ]
        },
        {
          "name": "COL_RingE",
          "min": [
            1.6,
            0,
            -1.6
          ],
          "max": [
            2,
            0.58,
            1.6
          ]
        },
        {
          "name": "COL_RingN",
          "min": [
            -2,
            0,
            -2
          ],
          "max": [
            2,
            0.58,
            -1.6
          ]
        },
        {
          "name": "COL_RingS",
          "min": [
            -2,
            0,
            1.6
          ],
          "max": [
            2,
            0.58,
            2
          ]
        },
        {
          "name": "COL_RingW",
          "min": [
            -2,
            0,
            -1.6
          ],
          "max": [
            -1.6,
            0.58,
            1.6
          ]
        }
      ]
    }
  },
  "oc_kerb_01": {
    "url": "assets/props/oc_kerb_01.glb",
    "bounds": {
      "min": [
        -1.5,
        0,
        -0.15
      ],
      "max": [
        1.5,
        0.15,
        0.15
      ]
    },
    "collision": {
      "asset_id": "oc_kerb_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Kerb",
          "min": [
            -1.5,
            0,
            -0.15
          ],
          "max": [
            1.5,
            0.15,
            0.15
          ]
        }
      ]
    }
  },
  "oc_lamp_01": {
    "url": "assets/props/oc_lamp_01.glb",
    "bounds": {
      "min": [
        -0.26,
        0,
        -0.155
      ],
      "max": [
        0.26,
        6,
        1.26
      ]
    },
    "collision": {
      "asset_id": "oc_lamp_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Pole",
          "min": [
            -0.15,
            0,
            -0.15
          ],
          "max": [
            0.15,
            6,
            0.15
          ]
        }
      ]
    }
  },
  "oc_palm_01": {
    "url": "assets/props/oc_palm_01.glb",
    "bounds": {
      "min": [
        -1.297,
        -0.004,
        -1.583
      ],
      "max": [
        1.82,
        4.55,
        1.583
      ]
    },
    "collision": {
      "asset_id": "oc_palm_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Trunk",
          "min": [
            -0.18,
            0,
            -0.18
          ],
          "max": [
            0.18,
            4.2,
            0.18
          ]
        }
      ]
    }
  },
  "oc_parking_01": {
    "url": "assets/props/oc_parking_01.glb",
    "bounds": {
      "min": [
        -13.3,
        -0.02,
        -13.3
      ],
      "max": [
        13.3,
        0.12,
        13.3
      ]
    },
    "collision": {
      "asset_id": "oc_parking_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_KerbB",
          "min": [
            -13,
            0,
            -13.3
          ],
          "max": [
            13,
            0.12,
            -13
          ]
        },
        {
          "name": "COL_KerbE",
          "min": [
            13,
            0,
            -13.3
          ],
          "max": [
            13.3,
            0.12,
            13.3
          ]
        },
        {
          "name": "COL_KerbF",
          "min": [
            -13,
            0,
            13
          ],
          "max": [
            13,
            0.12,
            13.3
          ]
        },
        {
          "name": "COL_KerbW1",
          "min": [
            -13.3,
            0,
            8
          ],
          "max": [
            -13,
            0.12,
            13.3
          ]
        },
        {
          "name": "COL_KerbW2",
          "min": [
            -13.3,
            0,
            -13.3
          ],
          "max": [
            -13,
            0.12,
            2
          ]
        }
      ]
    },
    "sockets": {
      "socket_bay_01": [
        -8.75,
        0.005,
        10.5
      ],
      "socket_bay_02": [
        -6.25,
        0.005,
        10.5
      ],
      "socket_bay_03": [
        -3.75,
        0.005,
        10.5
      ],
      "socket_bay_04": [
        -1.25,
        0.005,
        10.5
      ],
      "socket_bay_05": [
        1.25,
        0.005,
        10.5
      ],
      "socket_bay_06": [
        3.75,
        0.005,
        10.5
      ],
      "socket_bay_07": [
        6.25,
        0.005,
        10.5
      ],
      "socket_bay_08": [
        8.75,
        0.005,
        10.5
      ],
      "socket_bay_09": [
        -8.75,
        0.005,
        -0.5
      ],
      "socket_bay_10": [
        -6.25,
        0.005,
        -0.5
      ],
      "socket_bay_11": [
        -3.75,
        0.005,
        -0.5
      ],
      "socket_bay_12": [
        -1.25,
        0.005,
        -0.5
      ],
      "socket_bay_13": [
        1.25,
        0.005,
        -0.5
      ],
      "socket_bay_14": [
        3.75,
        0.005,
        -0.5
      ],
      "socket_bay_15": [
        6.25,
        0.005,
        -0.5
      ],
      "socket_bay_16": [
        8.75,
        0.005,
        -0.5
      ],
      "socket_bay_17": [
        -8.75,
        0.005,
        -5.5
      ],
      "socket_bay_18": [
        -6.25,
        0.005,
        -5.5
      ],
      "socket_bay_19": [
        -3.75,
        0.005,
        -5.5
      ],
      "socket_bay_20": [
        -1.25,
        0.005,
        -5.5
      ],
      "socket_bay_21": [
        1.25,
        0.005,
        -5.5
      ],
      "socket_bay_22": [
        3.75,
        0.005,
        -5.5
      ],
      "socket_bay_23": [
        6.25,
        0.005,
        -5.5
      ],
      "socket_bay_24": [
        8.75,
        0.005,
        -5.5
      ],
      "socket_entry": [
        -13,
        0.005,
        5
      ]
    }
  },
  "oc_petrol_forecourt_01": {
    "url": "assets/props/oc_petrol_forecourt_01.glb",
    "bounds": {
      "min": [
        -13.051,
        0,
        -10.15
      ],
      "max": [
        13,
        5.5,
        8.11
      ]
    },
    "collision": {
      "asset_id": "oc_petrol_forecourt_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Column-7.5",
          "min": [
            -7.8,
            0,
            3.7
          ],
          "max": [
            -7.2,
            4.2,
            4.3
          ]
        },
        {
          "name": "COL_Column7.5",
          "min": [
            7.2,
            0,
            3.7
          ],
          "max": [
            7.8,
            4.2,
            4.3
          ]
        },
        {
          "name": "COL_Island1",
          "min": [
            -3.6,
            0,
            2.4
          ],
          "max": [
            -2.4,
            2.15,
            5.9
          ]
        },
        {
          "name": "COL_Island2",
          "min": [
            2.4,
            0,
            2.4
          ],
          "max": [
            3.6,
            2.15,
            5.9
          ]
        },
        {
          "name": "COL_Kiosk",
          "min": [
            -5,
            0,
            -10
          ],
          "max": [
            5,
            3.75,
            -4
          ]
        },
        {
          "name": "COL_Totem",
          "min": [
            10.2,
            0,
            6.55
          ],
          "max": [
            11.8,
            5.5,
            7.05
          ]
        }
      ]
    },
    "sockets": {
      "socket_entry": [
        0,
        0,
        8
      ],
      "socket_kiosk_door": [
        2.7,
        0,
        -3.4
      ],
      "socket_price_board": [
        11,
        3.5,
        7.1
      ],
      "socket_pump_1": [
        -4.9,
        0,
        4
      ],
      "socket_pump_2": [
        4.9,
        0,
        4
      ],
      "socket_pump_nozzle_1": [
        -3,
        1,
        4
      ],
      "socket_pump_nozzle_2": [
        3,
        1,
        4
      ]
    }
  },
  "oc_plaza_01": {
    "url": "assets/props/oc_plaza_01.glb",
    "bounds": {
      "min": [
        -13,
        0,
        -6
      ],
      "max": [
        13,
        0.51,
        6
      ]
    },
    "collision": {
      "asset_id": "oc_plaza_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Planter-1",
          "min": [
            -11.7,
            0.12,
            -1
          ],
          "max": [
            -9.3,
            0.5,
            1
          ]
        },
        {
          "name": "COL_Planter1",
          "min": [
            9.3,
            0.12,
            -1
          ],
          "max": [
            11.7,
            0.5,
            1
          ]
        },
        {
          "name": "COL_Slab",
          "min": [
            -13,
            0,
            -6
          ],
          "max": [
            13,
            0.12,
            6
          ]
        }
      ]
    },
    "sockets": {
      "socket_bench_1": [
        -6,
        0.12,
        4.2
      ],
      "socket_bench_2": [
        6,
        0.12,
        4.2
      ],
      "socket_bench_3": [
        -6,
        0.12,
        -4.2
      ],
      "socket_bench_4": [
        6,
        0.12,
        -4.2
      ],
      "socket_bin_1": [
        -8.2,
        0.12,
        4.6
      ],
      "socket_bin_2": [
        8.2,
        0.12,
        -4.6
      ],
      "socket_bollard_1": [
        -12,
        0.12,
        5.5
      ],
      "socket_bollard_2": [
        -8,
        0.12,
        5.5
      ],
      "socket_bollard_3": [
        8,
        0.12,
        5.5
      ],
      "socket_bollard_4": [
        12,
        0.12,
        5.5
      ],
      "socket_fountain": [
        0,
        0.12,
        0
      ],
      "socket_palm_1": [
        -10.5,
        0.5,
        0
      ],
      "socket_palm_2": [
        10.5,
        0.5,
        0
      ]
    }
  },
  "oc_road_crossing_01": {
    "url": "assets/props/oc_road_crossing_01.glb",
    "bounds": {
      "min": [
        -9,
        -0.02,
        -6
      ],
      "max": [
        9,
        0.123,
        6
      ]
    },
    "collision": {
      "asset_id": "oc_road_crossing_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_PaveL",
          "min": [
            -9,
            0,
            -6
          ],
          "max": [
            -6,
            0.12,
            6
          ]
        },
        {
          "name": "COL_PaveR",
          "min": [
            6,
            0,
            -6
          ],
          "max": [
            9,
            0.12,
            6
          ]
        }
      ]
    },
    "sockets": {
      "socket_crossing": [
        0,
        0.005,
        0
      ],
      "socket_joint_back": [
        0,
        0,
        -6
      ],
      "socket_joint_front": [
        0,
        0,
        6
      ],
      "socket_lane_back": [
        3,
        0.005,
        0
      ],
      "socket_lane_fwd": [
        -3,
        0.005,
        0
      ]
    }
  },
  "oc_road_junction_01": {
    "url": "assets/props/oc_road_junction_01.glb",
    "bounds": {
      "min": [
        -9,
        -0.02,
        -9
      ],
      "max": [
        9,
        0.123,
        9
      ]
    },
    "collision": {
      "asset_id": "oc_road_junction_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Corner-1-1",
          "min": [
            -9,
            0,
            6
          ],
          "max": [
            -6,
            0.12,
            9
          ]
        },
        {
          "name": "COL_Corner-11",
          "min": [
            -9,
            0,
            -9
          ],
          "max": [
            -6,
            0.12,
            -6
          ]
        },
        {
          "name": "COL_Corner1-1",
          "min": [
            6,
            0,
            6
          ],
          "max": [
            9,
            0.12,
            9
          ]
        },
        {
          "name": "COL_Corner11",
          "min": [
            6,
            0,
            -9
          ],
          "max": [
            9,
            0.12,
            -6
          ]
        }
      ]
    },
    "sockets": {
      "socket_arm_E": [
        9,
        0,
        0
      ],
      "socket_arm_N": [
        0,
        0,
        -9
      ],
      "socket_arm_S": [
        0,
        0,
        9
      ],
      "socket_arm_W": [
        -9,
        0,
        0
      ],
      "socket_centre": [
        0,
        0.005,
        0
      ]
    }
  },
  "oc_road_straight_01": {
    "url": "assets/props/oc_road_straight_01.glb",
    "bounds": {
      "min": [
        -9,
        -0.02,
        -6
      ],
      "max": [
        9,
        0.123,
        6
      ]
    },
    "collision": {
      "asset_id": "oc_road_straight_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_PaveL",
          "min": [
            -9,
            0,
            -6
          ],
          "max": [
            -6,
            0.12,
            6
          ]
        },
        {
          "name": "COL_PaveR",
          "min": [
            6,
            0,
            -6
          ],
          "max": [
            9,
            0.12,
            6
          ]
        }
      ]
    },
    "sockets": {
      "socket_joint_back": [
        0,
        0,
        -6
      ],
      "socket_joint_front": [
        0,
        0,
        6
      ],
      "socket_lane_back": [
        3,
        0.005,
        0
      ],
      "socket_lane_fwd": [
        -3,
        0.005,
        0
      ]
    }
  },
  "oc_road_tjunction_01": {
    "url": "assets/props/oc_road_tjunction_01.glb",
    "bounds": {
      "min": [
        -9,
        -0.02,
        -9
      ],
      "max": [
        9,
        0.123,
        9
      ]
    },
    "collision": {
      "asset_id": "oc_road_tjunction_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Corner-1-1",
          "min": [
            -9,
            0,
            6
          ],
          "max": [
            -6,
            0.12,
            9
          ]
        },
        {
          "name": "COL_Corner-11",
          "min": [
            -9,
            0,
            -9
          ],
          "max": [
            -6,
            0.12,
            -6
          ]
        },
        {
          "name": "COL_Corner1-1",
          "min": [
            6,
            0,
            6
          ],
          "max": [
            9,
            0.12,
            9
          ]
        },
        {
          "name": "COL_Corner11",
          "min": [
            6,
            0,
            -9
          ],
          "max": [
            9,
            0.12,
            -6
          ]
        },
        {
          "name": "COL_PaveW",
          "min": [
            -9,
            0,
            -6
          ],
          "max": [
            -6,
            0.12,
            6
          ]
        }
      ]
    },
    "sockets": {
      "socket_arm_E": [
        9,
        0,
        0
      ],
      "socket_arm_N": [
        0,
        0,
        -9
      ],
      "socket_arm_S": [
        0,
        0,
        9
      ],
      "socket_centre": [
        0,
        0.005,
        0
      ]
    }
  },
  "oc_sign_01": {
    "url": "assets/props/oc_sign_01.glb",
    "bounds": {
      "min": [
        -0.42,
        0,
        -0.07
      ],
      "max": [
        0.42,
        2.4,
        0.03
      ]
    },
    "collision": {
      "asset_id": "oc_sign_01",
      "space": "game: metres, Y up, +Z forward; origin at footprint centre, ground level",
      "boxes": [
        {
          "name": "COL_Sign",
          "min": [
            -0.4,
            0,
            -0.05
          ],
          "max": [
            0.4,
            2.4,
            0.05
          ]
        }
      ]
    }
  }
};
