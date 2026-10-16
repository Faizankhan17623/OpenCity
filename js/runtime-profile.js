export const runtimeProfile = {
  "contractVersion": 1,
  "id": "basic",
  "mapVersion": 1,
  "coreVersion": "0.3.10-local",
  "presentationArt": false,
  "save": {
    "live": "opencity.basic.save.v2",
    "active": "opencity.basic.active",
    "slotPrefix": "opencity.basic.slot.",
    "namePrefix": "opencity.basic.name."
  },
  "settingsDefaults": {
    "volume": 1,
    "sens": 1,
    "invertY": false,
    "lowGfx": false,
    "ao": false
  },
  "graphics": {
    "resolutionMode": "device-tier",
    "detailTiers": [
      "low",
      "medium",
      "high"
    ],
    "resolutionHeights": [
      720,
      900,
      1080
    ],
    "defaultRenderHeight": 720,
    "maxRenderPixels": 2073600
  },
  "starterVehicle": {
    "modelId": "basic-sedan",
    "fuelLiters": 35,
    "color": "#257780",
    "offsetX": 5,
    "offsetZ": 9
  },
  "vehicles": [
    {
      "id": "basic-sedan",
      "fuelCapacityLiters": 55,
      "fuelType": "petrol",
      "componentSlots": [
        "engine",
        "drivetrain",
        "chassis",
        "brakes",
        "suspension",
        "tyres"
      ],
      "asset": {
        "url": "/assets/vehicles/oc_sedan_01.glb",
        "wheels": [
          "Wheel_FL",
          "Wheel_FR",
          "Wheel_RL",
          "Wheel_RR"
        ],
        "wheelRadius": 0.355,
        "panels": {
          "Door_FL": {
            "node": "Door_FL",
            "axis": "y",
            "angle": 1.08
          },
          "Door_FR": {
            "node": "Door_FR",
            "axis": "y",
            "angle": -1.08
          },
          "Door_RL": {
            "node": "Door_RL",
            "axis": "y",
            "angle": 1.08
          },
          "Door_RR": {
            "node": "Door_RR",
            "axis": "y",
            "angle": -1.08
          },
          "Hood": {
            "node": "Hood",
            "axis": "x",
            "angle": -1.12
          },
          "Trunk": {
            "node": "Trunk",
            "axis": "x",
            "angle": 1.2
          },
          "Fuel_Flap": {
            "node": "Fuel_Flap",
            "axis": "y",
            "angle": -1.45
          }
        },
        "materials": {
          "paint": "OC_Paint_Petrol",
          "headlight": "OC_Headlight_Emission",
          "tail": "OC_Lamp_Red"
        }
      }
    },
    {
      "id": "oc_sedan_01",
      "fuelCapacityLiters": 55,
      "fuelType": "petrol",
      "componentSlots": [
        "engine",
        "drivetrain",
        "chassis",
        "brakes",
        "suspension",
        "tyres"
      ],
      "asset": {
        "url": "/assets/vehicles/oc_sedan_01.glb",
        "wheels": [
          "Wheel_FL",
          "Wheel_FR",
          "Wheel_RL",
          "Wheel_RR"
        ],
        "wheelRadius": 0.355,
        "panels": {
          "Door_FL": {
            "node": "Door_FL",
            "axis": "y",
            "angle": 1.08
          },
          "Door_FR": {
            "node": "Door_FR",
            "axis": "y",
            "angle": -1.08
          },
          "Door_RL": {
            "node": "Door_RL",
            "axis": "y",
            "angle": 1.08
          },
          "Door_RR": {
            "node": "Door_RR",
            "axis": "y",
            "angle": -1.08
          },
          "Hood": {
            "node": "Hood",
            "axis": "x",
            "angle": -1.12
          },
          "Trunk": {
            "node": "Trunk",
            "axis": "x",
            "angle": 1.2
          },
          "Fuel_Flap": {
            "node": "Fuel_Flap",
            "axis": "y",
            "angle": -1.45
          }
        },
        "materials": {
          "paint": "OC_Paint_Petrol",
          "headlight": "OC_Headlight_Emission",
          "tail": "OC_Lamp_Red"
        }
      }
    },
    {
      "id": "oc_hatch_01",
      "fuelCapacityLiters": 38,
      "fuelType": "petrol",
      "asset": {
        "url": "/assets/vehicles/oc_hatch_01.glb",
        "wheels": [
          "Wheel_FL",
          "Wheel_FR",
          "Wheel_RL",
          "Wheel_RR"
        ],
        "panels": {
          "Door_FL": {
            "node": "Door_FL",
            "axis": "y",
            "angle": 1.12
          },
          "Door_FR": {
            "node": "Door_FR",
            "axis": "y",
            "angle": -1.12
          },
          "Hood": {
            "node": "Hood",
            "axis": "x",
            "angle": -1.12
          },
          "Trunk": {
            "node": "Trunk",
            "axis": "x",
            "angle": 1.18
          },
          "Fuel_Flap": {
            "node": "Fuel_Flap",
            "axis": "y",
            "angle": -1.4
          }
        },
        "materials": {
          "paint": "OC_Vireo_Paint",
          "headlight": "OC_Vireo_Headlight",
          "tail": "OC_Vireo_Tail"
        },
        "wheelRadius": 0.315
      }
    },
    {
      "id": "oc_scooter_01",
      "bike": true,
      "fuelType": "petrol",
      "asset": {
        "wheels": [
          "Wheel_F",
          "Wheel_R"
        ],
        "steering": "Steering",
        "lean": "Lean",
        "panels": {
          "Fuel_Flap": {
            "node": "Fuel_Flap",
            "axis": "x",
            "angle": 1.3
          },
          "Seat": {
            "node": "Seat",
            "axis": "x",
            "angle": 1.15
          },
          "Stand": {
            "node": "Stand",
            "axis": "z",
            "angle": -1.2
          }
        },
        "materials": {
          "paint": "OC_Paint_Body",
          "headlight": "OC_Headlight_Emission",
          "tail": "OC_Coast_Tail"
        },
        "url": "/assets/vehicles/oc_scooter_01.glb",
        "wheelRadius": 0.27
      },
      "fuelCapacityLiters": 12,
      "componentSlots": [
        "engine",
        "drivetrain",
        "brakes",
        "tyres"
      ]
    },
    {
      "id": "oc_exotic_01",
      "fuelCapacityLiters": 78,
      "fuelType": "petrol",
      "componentSlots": [
        "engine",
        "drivetrain",
        "chassis",
        "brakes",
        "suspension",
        "tyres"
      ],
      "asset": {
        "url": "/assets/vehicles/oc_exotic_01.glb",
        "wheels": [
          "Wheel_FL",
          "Wheel_FR",
          "Wheel_RL",
          "Wheel_RR"
        ],
        "wheelRadius": 0.35,
        "panels": {
          "Door_FL": {
            "node": "Door_FL",
            "axis": "y",
            "angle": 1.08
          },
          "Door_FR": {
            "node": "Door_FR",
            "axis": "y",
            "angle": -1.08
          },
          "Door_RL": {
            "node": "Door_RL",
            "axis": "y",
            "angle": 1.08
          },
          "Door_RR": {
            "node": "Door_RR",
            "axis": "y",
            "angle": -1.08
          },
          "Hood": {
            "node": "Hood",
            "axis": "x",
            "angle": -1.12
          },
          "Trunk": {
            "node": "Trunk",
            "axis": "x",
            "angle": 1.2
          },
          "Fuel_Flap": {
            "node": "Fuel_Flap",
            "axis": "y",
            "angle": -1.45
          }
        },
        "materials": {
          "paint": "OC_Paint_Body",
          "headlight": "OC_Headlight_Emission",
          "tail": "OC_Lamp_Red"
        }
      }
    },
    {
      "id": "oc_police_sedan_01",
      "fuelCapacityLiters": 55,
      "fuelType": "petrol",
      "componentSlots": [
        "engine",
        "drivetrain",
        "chassis",
        "brakes",
        "suspension",
        "tyres"
      ],
      "asset": {
        "url": "/assets/vehicles/oc_police_sedan_01.glb",
        "wheels": [
          "Wheel_FL",
          "Wheel_FR",
          "Wheel_RL",
          "Wheel_RR"
        ],
        "wheelRadius": 0.355,
        "panels": {
          "Door_FL": {
            "node": "Door_FL",
            "axis": "y",
            "angle": 1.08
          },
          "Door_FR": {
            "node": "Door_FR",
            "axis": "y",
            "angle": -1.08
          },
          "Door_RL": {
            "node": "Door_RL",
            "axis": "y",
            "angle": 1.08
          },
          "Door_RR": {
            "node": "Door_RR",
            "axis": "y",
            "angle": -1.08
          },
          "Hood": {
            "node": "Hood",
            "axis": "x",
            "angle": -1.12
          },
          "Trunk": {
            "node": "Trunk",
            "axis": "x",
            "angle": 1.2
          },
          "Fuel_Flap": {
            "node": "Fuel_Flap",
            "axis": "y",
            "angle": -1.45
          }
        },
        "materials": {
          "paint": "OC_Paint_Police",
          "headlight": "OC_Headlight_Emission",
          "tail": "OC_Lamp_Red"
        },
        "emergencyLights": [
          "OC_Lightbar_Emission",
          "OC_Lightbar_Emission_B"
        ]
      }
    }
  ],
  "services": {
    "bank": false,
    "bankCredentialKey": "opencity.basic.bank"
  },
  "economy": {
    "principalCapCents": 1000000,
    "maxLoans": 1,
    "bridgeCapCents": 100000,
    "maxBridgeLoans": 1,
    "rateBps": 2500,
    "daySeconds": 1440
  },
  "policeHelicopterAsset": {
    "url": "/assets/vehicles/oc_police_heli_01.glb",
    "root": "OC_Police_Heli_01",
    "mainRotor": "Rotor_Main",
    "tailRotor": "Rotor_Tail"
  }
};
