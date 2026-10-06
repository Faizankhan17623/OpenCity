// Central campaign mission data. Rewards are provisional game-balancing amounts.
export const CAMPAIGN_LOCATIONS = {
  "workshop": {
    "label": "Mendez Motor Works",
    "road": [
      4,
      5
    ]
  },
  "petrol": {
    "label": "Staffed forecourt",
    "road": [
      5,
      4
    ]
  },
  "parts": {
    "label": "Parts receiving counter",
    "road": [
      4,
      3
    ]
  },
  "hotel": {
    "label": "Orchid service entrance",
    "road": [
      3,
      2
    ]
  },
  "flats": {
    "label": "Marina residences",
    "road": [
      3,
      4
    ]
  },
  "coast": {
    "label": "Coast Road safe stop",
    "road": [
      1,
      3
    ]
  },
  "showroom": {
    "label": "Auto Palace",
    "road": [
      6,
      5
    ]
  },
  "bank": {
    "label": "City Bank",
    "road": [
      5,
      6
    ]
  },
  "holding": {
    "label": "Vehicle holding yard",
    "road": [
      7,
      6
    ]
  },
  "depot": {
    "label": "Fleet receiving depot",
    "road": [
      8,
      6
    ]
  },
  "auction": {
    "label": "Auction intake desk",
    "road": [
      7,
      5
    ]
  },
  "club": {
    "label": "Palm Club service court",
    "road": [
      6,
      2
    ]
  },
  "radio": {
    "label": "Radio courtyard",
    "road": [
      5,
      2
    ]
  },
  "inquiry": {
    "label": "Inquiry meeting point",
    "road": [
      4,
      7
    ]
  },
  "clinic": {
    "label": "Clinic transfer bay",
    "road": [
      3,
      6
    ]
  },
  "terminal": {
    "label": "Harbour terminal",
    "road": [
      2,
      8
    ]
  },
  "island": {
    "label": "Outer coast collection point",
    "road": [
      1,
      8
    ]
  },
  "yard": {
    "label": "Ward service yard",
    "road": [
      3,
      8
    ]
  },
  "shelter": {
    "label": "Staffed shelter receiving point",
    "road": [
      4,
      4
    ]
  },
  "dispatch": {
    "label": "Eastline dispatch",
    "road": [
      7,
      7
    ]
  },
  "market": {
    "label": "Market receiving bay",
    "road": [
      8,
      4
    ]
  },
  "rest": {
    "label": "Staffed roadside rest stop",
    "road": [
      8,
      2
    ]
  },
  "office": {
    "label": "Kai’s workspace",
    "road": [
      4,
      5
    ]
  },
  "studio": {
    "label": "Restoration and rehearsal block",
    "road": [
      6,
      3
    ]
  },
  "estate": {
    "label": "Hill estate receiving point",
    "road": [
      8,
      1
    ]
  },
  "gate": {
    "label": "Access control meeting point",
    "road": [
      9,
      4
    ]
  },
  "customs": {
    "label": "South Quay Customs",
    "road": [
      6,
      8
    ]
  },
  "test": {
    "label": "Workshop road-test checkpoint",
    "road": [
      5,
      8
    ]
  },
  "transfer": {
    "label": "Inland staffed transfer",
    "road": [
      2,
      6
    ]
  }
};

export const CAMPAIGN_MISSIONS = [
  {
    "id": "M01",
    "title": "Last Stop",
    "chapter": "Low Tide",
    "contact": "Rosa",
    "location": "workshop",
    "vehicle": "car",
    "reward": 250,
    "optional": false,
    "requires": [],
    "summary": "Collect Rosa's alternator. Stop for petrol first.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "KAI",
            "text": "Mum? I'm here."
          },
          {
            "speaker": "KAMILA",
            "text": "Did you eat?",
            "delivery": "telephone"
          },
          {
            "speaker": "KAI",
            "text": "I said I'm here, not twelve."
          },
          {
            "speaker": "KAMILA",
            "text": "Twelve-year-olds answer the question."
          },
          {
            "speaker": "KAI",
            "text": "I'll find something."
          },
          {
            "speaker": "KAMILA",
            "text": "And somewhere to sleep?"
          },
          {
            "speaker": "KAI",
            "text": "I know somebody."
          },
          {
            "speaker": "ROSA",
            "text": "Your mother said you might visit."
          },
          {
            "speaker": "KAI",
            "text": "I didn't say I was staying."
          },
          {
            "speaker": "ROSA",
            "text": "Good. Sofa's uncomfortable. Parts counter has my alternator. Green sedan's outside."
          },
          {
            "speaker": "KAI",
            "text": "You're giving me a job?"
          },
          {
            "speaker": "ROSA",
            "text": "I'm asking for an alternator. Let's see how ambitious we get afterward."
          }
        ],
        "key": "M01:0"
      },
      {
        "type": "drive",
        "location": "petrol",
        "label": "Stop for petrol",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M01:1"
      },
      {
        "type": "interact",
        "location": "petrol",
        "label": "Stop for petrol",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the work-car fuel allowance",
            "kind": "confirm"
          }
        ],
        "key": "M01:2"
      },
      {
        "type": "dialogue",
        "location": "petrol",
        "label": "At the forecourt",
        "lines": [
          {
            "speaker": "KAI",
            "text": "Gauge broken?"
          },
          {
            "speaker": "ROSA",
            "text": "No. That would be the optimistic explanation."
          },
          {
            "speaker": "NORA",
            "text": "Little Kai Dena. Still racing shopping trolleys?",
            "delivery": "at pump"
          },
          {
            "speaker": "KAI",
            "text": "More sophisticated vehicles now."
          },
          {
            "speaker": "KAI",
            "text": "Eventually."
          }
        ],
        "key": "M01:3"
      },
      {
        "type": "drive",
        "location": "parts",
        "label": "Collect Rosa’s alternator",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M01:4"
      },
      {
        "type": "interact",
        "location": "parts",
        "label": "Collect Rosa’s alternator",
        "actions": [
          {
            "id": "action-0",
            "label": "Check the reservation",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Match the alternator label",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Accept the receipt",
            "kind": "confirm"
          }
        ],
        "key": "M01:5"
      },
      {
        "type": "dialogue",
        "location": "parts",
        "label": "At the parts counter",
        "lines": [
          {
            "speaker": "PARTS CLERK",
            "text": "Mendez? Tell her the old one was beyond saving."
          },
          {
            "speaker": "KAI",
            "text": "You tell her. I'd like a second day."
          }
        ],
        "key": "M01:6"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Deliver Rosa’s parts",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M01:7"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Deliver Rosa’s parts",
        "actions": [
          {
            "id": "action-0",
            "label": "Hand over the alternator and receipt",
            "kind": "confirm"
          }
        ],
        "key": "M01:8"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "You brought the receipt."
          },
          {
            "speaker": "KAI",
            "text": "I brought the car too."
          },
          {
            "speaker": "ROSA",
            "text": "Don't put that on the invoice. There's food upstairs."
          }
        ],
        "key": "M01:9"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M02",
    "title": "Honest Miles",
    "chapter": "Low Tide",
    "contact": "Rosa",
    "location": "flats",
    "vehicle": "bike",
    "reward": 275,
    "optional": false,
    "requires": [
      "M01"
    ],
    "summary": "Return the repaired bike to hotel porter Ewan.",
    "stages": [
      {
        "type": "dialogue",
        "location": "flats",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "Rear brake, then the light. In that order."
          },
          {
            "speaker": "MILO",
            "text": "I checked both."
          },
          {
            "speaker": "ROSA",
            "text": "Good. Tell him what you checked."
          },
          {
            "speaker": "MILO",
            "text": "Brake cable and stop light. Don't make me come and rescue it.",
            "delivery": "to Kai"
          },
          {
            "speaker": "KAI",
            "text": "Everybody here gives the same welcome."
          }
        ],
        "key": "M02:0"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Check Milo’s repaired bike",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M02:1"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Check Milo’s repaired bike",
        "actions": [
          {
            "id": "action-0",
            "label": "Check the signed-off brakes",
            "kind": "inspect",
            "component": "brakes"
          },
          {
            "id": "action-1",
            "label": "Check the stop light",
            "kind": "confirm"
          }
        ],
        "key": "M02:2"
      },
      {
        "type": "drive",
        "location": "hotel",
        "label": "Deliver Ewan’s bike",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M02:3"
      },
      {
        "type": "interact",
        "location": "hotel",
        "label": "Deliver Ewan’s bike",
        "actions": [
          {
            "id": "action-0",
            "label": "Hand over keys and service note",
            "kind": "confirm"
          }
        ],
        "key": "M02:4"
      },
      {
        "type": "drive",
        "location": "coast",
        "label": "Help Nora’s interrupted route",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M02:5"
      },
      {
        "type": "interact",
        "location": "coast",
        "label": "Help Nora’s interrupted route",
        "actions": [
          {
            "id": "action-0",
            "label": "Ask which deliveries remain",
            "kind": "confirm"
          }
        ],
        "key": "M02:6"
      },
      {
        "type": "dialogue",
        "location": "coast",
        "label": "Conversation — Honest Miles",
        "lines": [
          {
            "speaker": "EWAN",
            "text": "Can I pay Rosa Friday?"
          },
          {
            "speaker": "KAI",
            "text": "She wrote Friday on the envelope."
          },
          {
            "speaker": "EWAN",
            "text": "I haven't asked her yet."
          },
          {
            "speaker": "KAI",
            "text": "Apparently you're predictable."
          },
          {
            "speaker": "NORA",
            "text": "Don't say it looks hot. So do I, and neither observation helps."
          },
          {
            "speaker": "KAI",
            "text": "What's still on the route?"
          },
          {
            "speaker": "NORA",
            "text": "Orchid, then the flats. The sheets won't carry themselves."
          },
          {
            "speaker": "ROSA",
            "text": "Yes, help her. No, don't promise a new engine on my behalf.",
            "delivery": "telephone"
          }
        ],
        "key": "M02:7"
      },
      {
        "type": "drive",
        "location": "hotel",
        "label": "Deliver the hotel linens",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M02:8"
      },
      {
        "type": "interact",
        "location": "hotel",
        "label": "Deliver the hotel linens",
        "actions": [
          {
            "id": "action-0",
            "label": "Obtain the first signature",
            "kind": "confirm"
          }
        ],
        "key": "M02:9"
      },
      {
        "type": "drive",
        "location": "flats",
        "label": "Finish Nora’s route",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M02:10"
      },
      {
        "type": "interact",
        "location": "flats",
        "label": "Finish Nora’s route",
        "actions": [
          {
            "id": "action-0",
            "label": "Obtain the final signature",
            "kind": "confirm"
          }
        ],
        "key": "M02:11"
      },
      {
        "type": "dialogue",
        "location": "flats",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "NORA",
            "text": "You used to leave halfway through a job."
          },
          {
            "speaker": "KAI",
            "text": "I was fourteen."
          },
          {
            "speaker": "NORA",
            "text": "Useful age for practising finishing."
          },
          {
            "speaker": "KAI",
            "text": "I'll put that on my next application."
          }
        ],
        "key": "M02:12"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M03",
    "title": "Malik Select",
    "chapter": "Low Tide",
    "contact": "Dev",
    "location": "bank",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M02"
    ],
    "summary": "Test-drive the hatchback; discuss an account with Leela.",
    "stages": [
      {
        "type": "dialogue",
        "location": "bank",
        "label": "Meet Dev",
        "lines": [
          {
            "speaker": "DEV",
            "text": "Six years and you come back in Rosa's green apology."
          },
          {
            "speaker": "KAI",
            "text": "It starts."
          },
          {
            "speaker": "DEV",
            "text": "So does a career. Come here."
          },
          {
            "speaker": "DEV",
            "text": "Dreams over here. This month's possibilities over there."
          },
          {
            "speaker": "KAI",
            "text": "I like the one that doesn't eat my rent."
          }
        ],
        "key": "M03:0"
      },
      {
        "type": "drive",
        "location": "coast",
        "label": "Complete the demonstration route",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M03:1"
      },
      {
        "type": "interact",
        "location": "coast",
        "label": "Complete the demonstration route",
        "actions": [
          {
            "id": "action-0",
            "label": "Review the handling while stopped",
            "kind": "confirm"
          }
        ],
        "key": "M03:2"
      },
      {
        "type": "drive",
        "location": "showroom",
        "label": "Return the test vehicle",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M03:3"
      },
      {
        "type": "interact",
        "location": "showroom",
        "label": "Return the test vehicle",
        "actions": [
          {
            "id": "action-0",
            "label": "Record its return condition",
            "kind": "confirm"
          }
        ],
        "key": "M03:4"
      },
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Conversation — Malik Select",
        "lines": [
          {
            "speaker": "DEV",
            "text": "We said we'd own a yard together.",
            "delivery": "passenger"
          },
          {
            "speaker": "KAI",
            "text": "We also said we'd never wear ties."
          },
          {
            "speaker": "DEV",
            "text": "You can't hold a man to everything."
          },
          {
            "speaker": "LEELA",
            "text": "Monthly payment isn't the whole price."
          },
          {
            "speaker": "DEV",
            "text": "I was getting there."
          },
          {
            "speaker": "LEELA",
            "text": "Excellent. I'll wait with the numbers."
          },
          {
            "speaker": "KAI",
            "text": "Can I open the account and think about the car?"
          },
          {
            "speaker": "LEELA",
            "text": "That's allowed. Nobody pays interest on thinking."
          }
        ],
        "key": "M03:5"
      },
      {
        "type": "drive",
        "location": "bank",
        "label": "Discuss an account with Leela",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M03:6"
      },
      {
        "type": "interact",
        "location": "bank",
        "label": "Discuss an account with Leela",
        "actions": [
          {
            "id": "action-0",
            "label": "Review interest and total cost",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Keep the purchase decision open",
            "kind": "confirm"
          }
        ],
        "key": "M03:7"
      },
      {
        "type": "dialogue",
        "location": "bank",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "DEV",
            "text": "You're careful now."
          },
          {
            "speaker": "KAI",
            "text": "I'm broke. Similar outfit."
          },
          {
            "speaker": "DEV",
            "text": "I've got private work coming. Better than parts runs."
          },
          {
            "speaker": "KAI",
            "text": "Call me when it's real."
          }
        ],
        "key": "M03:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M04",
    "title": "One Small Signature",
    "chapter": "Low Tide",
    "contact": "Dev",
    "location": "workshop",
    "vehicle": "van",
    "reward": 0,
    "optional": false,
    "requires": [
      "M03"
    ],
    "summary": "Inspect the collection order; deliver the van.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Dev",
        "lines": [
          {
            "speaker": "DEV",
            "text": "Broker needs a van shifted. Proper paperwork. Good pay."
          },
          {
            "speaker": "KAI",
            "text": "Why not one of his drivers?"
          },
          {
            "speaker": "DEV",
            "text": "They're busy. You're available. Don't turn arithmetic into an insult."
          },
          {
            "speaker": "KAI",
            "text": "I'm asking what I'm carrying."
          },
          {
            "speaker": "DEV",
            "text": "A van. For once, nothing hidden inside it."
          }
        ],
        "key": "M04:0"
      },
      {
        "type": "drive",
        "location": "holding",
        "label": "Inspect the collection order",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M04:1"
      },
      {
        "type": "interact",
        "location": "holding",
        "label": "Inspect the collection order",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the witness line",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Sign the fixed story handover",
            "kind": "confirm"
          }
        ],
        "key": "M04:2"
      },
      {
        "type": "dialogue",
        "location": "holding",
        "label": "Conversation — One Small Signature",
        "lines": [
          {
            "speaker": "CLERK",
            "text": "Witness signature there."
          },
          {
            "speaker": "KAI",
            "text": "Owner already gone?"
          },
          {
            "speaker": "CLERK",
            "text": "Before my shift. Form wasn't finished."
          },
          {
            "speaker": "KAI",
            "text": "Then I didn't witness it."
          },
          {
            "speaker": "DEV",
            "text": "It's a handover, Kai. You have the keys. We can stand here all afternoon."
          }
        ],
        "key": "M04:3"
      },
      {
        "type": "drive",
        "location": "depot",
        "label": "Deliver the assigned van",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M04:4"
      },
      {
        "type": "interact",
        "location": "depot",
        "label": "Deliver the assigned van",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the old business lettering",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Give the receiving clerk the keys",
            "kind": "confirm"
          }
        ],
        "key": "M04:5"
      },
      {
        "type": "dialogue",
        "location": "depot",
        "label": "Conversation — One Small Signature",
        "lines": [
          {
            "speaker": "KAI",
            "text": "Dev. Who owned this van?",
            "delivery": "phone"
          },
          {
            "speaker": "DEV",
            "text": "I'm driving. Talk when you're back."
          },
          {
            "speaker": "DEPOT WORKER",
            "text": "Keys in the office. We've got the shelves to remove."
          },
          {
            "speaker": "KAI",
            "text": "Wait. I need to check something."
          },
          {
            "speaker": "DEPOT WORKER",
            "text": "With the broker. It's received now."
          }
        ],
        "key": "M04:6"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Return with the broker’s payment",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M04:7"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Return with the broker’s payment",
        "actions": [
          {
            "id": "action-0",
            "label": "Keep the sealed fee with the disputed records",
            "kind": "confirm"
          }
        ],
        "key": "M04:8"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "NORA",
            "text": "Paid Tuesday. They say I surrendered it. To whom? A ghost?"
          },
          {
            "speaker": "ROSA",
            "text": "We'll find out."
          },
          {
            "speaker": "NORA",
            "text": "You know drivers. Ask around?",
            "delivery": "to Kai"
          },
          {
            "speaker": "KAI",
            "text": "Yes."
          }
        ],
        "key": "M04:9"
      }
    ],
    "outcomes": {
      "falseSignature": true,
      "brokerFeeHeld": true
    }
  },
  {
    "id": "M05",
    "title": "What A Receipt Is Worth",
    "chapter": "Low Tide",
    "contact": "Rosa",
    "location": "radio",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M04"
    ],
    "summary": "Tell Nora the truth; accompany her to challenge the record.",
    "stages": [
      {
        "type": "dialogue",
        "location": "radio",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "Tell me before I have to ask Nora."
          },
          {
            "speaker": "KAI",
            "text": "I moved it. I didn't know until I saw the lettering."
          },
          {
            "speaker": "ROSA",
            "text": "And then?"
          },
          {
            "speaker": "KAI",
            "text": "I finished the run."
          },
          {
            "speaker": "ROSA",
            "text": "And the signature?"
          },
          {
            "speaker": "KAI",
            "text": "They said it was paperwork."
          },
          {
            "speaker": "ROSA",
            "text": "That's how they made it look like she agreed."
          },
          {
            "speaker": "ROSA",
            "text": "Finish the customers you promised. Find another bed tonight."
          }
        ],
        "key": "M05:0"
      },
      {
        "type": "drive",
        "location": "flats",
        "label": "Tell Nora the truth",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M05:1"
      },
      {
        "type": "interact",
        "location": "flats",
        "label": "Tell Nora the truth",
        "actions": [
          {
            "id": "action-0",
            "label": "Admit the false witness signature",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Return the sealed broker payment",
            "kind": "confirm"
          }
        ],
        "key": "M05:2"
      },
      {
        "type": "drive",
        "location": "bank",
        "label": "Challenge the disputed record",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M05:3"
      },
      {
        "type": "interact",
        "location": "bank",
        "label": "Challenge the disputed record",
        "actions": [
          {
            "id": "action-0",
            "label": "Compare Nora’s authorised receipts",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Accept the discrepancy copy",
            "kind": "confirm"
          }
        ],
        "key": "M05:4"
      },
      {
        "type": "dialogue",
        "location": "bank",
        "label": "Conversation — What A Receipt Is Worth",
        "lines": [
          {
            "speaker": "KAI",
            "text": "I signed that I saw you hand it over. I didn't."
          },
          {
            "speaker": "NORA",
            "text": "I know where I was. What are you doing about where you were?"
          },
          {
            "speaker": "KAI",
            "text": "Starting here. This is what they paid me."
          },
          {
            "speaker": "NORA",
            "text": "Part of what you owe. Not the price of silence."
          },
          {
            "speaker": "LEELA",
            "text": "These payments don't match the claimed default.",
            "delivery": "with Nora present"
          },
          {
            "speaker": "KAI",
            "text": "Can you get it back?"
          },
          {
            "speaker": "LEELA",
            "text": "I can certify the discrepancy. I won't promise what I don't control."
          }
        ],
        "key": "M05:5"
      },
      {
        "type": "drive",
        "location": "radio",
        "label": "Bring Nora to Imani",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M05:6"
      },
      {
        "type": "interact",
        "location": "radio",
        "label": "Bring Nora to Imani",
        "actions": [
          {
            "id": "action-0",
            "label": "Ask permission for Nora’s interview",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Let Nora give her own account",
            "kind": "confirm"
          }
        ],
        "key": "M05:7"
      },
      {
        "type": "dialogue",
        "location": "radio",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "IMANI",
            "text": "May I record you?"
          },
          {
            "speaker": "NORA",
            "text": "Me. Not him explaining me."
          },
          {
            "speaker": "IMANI",
            "text": "Agreed. Kai, you can wait."
          },
          {
            "speaker": "KAI",
            "text": "I'll drive when you're ready."
          }
        ],
        "key": "M05:8"
      }
    ],
    "outcomes": {
      "brokerFeeHeld": false,
      "truthTold": true
    }
  },
  {
    "id": "M06",
    "title": "Lot Seventeen",
    "chapter": "Low Tide",
    "contact": "Nora",
    "location": "workshop",
    "vehicle": "car",
    "reward": 200,
    "optional": false,
    "requires": [
      "M05"
    ],
    "summary": "Submit the complaint before lot seventeen; meet the other owners.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Nora",
        "lines": [
          {
            "speaker": "NORA",
            "text": "Waterproof. Better than their filing system already."
          },
          {
            "speaker": "KAI",
            "text": "We get the dispute to the supervisor, not the bidder."
          },
          {
            "speaker": "NORA",
            "text": "Good. I wasn't planning to buy my own van twice."
          }
        ],
        "key": "M06:0"
      },
      {
        "type": "drive",
        "location": "auction",
        "label": "Submit the dispute at intake",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M06:1"
      },
      {
        "type": "interact",
        "location": "auction",
        "label": "Submit the dispute at intake",
        "actions": [
          {
            "id": "action-0",
            "label": "Deliver the complaint",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Obtain the signed hold notice",
            "kind": "confirm"
          }
        ],
        "key": "M06:2"
      },
      {
        "type": "drive",
        "location": "showroom",
        "label": "Meet affected owner Ada",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M06:3"
      },
      {
        "type": "interact",
        "location": "showroom",
        "label": "Meet affected owner Ada",
        "actions": [
          {
            "id": "action-0",
            "label": "Record Ada’s account with permission",
            "kind": "confirm"
          }
        ],
        "key": "M06:4"
      },
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Conversation — Lot Seventeen",
        "lines": [
          {
            "speaker": "SUPERVISOR",
            "text": "This puts the lot on hold. It doesn't settle ownership today."
          },
          {
            "speaker": "NORA",
            "text": "Hold is a start. Give me a copy with your name."
          },
          {
            "speaker": "ADA",
            "text": "Mine's the motorcycle. Different letter. Same people."
          },
          {
            "speaker": "KAI",
            "text": "Did they speak to you before taking it?"
          },
          {
            "speaker": "ADA",
            "text": "You're the first driver who's asked."
          },
          {
            "speaker": "KAI",
            "text": "You're buying these?"
          },
          {
            "speaker": "DEV",
            "text": "For an account. I don't decide the cases."
          },
          {
            "speaker": "KAI",
            "text": "You keep finding jobs without decisions in them."
          }
        ],
        "key": "M06:5"
      },
      {
        "type": "drive",
        "location": "hotel",
        "label": "Take Ada to her shift",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M06:6"
      },
      {
        "type": "interact",
        "location": "hotel",
        "label": "Take Ada to her shift",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the drop-off",
            "kind": "confirm"
          }
        ],
        "key": "M06:7"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Report the sale hold",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M06:8"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Report the sale hold",
        "actions": [
          {
            "id": "action-0",
            "label": "Explain that ownership remains under review",
            "kind": "confirm"
          }
        ],
        "key": "M06:9"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "People have been asking for you."
          },
          {
            "speaker": "KAI",
            "text": "You told them I was reliable?"
          },
          {
            "speaker": "ROSA",
            "text": "I told them you know the roads. Don't make me a liar twice."
          }
        ],
        "key": "M06:10"
      }
    ],
    "outcomes": {
      "noraSaleHeld": true
    }
  },
  {
    "id": "M07",
    "title": "A Better Offer",
    "chapter": "Low Tide",
    "contact": "Vale",
    "location": "inquiry",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M06"
    ],
    "summary": "Hear Vale's proposal; return to Marina Quarter.",
    "stages": [
      {
        "type": "dialogue",
        "location": "inquiry",
        "label": "Meet Vale",
        "lines": [
          {
            "speaker": "HOST",
            "text": "Mr Dena. Mr Vale's expecting you."
          },
          {
            "speaker": "KAI",
            "text": "That makes one of us."
          },
          {
            "speaker": "VALE",
            "text": "Dev says you know every road here."
          },
          {
            "speaker": "KAI",
            "text": "Enough to get lost without admitting it."
          },
          {
            "speaker": "VALE",
            "text": "Then you already understand executive transport."
          }
        ],
        "key": "M07:0"
      },
      {
        "type": "drive",
        "location": "club",
        "label": "Hear Vale’s proposal",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M07:1"
      },
      {
        "type": "interact",
        "location": "club",
        "label": "Hear Vale’s proposal",
        "actions": [
          {
            "id": "action-0",
            "label": "Review the proposed relocation",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Decline interference with Nora’s complaint",
            "kind": "confirm"
          }
        ],
        "key": "M07:2"
      },
      {
        "type": "dialogue",
        "location": "club",
        "label": "Conversation — A Better Offer",
        "lines": [
          {
            "speaker": "VALE",
            "text": "Regular clients. A salary. A new unit for your friend's workshop."
          },
          {
            "speaker": "KAI",
            "text": "Outside town, away from her customers."
          },
          {
            "speaker": "VALE",
            "text": "Space costs money. Staying still costs it too."
          },
          {
            "speaker": "KAI",
            "text": "Nora's complaint stays."
          },
          {
            "speaker": "VALE",
            "text": "A false witness statement is serious. Be sure she understands yours."
          }
        ],
        "key": "M07:3"
      },
      {
        "type": "dialogue",
        "location": "club",
        "label": "Conversation — A Better Offer",
        "lines": [
          {
            "speaker": "MERCER",
            "text": "Did you drive this van?"
          },
          {
            "speaker": "KAI",
            "text": "Yes."
          },
          {
            "speaker": "MERCER",
            "text": "Did you see the owner surrender it?"
          },
          {
            "speaker": "KAI",
            "text": "No. I told Nora that."
          },
          {
            "speaker": "MERCER",
            "text": "Now tell me. In the statement."
          },
          {
            "speaker": "KAI",
            "text": "Are you working for Vale?"
          },
          {
            "speaker": "MERCER",
            "text": "Anger isn't evidence. Neither is liking you."
          }
        ],
        "key": "M07:4"
      },
      {
        "type": "drive",
        "location": "inquiry",
        "label": "Attend Mercer’s interview",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M07:5"
      },
      {
        "type": "interact",
        "location": "inquiry",
        "label": "Attend Mercer’s interview",
        "actions": [
          {
            "id": "action-0",
            "label": "Stop safely for the interview",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Give the truthful witness account",
            "kind": "confirm"
          }
        ],
        "key": "M07:6"
      },
      {
        "type": "dialogue",
        "location": "inquiry",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "MERCER",
            "text": "Keep your appointment. Don't interfere with anyone else's account."
          },
          {
            "speaker": "KAI",
            "text": "I'll be there."
          }
        ],
        "key": "M07:7"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M08",
    "title": "The Short Route",
    "chapter": "Low Tide",
    "contact": "Imani",
    "location": "workshop",
    "vehicle": "car",
    "reward": 400,
    "optional": false,
    "requires": [
      "M07"
    ],
    "summary": "Collect Owen; reach a public safe place when followed.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Imani",
        "lines": [
          {
            "speaker": "IMANI",
            "text": "Owen will speak. Bring him to the station. Don't promise him protection you don't have."
          },
          {
            "speaker": "LEELA",
            "text": "The branch suspended me after I challenged the closed report. The owners' authorised copies are still with them."
          },
          {
            "speaker": "KAI",
            "text": "For showing them their own payments?"
          },
          {
            "speaker": "LEELA",
            "text": "Pending review, they say. I'll answer with the records, not guesses about motives."
          },
          {
            "speaker": "KAI",
            "text": "I'm a lift, not an army."
          },
          {
            "speaker": "IMANI",
            "text": "Remember that if he gets frightened."
          },
          {
            "speaker": "DEV",
            "text": "Where are you today?",
            "delivery": "calling"
          },
          {
            "speaker": "KAI",
            "text": "Depot, then radio station. Maybe come and explain your invoices."
          },
          {
            "speaker": "DEV",
            "text": "Maybe I will."
          }
        ],
        "key": "M08:0"
      },
      {
        "type": "drive",
        "location": "depot",
        "label": "Collect Owen for his voluntary statement",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M08:1"
      },
      {
        "type": "interact",
        "location": "depot",
        "label": "Collect Owen for his voluntary statement",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm Owen agrees to the lift",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Check the passenger list",
            "kind": "confirm"
          }
        ],
        "key": "M08:2"
      },
      {
        "type": "drive",
        "location": "coast",
        "label": "Use the public approach",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M08:3"
      },
      {
        "type": "interact",
        "location": "coast",
        "label": "Use the public approach",
        "actions": [
          {
            "id": "action-0",
            "label": "Report the repeated vehicle sighting",
            "kind": "confirm"
          }
        ],
        "key": "M08:4"
      },
      {
        "type": "drive",
        "location": "petrol",
        "label": "Reach the staffed sanctuary",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M08:5"
      },
      {
        "type": "interact",
        "location": "petrol",
        "label": "Reach the staffed sanctuary",
        "actions": [
          {
            "id": "action-0",
            "label": "Ask Mara to call for help",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm Owen is safe inside",
            "kind": "confirm"
          }
        ],
        "key": "M08:6"
      },
      {
        "type": "dialogue",
        "location": "petrol",
        "label": "Conversation — The Short Route",
        "lines": [
          {
            "speaker": "OWEN",
            "text": "I assigned trucks. That's what I do. Some orders skipped the usual review."
          },
          {
            "speaker": "KAI",
            "text": "Who asked for that?"
          },
          {
            "speaker": "OWEN",
            "text": "The names are why I didn't say yes yesterday."
          },
          {
            "speaker": "OWEN",
            "text": "That's one of the crews."
          },
          {
            "speaker": "KAI",
            "text": "Forecourt ahead. Lights, people. Keep your belt on."
          },
          {
            "speaker": "RECOVERY DRIVER",
            "text": "Pull over! We only want a word!"
          },
          {
            "speaker": "KAI",
            "text": "Then they can use the telephone."
          },
          {
            "speaker": "MARA",
            "text": "Nobody gets dragged out of a car here. I've called it in."
          }
        ],
        "key": "M08:7"
      },
      {
        "type": "drive",
        "location": "radio",
        "label": "Complete the agreed witness transfer",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M08:8"
      },
      {
        "type": "interact",
        "location": "radio",
        "label": "Complete the agreed witness transfer",
        "actions": [
          {
            "id": "action-0",
            "label": "Hand over the appointment reference",
            "kind": "confirm"
          }
        ],
        "key": "M08:9"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Report the escort car’s condition",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M08:10"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Report the escort car’s condition",
        "actions": [
          {
            "id": "action-0",
            "label": "Check braking condition",
            "kind": "inspect",
            "component": "brakes"
          },
          {
            "id": "action-1",
            "label": "Record the repair handover",
            "kind": "confirm"
          }
        ],
        "key": "M08:11"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "KAI",
            "text": "Can you make it faster?"
          },
          {
            "speaker": "ROSA",
            "text": "Tonight? I'll make it stop when you ask it to."
          },
          {
            "speaker": "OWEN",
            "text": "My family needs somewhere else for a few days. Then I'll speak.",
            "delivery": "telephone"
          },
          {
            "speaker": "IMANI",
            "text": "We can arrange a place with your sister. You choose what goes on record."
          }
        ],
        "key": "M08:12"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M09",
    "title": "Under The Arches",
    "chapter": "Low Tide",
    "contact": "Kai",
    "location": "radio",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M08"
    ],
    "summary": "Hear Dev's account; bring him and his records to Imani.",
    "stages": [
      {
        "type": "dialogue",
        "location": "radio",
        "label": "Meet Kai",
        "lines": [
          {
            "speaker": "DEV",
            "text": "They called in the stock. I'm finished."
          },
          {
            "speaker": "KAI",
            "text": "Owen nearly was. Who knew our route?"
          },
          {
            "speaker": "DEV",
            "text": "I thought they'd talk to you."
          },
          {
            "speaker": "KAI",
            "text": "You told them."
          },
          {
            "speaker": "DEV",
            "text": "They said they'd straighten the account if I helped settle it."
          },
          {
            "speaker": "KAI",
            "text": "You knew enough to ask what you'd get."
          }
        ],
        "key": "M09:0"
      },
      {
        "type": "drive",
        "location": "showroom",
        "label": "Hear Dev’s confession",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M09:1"
      },
      {
        "type": "interact",
        "location": "showroom",
        "label": "Hear Dev’s confession",
        "actions": [
          {
            "id": "action-0",
            "label": "Ask who knew Owen’s route",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Accept the volunteered complete records",
            "kind": "confirm"
          }
        ],
        "key": "M09:2"
      },
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Conversation — Under The Arches",
        "lines": [
          {
            "speaker": "DEV",
            "text": "These purchases went through my account. The delivery invoices name a Bluewater company."
          },
          {
            "speaker": "KAI",
            "text": "All of them. Not a selection that makes you look unlucky."
          },
          {
            "speaker": "DEV",
            "text": "Tell me I won't be arrested."
          },
          {
            "speaker": "KAI",
            "text": "I can't."
          },
          {
            "speaker": "DEV",
            "text": "Then what are you offering?"
          },
          {
            "speaker": "KAI",
            "text": "A lift to somewhere you can stop lying."
          }
        ],
        "key": "M09:3"
      },
      {
        "type": "drive",
        "location": "radio",
        "label": "Bring Dev to his agreed interview",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M09:4"
      },
      {
        "type": "interact",
        "location": "radio",
        "label": "Bring Dev to his agreed interview",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the full account is included",
            "kind": "confirm"
          }
        ],
        "key": "M09:5"
      },
      {
        "type": "dialogue",
        "location": "radio",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "IMANI",
            "text": "Start with what you did. We'll get to what they asked afterward."
          },
          {
            "speaker": "DEV",
            "text": "Can this part be off the record?"
          },
          {
            "speaker": "IMANI",
            "text": "We can discuss how to record it. We can't make it not happen."
          }
        ],
        "key": "M09:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M10",
    "title": "Names On The Page",
    "chapter": "Low Tide",
    "contact": "Imani",
    "location": "showroom",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M09"
    ],
    "summary": "Give the corrected statement; take Nora to the hire office.",
    "stages": [
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Meet Imani",
        "lines": [
          {
            "speaker": "IMANI",
            "text": "Their statements support yours. They don't replace it."
          },
          {
            "speaker": "KAI",
            "text": "I understand."
          },
          {
            "speaker": "NORA",
            "text": "Good. Save us the explanation of why you almost didn't mean it."
          }
        ],
        "key": "M10:0"
      },
      {
        "type": "drive",
        "location": "inquiry",
        "label": "Correct the witness statement",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M10:1"
      },
      {
        "type": "interact",
        "location": "inquiry",
        "label": "Correct the witness statement",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the revised wording",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Sign the corrected account",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Keep the case reference",
            "kind": "confirm"
          }
        ],
        "key": "M10:2"
      },
      {
        "type": "dialogue",
        "location": "inquiry",
        "label": "Conversation — Names On The Page",
        "lines": [
          {
            "speaker": "MERCER",
            "text": "This officer approved several disputed entries. Another unit will review them."
          },
          {
            "speaker": "LEELA",
            "text": "My report was closed. Here is its reference and the customers' authorisation."
          },
          {
            "speaker": "MERCER",
            "text": "Keep the originals. We'll record the copies."
          },
          {
            "speaker": "KAI",
            "text": "That sentence says I believed she agreed. I didn't know that."
          },
          {
            "speaker": "MERCER",
            "text": "Then we correct it before you sign."
          },
          {
            "speaker": "KAI",
            "text": "What happens to me?"
          },
          {
            "speaker": "MERCER",
            "text": "Your part is considered too. I won't promise you otherwise."
          }
        ],
        "key": "M10:3"
      },
      {
        "type": "drive",
        "location": "showroom",
        "label": "Take Nora to the hire desk",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M10:4"
      },
      {
        "type": "interact",
        "location": "showroom",
        "label": "Take Nora to the hire desk",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm her temporary transport arrangement",
            "kind": "confirm"
          }
        ],
        "key": "M10:5"
      },
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "NORA",
            "text": "Van-hire office. If you're free."
          },
          {
            "speaker": "KAI",
            "text": "You trust me with the keys?"
          },
          {
            "speaker": "NORA",
            "text": "I trust you to get me there. We can start with that."
          }
        ],
        "key": "M10:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M11",
    "title": "Doors Open",
    "chapter": "Low Tide",
    "contact": "Rosa",
    "location": "workshop",
    "vehicle": null,
    "reward": 0,
    "optional": false,
    "requires": [
      "M10"
    ],
    "summary": "Prepare the meeting space; speak to Rosa.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "Meetings after repairs. People still need their cars."
          },
          {
            "speaker": "KAI",
            "text": "I counted nine chairs."
          },
          {
            "speaker": "ROSA",
            "text": "Ten. Nora brings an opinion large enough for its own seat."
          }
        ],
        "key": "M11:0"
      },
      {
        "type": "travel",
        "location": "workshop",
        "label": "Prepare the meeting",
        "radius": 9,
        "holdSeconds": 0,
        "key": "M11:1"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Prepare the meeting",
        "actions": [
          {
            "id": "action-0",
            "label": "Place the chairs clear of the work bay",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Keep the side exit open",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Read Kai’s collection arrangement",
            "kind": "confirm"
          }
        ],
        "key": "M11:2"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Conversation — Doors Open",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "Enough to retire. I wanted that once."
          },
          {
            "speaker": "KAI",
            "text": "Once?"
          },
          {
            "speaker": "ROSA",
            "text": "Some mornings I want it before I've found my shoes."
          },
          {
            "speaker": "KAI",
            "text": "Don't stay because we need a hero."
          },
          {
            "speaker": "ROSA",
            "text": "Good. Haven't got the knees."
          },
          {
            "speaker": "KAI",
            "text": "I can run the collections. Properly. Not when I've nothing better on."
          },
          {
            "speaker": "ROSA",
            "text": "Put the arrangement on paper. Generosity makes terrible accounting."
          }
        ],
        "key": "M11:3"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "IMANI",
            "text": "May we record here tomorrow night?"
          },
          {
            "speaker": "ROSA",
            "text": "That bay stays clear. Apart from that, yes."
          },
          {
            "speaker": "KAI",
            "text": "You're staying?"
          },
          {
            "speaker": "ROSA",
            "text": "I'm deciding how to stay. Different job."
          }
        ],
        "key": "M11:4"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M12",
    "title": "Low Tide",
    "chapter": "Low Tide",
    "contact": "Rosa",
    "location": "radio",
    "vehicle": "van",
    "reward": 500,
    "optional": false,
    "requires": [
      "M11"
    ],
    "summary": "Open a safe exit; escort residents to the forecourt; take injured Dev to care.",
    "stages": [
      {
        "type": "dialogue",
        "location": "radio",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "FOREMAN",
            "text": "Vacant property. Clearance instruction."
          },
          {
            "speaker": "ROSA",
            "text": "You can see people through the window."
          },
          {
            "speaker": "FOREMAN",
            "text": "I'm paid to follow the job sheet."
          },
          {
            "speaker": "KAI",
            "text": "Then stop the truck while we check it."
          }
        ],
        "key": "M12:0"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Account for the residents",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M12:1"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Account for the residents",
        "actions": [
          {
            "id": "action-0",
            "label": "Open the marked side exit",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Check the first group",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Check the second group",
            "kind": "confirm"
          }
        ],
        "key": "M12:2"
      },
      {
        "type": "drive",
        "location": "petrol",
        "label": "Bring the residents to sanctuary",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M12:3"
      },
      {
        "type": "interact",
        "location": "petrol",
        "label": "Bring the residents to sanctuary",
        "actions": [
          {
            "id": "action-0",
            "label": "Reconcile both groups",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm the safe assembly",
            "kind": "confirm"
          }
        ],
        "key": "M12:4"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Collect injured Dev",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M12:5"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Collect injured Dev",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the clinic transfer",
            "kind": "confirm"
          }
        ],
        "key": "M12:6"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Conversation — Low Tide",
        "lines": [
          {
            "speaker": "IMANI",
            "text": "The recordings are copied. Leave the boxes. Help Nora."
          },
          {
            "speaker": "LEELA",
            "text": "People inside. Coast Road workshop. Stay on the line with me.",
            "delivery": "phone"
          },
          {
            "speaker": "DEV",
            "text": "I'll guide the truck out of the lane. Keep them behind me."
          },
          {
            "speaker": "KAI",
            "text": "Don't stand between it and the wall!"
          },
          {
            "speaker": "DEV",
            "text": "Follow the foreman. He's leaving."
          },
          {
            "speaker": "KAI",
            "text": "Somebody saw him. You're coming with me."
          },
          {
            "speaker": "MERCER",
            "text": "Stop that vehicle. Everyone else, give the ambulance room.",
            "delivery": "arriving"
          }
        ],
        "key": "M12:7"
      },
      {
        "type": "drive",
        "location": "clinic",
        "label": "Complete Dev’s care handover",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M12:8"
      },
      {
        "type": "interact",
        "location": "clinic",
        "label": "Complete Dev’s care handover",
        "actions": [
          {
            "id": "action-0",
            "label": "Hand Dev over to the receiving staff",
            "kind": "confirm"
          }
        ],
        "key": "M12:9"
      },
      {
        "type": "drive",
        "location": "radio",
        "label": "Give the incident account",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M12:10"
      },
      {
        "type": "interact",
        "location": "radio",
        "label": "Give the incident account",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm copies remain with the owners",
            "kind": "confirm"
          }
        ],
        "key": "M12:11"
      },
      {
        "type": "dialogue",
        "location": "radio",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "Everybody out?",
            "delivery": "dawn"
          },
          {
            "speaker": "KAI",
            "text": "Everybody."
          },
          {
            "speaker": "ROSA",
            "text": "All right. Now we can be angry."
          },
          {
            "speaker": "IMANI",
            "text": "These are the owners' accounts, corroborated by the records investigators hold.",
            "delivery": "radio"
          },
          {
            "speaker": "NORA",
            "text": "Shelves are gone."
          },
          {
            "speaker": "ROSA",
            "text": "We'll make new ones."
          },
          {
            "speaker": "NORA",
            "text": "Send an invoice. You have bills too."
          },
          {
            "speaker": "ROSA",
            "text": "A harbour job? Depends what you're asking him to drive.",
            "delivery": "later telephone"
          }
        ],
        "key": "M12:12"
      }
    ],
    "outcomes": {
      "noraVanReturned": true,
      "devRecovering": true
    }
  },
  {
    "id": "M13",
    "title": "A Proper Contract",
    "chapter": "The Other Shore",
    "contact": "Celia",
    "location": "terminal",
    "vehicle": "van",
    "reward": 300,
    "optional": false,
    "requires": [
      "M12"
    ],
    "summary": "Inspect the fleet van and deliver it to the south gate.",
    "stages": [
      {
        "type": "dialogue",
        "location": "terminal",
        "label": "Meet Celia",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "Rosa says you can drive. The newspapers say other things."
          },
          {
            "speaker": "KAI",
            "text": "Both had something to work with."
          },
          {
            "speaker": "CELIA",
            "text": "Good. You're not wasting my morning explaining the newspapers."
          },
          {
            "speaker": "ROSA",
            "text": "Fleet van. New clutch. Let it warm up."
          },
          {
            "speaker": "CELIA",
            "text": "Terminal office, south gate. Price includes fuel. Delivery receipt gets you paid."
          },
          {
            "speaker": "KAI",
            "text": "Anything else hiding in the signature?"
          },
          {
            "speaker": "CELIA",
            "text": "Read it. Ask me. That's what the paper is for."
          }
        ],
        "key": "M13:0"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Inspect the assigned fleet van",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M13:1"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Inspect the assigned fleet van",
        "actions": [
          {
            "id": "action-0",
            "label": "Check engine condition",
            "kind": "inspect",
            "component": "engine"
          },
          {
            "id": "action-1",
            "label": "Read fuel-inclusive delivery terms",
            "kind": "confirm"
          }
        ],
        "key": "M13:2"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Conversation — A Proper Contract",
        "lines": [
          {
            "speaker": "KAI",
            "text": "North gate says south is closed.",
            "delivery": "radio"
          },
          {
            "speaker": "CELIA",
            "text": "North gate says that when he doesn't want to lift his barrier. I'll call him."
          },
          {
            "speaker": "GATEKEEPER",
            "text": "Ward van? Right. South loading lane. Mind the pedestrians."
          },
          {
            "speaker": "KAI",
            "text": "They have priority?"
          },
          {
            "speaker": "GATEKEEPER",
            "text": "Over your bonnet? Ideally."
          }
        ],
        "key": "M13:3"
      },
      {
        "type": "drive",
        "location": "terminal",
        "label": "Deliver to the south gate",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M13:4"
      },
      {
        "type": "interact",
        "location": "terminal",
        "label": "Deliver to the south gate",
        "actions": [
          {
            "id": "action-0",
            "label": "Check the receiving name",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Obtain the signed delivery receipt",
            "kind": "confirm"
          }
        ],
        "key": "M13:5"
      },
      {
        "type": "dialogue",
        "location": "terminal",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "Receipt. Payment. Tomorrow's crossing needs a spare driver."
          },
          {
            "speaker": "KAI",
            "text": "That's unusually straightforward."
          },
          {
            "speaker": "CELIA",
            "text": "Only because tomorrow hasn't happened yet."
          }
        ],
        "key": "M13:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M14",
    "title": "Missed Crossing",
    "chapter": "The Other Shore",
    "contact": "Celia",
    "location": "yard",
    "vehicle": "van",
    "reward": 350,
    "optional": false,
    "requires": [
      "M13"
    ],
    "summary": "Take the approved road diversion; collect the stranded workers.",
    "stages": [
      {
        "type": "dialogue",
        "location": "yard",
        "label": "Meet Celia",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "The service van needs to reach the island yard. Ferry has a schedule dispute."
          },
          {
            "speaker": "KAI",
            "text": "How long?"
          },
          {
            "speaker": "CELIA",
            "text": "Three different answers. I trust the one who said he doesn't know."
          },
          {
            "speaker": "FERRY WORKER ELLIS",
            "text": "Six hotel staff are stranded on the other side. Last shuttle left."
          },
          {
            "speaker": "CELIA",
            "text": "The road will cost us most of the afternoon."
          },
          {
            "speaker": "KAI",
            "text": "It will cost them a shift."
          }
        ],
        "key": "M14:0"
      },
      {
        "type": "drive",
        "location": "island",
        "label": "Use the approved diversion",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M14:1"
      },
      {
        "type": "interact",
        "location": "island",
        "label": "Use the approved diversion",
        "actions": [
          {
            "id": "action-0",
            "label": "Check the six-person collection list",
            "kind": "confirm"
          }
        ],
        "key": "M14:2"
      },
      {
        "type": "drive",
        "location": "hotel",
        "label": "Collect the first workers",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M14:3"
      },
      {
        "type": "interact",
        "location": "hotel",
        "label": "Collect the first workers",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the first five names",
            "kind": "confirm"
          }
        ],
        "key": "M14:4"
      },
      {
        "type": "dialogue",
        "location": "hotel",
        "label": "Conversation — Missed Crossing",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "Bring the workers to the hostel, then the van to the yard. Record the delay.",
            "delivery": "radio"
          },
          {
            "speaker": "PASSENGER SURI",
            "text": "They said the company would send someone."
          },
          {
            "speaker": "KAI",
            "text": "This is the someone. Bags inside, please."
          },
          {
            "speaker": "SURI",
            "text": "You're a little late."
          },
          {
            "speaker": "KAI",
            "text": "I only became someone twenty minutes ago."
          },
          {
            "speaker": "ELLIS",
            "text": "Last passenger is at the shelter, not the ticket office. She has a walking stick.",
            "delivery": "radio"
          },
          {
            "speaker": "KAI",
            "text": "We'll collect her there."
          }
        ],
        "key": "M14:5"
      },
      {
        "type": "drive",
        "location": "flats",
        "label": "Collect the remaining worker",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M14:6"
      },
      {
        "type": "interact",
        "location": "flats",
        "label": "Collect the remaining worker",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm all six names",
            "kind": "confirm"
          }
        ],
        "key": "M14:7"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Complete the transfer",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M14:8"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Complete the transfer",
        "actions": [
          {
            "id": "action-0",
            "label": "Reconcile the receiving list",
            "kind": "confirm"
          }
        ],
        "key": "M14:9"
      },
      {
        "type": "dialogue",
        "location": "yard",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "We missed the delivery slot."
          },
          {
            "speaker": "KAI",
            "text": "Everyone reached work."
          },
          {
            "speaker": "CELIA",
            "text": "I know. Both facts go in the account. You did right. It still cost money."
          },
          {
            "speaker": "KAI",
            "text": "Who pays that part?"
          },
          {
            "speaker": "CELIA",
            "text": "Today, the business. Next contract, I price the contingency properly."
          }
        ],
        "key": "M14:10"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M15",
    "title": "The Family Yard",
    "chapter": "The Other Shore",
    "contact": "Celia",
    "location": "yard",
    "vehicle": "car",
    "reward": 300,
    "optional": false,
    "requires": [
      "M14"
    ],
    "summary": "Inspect the three marked vehicles with Tomas; deliver an honest report.",
    "stages": [
      {
        "type": "dialogue",
        "location": "yard",
        "label": "Meet Celia",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "My brother's opening the old yard. Check what still runs."
          },
          {
            "speaker": "KAI",
            "text": "Does he know I'm coming?"
          },
          {
            "speaker": "CELIA",
            "text": "He knows the business needs the stock."
          },
          {
            "speaker": "KAI",
            "text": "That's a different answer."
          },
          {
            "speaker": "CELIA",
            "text": "He knows you're coming."
          }
        ],
        "key": "M15:0"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Inspect the three marked stock vehicles",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M15:1"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Inspect the three marked stock vehicles",
        "actions": [
          {
            "id": "action-0",
            "label": "Record the running van’s condition",
            "kind": "inspect",
            "component": "engine"
          },
          {
            "id": "action-1",
            "label": "Record the repair car’s condition",
            "kind": "inspect",
            "component": "chassis"
          },
          {
            "id": "action-2",
            "label": "Record the non-running shell",
            "kind": "confirm"
          }
        ],
        "key": "M15:2"
      },
      {
        "type": "drive",
        "location": "island",
        "label": "Hear Tomas’s plan",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M15:3"
      },
      {
        "type": "interact",
        "location": "island",
        "label": "Hear Tomas’s plan",
        "actions": [
          {
            "id": "action-0",
            "label": "Keep condition and ownership separate",
            "kind": "confirm"
          }
        ],
        "key": "M15:4"
      },
      {
        "type": "dialogue",
        "location": "island",
        "label": "Conversation — The Family Yard",
        "lines": [
          {
            "speaker": "TOMAS",
            "text": "Let me guess. Anything with wheels belongs to Celia."
          },
          {
            "speaker": "KAI",
            "text": "I was asked what starts, not who owns it."
          },
          {
            "speaker": "TOMAS",
            "text": "Sensible boundary. Keep it."
          },
          {
            "speaker": "KAI",
            "text": "You're selling the yard?"
          },
          {
            "speaker": "TOMAS",
            "text": "My share. I have a place to study inland. Every year it becomes next year."
          },
          {
            "speaker": "KAI",
            "text": "Celia thinks you'll regret it."
          },
          {
            "speaker": "TOMAS",
            "text": "I might. I'd like a turn at making my own mistake."
          }
        ],
        "key": "M15:5"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Deliver the honest report",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M15:6"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Deliver the honest report",
        "actions": [
          {
            "id": "action-0",
            "label": "Give both siblings the same findings",
            "kind": "confirm"
          }
        ],
        "key": "M15:7"
      },
      {
        "type": "dialogue",
        "location": "yard",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "Dad kept this place alive through worse."
          },
          {
            "speaker": "TOMAS",
            "text": "He also paid people. Including himself."
          },
          {
            "speaker": "KAI",
            "text": "One van runs. One car needs work. The shell isn't a fleet. That's my report."
          },
          {
            "speaker": "CELIA",
            "text": "I didn't ask you to choose sides."
          },
          {
            "speaker": "KAI",
            "text": "Good. I haven't."
          }
        ],
        "key": "M15:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M16",
    "title": "Lot With No Shine",
    "chapter": "The Other Shore",
    "contact": "Tomas",
    "location": "auction",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M15"
    ],
    "summary": "Ask the auction steward to hold the disputed lot; corroborate its history.",
    "stages": [
      {
        "type": "dialogue",
        "location": "auction",
        "label": "Meet Tomas",
        "lines": [
          {
            "speaker": "TOMAS",
            "text": "The grey service car. That's Dad's."
          },
          {
            "speaker": "CELIA",
            "text": "Dad sold cars too. Remember that before you spend money."
          },
          {
            "speaker": "TOMAS",
            "text": "He lent this one to his partner. I was there."
          },
          {
            "speaker": "KAI",
            "text": "Then we need the history, not a higher bid."
          }
        ],
        "key": "M16:0"
      },
      {
        "type": "drive",
        "location": "auction",
        "label": "Request review of the service car",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M16:1"
      },
      {
        "type": "interact",
        "location": "auction",
        "label": "Request review of the service car",
        "actions": [
          {
            "id": "action-0",
            "label": "Identify the disputed lot",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Obtain a temporary hold reference",
            "kind": "confirm"
          }
        ],
        "key": "M16:2"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Find authorised history",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M16:3"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Find authorised history",
        "actions": [
          {
            "id": "action-0",
            "label": "Match the fleet-book entry",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Copy the loan receipt with Celia",
            "kind": "confirm"
          }
        ],
        "key": "M16:4"
      },
      {
        "type": "dialogue",
        "location": "yard",
        "label": "Conversation — Lot With No Shine",
        "lines": [
          {
            "speaker": "STEWARD",
            "text": "A claim needs something we can verify. I can pause this lot during today's review."
          },
          {
            "speaker": "CELIA",
            "text": "The old fleet book lists it. There may be a loan receipt at the yard."
          },
          {
            "speaker": "TOMAS",
            "text": "You kept the books?"
          },
          {
            "speaker": "CELIA",
            "text": "Some memories fit in filing cabinets."
          },
          {
            "speaker": "TOMAS",
            "text": "His handwriting. Look, he even charged for the spare tyre."
          },
          {
            "speaker": "CELIA",
            "text": "He charged everybody for that tyre. It was his favourite tyre."
          }
        ],
        "key": "M16:5"
      },
      {
        "type": "drive",
        "location": "auction",
        "label": "Deliver the corroborating record",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M16:6"
      },
      {
        "type": "interact",
        "location": "auction",
        "label": "Deliver the corroborating record",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the lot remains held",
            "kind": "confirm"
          }
        ],
        "key": "M16:7"
      },
      {
        "type": "dialogue",
        "location": "auction",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "STEWARD",
            "text": "It won't be sold while this is checked. I can't promise the final finding today."
          },
          {
            "speaker": "TOMAS",
            "text": "That's enough for today."
          },
          {
            "speaker": "CELIA",
            "text": "I thought you wanted to leave all this."
          },
          {
            "speaker": "TOMAS",
            "text": "Leaving the yard isn't the same as forgetting him."
          }
        ],
        "key": "M16:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M17",
    "title": "Grey Water",
    "chapter": "The Other Shore",
    "contact": "Celia",
    "location": "shelter",
    "vehicle": "van",
    "reward": 450,
    "optional": false,
    "requires": [
      "M16"
    ],
    "summary": "Move stranded passengers; keep the transfer lane clear.",
    "stages": [
      {
        "type": "dialogue",
        "location": "shelter",
        "label": "Meet Celia",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "Low shed first. Ellis has the passenger count. Tomas, stay inland."
          },
          {
            "speaker": "TOMAS",
            "text": "I'm already at the apron. There are people here.",
            "delivery": "radio"
          },
          {
            "speaker": "CELIA",
            "text": "Then tell Ellis where you are. Don't disappear on me."
          },
          {
            "speaker": "KAI",
            "text": "Which vehicles can carry passengers?"
          },
          {
            "speaker": "ELLIS",
            "text": "Two vans on the high side. Keys in the staffed booth."
          }
        ],
        "key": "M17:0"
      },
      {
        "type": "drive",
        "location": "terminal",
        "label": "Prepare the harbour transfer",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M17:1"
      },
      {
        "type": "interact",
        "location": "terminal",
        "label": "Prepare the harbour transfer",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm Ellis’s shelter list",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Accept the authorised keys",
            "kind": "confirm"
          }
        ],
        "key": "M17:2"
      },
      {
        "type": "drive",
        "location": "island",
        "label": "Collect the first group",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M17:3"
      },
      {
        "type": "interact",
        "location": "island",
        "label": "Collect the first group",
        "actions": [
          {
            "id": "action-0",
            "label": "Check every assigned passenger",
            "kind": "confirm"
          }
        ],
        "key": "M17:4"
      },
      {
        "type": "drive",
        "location": "shelter",
        "label": "Deliver the first group inland",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M17:5"
      },
      {
        "type": "interact",
        "location": "shelter",
        "label": "Deliver the first group inland",
        "actions": [
          {
            "id": "action-0",
            "label": "Reconcile the first safe group",
            "kind": "confirm"
          }
        ],
        "key": "M17:6"
      },
      {
        "type": "dialogue",
        "location": "shelter",
        "label": "Conversation — Grey Water",
        "lines": [
          {
            "speaker": "KELLS",
            "text": "Recovery assignment. These vans are coming with us."
          },
          {
            "speaker": "CELIA",
            "text": "Mine aren't. They're moving people."
          },
          {
            "speaker": "KELLS",
            "text": "Then unload them."
          },
          {
            "speaker": "KAI",
            "text": "You can discuss it where it's dry. Nobody's unloading into this weather."
          },
          {
            "speaker": "ELLIS",
            "text": "Leave him. I can walk. Passenger shelter, Kai!"
          }
        ],
        "key": "M17:7"
      },
      {
        "type": "drive",
        "location": "terminal",
        "label": "Collect the remaining group",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M17:8"
      },
      {
        "type": "interact",
        "location": "terminal",
        "label": "Collect the remaining group",
        "actions": [
          {
            "id": "action-0",
            "label": "Check Tomas and Ellis are accounted for",
            "kind": "confirm"
          }
        ],
        "key": "M17:9"
      },
      {
        "type": "drive",
        "location": "shelter",
        "label": "Complete the final transfer",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M17:10"
      },
      {
        "type": "interact",
        "location": "shelter",
        "label": "Complete the final transfer",
        "actions": [
          {
            "id": "action-0",
            "label": "Reconcile the harbour count",
            "kind": "confirm"
          }
        ],
        "key": "M17:11"
      },
      {
        "type": "dialogue",
        "location": "shelter",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "You should have waited for instructions."
          },
          {
            "speaker": "TOMAS",
            "text": "I listened to Ellis. He was here."
          },
          {
            "speaker": "KAI",
            "text": "Everybody accounted for. Argue inside."
          },
          {
            "speaker": "CELIA",
            "text": "Yes. Inside. Tomas—thank you.",
            "delivery": "after a breath"
          },
          {
            "speaker": "TOMAS",
            "text": "You're welcome. I'm still going inland next month."
          }
        ],
        "key": "M17:12"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M18",
    "title": "Room To Leave",
    "chapter": "The Other Shore",
    "contact": "Celia",
    "location": "terminal",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M17"
    ],
    "summary": "Walk the proposed smaller yard with both siblings; take Tomas to the terminal.",
    "stages": [
      {
        "type": "dialogue",
        "location": "terminal",
        "label": "Meet Celia",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "The whole yard needs more than we can raise."
          },
          {
            "speaker": "TOMAS",
            "text": "I've been saying that for two years."
          },
          {
            "speaker": "CELIA",
            "text": "I know. I'm trying to say it now."
          },
          {
            "speaker": "KAI",
            "text": "Which part can operate without either of you working for free?"
          }
        ],
        "key": "M18:0"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Review the smaller-yard agreement",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M18:1"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Review the smaller-yard agreement",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the service-bay terms",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm both siblings receive copies",
            "kind": "confirm"
          }
        ],
        "key": "M18:2"
      },
      {
        "type": "dialogue",
        "location": "yard",
        "label": "Conversation — Room To Leave",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "We keep the service bay and lease the outer space. You receive your share on agreed terms."
          },
          {
            "speaker": "TOMAS",
            "text": "And I can go?"
          },
          {
            "speaker": "CELIA",
            "text": "You never needed my permission."
          },
          {
            "speaker": "TOMAS",
            "text": "I wanted to leave with your blessing, not while you called after me."
          },
          {
            "speaker": "CELIA",
            "text": "We settled it with the estate. Your name is on this copy too."
          },
          {
            "speaker": "TOMAS",
            "text": "You should keep the car here until it runs."
          },
          {
            "speaker": "CELIA",
            "text": "I'll send photographs. Of the car. Not invoices disguised as invitations."
          }
        ],
        "key": "M18:3"
      },
      {
        "type": "drive",
        "location": "terminal",
        "label": "Take Tomas to his departure",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M18:4"
      },
      {
        "type": "interact",
        "location": "terminal",
        "label": "Take Tomas to his departure",
        "actions": [
          {
            "id": "action-0",
            "label": "Hand over his travel bag",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm the next available crossing",
            "kind": "confirm"
          }
        ],
        "key": "M18:5"
      },
      {
        "type": "dialogue",
        "location": "terminal",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "TOMAS",
            "text": "If she asks you to visit, check whether she's holding a spanner."
          },
          {
            "speaker": "CELIA",
            "text": "Palm Club needs equipment transport. I recommended you.",
            "delivery": "later call"
          },
          {
            "speaker": "KAI",
            "text": "A recommendation with a warning?"
          },
          {
            "speaker": "CELIA",
            "text": "He's a promoter. Count the money before you believe the compliment."
          }
        ],
        "key": "M18:6"
      }
    ],
    "outcomes": {
      "tomasMovedInland": true,
      "devRecovering": false
    }
  },
  {
    "id": "M19",
    "title": "The Back Door",
    "chapter": "After Midnight",
    "contact": "Sal",
    "location": "club",
    "vehicle": "van",
    "reward": 300,
    "optional": false,
    "requires": [
      "M18"
    ],
    "summary": "Collect the labelled sound cases; hand them to stage manager Rina.",
    "stages": [
      {
        "type": "dialogue",
        "location": "club",
        "label": "Meet Sal",
        "lines": [
          {
            "speaker": "SAL",
            "text": "The driver who declined Vale. Excellent instinct. Terrible networking."
          },
          {
            "speaker": "KAI",
            "text": "Celia said you needed speakers moved."
          },
          {
            "speaker": "SAL",
            "text": "Straight to business. I like that. Go round the back."
          },
          {
            "speaker": "KAI",
            "text": "Networking finished already?"
          },
          {
            "speaker": "SAL",
            "text": "The speakers are shy."
          }
        ],
        "key": "M19:0"
      },
      {
        "type": "drive",
        "location": "parts",
        "label": "Collect the labelled sound cases",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M19:1"
      },
      {
        "type": "interact",
        "location": "parts",
        "label": "Collect the labelled sound cases",
        "actions": [
          {
            "id": "action-0",
            "label": "Match Rina’s equipment list",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Accept the collection sheet",
            "kind": "confirm"
          }
        ],
        "key": "M19:2"
      },
      {
        "type": "dialogue",
        "location": "parts",
        "label": "Conversation — The Back Door",
        "lines": [
          {
            "speaker": "RINA",
            "text": "Not against that door. People use it to escape your employer's speeches."
          },
          {
            "speaker": "KAI",
            "text": "He's not my employer yet."
          },
          {
            "speaker": "RINA",
            "text": "Keep the receipt. It helps preserve that distinction."
          },
          {
            "speaker": "PORTER",
            "text": "Is your overtime coming this week?"
          },
          {
            "speaker": "RINA",
            "text": "Apparently it arrived spiritually. Still waiting for the envelope."
          }
        ],
        "key": "M19:3"
      },
      {
        "type": "drive",
        "location": "club",
        "label": "Deliver to the service entrance",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M19:4"
      },
      {
        "type": "interact",
        "location": "club",
        "label": "Deliver to the service entrance",
        "actions": [
          {
            "id": "action-0",
            "label": "Keep the exit clear",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Obtain Rina’s signature",
            "kind": "confirm"
          }
        ],
        "key": "M19:5"
      },
      {
        "type": "dialogue",
        "location": "club",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "SAL",
            "text": "Perfect. Same again tomorrow, but the cargo sings."
          },
          {
            "speaker": "KAI",
            "text": "Cases signed in. Fee agreed. Rina needs her overtime too."
          },
          {
            "speaker": "SAL",
            "text": "You've been here ten minutes."
          },
          {
            "speaker": "KAI",
            "text": "I listen while carrying things."
          }
        ],
        "key": "M19:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M20",
    "title": "Headliner",
    "chapter": "After Midnight",
    "contact": "Rina",
    "location": "club",
    "vehicle": "van",
    "reward": 350,
    "optional": false,
    "requires": [
      "M19"
    ],
    "summary": "Collect the group; return for Sef before completing the drop-off.",
    "stages": [
      {
        "type": "dialogue",
        "location": "club",
        "label": "Meet Rina",
        "lines": [
          {
            "speaker": "SAL",
            "text": "The band thinks the hotel supplied a car. The hotel thinks I did. Solve the philosophy."
          },
          {
            "speaker": "KAI",
            "text": "How many people?"
          },
          {
            "speaker": "SAL",
            "text": "Four. No, five. Singer counts his assistant as luggage."
          },
          {
            "speaker": "KAI",
            "text": "Names, Sal. People have names."
          },
          {
            "speaker": "RINA",
            "text": "Ines, Leon, Pia, Joel, Sef. Sef's at rehearsal. Here are the addresses."
          }
        ],
        "key": "M20:0"
      },
      {
        "type": "drive",
        "location": "hotel",
        "label": "Collect the band group",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M20:1"
      },
      {
        "type": "interact",
        "location": "hotel",
        "label": "Collect the band group",
        "actions": [
          {
            "id": "action-0",
            "label": "Check Ines Leon Pia and Joel",
            "kind": "confirm"
          }
        ],
        "key": "M20:2"
      },
      {
        "type": "drive",
        "location": "studio",
        "label": "Return for Sef",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M20:3"
      },
      {
        "type": "interact",
        "location": "studio",
        "label": "Return for Sef",
        "actions": [
          {
            "id": "action-0",
            "label": "Collect Sef and authorised equipment",
            "kind": "confirm"
          }
        ],
        "key": "M20:4"
      },
      {
        "type": "dialogue",
        "location": "studio",
        "label": "Conversation — Headliner",
        "lines": [
          {
            "speaker": "INES",
            "text": "We can start without the keyboard player."
          },
          {
            "speaker": "PIA",
            "text": "He's seventeen and doesn't know the city."
          },
          {
            "speaker": "KAI",
            "text": "Then we don't leave him to discover it under a bus shelter."
          },
          {
            "speaker": "SAL",
            "text": "Doors open in twenty minutes.",
            "delivery": "phone"
          },
          {
            "speaker": "KAI",
            "text": "Ask Rina to hold the warm-up. I'm getting the fifth person."
          },
          {
            "speaker": "SEF",
            "text": "They said don't leave the equipment."
          },
          {
            "speaker": "KAI",
            "text": "Good job. Equipment and musician, both in the van."
          }
        ],
        "key": "M20:5"
      },
      {
        "type": "drive",
        "location": "club",
        "label": "Deliver all five people",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M20:6"
      },
      {
        "type": "interact",
        "location": "club",
        "label": "Deliver all five people",
        "actions": [
          {
            "id": "action-0",
            "label": "Check all five names before handover",
            "kind": "confirm"
          }
        ],
        "key": "M20:7"
      },
      {
        "type": "dialogue",
        "location": "club",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "SAL",
            "text": "You enjoy making my evenings exciting."
          },
          {
            "speaker": "RINA",
            "text": "They're all here. Sound check in three minutes."
          },
          {
            "speaker": "SEF",
            "text": "You came back.",
            "delivery": "to Kai"
          },
          {
            "speaker": "KAI",
            "text": "You were on the list."
          },
          {
            "speaker": "INES",
            "text": "Next time I make the list."
          }
        ],
        "key": "M20:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M21",
    "title": "House Rules",
    "chapter": "After Midnight",
    "contact": "Sal",
    "location": "club",
    "vehicle": "car",
    "reward": 200,
    "optional": false,
    "requires": [
      "M20"
    ],
    "summary": "Hear Duarte's account; bring both accounts to Sal.",
    "stages": [
      {
        "type": "dialogue",
        "location": "club",
        "label": "Meet Sal",
        "lines": [
          {
            "speaker": "SAL",
            "text": "Duarte owes me for an event. Pick up the money."
          },
          {
            "speaker": "KAI",
            "text": "Collection or conversation?"
          },
          {
            "speaker": "SAL",
            "text": "Friendly collection."
          },
          {
            "speaker": "KAI",
            "text": "I'll start with the friendly part."
          }
        ],
        "key": "M21:0"
      },
      {
        "type": "drive",
        "location": "market",
        "label": "Hear Duarte’s account",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M21:1"
      },
      {
        "type": "interact",
        "location": "market",
        "label": "Hear Duarte’s account",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the cancellation fax",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Invite Duarte to the discussion",
            "kind": "confirm"
          }
        ],
        "key": "M21:2"
      },
      {
        "type": "dialogue",
        "location": "market",
        "label": "Conversation — House Rules",
        "lines": [
          {
            "speaker": "DUARTE",
            "text": "Cancelled promoter, empty room. I paid the kitchen staff myself."
          },
          {
            "speaker": "KAI",
            "text": "Sal says the booking was honoured."
          },
          {
            "speaker": "DUARTE",
            "text": "Read his cancellation fax. Kept it because I know Sal."
          },
          {
            "speaker": "KAI",
            "text": "Will you come and say this to him?"
          },
          {
            "speaker": "DUARTE",
            "text": "With the man he sent to frighten me?"
          },
          {
            "speaker": "KAI",
            "text": "With the driver who hasn't collected anything."
          }
        ],
        "key": "M21:3"
      },
      {
        "type": "drive",
        "location": "club",
        "label": "Compare both accounts",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M21:4"
      },
      {
        "type": "interact",
        "location": "club",
        "label": "Compare both accounts",
        "actions": [
          {
            "id": "action-0",
            "label": "Check the retained deposit",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Obtain the corrected-statement agreement",
            "kind": "confirm"
          }
        ],
        "key": "M21:5"
      },
      {
        "type": "dialogue",
        "location": "club",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "SAL",
            "text": "I sent you for an envelope."
          },
          {
            "speaker": "KAI",
            "text": "You got the people who can explain why it's empty."
          },
          {
            "speaker": "DUARTE",
            "text": "My staff worked. Yours cancelled. Which part am I paying for?"
          },
          {
            "speaker": "SAL",
            "text": "The booking deposit—"
          },
          {
            "speaker": "RINA",
            "text": "Was retained. Your own account says so."
          },
          {
            "speaker": "SAL",
            "text": "Revised statement tomorrow."
          },
          {
            "speaker": "KAI",
            "text": "To him, not through me."
          }
        ],
        "key": "M21:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M22",
    "title": "Coast Road Invitational",
    "chapter": "After Midnight",
    "contact": "Sal",
    "location": "club",
    "vehicle": "car",
    "reward": 450,
    "optional": false,
    "requires": [
      "M21"
    ],
    "summary": "Complete the course; assist the stopped rival after the finish.",
    "stages": [
      {
        "type": "dialogue",
        "location": "club",
        "label": "Meet Sal",
        "lines": [
          {
            "speaker": "SAL",
            "text": "A clean event. Good drivers. No arguments."
          },
          {
            "speaker": "RINA",
            "text": "You're announcing two of those three things too early."
          },
          {
            "speaker": "KAI",
            "text": "Whose car?"
          },
          {
            "speaker": "SAL",
            "text": "Loaner. Inspected, insured for the event. Bring the whole thing back."
          },
          {
            "speaker": "RIVAL DRIVER VAUGHN",
            "text": "That's your famous driver? He'll stop and ask the corners how they feel."
          },
          {
            "speaker": "KAI",
            "text": "Only the ones you've already hit."
          }
        ],
        "key": "M22:0"
      },
      {
        "type": "drive",
        "location": "coast",
        "label": "Begin the controlled route",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M22:1"
      },
      {
        "type": "interact",
        "location": "coast",
        "label": "Begin the controlled route",
        "actions": [
          {
            "id": "action-0",
            "label": "Check in with the marshal",
            "kind": "confirm"
          }
        ],
        "key": "M22:2"
      },
      {
        "type": "dialogue",
        "location": "coast",
        "label": "The marshal’s instructions",
        "lines": [
          {
            "speaker": "MARSHAL",
            "text": "Keep inside the closed course. Spectators behind barriers. Wait for the flag."
          }
        ],
        "key": "M22:3"
      },
      {
        "type": "drive",
        "location": "island",
        "label": "Complete the second checkpoint",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M22:4"
      },
      {
        "type": "interact",
        "location": "island",
        "label": "Complete the second checkpoint",
        "actions": [
          {
            "id": "action-0",
            "label": "Stop inside the checkpoint",
            "kind": "confirm"
          }
        ],
        "key": "M22:5"
      },
      {
        "type": "drive",
        "location": "terminal",
        "label": "Complete the return checkpoint",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M22:6"
      },
      {
        "type": "interact",
        "location": "terminal",
        "label": "Complete the return checkpoint",
        "actions": [
          {
            "id": "action-0",
            "label": "Register a classified finish",
            "kind": "confirm"
          }
        ],
        "key": "M22:7"
      },
      {
        "type": "dialogue",
        "location": "terminal",
        "label": "Classified finish",
        "lines": [
          {
            "speaker": "SAL",
            "text": "A finish without a repair invoice. I can promote that."
          }
        ],
        "key": "M22:8"
      },
      {
        "type": "drive",
        "location": "coast",
        "label": "Assist the stopped rival",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M22:9"
      },
      {
        "type": "interact",
        "location": "coast",
        "label": "Assist the stopped rival",
        "actions": [
          {
            "id": "action-0",
            "label": "Ask about the jammed belt",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Call the marshal",
            "kind": "confirm"
          }
        ],
        "key": "M22:10"
      },
      {
        "type": "dialogue",
        "location": "coast",
        "label": "Assist Vaughn at the safe stop",
        "lines": [
          {
            "speaker": "VAUGHN",
            "text": "Go collect your applause."
          },
          {
            "speaker": "KAI",
            "text": "Marshal's coming. Can you release the belt?"
          },
          {
            "speaker": "VAUGHN",
            "text": "Door's jammed."
          },
          {
            "speaker": "KAI",
            "text": "Then sit still. We're getting help."
          }
        ],
        "key": "M22:11"
      },
      {
        "type": "drive",
        "location": "club",
        "label": "Return the event keys",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M22:12"
      },
      {
        "type": "interact",
        "location": "club",
        "label": "Return the event keys",
        "actions": [
          {
            "id": "action-0",
            "label": "Meet the workshop-prize sponsor",
            "kind": "confirm"
          }
        ],
        "key": "M22:13"
      },
      {
        "type": "dialogue",
        "location": "club",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROOK",
            "text": "Damian Rook. I sponsor the workshop prizes."
          },
          {
            "speaker": "KAI",
            "text": "Kai Dena."
          },
          {
            "speaker": "ROOK",
            "text": "I heard. Interesting choice, coming back."
          },
          {
            "speaker": "KAI",
            "text": "The race had finished."
          },
          {
            "speaker": "ROOK",
            "text": "Many people don't notice when it has."
          }
        ],
        "key": "M22:14"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M23",
    "title": "No Such Thing As Free",
    "chapter": "After Midnight",
    "contact": "Rina",
    "location": "club",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M22"
    ],
    "summary": "Inspect the requested storage arrangements; warn Rina.",
    "stages": [
      {
        "type": "dialogue",
        "location": "club",
        "label": "Meet Rina",
        "lines": [
          {
            "speaker": "KELLS",
            "text": "A few vehicles behind the club. One night. You owe me more than parking."
          },
          {
            "speaker": "SAL",
            "text": "Tonight's a bad night."
          },
          {
            "speaker": "KELLS",
            "text": "Then you'll remember it."
          },
          {
            "speaker": "SAL",
            "text": "Shift the catering van. Make space. We settle it tomorrow."
          },
          {
            "speaker": "KAI",
            "text": "Those registration numbers were on disputed recovery sheets."
          },
          {
            "speaker": "SAL",
            "text": "Allegations. You're getting fond of that word."
          },
          {
            "speaker": "KAI",
            "text": "I signed once because someone told me not to ask. I'm asking."
          },
          {
            "speaker": "SAL",
            "text": "I had a licensing problem. Kells knew somebody. That was years ago."
          },
          {
            "speaker": "KAI",
            "text": "And you're still paying."
          }
        ],
        "key": "M23:0"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Inspect the storage request",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M23:1"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Inspect the storage request",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the registration list",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Record disputed recovery references",
            "kind": "confirm"
          }
        ],
        "key": "M23:2"
      },
      {
        "type": "drive",
        "location": "club",
        "label": "Warn the staff",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M23:3"
      },
      {
        "type": "interact",
        "location": "club",
        "label": "Warn the staff",
        "actions": [
          {
            "id": "action-0",
            "label": "Give Rina the lane warning",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Inform security and staff",
            "kind": "confirm"
          }
        ],
        "key": "M23:4"
      },
      {
        "type": "dialogue",
        "location": "club",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "RINA",
            "text": "How many staff need to know?"
          },
          {
            "speaker": "KAI",
            "text": "Everyone using that lane. Keep it clear and tell security what happened."
          },
          {
            "speaker": "SAL",
            "text": "You make me sound weak."
          },
          {
            "speaker": "RINA",
            "text": "You sound like my employer. Act like it."
          },
          {
            "speaker": "KELLS",
            "text": "We're coming for the space. Don't make the welcome expensive.",
            "delivery": "phone"
          }
        ],
        "key": "M23:5"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M24",
    "title": "Last Set",
    "chapter": "After Midnight",
    "contact": "Rina",
    "location": "shelter",
    "vehicle": "van",
    "reward": 450,
    "optional": false,
    "requires": [
      "M23"
    ],
    "summary": "Clear the audience route; protect staff; regroup at the assembly point.",
    "stages": [
      {
        "type": "dialogue",
        "location": "shelter",
        "label": "Meet Rina",
        "lines": [
          {
            "speaker": "RINA",
            "text": "Kai. Service door. It's Kells's crew.",
            "delivery": "radio"
          },
          {
            "speaker": "SAL",
            "text": "I'll talk to them."
          },
          {
            "speaker": "KAI",
            "text": "From behind security. Rina, start moving people out."
          },
          {
            "speaker": "INES",
            "text": "We're taking a short break. Please follow the staff to the front exit.",
            "delivery": "on microphone"
          }
        ],
        "key": "M24:0"
      },
      {
        "type": "drive",
        "location": "club",
        "label": "Prepare the audience exit",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M24:1"
      },
      {
        "type": "interact",
        "location": "club",
        "label": "Prepare the audience exit",
        "actions": [
          {
            "id": "action-0",
            "label": "Check the front route",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Account for the first group",
            "kind": "confirm"
          }
        ],
        "key": "M24:2"
      },
      {
        "type": "drive",
        "location": "shelter",
        "label": "Move the first group to assembly",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M24:3"
      },
      {
        "type": "interact",
        "location": "shelter",
        "label": "Move the first group to assembly",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm Pia’s group is safe",
            "kind": "confirm"
          }
        ],
        "key": "M24:4"
      },
      {
        "type": "dialogue",
        "location": "shelter",
        "label": "Conversation — Last Set",
        "lines": [
          {
            "speaker": "KELLS'S LIEUTENANT",
            "text": "Your boss promised us space."
          },
          {
            "speaker": "KAI",
            "text": "There's an audience in it. Back away."
          },
          {
            "speaker": "LIEUTENANT",
            "text": "Then move the audience faster."
          },
          {
            "speaker": "RINA",
            "text": "Front doors still clear. Don't send anyone into the loading lane."
          },
          {
            "speaker": "SEF",
            "text": "Where's Pia?"
          },
          {
            "speaker": "KAI",
            "text": "With the first group. Rina has the list. Go to her."
          }
        ],
        "key": "M24:5"
      },
      {
        "type": "drive",
        "location": "club",
        "label": "Collect remaining staff",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M24:6"
      },
      {
        "type": "interact",
        "location": "club",
        "label": "Collect remaining staff",
        "actions": [
          {
            "id": "action-0",
            "label": "Account for Sef and the last group",
            "kind": "confirm"
          }
        ],
        "key": "M24:7"
      },
      {
        "type": "drive",
        "location": "shelter",
        "label": "Complete the evacuation",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M24:8"
      },
      {
        "type": "interact",
        "location": "shelter",
        "label": "Complete the evacuation",
        "actions": [
          {
            "id": "action-0",
            "label": "Reconcile Rina’s list",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Give the factual incident account",
            "kind": "confirm"
          }
        ],
        "key": "M24:9"
      },
      {
        "type": "dialogue",
        "location": "shelter",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "MERCER",
            "text": "Leave the records where they are. Someone will take your statement."
          },
          {
            "speaker": "SAL",
            "text": "I was being threatened."
          },
          {
            "speaker": "KAI",
            "text": "Tell her what you agreed before that part."
          },
          {
            "speaker": "SAL",
            "text": "You'll stay?"
          },
          {
            "speaker": "KAI",
            "text": "I'll say what I saw. That's what staying means."
          },
          {
            "speaker": "RINA",
            "text": "Everybody's outside. We can close now."
          }
        ],
        "key": "M24:10"
      }
    ],
    "outcomes": {
      "clubReopened": true
    }
  },
  {
    "id": "M25",
    "title": "Eastline",
    "chapter": "Weight of the Road",
    "contact": "Tessa",
    "location": "dispatch",
    "vehicle": "van",
    "reward": 325,
    "optional": false,
    "requires": [
      "M24"
    ],
    "summary": "Check the load with Paz; deliver it to receiving clerk June.",
    "stages": [
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Meet Tessa",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "Paz says you tell people when a job's going wrong."
          },
          {
            "speaker": "KAI",
            "text": "Usually shortly after finding out myself."
          },
          {
            "speaker": "TESSA",
            "text": "Better than most. Market delivery. Customer signs, you come back. Tell me if you can't."
          },
          {
            "speaker": "KAI",
            "text": "No pitch about where I'll be in five years?"
          },
          {
            "speaker": "TESSA",
            "text": "Hopefully not still unloading this truck."
          }
        ],
        "key": "M25:0"
      },
      {
        "type": "drive",
        "location": "dispatch",
        "label": "Accept the authorised load",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M25:1"
      },
      {
        "type": "interact",
        "location": "dispatch",
        "label": "Accept the authorised load",
        "actions": [
          {
            "id": "action-0",
            "label": "Check the date and receiving number",
            "kind": "confirm"
          }
        ],
        "key": "M25:2"
      },
      {
        "type": "drive",
        "location": "market",
        "label": "Deliver to June’s bay",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M25:3"
      },
      {
        "type": "interact",
        "location": "market",
        "label": "Deliver to June’s bay",
        "actions": [
          {
            "id": "action-0",
            "label": "Compare the correct booking",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Hand over the labelled produce",
            "kind": "confirm"
          }
        ],
        "key": "M25:4"
      },
      {
        "type": "dialogue",
        "location": "market",
        "label": "Conversation — Eastline",
        "lines": [
          {
            "speaker": "PAZ",
            "text": "We split workshop time and some customers. Nobody owns everybody's van."
          },
          {
            "speaker": "KAI",
            "text": "Who gets the bad routes?"
          },
          {
            "speaker": "PAZ",
            "text": "We argue. Then we take turns. Democracy has potholes."
          },
          {
            "speaker": "JUNE",
            "text": "These crates were due yesterday."
          },
          {
            "speaker": "KAI",
            "text": "Different booking. Today's produce. Check the date."
          },
          {
            "speaker": "JUNE",
            "text": "You're right. Sorry. Three trucks, one desk."
          },
          {
            "speaker": "KAI",
            "text": "I'll stack them by the correct door if you point."
          }
        ],
        "key": "M25:5"
      },
      {
        "type": "drive",
        "location": "dispatch",
        "label": "Return the receipt",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M25:6"
      },
      {
        "type": "interact",
        "location": "dispatch",
        "label": "Return the receipt",
        "actions": [
          {
            "id": "action-0",
            "label": "Record the date mix-up for the next driver",
            "kind": "confirm"
          }
        ],
        "key": "M25:7"
      },
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "Trouble?"
          },
          {
            "speaker": "KAI",
            "text": "Date mix-up. Sorted at the desk."
          },
          {
            "speaker": "TESSA",
            "text": "Put it in the note so the next driver doesn't get blamed for yesterday."
          }
        ],
        "key": "M25:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M26",
    "title": "Road Closed",
    "chapter": "Weight of the Road",
    "contact": "Tessa",
    "location": "market",
    "vehicle": "van",
    "reward": 350,
    "optional": false,
    "requires": [
      "M25"
    ],
    "summary": "Confirm the closure; use the authorised diversion; complete the delivery.",
    "stages": [
      {
        "type": "dialogue",
        "location": "market",
        "label": "Meet Tessa",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "Access permit in the folder. If the road's shut, ring before improvising."
          },
          {
            "speaker": "KAI",
            "text": "That sentence has a history."
          },
          {
            "speaker": "TESSA",
            "text": "It has three repair invoices and a man who still says the shortcut was sound."
          }
        ],
        "key": "M26:0"
      },
      {
        "type": "drive",
        "location": "gate",
        "label": "Confirm access instructions",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M26:1"
      },
      {
        "type": "interact",
        "location": "gate",
        "label": "Confirm access instructions",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the closure reference",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Call dispatch before changing route",
            "kind": "confirm"
          }
        ],
        "key": "M26:2"
      },
      {
        "type": "drive",
        "location": "coast",
        "label": "Use the authorised diversion",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M26:3"
      },
      {
        "type": "interact",
        "location": "coast",
        "label": "Use the authorised diversion",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the public route is open",
            "kind": "confirm"
          }
        ],
        "key": "M26:4"
      },
      {
        "type": "dialogue",
        "location": "coast",
        "label": "Conversation — Road Closed",
        "lines": [
          {
            "speaker": "PRIVATE GUARD",
            "text": "Access suspended. Turn around."
          },
          {
            "speaker": "KAI",
            "text": "Municipal permit says delivery access until noon."
          },
          {
            "speaker": "GUARD",
            "text": "My sheet says Rook Civic Services clearance only."
          },
          {
            "speaker": "KAI",
            "text": "Who can explain the difference?"
          },
          {
            "speaker": "GUARD",
            "text": "Not me. Control office number's on the board."
          },
          {
            "speaker": "TESSA",
            "text": "East approach is open. Longer, but confirmed. Record who turned you back.",
            "delivery": "radio"
          },
          {
            "speaker": "KAI",
            "text": "Guard's doing what he was told. I'll note the instruction, not invent his motives."
          }
        ],
        "key": "M26:5"
      },
      {
        "type": "drive",
        "location": "market",
        "label": "Complete the delivery",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M26:6"
      },
      {
        "type": "interact",
        "location": "market",
        "label": "Complete the delivery",
        "actions": [
          {
            "id": "action-0",
            "label": "Hand over the complete load",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Keep the access refusal copy",
            "kind": "confirm"
          }
        ],
        "key": "M26:7"
      },
      {
        "type": "dialogue",
        "location": "market",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "JUNE",
            "text": "I was going to call it a lost cause."
          },
          {
            "speaker": "KAI",
            "text": "Call it a long route. Goods are all here."
          },
          {
            "speaker": "TESSA",
            "text": "Civic Services operates the gate. Same name on the new recovery contracts.",
            "delivery": "later"
          },
          {
            "speaker": "KAI",
            "text": "Rook sponsored Sal's event."
          },
          {
            "speaker": "TESSA",
            "text": "Then he can afford a better sign."
          }
        ],
        "key": "M26:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M27",
    "title": "The Driver Who Didn'T Call",
    "chapter": "Weight of the Road",
    "contact": "Tessa",
    "location": "clinic",
    "vehicle": "car",
    "reward": 350,
    "optional": false,
    "requires": [
      "M26"
    ],
    "summary": "Ask at the listed stops; locate Oren; arrange medical transport.",
    "stages": [
      {
        "type": "dialogue",
        "location": "clinic",
        "label": "Meet Tessa",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "Oren misses lunch, not calls. Check his last two stops."
          },
          {
            "speaker": "KAI",
            "text": "Stolen load?"
          },
          {
            "speaker": "TESSA",
            "text": "Maybe. Find the driver before we price the cargo."
          }
        ],
        "key": "M27:0"
      },
      {
        "type": "drive",
        "location": "market",
        "label": "Check Oren’s first stop",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M27:1"
      },
      {
        "type": "interact",
        "location": "market",
        "label": "Check Oren’s first stop",
        "actions": [
          {
            "id": "action-0",
            "label": "Ask for his departure time",
            "kind": "confirm"
          }
        ],
        "key": "M27:2"
      },
      {
        "type": "drive",
        "location": "petrol",
        "label": "Check the next stop",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M27:3"
      },
      {
        "type": "interact",
        "location": "petrol",
        "label": "Check the next stop",
        "actions": [
          {
            "id": "action-0",
            "label": "Ask which rest area Oren used",
            "kind": "confirm"
          }
        ],
        "key": "M27:4"
      },
      {
        "type": "dialogue",
        "location": "petrol",
        "label": "Conversation — The Driver Who Didn'T Call",
        "lines": [
          {
            "speaker": "FUEL ATTENDANT",
            "text": "He argued with a recovery crew. Left holding his ribs."
          },
          {
            "speaker": "KAI",
            "text": "Which way?"
          },
          {
            "speaker": "ATTENDANT",
            "text": "Rest area. Said he needed ten minutes."
          },
          {
            "speaker": "OREN",
            "text": "Don't tell her I sat here all afternoon."
          },
          {
            "speaker": "KAI",
            "text": "I'll tell her you're hurt. Sit down."
          },
          {
            "speaker": "OREN",
            "text": "They wanted the truck. I couldn't afford another day off."
          },
          {
            "speaker": "KAI",
            "text": "You don't get a cheaper injury by hiding it."
          }
        ],
        "key": "M27:5"
      },
      {
        "type": "drive",
        "location": "rest",
        "label": "Locate Oren and arrange help",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M27:6"
      },
      {
        "type": "interact",
        "location": "rest",
        "label": "Locate Oren and arrange help",
        "actions": [
          {
            "id": "action-0",
            "label": "Ask about the injury",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm he accepts the clinic transfer",
            "kind": "confirm"
          }
        ],
        "key": "M27:7"
      },
      {
        "type": "drive",
        "location": "clinic",
        "label": "Hand Oren over to care",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M27:8"
      },
      {
        "type": "interact",
        "location": "clinic",
        "label": "Hand Oren over to care",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm Paz will collect the secured truck",
            "kind": "confirm"
          }
        ],
        "key": "M27:9"
      },
      {
        "type": "dialogue",
        "location": "clinic",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "You could have called."
          },
          {
            "speaker": "OREN",
            "text": "Last time you said we all had to take more weight."
          },
          {
            "speaker": "TESSA",
            "text": "I meant work. But I said weight. I'm sorry."
          },
          {
            "speaker": "KAI",
            "text": "Truck's secure. Paz has the collection. Oren gets to be a person tonight."
          }
        ],
        "key": "M27:10"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M28",
    "title": "Shared Weight",
    "chapter": "Weight of the Road",
    "contact": "Tessa",
    "location": "dispatch",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M27"
    ],
    "summary": "Bring the cooperative's proposal to Leela; return for the members' decision.",
    "stages": [
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Meet Tessa",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "Big one buys us volume. Small one buys us breathing room."
          },
          {
            "speaker": "PAZ",
            "text": "Which one buys a day off?"
          },
          {
            "speaker": "KAI",
            "text": "That sounds like the useful question."
          }
        ],
        "key": "M28:0"
      },
      {
        "type": "drive",
        "location": "bank",
        "label": "Review the cooperative proposal",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M28:1"
      },
      {
        "type": "interact",
        "location": "bank",
        "label": "Review the cooperative proposal",
        "actions": [
          {
            "id": "action-0",
            "label": "Compare costs and cover",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Keep personal borrowing optional",
            "kind": "confirm"
          }
        ],
        "key": "M28:2"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Confirm Celia’s actual capacity",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M28:3"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Confirm Celia’s actual capacity",
        "actions": [
          {
            "id": "action-0",
            "label": "Record two routes and one service bay",
            "kind": "confirm"
          }
        ],
        "key": "M28:4"
      },
      {
        "type": "dialogue",
        "location": "yard",
        "label": "Conversation — Shared Weight",
        "lines": [
          {
            "speaker": "LEELA",
            "text": "Revenue is not spare money. Repairs, repayments and missed days still happen."
          },
          {
            "speaker": "CELIA",
            "text": "I can share two routes and one service bay. I won't promise a fleet I don't have."
          },
          {
            "speaker": "TESSA",
            "text": "The smaller option leaves some money on the table."
          },
          {
            "speaker": "PAZ",
            "text": "It also leaves drivers in their beds sometimes."
          },
          {
            "speaker": "KAI",
            "text": "My share would be smaller too. I can live with it."
          },
          {
            "speaker": "LEELA",
            "text": "Put assumptions in the proposal. Don't build the loan on a perfect month."
          }
        ],
        "key": "M28:5"
      },
      {
        "type": "drive",
        "location": "dispatch",
        "label": "Return for the members’ decision",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M28:6"
      },
      {
        "type": "interact",
        "location": "dispatch",
        "label": "Return for the members’ decision",
        "actions": [
          {
            "id": "action-0",
            "label": "Keep Oren’s cover in the budget",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Approve the smaller contract",
            "kind": "confirm"
          }
        ],
        "key": "M28:7"
      },
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "I wanted something nobody could push around."
          },
          {
            "speaker": "CELIA",
            "text": "Being too exhausted to move isn't the same thing."
          },
          {
            "speaker": "TESSA",
            "text": "Fair. Oren's cover stays in the budget."
          },
          {
            "speaker": "KAI",
            "text": "So what are we delivering tomorrow?"
          },
          {
            "speaker": "TESSA",
            "text": "A sensible amount. Strange new idea."
          }
        ],
        "key": "M28:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M29",
    "title": "The Long Convoy",
    "chapter": "Weight of the Road",
    "contact": "Tessa",
    "location": "depot",
    "vehicle": "van",
    "reward": 450,
    "optional": false,
    "requires": [
      "M28"
    ],
    "summary": "Escort the convoy; stop for the disabled rear truck; complete the revised route.",
    "stages": [
      {
        "type": "dialogue",
        "location": "depot",
        "label": "Meet Tessa",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "We arrive together or explain why we didn't. Nobody vanishes to save a bonus."
          },
          {
            "speaker": "PAZ",
            "text": "Lead van Kai, middle truck me, rear Oren's relief driver."
          },
          {
            "speaker": "KAI",
            "text": "Call before a problem becomes a rumour."
          }
        ],
        "key": "M29:0"
      },
      {
        "type": "drive",
        "location": "dispatch",
        "label": "Check the dispatch list",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M29:1"
      },
      {
        "type": "interact",
        "location": "dispatch",
        "label": "Check the dispatch list",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm Paz and Ivo are ready",
            "kind": "confirm"
          }
        ],
        "key": "M29:2"
      },
      {
        "type": "drive",
        "location": "gate",
        "label": "Complete the first convoy checkpoint",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M29:3"
      },
      {
        "type": "interact",
        "location": "gate",
        "label": "Complete the first convoy checkpoint",
        "actions": [
          {
            "id": "action-0",
            "label": "Report the shared route position",
            "kind": "confirm"
          }
        ],
        "key": "M29:4"
      },
      {
        "type": "dialogue",
        "location": "gate",
        "label": "Conversation — The Long Convoy",
        "lines": [
          {
            "speaker": "RELIEF DRIVER IVO",
            "text": "Temperature warning. I'm pulling into the marked lay-by."
          },
          {
            "speaker": "KAI",
            "text": "Heard. Everyone hold at the next safe stop."
          },
          {
            "speaker": "CONTRACTOR",
            "text": "Your slot's gone. Move it."
          },
          {
            "speaker": "TESSA",
            "text": "We have a booking and a stopped truck. Stay clear of the cab.",
            "delivery": "radio"
          },
          {
            "speaker": "PAZ",
            "text": "Assistance confirmed. Don't turn this into a second problem."
          }
        ],
        "key": "M29:5"
      },
      {
        "type": "drive",
        "location": "rest",
        "label": "Stop for Ivo’s breakdown",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M29:6"
      },
      {
        "type": "interact",
        "location": "rest",
        "label": "Stop for Ivo’s breakdown",
        "actions": [
          {
            "id": "action-0",
            "label": "Request assistance",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Notify the customer of revised arrival",
            "kind": "confirm"
          }
        ],
        "key": "M29:7"
      },
      {
        "type": "drive",
        "location": "depot",
        "label": "Complete the revised delivery",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M29:8"
      },
      {
        "type": "interact",
        "location": "depot",
        "label": "Complete the revised delivery",
        "actions": [
          {
            "id": "action-0",
            "label": "Reconcile the whole load",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Record the missed window honestly",
            "kind": "confirm"
          }
        ],
        "key": "M29:9"
      },
      {
        "type": "dialogue",
        "location": "depot",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "CUSTOMER",
            "text": "You missed the window."
          },
          {
            "speaker": "TESSA",
            "text": "We did. Here's the breakdown and the incident report. The load is complete."
          },
          {
            "speaker": "CUSTOMER",
            "text": "Tomorrow, call my desk before the window closes."
          },
          {
            "speaker": "KAI",
            "text": "We called dispatch. We should have called you too."
          }
        ],
        "key": "M29:10"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M30",
    "title": "A Name On The Door",
    "chapter": "Weight of the Road",
    "contact": "Rosa",
    "location": "office",
    "vehicle": null,
    "reward": 0,
    "optional": false,
    "requires": [
      "M29"
    ],
    "summary": "Review the modest workspace agreement; collect the office keys.",
    "stages": [
      {
        "type": "dialogue",
        "location": "office",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "It has character."
          },
          {
            "speaker": "KAI",
            "text": "It has a short leg."
          },
          {
            "speaker": "ROSA",
            "text": "Same thing, cheaper to fix."
          }
        ],
        "key": "M30:0"
      },
      {
        "type": "travel",
        "location": "office",
        "label": "Review the modest workspace agreement",
        "radius": 9,
        "holdSeconds": 0,
        "key": "M30:1"
      },
      {
        "type": "interact",
        "location": "office",
        "label": "Review the modest workspace agreement",
        "actions": [
          {
            "id": "action-0",
            "label": "Read rent and power terms",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm independent job choices",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Accept the story office keys",
            "kind": "confirm"
          }
        ],
        "key": "M30:2"
      },
      {
        "type": "dialogue",
        "location": "office",
        "label": "Conversation — A Name On The Door",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "We can supply regular work. This doesn't mean you belong to Eastline."
          },
          {
            "speaker": "KAI",
            "text": "Written that way?"
          },
          {
            "speaker": "TESSA",
            "text": "Read it. You've had practice."
          },
          {
            "speaker": "ROSA",
            "text": "Rent includes power, not me repairing every vehicle you bring home."
          },
          {
            "speaker": "KAI",
            "text": "And the desk?"
          },
          {
            "speaker": "ROSA",
            "text": "Sadly included."
          }
        ],
        "key": "M30:3"
      },
      {
        "type": "dialogue",
        "location": "office",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROOK",
            "text": "Kai Dena Transport. Good name. It tells people who answers the telephone."
          },
          {
            "speaker": "KAI",
            "text": "Assuming the telephone gets connected."
          },
          {
            "speaker": "ROOK",
            "text": "I could help with more than that. Fleet, premises, introductions."
          },
          {
            "speaker": "KAI",
            "text": "What would you need from me?"
          },
          {
            "speaker": "ROOK",
            "text": "A conversation at Motor House. Nothing signed over a short desk."
          },
          {
            "speaker": "ROOK",
            "text": "There. Every investment begins somewhere."
          }
        ],
        "key": "M30:4"
      }
    ],
    "outcomes": {
      "independentOffice": true
    }
  },
  {
    "id": "M31",
    "title": "Rook Motor House",
    "chapter": "The Price of a Key",
    "contact": "Mira",
    "location": "showroom",
    "vehicle": "car",
    "reward": 500,
    "optional": false,
    "requires": [
      "M30"
    ],
    "summary": "Inspect and deliver the collector's car with its signed condition sheet.",
    "stages": [
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Meet Mira",
        "lines": [
          {
            "speaker": "ROOK",
            "text": "Mira runs the place. If I tell you something she disagrees with, ask her twice."
          },
          {
            "speaker": "MIRA",
            "text": "Once is usually enough."
          },
          {
            "speaker": "KAI",
            "text": "That's a useful policy."
          },
          {
            "speaker": "ROOK",
            "text": "Collector's car coming from the restoration studio. An ordinary delivery with an unusual paint bill."
          }
        ],
        "key": "M31:0"
      },
      {
        "type": "drive",
        "location": "studio",
        "label": "Inspect the collector’s car",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M31:1"
      },
      {
        "type": "interact",
        "location": "studio",
        "label": "Inspect the collector’s car",
        "actions": [
          {
            "id": "action-0",
            "label": "Record the existing trim mark",
            "kind": "inspect",
            "component": "chassis"
          },
          {
            "id": "action-1",
            "label": "Accept Anja’s condition sheet",
            "kind": "confirm"
          }
        ],
        "key": "M31:2"
      },
      {
        "type": "dialogue",
        "location": "studio",
        "label": "Conversation — Rook Motor House",
        "lines": [
          {
            "speaker": "RESTORER ANJA",
            "text": "No door opened against a wall. Photograph the existing mark on the rear trim."
          },
          {
            "speaker": "KAI",
            "text": "So it doesn't become my mark."
          },
          {
            "speaker": "ANJA",
            "text": "Exactly. Somebody taught you properly."
          },
          {
            "speaker": "ROOK",
            "text": "Treat it like a customer's ordinary car. The owner cares the same amount."
          },
          {
            "speaker": "KAI",
            "text": "Most people here mention the price first."
          },
          {
            "speaker": "ROOK",
            "text": "Price doesn't tell you how to drive it."
          }
        ],
        "key": "M31:3"
      },
      {
        "type": "drive",
        "location": "showroom",
        "label": "Complete the approved delivery",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M31:4"
      },
      {
        "type": "interact",
        "location": "showroom",
        "label": "Complete the approved delivery",
        "actions": [
          {
            "id": "action-0",
            "label": "Compare the condition sheet",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Hand over the authorised keys",
            "kind": "confirm"
          }
        ],
        "key": "M31:5"
      },
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "MIRA",
            "text": "Mark recorded, no additions. Payment today."
          },
          {
            "speaker": "ROOK",
            "text": "Take a look around. Nobody will ask you to leave fingerprints outside."
          },
          {
            "speaker": "KAI",
            "text": "I might still keep my hands in my pockets."
          }
        ],
        "key": "M31:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M32",
    "title": "White Gloves",
    "chapter": "The Price of a Key",
    "contact": "Mira",
    "location": "estate",
    "vehicle": "car",
    "reward": 400,
    "optional": false,
    "requires": [
      "M31"
    ],
    "summary": "Compare the authorised work and invoice with both parties present.",
    "stages": [
      {
        "type": "dialogue",
        "location": "estate",
        "label": "Meet Mira",
        "lines": [
          {
            "speaker": "ROOK",
            "text": "Anja disputes the last payment. Find out why before it becomes a performance."
          },
          {
            "speaker": "KAI",
            "text": "She restored it. She probably knows."
          },
          {
            "speaker": "ROOK",
            "text": "Knowing and agreeing aren't always neighbours."
          }
        ],
        "key": "M32:0"
      },
      {
        "type": "drive",
        "location": "studio",
        "label": "Compare authorised work and invoice",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M32:1"
      },
      {
        "type": "interact",
        "location": "studio",
        "label": "Compare authorised work and invoice",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the signed interior addition",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Request release approval",
            "kind": "confirm"
          }
        ],
        "key": "M32:2"
      },
      {
        "type": "drive",
        "location": "bank",
        "label": "Confirm the documented payment",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M32:3"
      },
      {
        "type": "interact",
        "location": "bank",
        "label": "Confirm the documented payment",
        "actions": [
          {
            "id": "action-0",
            "label": "Obtain Anja’s release reference",
            "kind": "confirm"
          }
        ],
        "key": "M32:4"
      },
      {
        "type": "dialogue",
        "location": "bank",
        "label": "Conversation — White Gloves",
        "lines": [
          {
            "speaker": "ANJA",
            "text": "He approved the interior after the bodywork quote. This is the signed addition."
          },
          {
            "speaker": "BELLAMY",
            "text": "The whole job was supposed to be included."
          },
          {
            "speaker": "KAI",
            "text": "This date is later. You chose the material here."
          },
          {
            "speaker": "BELLAMY",
            "text": "Are you the accountant now?"
          },
          {
            "speaker": "KAI",
            "text": "I'm the man who can't deliver a settled handover until it's settled."
          },
          {
            "speaker": "MIRA",
            "text": "The extra work is documented. We can complete the payment through the desk."
          },
          {
            "speaker": "ROOK",
            "text": "Do that. Mr Bellamy, the car will arrive with time to spare."
          }
        ],
        "key": "M32:5"
      },
      {
        "type": "drive",
        "location": "estate",
        "label": "Complete Bellamy’s handover",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M32:6"
      },
      {
        "type": "interact",
        "location": "estate",
        "label": "Complete Bellamy’s handover",
        "actions": [
          {
            "id": "action-0",
            "label": "Deliver the condition sheet with the car",
            "kind": "confirm"
          }
        ],
        "key": "M32:7"
      },
      {
        "type": "dialogue",
        "location": "estate",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ANJA",
            "text": "Thank you for not calling it a misunderstanding and driving away."
          },
          {
            "speaker": "KAI",
            "text": "I tried that version once."
          },
          {
            "speaker": "ROOK",
            "text": "You made a wealthy client wait for a mechanic.",
            "delivery": "later"
          },
          {
            "speaker": "KAI",
            "text": "I made two people finish their agreement."
          },
          {
            "speaker": "ROOK",
            "text": "Precise. I like precise."
          }
        ],
        "key": "M32:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M33",
    "title": "The Private Road",
    "chapter": "The Price of a Key",
    "contact": "Mira",
    "location": "showroom",
    "vehicle": "car",
    "reward": 375,
    "optional": false,
    "requires": [
      "M32"
    ],
    "summary": "Collect the two guests and complete the estate transfer.",
    "stages": [
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Meet Mira",
        "lines": [
          {
            "speaker": "MIRA",
            "text": "Two guests. Estate office. Return the pass afterward."
          },
          {
            "speaker": "KAI",
            "text": "Same road that turned Eastline away?"
          },
          {
            "speaker": "MIRA",
            "text": "That's the road on the booking. Ask the operations office about the policy."
          }
        ],
        "key": "M33:0"
      },
      {
        "type": "drive",
        "location": "hotel",
        "label": "Collect the booked guests",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M33:1"
      },
      {
        "type": "interact",
        "location": "hotel",
        "label": "Collect the booked guests",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm both names",
            "kind": "confirm"
          }
        ],
        "key": "M33:2"
      },
      {
        "type": "drive",
        "location": "gate",
        "label": "Present the temporary pass",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M33:3"
      },
      {
        "type": "interact",
        "location": "gate",
        "label": "Present the temporary pass",
        "actions": [
          {
            "id": "action-0",
            "label": "Record the stated priority policy",
            "kind": "confirm"
          }
        ],
        "key": "M33:4"
      },
      {
        "type": "dialogue",
        "location": "gate",
        "label": "Conversation — The Private Road",
        "lines": [
          {
            "speaker": "GATE GUARD",
            "text": "Motor House pass? Go through."
          },
          {
            "speaker": "KAI",
            "text": "Delivery permit didn't count last month."
          },
          {
            "speaker": "GUARD",
            "text": "Different clearance. I don't write them."
          },
          {
            "speaker": "PASSENGER ONE",
            "text": "Terrible queues before Rook sorted this out."
          },
          {
            "speaker": "PASSENGER TWO",
            "text": "For us, certainly."
          },
          {
            "speaker": "KAI",
            "text": "Tessa pays for access too. Why does this pass erase her queue?"
          },
          {
            "speaker": "ROOK",
            "text": "Dedicated capacity. Clients pay for certainty."
          },
          {
            "speaker": "KAI",
            "text": "Somebody else pays by waiting."
          },
          {
            "speaker": "ROOK",
            "text": "Scarce things have priorities. That's not a scandal by itself."
          }
        ],
        "key": "M33:5"
      },
      {
        "type": "drive",
        "location": "estate",
        "label": "Complete the guest transfer",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M33:6"
      },
      {
        "type": "interact",
        "location": "estate",
        "label": "Complete the guest transfer",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm both arrivals",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Ask Rook about unequal access",
            "kind": "confirm"
          }
        ],
        "key": "M33:7"
      },
      {
        "type": "drive",
        "location": "showroom",
        "label": "Return the temporary pass",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M33:8"
      },
      {
        "type": "interact",
        "location": "showroom",
        "label": "Return the temporary pass",
        "actions": [
          {
            "id": "action-0",
            "label": "Obtain the return receipt",
            "kind": "confirm"
          }
        ],
        "key": "M33:9"
      },
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "MIRA",
            "text": "Something wrong with the trip?"
          },
          {
            "speaker": "KAI",
            "text": "Trip was smooth. That's what I'm thinking about."
          }
        ],
        "key": "M33:10"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M34",
    "title": "Terms And Conditions",
    "chapter": "The Price of a Key",
    "contact": "Rook",
    "location": "office",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M33"
    ],
    "summary": "Read the proposal; discuss it with Leela; agree only to a limited trial.",
    "stages": [
      {
        "type": "dialogue",
        "location": "office",
        "label": "Meet Rook",
        "lines": [
          {
            "speaker": "ROOK",
            "text": "Five vehicles. Better premises. Your name stays on the door."
          },
          {
            "speaker": "KAI",
            "text": "Who chooses the jobs?"
          },
          {
            "speaker": "ROOK",
            "text": "The business we build together."
          },
          {
            "speaker": "KAI",
            "text": "That's not a name I can call at three in the morning."
          },
          {
            "speaker": "ROOK",
            "text": "For the first period, my operations team."
          }
        ],
        "key": "M34:0"
      },
      {
        "type": "drive",
        "location": "bank",
        "label": "Read the proposal with Leela",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M34:1"
      },
      {
        "type": "interact",
        "location": "bank",
        "label": "Read the proposal with Leela",
        "actions": [
          {
            "id": "action-0",
            "label": "Separate investment and trial",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Read assignment obligations",
            "kind": "confirm"
          }
        ],
        "key": "M34:2"
      },
      {
        "type": "drive",
        "location": "showroom",
        "label": "Accept only the limited trial",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M34:3"
      },
      {
        "type": "interact",
        "location": "showroom",
        "label": "Accept only the limited trial",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm no ownership change",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Accept the temporary assignment keys",
            "kind": "confirm"
          }
        ],
        "key": "M34:4"
      },
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Conversation — Terms And Conditions",
        "lines": [
          {
            "speaker": "LEELA",
            "text": "The investment ties priority to their contracts. This trial is narrower, but it still binds you to assigned work."
          },
          {
            "speaker": "KAI",
            "text": "I can walk away from the investment."
          },
          {
            "speaker": "LEELA",
            "text": "That doesn't mean the trial has no consequences."
          },
          {
            "speaker": "KAI",
            "text": "I heard you."
          },
          {
            "speaker": "LEELA",
            "text": "I know. I want you to remember hearing me."
          },
          {
            "speaker": "ROOK",
            "text": "One vehicle on loan for the assignments. No ownership change. Try working with us."
          },
          {
            "speaker": "KAI",
            "text": "Limited term. No agreement to the larger deal."
          },
          {
            "speaker": "ROOK",
            "text": "Written exactly that way."
          }
        ],
        "key": "M34:5"
      },
      {
        "type": "drive",
        "location": "office",
        "label": "Record the trial",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M34:6"
      },
      {
        "type": "interact",
        "location": "office",
        "label": "Record the trial",
        "actions": [
          {
            "id": "action-0",
            "label": "Keep the larger investment unsigned",
            "kind": "confirm"
          }
        ],
        "key": "M34:7"
      },
      {
        "type": "dialogue",
        "location": "office",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "Yours?"
          },
          {
            "speaker": "KAI",
            "text": "Trial vehicle."
          },
          {
            "speaker": "ROSA",
            "text": "Then remember where the keys go when the trial ends."
          }
        ],
        "key": "M34:8"
      }
    ],
    "outcomes": {
      "trialActive": true
    }
  },
  {
    "id": "M35",
    "title": "A Quiet Collection",
    "chapter": "The Price of a Key",
    "contact": "Harlan",
    "location": "petrol",
    "vehicle": "van",
    "reward": 0,
    "optional": false,
    "requires": [
      "M34"
    ],
    "summary": "Verify the handover; refuse the false witness claim; help the drivers leave safely.",
    "stages": [
      {
        "type": "dialogue",
        "location": "petrol",
        "label": "Meet Harlan",
        "lines": [
          {
            "speaker": "HARLAN",
            "text": "Voluntary surrender. Support crew on site. Witness receipt after handover."
          },
          {
            "speaker": "KAI",
            "text": "I'll read it there."
          },
          {
            "speaker": "HARLAN",
            "text": "It's standard."
          },
          {
            "speaker": "KAI",
            "text": "So was the last one I shouldn't have signed."
          }
        ],
        "key": "M35:0"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Verify the claimed voluntary handover",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M35:1"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Verify the claimed voluntary handover",
        "actions": [
          {
            "id": "action-0",
            "label": "Ask Bea whether she agreed",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Refuse the false witness claim",
            "kind": "confirm"
          }
        ],
        "key": "M35:2"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Prepare the drivers’ exit",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M35:3"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Prepare the drivers’ exit",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the office occupants",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Record the objection with Operations",
            "kind": "confirm"
          }
        ],
        "key": "M35:4"
      },
      {
        "type": "dialogue",
        "location": "yard",
        "label": "Conversation — A Quiet Collection",
        "lines": [
          {
            "speaker": "DRIVER BEA",
            "text": "We haven't surrendered anything. The appeal's still open."
          },
          {
            "speaker": "KELLS",
            "text": "She doesn't decide the schedule. Keys, Dena."
          },
          {
            "speaker": "KAI",
            "text": "Where's her signed release?"
          },
          {
            "speaker": "KELLS",
            "text": "You work for the collection team."
          },
          {
            "speaker": "KAI",
            "text": "Not for making up the owner."
          },
          {
            "speaker": "HARLAN",
            "text": "Complete the assigned recovery and note the objection."
          },
          {
            "speaker": "KAI",
            "text": "Refusal isn't a note saying yes."
          },
          {
            "speaker": "BEA",
            "text": "Two in the office. I'll get them."
          },
          {
            "speaker": "KAI",
            "text": "I'll keep the gate clear. Nobody comes back for a vehicle."
          }
        ],
        "key": "M35:5"
      },
      {
        "type": "drive",
        "location": "petrol",
        "label": "Bring drivers to a public safe place",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M35:6"
      },
      {
        "type": "interact",
        "location": "petrol",
        "label": "Bring drivers to a public safe place",
        "actions": [
          {
            "id": "action-0",
            "label": "Reconcile Bea’s list",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Leave disputed vehicles in place",
            "kind": "confirm"
          }
        ],
        "key": "M35:7"
      },
      {
        "type": "dialogue",
        "location": "petrol",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROOK",
            "text": "You abandoned an assignment.",
            "delivery": "phone"
          },
          {
            "speaker": "KAI",
            "text": "I refused a false handover. I've recorded why with Operations."
          },
          {
            "speaker": "ROOK",
            "text": "Bring my vehicle back. We will discuss the contract separately."
          },
          {
            "speaker": "KAI",
            "text": "It'll be returned with the condition sheet."
          }
        ],
        "key": "M35:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M36",
    "title": "What You Keep",
    "chapter": "The Price of a Key",
    "contact": "Mira",
    "location": "workshop",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M35"
    ],
    "summary": "Return Rook's loan vehicle; give a truthful account; speak to Tessa.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Mira",
        "lines": [
          {
            "speaker": "Mira",
            "text": "Return Rook's loan vehicle; give a truthful account; speak to Tessa."
          }
        ],
        "key": "M36:0"
      },
      {
        "type": "drive",
        "location": "showroom",
        "label": "Return the assigned trial keys",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M36:1"
      },
      {
        "type": "interact",
        "location": "showroom",
        "label": "Return the assigned trial keys",
        "actions": [
          {
            "id": "action-0",
            "label": "Obtain the condition and return receipt",
            "kind": "confirm"
          }
        ],
        "key": "M36:2"
      },
      {
        "type": "drive",
        "location": "radio",
        "label": "Give a truthful account",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M36:3"
      },
      {
        "type": "interact",
        "location": "radio",
        "label": "Give a truthful account",
        "actions": [
          {
            "id": "action-0",
            "label": "Include Leela’s warning",
            "kind": "confirm"
          }
        ],
        "key": "M36:4"
      },
      {
        "type": "dialogue",
        "location": "radio",
        "label": "Conversation — What You Keep",
        "lines": [
          {
            "speaker": "MIRA",
            "text": "Condition checked. Here's confirmation of return."
          },
          {
            "speaker": "KAI",
            "text": "And the contract dispute?"
          },
          {
            "speaker": "MIRA",
            "text": "Separate. I won't pretend returning a key settles it."
          },
          {
            "speaker": "KAI",
            "text": "Thanks for saying it plainly."
          }
        ],
        "key": "M36:5"
      },
      {
        "type": "drive",
        "location": "dispatch",
        "label": "Speak to Tessa",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M36:6"
      },
      {
        "type": "interact",
        "location": "dispatch",
        "label": "Speak to Tessa",
        "actions": [
          {
            "id": "action-0",
            "label": "Acknowledge the access decision",
            "kind": "confirm"
          }
        ],
        "key": "M36:7"
      },
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Conversation — What You Keep",
        "lines": [
          {
            "speaker": "IMANI",
            "text": "Why did you take the trial?"
          },
          {
            "speaker": "KAI",
            "text": "Better cars. Better money. Thought I could choose only the useful part."
          },
          {
            "speaker": "IMANI",
            "text": "Leela warned you?"
          },
          {
            "speaker": "KAI",
            "text": "Yes. Keep that in."
          },
          {
            "speaker": "IMANI",
            "text": "I wasn't going to remove it."
          },
          {
            "speaker": "TESSA",
            "text": "We talked about those gates. Then you drove through one with his pass."
          },
          {
            "speaker": "KAI",
            "text": "You're right."
          },
          {
            "speaker": "TESSA",
            "text": "Don't say it because it's the shortest way out of the room."
          },
          {
            "speaker": "KAI",
            "text": "I won't ask you to make it easy."
          }
        ],
        "key": "M36:8"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Return to ordinary work",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M36:9"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Return to ordinary work",
        "actions": [
          {
            "id": "action-0",
            "label": "Check the next work car’s tyres",
            "kind": "inspect",
            "component": "tyres"
          }
        ],
        "key": "M36:10"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "Smaller car, same roads."
          },
          {
            "speaker": "KAI",
            "text": "Less comfortable view of myself."
          },
          {
            "speaker": "ROSA",
            "text": "Mirrors are like that. There's work tomorrow if you want it."
          }
        ],
        "key": "M36:11"
      }
    ],
    "outcomes": {
      "trialActive": false
    }
  },
  {
    "id": "M37",
    "title": "Weather Coming",
    "chapter": "Open Roads",
    "contact": "Rosa",
    "location": "dispatch",
    "vehicle": "van",
    "reward": 300,
    "optional": false,
    "requires": [
      "M36"
    ],
    "summary": "Collect the marked shelter supplies; deliver them to Eastline.",
    "stages": [
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "IMANI",
            "text": "The shelter list will be repeated after the forecast. Please use the published routes, not rumours.",
            "delivery": "radio"
          },
          {
            "speaker": "ROSA",
            "text": "Nora has blankets at the Orchid. Tessa needs them at the staging room."
          },
          {
            "speaker": "KAI",
            "text": "Does Tessa know I'm coming?"
          },
          {
            "speaker": "ROSA",
            "text": "She asked for a driver. I gave her a name, not a reconciliation speech."
          }
        ],
        "key": "M37:0"
      },
      {
        "type": "drive",
        "location": "hotel",
        "label": "Collect donated shelter supplies",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M37:1"
      },
      {
        "type": "interact",
        "location": "hotel",
        "label": "Collect donated shelter supplies",
        "actions": [
          {
            "id": "action-0",
            "label": "Separate donations from customer orders",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Check the shelter labels",
            "kind": "confirm"
          }
        ],
        "key": "M37:2"
      },
      {
        "type": "dialogue",
        "location": "hotel",
        "label": "Conversation — Weather Coming",
        "lines": [
          {
            "speaker": "NORA",
            "text": "These are donated. Those are a customer's order. Don't make generosity out of somebody else's sheets."
          },
          {
            "speaker": "KAI",
            "text": "Marked boxes only. Where are you staying?"
          },
          {
            "speaker": "NORA",
            "text": "Upstairs at my sister's if it gets bad. I've thought about it."
          },
          {
            "speaker": "KAI",
            "text": "I was asking, not assigning."
          },
          {
            "speaker": "NORA",
            "text": "Good. You're learning."
          }
        ],
        "key": "M37:3"
      },
      {
        "type": "drive",
        "location": "dispatch",
        "label": "Deliver the shelter load",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M37:4"
      },
      {
        "type": "interact",
        "location": "dispatch",
        "label": "Deliver the shelter load",
        "actions": [
          {
            "id": "action-0",
            "label": "Use the dry receiving room",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Obtain the staging receipt",
            "kind": "confirm"
          }
        ],
        "key": "M37:5"
      },
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "Dry room on the left. Route requests are on the board."
          },
          {
            "speaker": "KAI",
            "text": "Which first?"
          },
          {
            "speaker": "TESSA",
            "text": "The one you can complete before the closure. Tell me when it's done."
          }
        ],
        "key": "M37:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M38",
    "title": "Who Goes First",
    "chapter": "Open Roads",
    "contact": "Tessa",
    "location": "shelter",
    "vehicle": "van",
    "reward": 350,
    "optional": false,
    "requires": [
      "M37"
    ],
    "summary": "Confirm access instructions; use safe public routes; deliver the supplies.",
    "stages": [
      {
        "type": "dialogue",
        "location": "shelter",
        "label": "Meet Tessa",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "Some roads are dangerous. Some gates are merely expensive. We need to know which."
          },
          {
            "speaker": "KAI",
            "text": "Not everything that delays us is a plot."
          },
          {
            "speaker": "TESSA",
            "text": "Exactly. Bring facts. And the supplies."
          }
        ],
        "key": "M38:0"
      },
      {
        "type": "drive",
        "location": "gate",
        "label": "Confirm the first restriction",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M38:1"
      },
      {
        "type": "interact",
        "location": "gate",
        "label": "Confirm the first restriction",
        "actions": [
          {
            "id": "action-0",
            "label": "Record the washed-out road closure",
            "kind": "confirm"
          }
        ],
        "key": "M38:2"
      },
      {
        "type": "drive",
        "location": "estate",
        "label": "Confirm the priority refusal",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M38:3"
      },
      {
        "type": "interact",
        "location": "estate",
        "label": "Confirm the priority refusal",
        "actions": [
          {
            "id": "action-0",
            "label": "Keep the Operations reference",
            "kind": "confirm"
          }
        ],
        "key": "M38:4"
      },
      {
        "type": "dialogue",
        "location": "estate",
        "label": "Conversation — Who Goes First",
        "lines": [
          {
            "speaker": "MUNICIPAL WORKER",
            "text": "Surface washed out. Turn back. This one's not negotiable.",
            "delivery": "first gate"
          },
          {
            "speaker": "KAI",
            "text": "Understood. Anyone still waiting beyond it?"
          },
          {
            "speaker": "WORKER",
            "text": "Transfer crew has the list. I'll pass your offer on."
          },
          {
            "speaker": "DISPATCHER",
            "text": "Paid service account first. That's my queue instruction."
          },
          {
            "speaker": "KAI",
            "text": "Who approved that for the shelter request?"
          },
          {
            "speaker": "DISPATCHER",
            "text": "Operations. Reference on your refusal slip."
          }
        ],
        "key": "M38:5"
      },
      {
        "type": "drive",
        "location": "coast",
        "label": "Use the public approach",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M38:6"
      },
      {
        "type": "interact",
        "location": "coast",
        "label": "Use the public approach",
        "actions": [
          {
            "id": "action-0",
            "label": "Check the current route notice",
            "kind": "confirm"
          }
        ],
        "key": "M38:7"
      },
      {
        "type": "drive",
        "location": "shelter",
        "label": "Deliver the shelter supplies",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M38:8"
      },
      {
        "type": "interact",
        "location": "shelter",
        "label": "Deliver the shelter supplies",
        "actions": [
          {
            "id": "action-0",
            "label": "Hand over the intact load",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Report the distinct instructions accurately",
            "kind": "confirm"
          }
        ],
        "key": "M38:9"
      },
      {
        "type": "dialogue",
        "location": "shelter",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "IMANI",
            "text": "One safety closure, one priority refusal, one open route. Is that accurate?"
          },
          {
            "speaker": "KAI",
            "text": "Yes. Don't put the road worker in the same story as the queue policy."
          },
          {
            "speaker": "IMANI",
            "text": "He's in the story. For doing his job properly."
          }
        ],
        "key": "M38:10"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M39",
    "title": "The Mechanic'S Promise",
    "chapter": "Open Roads",
    "contact": "Rosa",
    "location": "dispatch",
    "vehicle": "van",
    "reward": 300,
    "optional": false,
    "requires": [
      "M38"
    ],
    "summary": "Collect the available service parts; check the assigned fleet with Rosa.",
    "stages": [
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "MILO",
            "text": "Which one gets the new tyres?"
          },
          {
            "speaker": "ROSA",
            "text": "The van carrying people. Coupe can wait for a better evening."
          },
          {
            "speaker": "KAI",
            "text": "I used to think the expensive one was always the important one."
          },
          {
            "speaker": "ROSA",
            "text": "Expensive just tells you which invoice hurts."
          }
        ],
        "key": "M39:0"
      },
      {
        "type": "drive",
        "location": "parts",
        "label": "Collect the reserved fleet parts",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M39:1"
      },
      {
        "type": "interact",
        "location": "parts",
        "label": "Collect the reserved fleet parts",
        "actions": [
          {
            "id": "action-0",
            "label": "Match brake service references",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Match correct tyre references",
            "kind": "confirm"
          }
        ],
        "key": "M39:2"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Review Rosa’s signed checks",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M39:3"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Review Rosa’s signed checks",
        "actions": [
          {
            "id": "action-0",
            "label": "Check braking condition",
            "kind": "inspect",
            "component": "brakes"
          },
          {
            "id": "action-1",
            "label": "Check engine condition",
            "kind": "inspect",
            "component": "engine"
          },
          {
            "id": "action-2",
            "label": "Check tyre condition",
            "kind": "inspect",
            "component": "tyres"
          }
        ],
        "key": "M39:4"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Conversation — The Mechanic'S Promise",
        "lines": [
          {
            "speaker": "MILO",
            "text": "Brake check, lights, tyres. You want me to repeat it?"
          },
          {
            "speaker": "ROSA",
            "text": "Yes. Nervous is fine. Guessing isn't."
          },
          {
            "speaker": "KAI",
            "text": "I knew what Rook's pass meant. Took it anyway. You were right to be angry."
          },
          {
            "speaker": "TESSA",
            "text": "I still am."
          },
          {
            "speaker": "KAI",
            "text": "I'm not offering this job as an eraser."
          },
          {
            "speaker": "TESSA",
            "text": "Good. We need a driver, not another speech."
          }
        ],
        "key": "M39:5"
      },
      {
        "type": "drive",
        "location": "dispatch",
        "label": "Deliver the prepared fleet records",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M39:6"
      },
      {
        "type": "interact",
        "location": "dispatch",
        "label": "Deliver the prepared fleet records",
        "actions": [
          {
            "id": "action-0",
            "label": "Hand over the checklist",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Acknowledge Tessa’s concerns",
            "kind": "confirm"
          }
        ],
        "key": "M39:7"
      },
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "Full tank. Engine sound. If either changes, report which one."
          },
          {
            "speaker": "KAI",
            "text": "I can keep two problems separate."
          },
          {
            "speaker": "ROSA",
            "text": "Start there. Build up."
          }
        ],
        "key": "M39:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M40",
    "title": "Kells'S Last Contract",
    "chapter": "Open Roads",
    "contact": "Tessa",
    "location": "inquiry",
    "vehicle": "van",
    "reward": 450,
    "optional": false,
    "requires": [
      "M39"
    ],
    "summary": "Protect the occupied dispatch room; open the pedestrian exit; hold for responding officers.",
    "stages": [
      {
        "type": "dialogue",
        "location": "inquiry",
        "label": "Meet Tessa",
        "lines": [
          {
            "speaker": "KELLS",
            "text": "Assigned recovery. Rook vehicles and anything standing in their way."
          },
          {
            "speaker": "TESSA",
            "text": "Those vans belong to three different operators. Nobody agreed to that."
          },
          {
            "speaker": "KELLS",
            "text": "Take it up with the people who write the papers."
          },
          {
            "speaker": "KAI",
            "text": "I have. You still don't get to drag the drivers out."
          }
        ],
        "key": "M40:0"
      },
      {
        "type": "drive",
        "location": "dispatch",
        "label": "Check the occupied-room roster",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M40:1"
      },
      {
        "type": "interact",
        "location": "dispatch",
        "label": "Check the occupied-room roster",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm six staff inside",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm two staff outside",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Request officers",
            "kind": "confirm"
          }
        ],
        "key": "M40:2"
      },
      {
        "type": "drive",
        "location": "shelter",
        "label": "Move the first group to safety",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M40:3"
      },
      {
        "type": "interact",
        "location": "shelter",
        "label": "Move the first group to safety",
        "actions": [
          {
            "id": "action-0",
            "label": "Reconcile the first four names",
            "kind": "confirm"
          }
        ],
        "key": "M40:4"
      },
      {
        "type": "drive",
        "location": "dispatch",
        "label": "Collect remaining staff",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M40:5"
      },
      {
        "type": "interact",
        "location": "dispatch",
        "label": "Collect remaining staff",
        "actions": [
          {
            "id": "action-0",
            "label": "Keep the pedestrian route clear",
            "kind": "confirm"
          }
        ],
        "key": "M40:6"
      },
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Conversation — Kells'S Last Contract",
        "lines": [
          {
            "speaker": "PAZ",
            "text": "Staff counted. Six in the room, two outside."
          },
          {
            "speaker": "KAI",
            "text": "Keep them off the vehicle lane. Tessa, tell the dispatcher exactly where we are."
          },
          {
            "speaker": "KELLS",
            "text": "You could have had the showroom job."
          },
          {
            "speaker": "KAI",
            "text": "I had it. That's how I know what your instructions leave out."
          },
          {
            "speaker": "TESSA",
            "text": "Assault at the yard. Occupied vehicles. We need officers here.",
            "delivery": "phone"
          }
        ],
        "key": "M40:7"
      },
      {
        "type": "drive",
        "location": "shelter",
        "label": "Complete the safe regroup",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M40:8"
      },
      {
        "type": "interact",
        "location": "shelter",
        "label": "Complete the safe regroup",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm all eight names",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Wait for responding officers",
            "kind": "confirm"
          }
        ],
        "key": "M40:9"
      },
      {
        "type": "drive",
        "location": "inquiry",
        "label": "Give the peaceful statement",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M40:10"
      },
      {
        "type": "interact",
        "location": "inquiry",
        "label": "Give the peaceful statement",
        "actions": [
          {
            "id": "action-0",
            "label": "Cooperate with Mercer",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Submit volunteered assignment copies",
            "kind": "confirm"
          }
        ],
        "key": "M40:11"
      },
      {
        "type": "dialogue",
        "location": "inquiry",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "MERCER",
            "text": "Hands visible. Away from the drivers. Everyone, including you, Kai."
          },
          {
            "speaker": "KAI",
            "text": "Understood."
          },
          {
            "speaker": "KELLS",
            "text": "This is a business collection."
          },
          {
            "speaker": "MERCER",
            "text": "Then why are two people injured? You'll explain that in your statement."
          }
        ],
        "key": "M40:12"
      }
    ],
    "outcomes": {
      "kellsDetained": true
    }
  },
  {
    "id": "M41",
    "title": "Across The Causeway",
    "chapter": "Open Roads",
    "contact": "Celia",
    "location": "shelter",
    "vehicle": "van",
    "reward": 450,
    "optional": false,
    "requires": [
      "M40"
    ],
    "summary": "Move the assigned passenger group to the staffed transfer point; obey the turnback.",
    "stages": [
      {
        "type": "dialogue",
        "location": "shelter",
        "label": "Meet Celia",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "Last safe transfer window. If they close it earlier, we stop earlier."
          },
          {
            "speaker": "KAI",
            "text": "No saving a schedule by losing a van full of people."
          },
          {
            "speaker": "CELIA",
            "text": "Exactly. Ellis has the final headcount."
          },
          {
            "speaker": "TOMAS",
            "text": "Where do you need me?",
            "delivery": "arriving"
          },
          {
            "speaker": "CELIA",
            "text": "I thought you were inland."
          },
          {
            "speaker": "TOMAS",
            "text": "I came because I could. Tell me where to stand."
          }
        ],
        "key": "M41:0"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Prepare the passenger group",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M41:1"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Prepare the passenger group",
        "actions": [
          {
            "id": "action-0",
            "label": "Match names to the receiving list",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm the brother is on the second list",
            "kind": "confirm"
          }
        ],
        "key": "M41:2"
      },
      {
        "type": "drive",
        "location": "transfer",
        "label": "Complete the staffed transfer",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M41:3"
      },
      {
        "type": "interact",
        "location": "transfer",
        "label": "Complete the staffed transfer",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the receiving headcount",
            "kind": "confirm"
          }
        ],
        "key": "M41:4"
      },
      {
        "type": "dialogue",
        "location": "transfer",
        "label": "Conversation — Across The Causeway",
        "lines": [
          {
            "speaker": "ELLIS",
            "text": "Two vans here, one on approach. Last passenger has a blue bag."
          },
          {
            "speaker": "PASSENGER",
            "text": "My brother's not in this van."
          },
          {
            "speaker": "KAI",
            "text": "Ellis, check the other list before we move."
          },
          {
            "speaker": "ELLIS",
            "text": "Confirmed. Second van, seat by the door. You'll meet at the receiving point."
          },
          {
            "speaker": "ROAD WORKER",
            "text": "Route closing. Leave the empty vehicle. Walk to the marked transfer side with us."
          },
          {
            "speaker": "CELIA",
            "text": "That's a fleet van—"
          },
          {
            "speaker": "CELIA",
            "text": "Leave it. Tomas, take the rear count."
          }
        ],
        "key": "M41:5"
      },
      {
        "type": "drive",
        "location": "coast",
        "label": "Obey the controlled turnback",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M41:6"
      },
      {
        "type": "interact",
        "location": "coast",
        "label": "Obey the controlled turnback",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the closure instruction",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Leave the empty story vehicle with staff",
            "kind": "confirm"
          }
        ],
        "key": "M41:7"
      },
      {
        "type": "travel",
        "location": "shelter",
        "label": "Reach the receiving side",
        "radius": 9,
        "holdSeconds": 0,
        "key": "M41:8",
        "onFoot": true
      },
      {
        "type": "interact",
        "location": "shelter",
        "label": "Reach the receiving side",
        "actions": [
          {
            "id": "action-0",
            "label": "Reconcile the final names with Ellis",
            "kind": "confirm"
          }
        ],
        "key": "M41:9"
      },
      {
        "type": "dialogue",
        "location": "shelter",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "TOMAS",
            "text": "I'm still taking the inland place when this is over."
          },
          {
            "speaker": "CELIA",
            "text": "I know."
          },
          {
            "speaker": "TOMAS",
            "text": "And you're not going to make today a reason I can't?"
          },
          {
            "speaker": "CELIA",
            "text": "No. Today is a reason I'm glad you came."
          }
        ],
        "key": "M41:10"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M42",
    "title": "The Night Line",
    "chapter": "Open Roads",
    "contact": "Rina",
    "location": "radio",
    "vehicle": "van",
    "reward": 250,
    "optional": false,
    "requires": [
      "M41"
    ],
    "summary": "Deliver verified route notes; reunite the separated passengers; help Imani prepare the next bulletin.",
    "stages": [
      {
        "type": "dialogue",
        "location": "radio",
        "label": "Meet Rina",
        "lines": [
          {
            "speaker": "SAL",
            "text": "I normally employ people for this."
          },
          {
            "speaker": "RINA",
            "text": "Some of them are asleep. Try the educational experience."
          },
          {
            "speaker": "KAI",
            "text": "Where's the headliner?"
          },
          {
            "speaker": "SEF",
            "text": "On tea.",
            "delivery": "carrying a kettle"
          }
        ],
        "key": "M42:0"
      },
      {
        "type": "drive",
        "location": "club",
        "label": "Deliver verified route notes",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M42:1"
      },
      {
        "type": "interact",
        "location": "club",
        "label": "Deliver verified route notes",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the issue time",
            "kind": "confirm"
          }
        ],
        "key": "M42:2"
      },
      {
        "type": "drive",
        "location": "shelter",
        "label": "Reunite the separated passengers",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M42:3"
      },
      {
        "type": "interact",
        "location": "shelter",
        "label": "Reunite the separated passengers",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the sister’s name",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Match both receiving references",
            "kind": "confirm"
          }
        ],
        "key": "M42:4"
      },
      {
        "type": "dialogue",
        "location": "shelter",
        "label": "Conversation — The Night Line",
        "lines": [
          {
            "speaker": "LEELA",
            "text": "We have a telephone queue. People calling family get their turn without a bank account."
          },
          {
            "speaker": "KAI",
            "text": "The brother from the causeway?"
          },
          {
            "speaker": "LEELA",
            "text": "Over there. His sister's been found. Bring her to this desk."
          },
          {
            "speaker": "SISTER",
            "text": "You said we'd meet here."
          },
          {
            "speaker": "KAI",
            "text": "Ellis checked. I'm glad you both listened to him."
          },
          {
            "speaker": "IMANI",
            "text": "Read the closure notice exactly. Not somebody's version in the corridor.",
            "delivery": "phone"
          },
          {
            "speaker": "KAI",
            "text": "Municipal issue, twenty-three ten. North approach closed. Receiving point remains open."
          },
          {
            "speaker": "IMANI",
            "text": "Thank you. I'll verify against dispatch before airing it."
          }
        ],
        "key": "M42:5"
      },
      {
        "type": "drive",
        "location": "radio",
        "label": "Prepare the verified bulletin",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M42:6"
      },
      {
        "type": "interact",
        "location": "radio",
        "label": "Prepare the verified bulletin",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the current closure notice",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Wait for dispatch verification",
            "kind": "confirm"
          }
        ],
        "key": "M42:7"
      },
      {
        "type": "dialogue",
        "location": "radio",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "SAL",
            "text": "Kitchen says everyone eats. No ticket required."
          },
          {
            "speaker": "RINA",
            "text": "Best announcement you've made all year."
          },
          {
            "speaker": "TESSA",
            "text": "Depot workers are still waiting. Rook wants his stock moved first.",
            "delivery": "calling Kai"
          },
          {
            "speaker": "KAI",
            "text": "Send the confirmed location. I'll speak to Celia about seats."
          }
        ],
        "key": "M42:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M43",
    "title": "No Private Exit",
    "chapter": "Open Roads",
    "contact": "Tessa",
    "location": "transfer",
    "vehicle": "van",
    "reward": 500,
    "optional": false,
    "requires": [
      "M42"
    ],
    "summary": "Agree a safe exit with depot staff; bring the approved passenger vehicles; move the workers.",
    "stages": [
      {
        "type": "dialogue",
        "location": "transfer",
        "label": "Meet Tessa",
        "lines": [
          {
            "speaker": "ROOK",
            "text": "My cars need moving while the road is passable. Yours is an unusually useful skill tonight."
          },
          {
            "speaker": "KAI",
            "text": "The workers asked for transport."
          },
          {
            "speaker": "ROOK",
            "text": "It is being arranged. Take the coupe first. I can make the previous disagreement go away."
          },
          {
            "speaker": "KAI",
            "text": "Is the driver moving people on your list yet?"
          },
          {
            "speaker": "ROOK",
            "text": "Kai, don't turn a practical problem into a principle."
          },
          {
            "speaker": "KAI",
            "text": "People waiting isn't theoretical."
          }
        ],
        "key": "M43:0"
      },
      {
        "type": "drive",
        "location": "depot",
        "label": "Agree the safe exit with Mira",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M43:1"
      },
      {
        "type": "interact",
        "location": "depot",
        "label": "Agree the safe exit with Mira",
        "actions": [
          {
            "id": "action-0",
            "label": "Check the worker list",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm upper-gate consent",
            "kind": "confirm"
          }
        ],
        "key": "M43:2"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Collect authorised passenger transport",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M43:3"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Collect authorised passenger transport",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm Celia’s seats",
            "kind": "confirm"
          }
        ],
        "key": "M43:4"
      },
      {
        "type": "dialogue",
        "location": "yard",
        "label": "Conversation — No Private Exit",
        "lines": [
          {
            "speaker": "MIRA",
            "text": "Staff list is here. Celia has enough seats if the upper gate opens."
          },
          {
            "speaker": "ROOK",
            "text": "The upper gate is the stock route."
          },
          {
            "speaker": "MIRA",
            "text": "The stock has no passengers. I'm opening it for staff."
          },
          {
            "speaker": "CELIA",
            "text": "Route confirmed by road control. We collect, count, leave. No second trip into the closed zone.",
            "delivery": "radio"
          },
          {
            "speaker": "KAI",
            "text": "Heard. Mira, bring everybody to the marked point."
          },
          {
            "speaker": "DEPOT WORKER",
            "text": "Will he sack us for this?"
          },
          {
            "speaker": "MIRA",
            "text": "He's looking at his manager doing the same thing. Come with me."
          }
        ],
        "key": "M43:5"
      },
      {
        "type": "drive",
        "location": "depot",
        "label": "Collect assembled workers",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M43:6"
      },
      {
        "type": "interact",
        "location": "depot",
        "label": "Collect assembled workers",
        "actions": [
          {
            "id": "action-0",
            "label": "Check every assigned name",
            "kind": "confirm"
          }
        ],
        "key": "M43:7"
      },
      {
        "type": "drive",
        "location": "transfer",
        "label": "Complete the inland transfer",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M43:8"
      },
      {
        "type": "interact",
        "location": "transfer",
        "label": "Complete the inland transfer",
        "actions": [
          {
            "id": "action-0",
            "label": "Reconcile the receiving list",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm officials remain at Rook’s safe area",
            "kind": "confirm"
          }
        ],
        "key": "M43:9"
      },
      {
        "type": "dialogue",
        "location": "transfer",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROOK",
            "text": "You could have owned a fleet."
          },
          {
            "speaker": "KAI",
            "text": "You keep offering me other people's choices."
          },
          {
            "speaker": "ROOK",
            "text": "This won't settle the accounts."
          },
          {
            "speaker": "KAI",
            "text": "No. People who can review them will do that. Get in if you need transport."
          }
        ],
        "key": "M43:10"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "M44",
    "title": "A Road Of Our Own",
    "chapter": "Open Roads",
    "contact": "Imani",
    "location": "office",
    "vehicle": "car",
    "reward": 0,
    "optional": false,
    "requires": [
      "M43"
    ],
    "summary": "Give the final statement; attend the transport meeting; return to the office.",
    "stages": [
      {
        "type": "dialogue",
        "location": "office",
        "label": "Meet Imani",
        "lines": [
          {
            "speaker": "Imani",
            "text": "Give the final statement; attend the transport meeting; return to the office."
          }
        ],
        "key": "M44:0"
      },
      {
        "type": "drive",
        "location": "inquiry",
        "label": "Give the complete statement",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M44:1"
      },
      {
        "type": "interact",
        "location": "inquiry",
        "label": "Give the complete statement",
        "actions": [
          {
            "id": "action-0",
            "label": "Keep the convoy delay in the account",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Separate violence and contract disputes",
            "kind": "confirm"
          }
        ],
        "key": "M44:2"
      },
      {
        "type": "dialogue",
        "location": "inquiry",
        "label": "Conversation — A Road Of Our Own",
        "lines": [
          {
            "speaker": "IMANI",
            "text": "Your convoy was late before the storm. The report includes it."
          },
          {
            "speaker": "KAI",
            "text": "It should. We failed to call the customer soon enough."
          },
          {
            "speaker": "TESSA",
            "text": "Put our explanation beside it. Not instead of it."
          },
          {
            "speaker": "MERCER",
            "text": "Kells's violence and the recovery orders are under investigation. The service contracts have their own review."
          },
          {
            "speaker": "KAI",
            "text": "Rook?"
          },
          {
            "speaker": "MERCER",
            "text": "His instructions, payments and witnesses. We prove what happened. We don't arrest a reputation."
          }
        ],
        "key": "M44:3"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Attend the transport meeting",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M44:4"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Attend the transport meeting",
        "actions": [
          {
            "id": "action-0",
            "label": "Read shared cover and separate ownership",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Sign only for Kai’s company",
            "kind": "confirm"
          }
        ],
        "key": "M44:5"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Conversation — A Road Of Our Own",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "Separate fleets. Shared emergency cover. Written responsibilities."
          },
          {
            "speaker": "SAL",
            "text": "One person in charge would be simpler."
          },
          {
            "speaker": "TESSA",
            "text": "Simpler for the person in charge."
          },
          {
            "speaker": "PAZ",
            "text": "Kai knows everybody. He could run it."
          },
          {
            "speaker": "KAI",
            "text": "I can run my company and answer for my part. That doesn't give me everybody else's keys."
          },
          {
            "speaker": "ROSA",
            "text": "Good. Put that sentence in the agreement."
          }
        ],
        "key": "M44:6"
      },
      {
        "type": "drive",
        "location": "office",
        "label": "Return to the modest office",
        "radius": 9,
        "holdSeconds": 2,
        "key": "M44:7"
      },
      {
        "type": "interact",
        "location": "office",
        "label": "Return to the modest office",
        "actions": [
          {
            "id": "action-0",
            "label": "Accept Nora’s ordinary booking",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Invite Kai’s mother to visit",
            "kind": "confirm"
          }
        ],
        "key": "M44:8"
      },
      {
        "type": "dialogue",
        "location": "office",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "NORA",
            "text": "I've got a hotel run Monday. Ordinary linens. No conspiracy included."
          },
          {
            "speaker": "KAI",
            "text": "Send the booking."
          },
          {
            "speaker": "NORA",
            "text": "I thought I'd ask whether you're staying first."
          },
          {
            "speaker": "KAI",
            "text": "Yes."
          },
          {
            "speaker": "KAI",
            "text": "Come visit. I have somewhere to put the kettle now."
          }
        ],
        "key": "M44:9"
      },
      {
        "type": "dialogue",
        "location": "office",
        "label": "Over the following year — The Morning Shift",
        "lines": [
          {
            "speaker": "IMANI",
            "text": "The Bluewater cases reach judgment after the owners’ evidence is reviewed. Each disputed acquisition receives its own settlement."
          },
          {
            "speaker": "MERCER",
            "text": "Kells and the organisers answer for the acts proved against them. Rook’s role brings penalties; the service contracts receive a separate review."
          },
          {
            "speaker": "KAI",
            "text": "My community service is complete. I keep the completion copy, and Dev continues his restitution."
          },
          {
            "speaker": "LEELA",
            "text": "The findings were upheld. Customers keep copies and a clear way to challenge mistakes."
          },
          {
            "speaker": "TESSA",
            "text": "Days off go on the rota first. Separate fleets, shared cover and written responsibilities."
          },
          {
            "speaker": "ROSA",
            "text": "Milo opens tomorrow with the checklist. I am taking the morning."
          },
          {
            "speaker": "KAMILA",
            "text": "The car is yours. The work too? All of it?"
          },
          {
            "speaker": "KAI",
            "text": "Mine too. But not all of it. That is why it works."
          }
        ],
        "key": "M44:10"
      }
    ],
    "outcomes": {
      "epilogueComplete": true
    }
  },
  {
    "id": "S01",
    "title": "Before Breakfast",
    "chapter": "Character Stories",
    "contact": "Rosa",
    "location": "hotel",
    "vehicle": "bike",
    "reward": 200,
    "optional": true,
    "requires": [
      "M02"
    ],
    "summary": "Test the signed-off repair on the short route; deliver the bike.",
    "stages": [
      {
        "type": "dialogue",
        "location": "hotel",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "Milo's first unsupervised finish. Give the bike to Ewan before his shift."
          },
          {
            "speaker": "MILO",
            "text": "It wasn't unsupervised. You watched through the office window."
          },
          {
            "speaker": "ROSA",
            "text": "I was admiring the weather."
          },
          {
            "speaker": "KAI",
            "text": "Lovely weather, directly behind the brake cable."
          }
        ],
        "key": "S01:0"
      },
      {
        "type": "drive",
        "location": "coast",
        "label": "Test the signed-off repair",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S01:1"
      },
      {
        "type": "interact",
        "location": "coast",
        "label": "Test the signed-off repair",
        "actions": [
          {
            "id": "action-0",
            "label": "Check repaired brake condition",
            "kind": "inspect",
            "component": "brakes"
          }
        ],
        "key": "S01:2"
      },
      {
        "type": "dialogue",
        "location": "coast",
        "label": "Conversation — Before Breakfast",
        "lines": [
          {
            "speaker": "MILO",
            "text": "If the lever feels wrong, stop. Call me.",
            "delivery": "before departure"
          },
          {
            "speaker": "KAI",
            "text": "I'll call you either way."
          },
          {
            "speaker": "EWAN",
            "text": "Look at that. Brake light works before I kick it."
          },
          {
            "speaker": "KAI",
            "text": "Milo did the work. Tell him if anything needs adjusting."
          },
          {
            "speaker": "EWAN",
            "text": "Tell him I made the start of my shift for once."
          }
        ],
        "key": "S01:3"
      },
      {
        "type": "drive",
        "location": "hotel",
        "label": "Return Ewan’s motorcycle",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S01:4"
      },
      {
        "type": "interact",
        "location": "hotel",
        "label": "Return Ewan’s motorcycle",
        "actions": [
          {
            "id": "action-0",
            "label": "Deliver Milo’s service note",
            "kind": "confirm"
          }
        ],
        "key": "S01:5"
      },
      {
        "type": "dialogue",
        "location": "hotel",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "EWAN",
            "text": "Good work, lad. Thank you."
          },
          {
            "speaker": "MILO",
            "text": "You're welcome. Bring it back for the check Rosa wrote down."
          },
          {
            "speaker": "ROSA",
            "text": "Look at that. A customer conversation without promising the moon."
          }
        ],
        "key": "S01:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S02",
    "title": "The Car She Kept",
    "chapter": "Character Stories",
    "contact": "Rosa",
    "location": "workshop",
    "vehicle": "car",
    "reward": 0,
    "optional": true,
    "requires": [
      "M18"
    ],
    "summary": "Take photographs with Rosa; attend the valuation; hear her decision.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "KAI",
            "text": "Didn't know you had this."
          },
          {
            "speaker": "ROSA",
            "text": "Neither did my sensible financial decisions."
          },
          {
            "speaker": "KAI",
            "text": "Selling it?"
          },
          {
            "speaker": "ROSA",
            "text": "Getting a valuation. Not every thought is an instruction."
          }
        ],
        "key": "S02:0"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Record the stored car’s history",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S02:1"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Record the stored car’s history",
        "actions": [
          {
            "id": "action-0",
            "label": "Review Rosa’s condition notes",
            "kind": "confirm"
          }
        ],
        "key": "S02:2"
      },
      {
        "type": "drive",
        "location": "showroom",
        "label": "Attend the valuation",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S02:3"
      },
      {
        "type": "interact",
        "location": "showroom",
        "label": "Attend the valuation",
        "actions": [
          {
            "id": "action-0",
            "label": "Read the restoration-project offer",
            "kind": "confirm"
          }
        ],
        "key": "S02:4"
      },
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Conversation — The Car She Kept",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "Your mother and I planned a coast trip in it. Never found the same free week."
          },
          {
            "speaker": "KAI",
            "text": "We could finish it for you."
          },
          {
            "speaker": "ROSA",
            "text": "Another promise paid in your evenings. Let's hear the offer first."
          },
          {
            "speaker": "VALUER",
            "text": "Condition listed honestly. Restoration project price, not finished-car price."
          },
          {
            "speaker": "KAI",
            "text": "Can the buyer keep its history with it?"
          },
          {
            "speaker": "VALUER",
            "text": "We can attach the record. Can't sell a person instructions for their future."
          }
        ],
        "key": "S02:5"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Hear Rosa’s decision",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S02:6"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Hear Rosa’s decision",
        "actions": [
          {
            "id": "action-0",
            "label": "Discuss a manageable restoration budget",
            "kind": "confirm"
          }
        ],
        "key": "S02:7"
      },
      {
        "type": "choice",
        "location": "workshop",
        "label": "Rosa’s decision",
        "choiceKey": "rosaCar",
        "choices": [
          {
            "id": "keep",
            "label": "Keep the car with a modest restoration budget",
            "recap": "Rosa keeps the car and reserves one afternoon a month."
          },
          {
            "id": "sell",
            "label": "Sell honestly with its history attached",
            "recap": "Rosa sells with its condition disclosed and plans a visit inland."
          }
        ],
        "key": "S02:8"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Rosa’s decision",
        "choiceKey": "rosaCar",
        "variants": {
          "keep": [
            {
              "speaker": "ROSA",
              "text": "I’ll keep it and budget one afternoon a month. Not rebuild my life around it."
            },
            {
              "speaker": "KAI",
              "text": "I’ll label the cover so Milo does not turn it into shelf space."
            }
          ],
          "sell": [
            {
              "speaker": "ROSA",
              "text": "Somebody should use it. I can buy a train ticket to visit your mother."
            },
            {
              "speaker": "KAI",
              "text": "She will pack food for three journeys."
            },
            {
              "speaker": "ROSA",
              "text": "Then I will invite a friend."
            }
          ]
        },
        "lines": [],
        "key": "S02:9"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "Right. That's a decision. Now let's make tea before I turn it into another argument."
          }
        ],
        "key": "S02:10"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S03",
    "title": "One Seat Left",
    "chapter": "Character Stories",
    "contact": "Celia",
    "location": "flats",
    "vehicle": "car",
    "reward": 200,
    "optional": true,
    "requires": [
      "M14"
    ],
    "summary": "Take Ellis to the address he provides.",
    "stages": [
      {
        "type": "dialogue",
        "location": "flats",
        "label": "Meet Celia",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "Ellis covered somebody else's shift and missed his own ride. Can you take him?"
          },
          {
            "speaker": "KAI",
            "text": "He fits in a sedan. That's refreshingly manageable."
          },
          {
            "speaker": "ELLIS",
            "text": "I can hear you."
          },
          {
            "speaker": "KAI",
            "text": "Then I don't need to test the radio."
          }
        ],
        "key": "S03:0"
      },
      {
        "type": "drive",
        "location": "terminal",
        "label": "Collect Ellis after his shift",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S03:1"
      },
      {
        "type": "interact",
        "location": "terminal",
        "label": "Collect Ellis after his shift",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm his destination",
            "kind": "confirm"
          }
        ],
        "key": "S03:2"
      },
      {
        "type": "dialogue",
        "location": "terminal",
        "label": "Conversation — One Seat Left",
        "lines": [
          {
            "speaker": "ELLIS",
            "text": "We print the last departure. We don't print how long it takes to lock the terminal afterward."
          },
          {
            "speaker": "KAI",
            "text": "Has anyone told the scheduler?"
          },
          {
            "speaker": "ELLIS",
            "text": "Often. Nice woman. Given three vans' work and two vans."
          },
          {
            "speaker": "KAI",
            "text": "I'll mention the gap to Celia. Without blaming the woman for arithmetic."
          },
          {
            "speaker": "ELLIS",
            "text": "Thank you. Turn by the lit bakery."
          }
        ],
        "key": "S03:3"
      },
      {
        "type": "drive",
        "location": "flats",
        "label": "Take Ellis home",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S03:4"
      },
      {
        "type": "interact",
        "location": "flats",
        "label": "Take Ellis home",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the safe drop-off",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Record the scheduling gap",
            "kind": "confirm"
          }
        ],
        "key": "S03:5"
      },
      {
        "type": "dialogue",
        "location": "flats",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ELLIS",
            "text": "That's me. Come in for a cup?"
          },
          {
            "speaker": "KAI",
            "text": "Another collection. Next time with notice."
          },
          {
            "speaker": "ELLIS",
            "text": "Then next time is an invitation, not overtime."
          }
        ],
        "key": "S03:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S04",
    "title": "Return Address",
    "chapter": "Character Stories",
    "contact": "Tomas",
    "location": "dispatch",
    "vehicle": "van",
    "reward": 200,
    "optional": true,
    "requires": [
      "M16"
    ],
    "summary": "Match the three personal boxes to Tomas's list; pack them with Celia.",
    "stages": [
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Meet Tomas",
        "lines": [
          {
            "speaker": "TOMAS",
            "text": "Three boxes. Clothes, books, photographs. Not a stolen fleet."
          },
          {
            "speaker": "KAI",
            "text": "I'll check the labels with Celia."
          },
          {
            "speaker": "TOMAS",
            "text": "She'll check the boxes. Let her. We're getting better at not turning it into a war."
          }
        ],
        "afterFlag": "tomasMovedInland",
        "afterLines": [
          {
            "speaker": "TOMAS",
            "delivery": "phone",
            "text": "Three boxes still at the yard. Could you send them? Clothes, books, photographs. Nothing the business needs."
          },
          {
            "speaker": "KAI",
            "text": "I'll check the labels with Celia."
          },
          {
            "speaker": "TOMAS",
            "text": "She'll check the boxes. Let her. We're getting better at not turning it into a war."
          }
        ],
        "key": "S04:0"
      },
      {
        "type": "drive",
        "location": "yard",
        "label": "Match Tomas’s personal boxes",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S04:1"
      },
      {
        "type": "interact",
        "location": "yard",
        "label": "Match Tomas’s personal boxes",
        "actions": [
          {
            "id": "action-0",
            "label": "Check clothes",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Check books",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Agree photograph copies with Celia",
            "kind": "confirm"
          }
        ],
        "key": "S04:2"
      },
      {
        "type": "dialogue",
        "location": "yard",
        "label": "Conversation — Return Address",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "This album was in the office."
          },
          {
            "speaker": "KAI",
            "text": "He listed photographs. We can call him before deciding."
          },
          {
            "speaker": "TOMAS",
            "text": "Take copies of the family pages if you want. I want the seaside ones with Mum."
          },
          {
            "speaker": "CELIA",
            "text": "I thought you'd want Dad's business pictures."
          },
          {
            "speaker": "TOMAS",
            "text": "I have enough memories of being told to stand beside a van."
          },
          {
            "speaker": "CELIA",
            "text": "Fair. Seaside pages. I'll keep copies, not the whole album hostage."
          }
        ],
        "key": "S04:3"
      },
      {
        "type": "drive",
        "location": "dispatch",
        "label": "Dispatch the authorised boxes",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S04:4"
      },
      {
        "type": "interact",
        "location": "dispatch",
        "label": "Dispatch the authorised boxes",
        "actions": [
          {
            "id": "action-0",
            "label": "Obtain the labelled receipt",
            "kind": "confirm"
          }
        ],
        "key": "S04:5"
      },
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "Write if the photographs get there safely."
          },
          {
            "speaker": "TOMAS",
            "text": "I can write even if they do."
          },
          {
            "speaker": "KAI",
            "text": "Excellent. A contract with no vehicles in it."
          }
        ],
        "key": "S04:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S05",
    "title": "The Opening Act",
    "chapter": "Character Stories",
    "contact": "Sef",
    "location": "club",
    "vehicle": "van",
    "reward": 225,
    "optional": true,
    "requires": [
      "M20"
    ],
    "summary": "Collect the authorised equipment; deliver it to rehearsal.",
    "stages": [
      {
        "type": "dialogue",
        "location": "club",
        "label": "Meet Sef",
        "lines": [
          {
            "speaker": "SEF",
            "text": "Everything's in two places. Sorry."
          },
          {
            "speaker": "KAI",
            "text": "That's better than three. Which closes first?"
          },
          {
            "speaker": "SEF",
            "text": "School store."
          },
          {
            "speaker": "RINA",
            "text": "Bring the permission slip. The caretaker doesn't accept charisma as identification."
          }
        ],
        "key": "S05:0"
      },
      {
        "type": "drive",
        "location": "parts",
        "label": "Collect authorised equipment",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S05:1"
      },
      {
        "type": "interact",
        "location": "parts",
        "label": "Collect authorised equipment",
        "actions": [
          {
            "id": "action-0",
            "label": "Present permission slip",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Accept return receipt",
            "kind": "confirm"
          }
        ],
        "key": "S05:2"
      },
      {
        "type": "drive",
        "location": "studio",
        "label": "Deliver to rehearsal",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S05:3"
      },
      {
        "type": "interact",
        "location": "studio",
        "label": "Deliver to rehearsal",
        "actions": [
          {
            "id": "action-0",
            "label": "Hand equipment and receipt to Sef",
            "kind": "confirm"
          }
        ],
        "key": "S05:4"
      },
      {
        "type": "dialogue",
        "location": "studio",
        "label": "Conversation — The Opening Act",
        "lines": [
          {
            "speaker": "CARETAKER",
            "text": "Back tomorrow, as clean as it leaves."
          },
          {
            "speaker": "KAI",
            "text": "Sef signed for it. I'll give him your receipt."
          },
          {
            "speaker": "SEF",
            "text": "Want to hear the new one?",
            "delivery": "at rehearsal"
          },
          {
            "speaker": "KAI",
            "text": "One verse. Van's in the loading space."
          }
        ],
        "key": "S05:5"
      },
      {
        "type": "drive",
        "location": "club",
        "label": "Confirm Rina’s setup list",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S05:6"
      },
      {
        "type": "interact",
        "location": "club",
        "label": "Confirm Rina’s setup list",
        "actions": [
          {
            "id": "action-0",
            "label": "Keep the service route clear",
            "kind": "confirm"
          }
        ],
        "key": "S05:7"
      },
      {
        "type": "dialogue",
        "location": "club",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "RINA",
            "text": "Stable. That's already ahead of half this industry."
          },
          {
            "speaker": "SEF",
            "text": "Do you think people will like it?"
          },
          {
            "speaker": "KAI",
            "text": "Give them a chance to hear it."
          }
        ],
        "key": "S05:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S06",
    "title": "The Wrong Applause",
    "chapter": "Character Stories",
    "contact": "Rina",
    "location": "club",
    "vehicle": null,
    "reward": 200,
    "optional": true,
    "requires": [
      "M24"
    ],
    "summary": "Accompany Rina as the staff representative; deliver the corrected payroll envelopes after confirmation.",
    "stages": [
      {
        "type": "dialogue",
        "location": "club",
        "label": "Meet Rina",
        "lines": [
          {
            "speaker": "RINA",
            "text": "Wonderful team would like last month's overtime."
          },
          {
            "speaker": "SAL",
            "text": "I was planning a gesture."
          },
          {
            "speaker": "KAI",
            "text": "An envelope can be a gesture."
          },
          {
            "speaker": "SAL",
            "text": "Everybody's a comedian until I hire one."
          }
        ],
        "key": "S06:0"
      },
      {
        "type": "travel",
        "location": "club",
        "label": "Review corrected overtime",
        "radius": 9,
        "holdSeconds": 0,
        "key": "S06:1"
      },
      {
        "type": "interact",
        "location": "club",
        "label": "Review corrected overtime",
        "actions": [
          {
            "id": "action-0",
            "label": "Compare names and hours",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Obtain bookkeeper approval",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Deliver first sealed envelope",
            "kind": "confirm"
          },
          {
            "id": "action-3",
            "label": "Deliver second sealed envelope",
            "kind": "confirm"
          },
          {
            "id": "action-4",
            "label": "Confirm the receiving sheet",
            "kind": "confirm"
          }
        ],
        "key": "S06:2"
      },
      {
        "type": "dialogue",
        "location": "club",
        "label": "Conversation — The Wrong Applause",
        "lines": [
          {
            "speaker": "RINA",
            "text": "Names, hours, previous payments. Here. Check them with the bookkeeper."
          },
          {
            "speaker": "SAL",
            "text": "Could we do the announcement first?"
          },
          {
            "speaker": "RINA",
            "text": "No."
          },
          {
            "speaker": "BOOKKEEPER",
            "text": "Payments authorised. These envelopes are sealed. Staff sign the receiving sheet."
          },
          {
            "speaker": "KAI",
            "text": "Straight to the people named. Understood."
          },
          {
            "speaker": "PORTER",
            "text": "Is there a speech inside?"
          },
          {
            "speaker": "KAI",
            "text": "Only if he's discovered very small handwriting."
          }
        ],
        "key": "S06:3"
      },
      {
        "type": "dialogue",
        "location": "club",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "SAL",
            "text": "Thank you for keeping this place alive."
          },
          {
            "speaker": "RINA",
            "text": "That's the speech. Stop there. It's good."
          }
        ],
        "key": "S06:4"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S07",
    "title": "Missing Crate",
    "chapter": "Character Stories",
    "contact": "Tessa",
    "location": "dispatch",
    "vehicle": "van",
    "reward": 225,
    "optional": true,
    "requires": [
      "M25"
    ],
    "summary": "Compare receiving slips; locate the mislabelled load; correct the handover.",
    "stages": [
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Meet Tessa",
        "lines": [
          {
            "speaker": "TESSA",
            "text": "Could be theft. Could be somebody copying yesterday's label."
          },
          {
            "speaker": "KAI",
            "text": "Which do I investigate first?"
          },
          {
            "speaker": "TESSA",
            "text": "The label. It's less likely to run away."
          }
        ],
        "key": "S07:0"
      },
      {
        "type": "drive",
        "location": "market",
        "label": "Compare receiving slips",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S07:1"
      },
      {
        "type": "interact",
        "location": "market",
        "label": "Compare receiving slips",
        "actions": [
          {
            "id": "action-0",
            "label": "Check the duplicate number",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Match the overflow receipt",
            "kind": "confirm"
          }
        ],
        "key": "S07:2"
      },
      {
        "type": "drive",
        "location": "depot",
        "label": "Locate the sealed load",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S07:3"
      },
      {
        "type": "interact",
        "location": "depot",
        "label": "Locate the sealed load",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the duplicate label with Niko",
            "kind": "confirm"
          }
        ],
        "key": "S07:4"
      },
      {
        "type": "dialogue",
        "location": "depot",
        "label": "Conversation — Missing Crate",
        "lines": [
          {
            "speaker": "JUNE",
            "text": "We received two with the same number. Put one in the overflow bay."
          },
          {
            "speaker": "DRIVER NIKO",
            "text": "I printed the labels. Please don't tell her I lost a shipment."
          },
          {
            "speaker": "KAI",
            "text": "You didn't lose it. You made an error. Tell her the accurate problem."
          },
          {
            "speaker": "NIKO",
            "text": "Last place docked wages for everything."
          },
          {
            "speaker": "KAI",
            "text": "I can't speak for every place. Come back and tell this one with me."
          }
        ],
        "key": "S07:5"
      },
      {
        "type": "drive",
        "location": "dispatch",
        "label": "Correct the handover",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S07:6"
      },
      {
        "type": "interact",
        "location": "dispatch",
        "label": "Correct the handover",
        "actions": [
          {
            "id": "action-0",
            "label": "Record an error without a theft accusation",
            "kind": "confirm"
          }
        ],
        "key": "S07:7"
      },
      {
        "type": "dialogue",
        "location": "dispatch",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "NIKO",
            "text": "Duplicate label. Bay receipt proves the load stayed here."
          },
          {
            "speaker": "TESSA",
            "text": "Good. Add a check before printing the second set. Thank you for finding it."
          },
          {
            "speaker": "KAI",
            "text": "No dramatic chase. Terrible radio story."
          },
          {
            "speaker": "TESSA",
            "text": "Beautiful delivery story."
          }
        ],
        "key": "S07:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S08",
    "title": "Night Relief",
    "chapter": "Character Stories",
    "contact": "Tessa",
    "location": "market",
    "vehicle": "van",
    "reward": 350,
    "optional": true,
    "requires": [
      "M29"
    ],
    "summary": "Complete the first freight leg; meet the agreed relief driver; finish the customer handover.",
    "stages": [
      {
        "type": "dialogue",
        "location": "market",
        "label": "Meet Tessa",
        "lines": [
          {
            "speaker": "PAZ",
            "text": "My sister's in labour. Mum can't get there alone. I'm supposed to leave now."
          },
          {
            "speaker": "TESSA",
            "text": "Family or load. Tell me which one needs you, not just a driver."
          },
          {
            "speaker": "PAZ",
            "text": "Family."
          },
          {
            "speaker": "KAI",
            "text": "I'll take the first leg. We find cover for the rest."
          }
        ],
        "key": "S08:0"
      },
      {
        "type": "drive",
        "location": "depot",
        "label": "Accept Paz’s first freight leg",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S08:1"
      },
      {
        "type": "interact",
        "location": "depot",
        "label": "Accept Paz’s first freight leg",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm family cover",
            "kind": "confirm"
          }
        ],
        "key": "S08:2"
      },
      {
        "type": "drive",
        "location": "rest",
        "label": "Meet the relief driver",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S08:3"
      },
      {
        "type": "interact",
        "location": "rest",
        "label": "Meet the relief driver",
        "actions": [
          {
            "id": "action-0",
            "label": "Check relay reference",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm revised arrival",
            "kind": "confirm"
          }
        ],
        "key": "S08:4"
      },
      {
        "type": "dialogue",
        "location": "rest",
        "label": "Conversation — Night Relief",
        "lines": [
          {
            "speaker": "CELIA",
            "text": "Ellis is off duty and available. I'll ask him; I won't volunteer him.",
            "delivery": "phone"
          },
          {
            "speaker": "ELLIS",
            "text": "Yes. Two hours, then I need to be home. Agreed?",
            "delivery": "later"
          },
          {
            "speaker": "KAI",
            "text": "Agreed. We'll hand over at the staffed service stop."
          },
          {
            "speaker": "ROSA",
            "text": "I can send the repaired van. Driver's coming. Keep the load under cover.",
            "delivery": "phone"
          },
          {
            "speaker": "TESSA",
            "text": "Customer informed. New arrival time accepted. Don't rush to hide the delay."
          }
        ],
        "key": "S08:5"
      },
      {
        "type": "drive",
        "location": "market",
        "label": "Complete the handover",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S08:6"
      },
      {
        "type": "interact",
        "location": "market",
        "label": "Complete the handover",
        "actions": [
          {
            "id": "action-0",
            "label": "Obtain the intact-load signature",
            "kind": "confirm"
          }
        ],
        "key": "S08:7"
      },
      {
        "type": "dialogue",
        "location": "market",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "PAZ",
            "text": "Baby's here. Everybody's well. Mum says thank you."
          },
          {
            "speaker": "KAI",
            "text": "Name?"
          },
          {
            "speaker": "PAZ",
            "text": "Still arguing. Apparently that's a separate delivery."
          },
          {
            "speaker": "TESSA",
            "text": "Cover sorted. Take tomorrow morning too. We'll put it on the rota."
          }
        ],
        "key": "S08:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S09",
    "title": "A Fair Price",
    "chapter": "Character Stories",
    "contact": "Dev",
    "location": "bank",
    "vehicle": "car",
    "reward": 200,
    "optional": true,
    "requires": [
      "M18"
    ],
    "summary": "Inspect the offered car with Dev and Amel.",
    "stages": [
      {
        "type": "dialogue",
        "location": "bank",
        "label": "Meet Dev",
        "lines": [
          {
            "speaker": "DEV",
            "text": "She asked me to check a car. Second opinion?"
          },
          {
            "speaker": "KAI",
            "text": "You're not charging her to say yes?"
          },
          {
            "speaker": "DEV",
            "text": "I'm charging for the inspection. Either answer."
          }
        ],
        "key": "S09:0"
      },
      {
        "type": "drive",
        "location": "showroom",
        "label": "Inspect the offered car",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S09:1"
      },
      {
        "type": "interact",
        "location": "showroom",
        "label": "Inspect the offered car",
        "actions": [
          {
            "id": "action-0",
            "label": "Record powertrain condition",
            "kind": "inspect",
            "component": "engine"
          },
          {
            "id": "action-1",
            "label": "Record the vibration category",
            "kind": "inspect",
            "component": "suspension"
          },
          {
            "id": "action-2",
            "label": "Explain likely repair categories",
            "kind": "confirm"
          }
        ],
        "key": "S09:2"
      },
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Conversation — A Fair Price",
        "lines": [
          {
            "speaker": "AMEL",
            "text": "Seller says the noise is normal."
          },
          {
            "speaker": "DEV",
            "text": "Normal for a worn bearing. That doesn't mean cheap to leave alone."
          },
          {
            "speaker": "SELLER",
            "text": "We can take a little off."
          },
          {
            "speaker": "KAI",
            "text": "First tell her the likely repair category. She can decide if the price works."
          },
          {
            "speaker": "AMEL",
            "text": "I'd rather keep looking."
          },
          {
            "speaker": "DEV",
            "text": "Then we keep looking."
          }
        ],
        "key": "S09:3"
      },
      {
        "type": "drive",
        "location": "bank",
        "label": "Review affordability",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S09:4"
      },
      {
        "type": "interact",
        "location": "bank",
        "label": "Review affordability",
        "actions": [
          {
            "id": "action-0",
            "label": "Respect Amel’s decision to keep looking",
            "kind": "confirm"
          }
        ],
        "key": "S09:5"
      },
      {
        "type": "dialogue",
        "location": "bank",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "KAI",
            "text": "You could have had a commission."
          },
          {
            "speaker": "DEV",
            "text": "Yes."
          },
          {
            "speaker": "KAI",
            "text": "That's the whole answer?"
          },
          {
            "speaker": "DEV",
            "text": "I'm trying shorter answers when the long ones are excuses."
          }
        ],
        "key": "S09:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S10",
    "title": "Second Chance Stock",
    "chapter": "Character Stories",
    "contact": "Dev",
    "location": "workshop",
    "vehicle": "car",
    "reward": 200,
    "optional": true,
    "requires": [
      "M44"
    ],
    "summary": "Inspect the vehicle; witness an honest conversation with former victim Ada.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Dev",
        "lines": [
          {
            "speaker": "DEV",
            "text": "I want you to inspect it. Not tell everyone I'm trustworthy now."
          },
          {
            "speaker": "KAI",
            "text": "Good. I'm better at engines than miracles."
          },
          {
            "speaker": "DEV",
            "text": "History's in the folder. Faults on the card."
          }
        ],
        "key": "S10:0"
      },
      {
        "type": "drive",
        "location": "showroom",
        "label": "Review Dev’s disclosed stock",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S10:1"
      },
      {
        "type": "interact",
        "location": "showroom",
        "label": "Review Dev’s disclosed stock",
        "actions": [
          {
            "id": "action-0",
            "label": "Compare condition and card",
            "kind": "inspect",
            "component": "chassis"
          },
          {
            "id": "action-1",
            "label": "Read the history",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Hear Ada without asking forgiveness",
            "kind": "confirm"
          }
        ],
        "key": "S10:2"
      },
      {
        "type": "dialogue",
        "location": "showroom",
        "label": "Conversation — Second Chance Stock",
        "lines": [
          {
            "speaker": "ADA",
            "text": "You're selling again? Convenient ending for you."
          },
          {
            "speaker": "DEV",
            "text": "My case is settled on terms. Restitution payments continue. I haven't finished paying you back."
          },
          {
            "speaker": "ADA",
            "text": "I don't owe you a fresh start."
          },
          {
            "speaker": "DEV",
            "text": "No. I won't put your name in a story saying you gave me one."
          },
          {
            "speaker": "KAI",
            "text": "The car's condition matches the card. That tells us about the car."
          },
          {
            "speaker": "BUYER",
            "text": "I'll read the history before deciding."
          },
          {
            "speaker": "DEV",
            "text": "Take your time."
          }
        ],
        "key": "S10:3"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Confirm the listed mirror correction",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S10:4"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Confirm the listed mirror correction",
        "actions": [
          {
            "id": "action-0",
            "label": "Record the defect honestly",
            "kind": "confirm"
          }
        ],
        "key": "S10:5"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "DEV",
            "text": "That went badly."
          },
          {
            "speaker": "KAI",
            "text": "Nobody was lied to. Let that be the day's improvement."
          },
          {
            "speaker": "DEV",
            "text": "All right. Tea?"
          },
          {
            "speaker": "KAI",
            "text": "After you fix the loose mirror you listed."
          }
        ],
        "key": "S10:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S11",
    "title": "The Radio Rattle",
    "chapter": "Character Stories",
    "contact": "Nora",
    "location": "workshop",
    "vehicle": "van",
    "reward": 175,
    "optional": true,
    "requires": [
      "M18"
    ],
    "summary": "Accompany Nora on a short diagnostic delivery; return with the noise identified.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Nora",
        "lines": [
          {
            "speaker": "NORA",
            "text": "Only happens on left turns."
          },
          {
            "speaker": "ROSA",
            "text": "Then we'll make it a right-turn-only vehicle. Very exclusive."
          },
          {
            "speaker": "KAI",
            "text": "Premium navigation package."
          },
          {
            "speaker": "NORA",
            "text": "Fix it before the two of you open a comedy club."
          }
        ],
        "key": "S11:0"
      },
      {
        "type": "drive",
        "location": "hotel",
        "label": "Join Nora’s diagnostic delivery",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S11:1"
      },
      {
        "type": "interact",
        "location": "hotel",
        "label": "Join Nora’s diagnostic delivery",
        "actions": [
          {
            "id": "action-0",
            "label": "Record the left-turn symptom",
            "kind": "confirm"
          }
        ],
        "key": "S11:2"
      },
      {
        "type": "drive",
        "location": "coast",
        "label": "Stop and check the compartment",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S11:3"
      },
      {
        "type": "interact",
        "location": "coast",
        "label": "Stop and check the compartment",
        "actions": [
          {
            "id": "action-0",
            "label": "Identify the loose receipt tin",
            "kind": "confirm"
          }
        ],
        "key": "S11:4"
      },
      {
        "type": "dialogue",
        "location": "coast",
        "label": "Conversation — The Radio Rattle",
        "lines": [
          {
            "speaker": "NORA",
            "text": "Hear it?"
          },
          {
            "speaker": "KAI",
            "text": "Yes. Empty tin in the lower compartment."
          },
          {
            "speaker": "NORA",
            "text": "That's my receipt tin."
          },
          {
            "speaker": "KAI",
            "text": "Apparently it wants to be on the radio too."
          }
        ],
        "key": "S11:5"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Report the simple cause",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S11:6"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Report the simple cause",
        "actions": [
          {
            "id": "action-0",
            "label": "Avoid unrelated repairs",
            "kind": "confirm"
          }
        ],
        "key": "S11:7"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "What do I owe you?"
          },
          {
            "speaker": "NORA",
            "text": "Nothing. That's why I'm making the offer and you're not writing an invoice."
          },
          {
            "speaker": "KAI",
            "text": "I think she won that one."
          }
        ],
        "key": "S11:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S12",
    "title": "Last Orders At The Orchid",
    "chapter": "Character Stories",
    "contact": "Nora",
    "location": "hotel",
    "vehicle": "van",
    "reward": 325,
    "optional": true,
    "requires": [
      "M30"
    ],
    "summary": "Finish the authorised deliveries; help staff complete the event; bring willing speakers to Imani.",
    "stages": [
      {
        "type": "dialogue",
        "location": "hotel",
        "label": "Meet Nora",
        "lines": [
          {
            "speaker": "NORA",
            "text": "They still need clean tablecloths. Staff still need wages after tonight."
          },
          {
            "speaker": "IMANI",
            "text": "Some want to talk about their years here. Some don't. Ask before pointing me at anyone."
          },
          {
            "speaker": "KAI",
            "text": "Deliveries first, then I'll help with the introductions."
          }
        ],
        "key": "S12:0"
      },
      {
        "type": "drive",
        "location": "parts",
        "label": "Collect authorised event supplies",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S12:1"
      },
      {
        "type": "interact",
        "location": "parts",
        "label": "Collect authorised event supplies",
        "actions": [
          {
            "id": "action-0",
            "label": "Match the receiving list",
            "kind": "confirm"
          }
        ],
        "key": "S12:2"
      },
      {
        "type": "drive",
        "location": "hotel",
        "label": "Complete the event handover",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S12:3"
      },
      {
        "type": "interact",
        "location": "hotel",
        "label": "Complete the event handover",
        "actions": [
          {
            "id": "action-0",
            "label": "Deliver linens",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Ask Luz about an interview",
            "kind": "confirm"
          }
        ],
        "key": "S12:4"
      },
      {
        "type": "dialogue",
        "location": "hotel",
        "label": "Conversation — Last Orders At The Orchid",
        "lines": [
          {
            "speaker": "CHEF LUZ",
            "text": "New manager wants the old menu and half the people who know it."
          },
          {
            "speaker": "EWAN",
            "text": "I've got an offer at the terminal hotel. Feels like leaving the team."
          },
          {
            "speaker": "LUZ",
            "text": "It's a job, Ewan. You don't have to be buried under the reception desk."
          },
          {
            "speaker": "IMANI",
            "text": "May I record that?",
            "delivery": "to Luz"
          },
          {
            "speaker": "LUZ",
            "text": "That part, yes. Ask Ewan for his own answer."
          },
          {
            "speaker": "EWAN",
            "text": "Not the interview. I'll help Kai with the last load."
          },
          {
            "speaker": "IMANI",
            "text": "Of course."
          }
        ],
        "key": "S12:5"
      },
      {
        "type": "drive",
        "location": "radio",
        "label": "Arrange only willing interviews",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S12:6"
      },
      {
        "type": "interact",
        "location": "radio",
        "label": "Arrange only willing interviews",
        "actions": [
          {
            "id": "action-0",
            "label": "Record Luz’s consent",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Respect Ewan’s refusal",
            "kind": "confirm"
          }
        ],
        "key": "S12:7"
      },
      {
        "type": "drive",
        "location": "hotel",
        "label": "Complete the final staff load",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S12:8"
      },
      {
        "type": "interact",
        "location": "hotel",
        "label": "Complete the final staff load",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the last signature",
            "kind": "confirm"
          }
        ],
        "key": "S12:9"
      },
      {
        "type": "dialogue",
        "location": "hotel",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "NEW MANAGER",
            "text": "Interviews for the new posts begin Monday."
          },
          {
            "speaker": "LUZ",
            "text": "Send the terms before asking everyone to dress up for you."
          },
          {
            "speaker": "KAI",
            "text": "You staying?"
          },
          {
            "speaker": "LUZ",
            "text": "I'll read them. Then I'll decide."
          },
          {
            "speaker": "NORA",
            "text": "That's a better ending than pretending the building makes the choice."
          },
          {
            "speaker": "IMANI",
            "text": "The hotel changes hands tomorrow. Tonight belongs to the people who kept it open.",
            "delivery": "closing recording"
          }
        ],
        "key": "S12:10"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S13",
    "title": "What The Engine Doesn'T Say",
    "chapter": "Character Stories",
    "contact": "Rosa",
    "location": "workshop",
    "vehicle": "car",
    "reward": 175,
    "optional": true,
    "requires": [
      "M18"
    ],
    "summary": "Record Jo's symptoms; review Rosa's diagnosis with the customer.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "JO",
            "text": "Filled it yesterday. Still loses power on the hill."
          },
          {
            "speaker": "MILO",
            "text": "Could be the engine."
          },
          {
            "speaker": "ROSA",
            "text": "Could be several things. We diagnose before selling someone the expensive word."
          },
          {
            "speaker": "KAI",
            "text": "What do you need me to do?"
          },
          {
            "speaker": "ROSA",
            "text": "Ask Jo when it happens. Write the symptoms. Don't invent the answer."
          }
        ],
        "key": "S13:0"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Record Jo’s symptoms",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S13:1"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Record Jo’s symptoms",
        "actions": [
          {
            "id": "action-0",
            "label": "Ask when power loss occurs",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Ask about braking and steering",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Review engine condition",
            "kind": "inspect",
            "component": "engine"
          },
          {
            "id": "action-3",
            "label": "Record the separate vibration",
            "kind": "inspect",
            "component": "suspension"
          }
        ],
        "key": "S13:2"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Conversation — What The Engine Doesn'T Say",
        "lines": [
          {
            "speaker": "JO",
            "text": "Hot afternoons. Mostly when I'm carrying a full route."
          },
          {
            "speaker": "KAI",
            "text": "Any trouble braking or steering?"
          },
          {
            "speaker": "JO",
            "text": "Brakes feel fine. There's a vibration too, but that's older."
          },
          {
            "speaker": "MILO",
            "text": "Two faults. One complaint made them sound like one."
          },
          {
            "speaker": "ROSA",
            "text": "That's why the sheet has separate lines."
          }
        ],
        "key": "S13:3"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "JO",
            "text": "So it doesn't need a whole engine?"
          },
          {
            "speaker": "ROSA",
            "text": "Not on this evidence. We'll fix what we found and test it."
          },
          {
            "speaker": "KAI",
            "text": "Fuel is still in the tank. Condition's the problem."
          },
          {
            "speaker": "JO",
            "text": "I can understand that. I can decide from that."
          }
        ],
        "key": "S13:4"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S14",
    "title": "The Right Part",
    "chapter": "Character Stories",
    "contact": "Rosa",
    "location": "workshop",
    "vehicle": "van",
    "reward": 225,
    "optional": true,
    "requires": [
      "S13"
    ],
    "summary": "Match the supplied references; reject the incompatible substitute.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "These mounts and the service kit. Supplier has them reserved."
          },
          {
            "speaker": "KAI",
            "text": "If the box looks different?"
          },
          {
            "speaker": "ROSA",
            "text": "Read the part reference. Boxes aren't engineering."
          },
          {
            "speaker": "MILO",
            "text": "Photograph the label if you're unsure. I'll check it before you sign."
          }
        ],
        "key": "S14:0"
      },
      {
        "type": "drive",
        "location": "parts",
        "label": "Match reserved references",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S14:1"
      },
      {
        "type": "interact",
        "location": "parts",
        "label": "Match reserved references",
        "actions": [
          {
            "id": "action-0",
            "label": "Read Jo’s model reference",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Reject incompatible substitute",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Confirm correct mounts and kit",
            "kind": "confirm"
          }
        ],
        "key": "S14:2"
      },
      {
        "type": "dialogue",
        "location": "parts",
        "label": "Conversation — The Right Part",
        "lines": [
          {
            "speaker": "PARTS CLERK",
            "text": "Same family of car. This kit should do."
          },
          {
            "speaker": "KAI",
            "text": "Jo's model and year aren't on the compatibility label."
          },
          {
            "speaker": "CLERK",
            "text": "It's the one we have out front."
          },
          {
            "speaker": "KAI",
            "text": "Then check the reservation. I'm not taking availability as proof it fits."
          },
          {
            "speaker": "CLERK",
            "text": "You're right. This one's yours. The other kit belongs to a different customer."
          },
          {
            "speaker": "KAI",
            "text": "Good. Two cars can avoid an interesting afternoon."
          }
        ],
        "key": "S14:3"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Deliver authorised parts",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S14:4"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Deliver authorised parts",
        "actions": [
          {
            "id": "action-0",
            "label": "Match labels with Milo",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "File the job receipt",
            "kind": "confirm"
          }
        ],
        "key": "S14:5"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "MILO",
            "text": "Fits the actual vehicle. Correct mount set too."
          },
          {
            "speaker": "ROSA",
            "text": "Return receipt in the job folder. Now we can do the work Jo agreed to."
          },
          {
            "speaker": "JO",
            "text": "What about the other noise?"
          },
          {
            "speaker": "ROSA",
            "text": "Separate line, separate repair. You authorised both. Nothing extra hidden in a package."
          }
        ],
        "key": "S14:6"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S15",
    "title": "The Customs Visit",
    "chapter": "Character Stories",
    "contact": "Dara",
    "location": "customs",
    "vehicle": "car",
    "reward": 225,
    "optional": true,
    "requires": [
      "S14"
    ],
    "summary": "Compare compatible packages for Jo's work car; explain the tradeoffs.",
    "stages": [
      {
        "type": "dialogue",
        "location": "customs",
        "label": "Meet Dara",
        "lines": [
          {
            "speaker": "DARA",
            "text": "Rosa sent you? Was the note a recommendation or a complaint?"
          },
          {
            "speaker": "KAI",
            "text": "She said you know which upgrades deserve the word."
          },
          {
            "speaker": "DARA",
            "text": "That's practically a love letter from her."
          }
        ],
        "key": "S15:0"
      },
      {
        "type": "drive",
        "location": "customs",
        "label": "Compare compatible work-car packages",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S15:1"
      },
      {
        "type": "interact",
        "location": "customs",
        "label": "Compare compatible work-car packages",
        "actions": [
          {
            "id": "action-0",
            "label": "Review useful suspension and tyres",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Reject wrong-fitment wheels",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Cancel the paint preview",
            "kind": "confirm"
          },
          {
            "id": "action-3",
            "label": "Keep only authorised parts on the quote",
            "kind": "confirm"
          }
        ],
        "key": "S15:2"
      },
      {
        "type": "dialogue",
        "location": "customs",
        "label": "Conversation — The Customs Visit",
        "lines": [
          {
            "speaker": "JO",
            "text": "I want it to carry my route reliably. Maybe look less like it's apologising."
          },
          {
            "speaker": "DARA",
            "text": "Then we start with useful suspension and tyres, not the loudest engine in the catalogue."
          },
          {
            "speaker": "KAI",
            "text": "These premium wheels aren't offered for this car?"
          },
          {
            "speaker": "DARA",
            "text": "Wrong fitment. A more expensive mistake is still a mistake."
          },
          {
            "speaker": "JO",
            "text": "Keep the original colour. New trim will do."
          },
          {
            "speaker": "KAI",
            "text": "Preview cancelled for the paint. Chosen parts stay on the quote."
          }
        ],
        "key": "S15:3"
      },
      {
        "type": "dialogue",
        "location": "customs",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "DARA",
            "text": "Nothing that needs an explanation at every speed bump."
          },
          {
            "speaker": "ROSA",
            "text": "So you've finally designed a car for a road.",
            "delivery": "phone"
          },
          {
            "speaker": "DARA",
            "text": "I'll put that compliment beside your other one. There'll be room."
          }
        ],
        "key": "S15:4"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S16",
    "title": "Prove It On The Road",
    "chapter": "Character Stories",
    "contact": "Dara",
    "location": "customs",
    "vehicle": "car",
    "reward": 275,
    "optional": true,
    "requires": [
      "S15"
    ],
    "summary": "Complete the controlled checks; stop and report the loose-fitment symptom.",
    "stages": [
      {
        "type": "dialogue",
        "location": "customs",
        "label": "Meet Dara",
        "lines": [
          {
            "speaker": "DARA",
            "text": "Baseline's recorded. Same load, same route. We compare like with like."
          },
          {
            "speaker": "KAI",
            "text": "Not a top-speed competition?"
          },
          {
            "speaker": "DARA",
            "text": "If Jo wanted a trophy, we'd have put a shelf in the boot."
          },
          {
            "speaker": "ROSA",
            "text": "Bring the car back with observations. We can supply our own adjectives."
          }
        ],
        "key": "S16:0"
      },
      {
        "type": "drive",
        "location": "test",
        "label": "Perform the baseline check",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S16:1"
      },
      {
        "type": "interact",
        "location": "test",
        "label": "Perform the baseline check",
        "actions": [
          {
            "id": "action-0",
            "label": "Record braking condition",
            "kind": "inspect",
            "component": "brakes"
          }
        ],
        "key": "S16:2"
      },
      {
        "type": "drive",
        "location": "coast",
        "label": "Complete the service-loop check",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S16:3"
      },
      {
        "type": "interact",
        "location": "coast",
        "label": "Complete the service-loop check",
        "actions": [
          {
            "id": "action-0",
            "label": "Stop and report loose trim",
            "kind": "confirm"
          }
        ],
        "key": "S16:4"
      },
      {
        "type": "drive",
        "location": "customs",
        "label": "Pause for the authorised recheck",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S16:5"
      },
      {
        "type": "interact",
        "location": "customs",
        "label": "Pause for the authorised recheck",
        "actions": [
          {
            "id": "action-0",
            "label": "Record the bracket correction",
            "kind": "confirm"
          }
        ],
        "key": "S16:6"
      },
      {
        "type": "dialogue",
        "location": "customs",
        "label": "Conversation — Prove It On The Road",
        "lines": [
          {
            "speaker": "KAI",
            "text": "New vibration after the turn. Stopped at the test bay.",
            "delivery": "radio"
          },
          {
            "speaker": "DARA",
            "text": "Good call. Test paused. We'll inspect before continuing."
          },
          {
            "speaker": "MILO",
            "text": "Trim bracket. I checked it before the last adjustment, not after."
          },
          {
            "speaker": "ROSA",
            "text": "Then we fix it, check it again and record the recheck."
          }
        ],
        "key": "S16:7"
      },
      {
        "type": "drive",
        "location": "test",
        "label": "Repeat the controlled check",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S16:8"
      },
      {
        "type": "interact",
        "location": "test",
        "label": "Repeat the controlled check",
        "actions": [
          {
            "id": "action-0",
            "label": "Record the same-route comparison",
            "kind": "confirm"
          }
        ],
        "key": "S16:9"
      },
      {
        "type": "drive",
        "location": "customs",
        "label": "Complete Jo’s handover",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S16:10"
      },
      {
        "type": "interact",
        "location": "customs",
        "label": "Complete Jo’s handover",
        "actions": [
          {
            "id": "action-0",
            "label": "Explain how to report a returning symptom",
            "kind": "confirm"
          }
        ],
        "key": "S16:11"
      },
      {
        "type": "dialogue",
        "location": "customs",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "JO",
            "text": "Less wandering with a load. That's what I wanted."
          },
          {
            "speaker": "DARA",
            "text": "The result's on the sheet. If the symptom returns, you call us."
          },
          {
            "speaker": "KAI",
            "text": "Even after the keys change hands?"
          },
          {
            "speaker": "ROSA",
            "text": "Especially then. We sold work, not a disappearing act."
          }
        ],
        "key": "S16:12"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S17",
    "title": "Two Shutters Open",
    "chapter": "Character Stories",
    "contact": "Rosa",
    "location": "workshop",
    "vehicle": "van",
    "reward": 325,
    "optional": true,
    "requires": [
      "S16"
    ],
    "summary": "Arrange the disabled van's recovery; transfer the authorised bike job; deliver revised estimates.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "One van with a failed engine. One commuter bike waiting on tyres. More promises than bays."
          },
          {
            "speaker": "DARA",
            "text": "I have a bay and the bike's correct tyres. You have the diagnostic slot I need."
          },
          {
            "speaker": "KAI",
            "text": "We can share the work without sharing every argument?"
          },
          {
            "speaker": "DARA",
            "text": "We can schedule those separately."
          }
        ],
        "key": "S17:0"
      },
      {
        "type": "drive",
        "location": "rest",
        "label": "Confirm Irene’s recovery consent",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S17:1"
      },
      {
        "type": "interact",
        "location": "rest",
        "label": "Confirm Irene’s recovery consent",
        "actions": [
          {
            "id": "action-0",
            "label": "Explain failed engine separately from fuel",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm the quoted destination",
            "kind": "confirm"
          }
        ],
        "key": "S17:2"
      },
      {
        "type": "drive",
        "location": "customs",
        "label": "Transfer the authorised bike job",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S17:3"
      },
      {
        "type": "interact",
        "location": "customs",
        "label": "Transfer the authorised bike job",
        "actions": [
          {
            "id": "action-0",
            "label": "Match the correct tyre reference",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Give the revised estimate",
            "kind": "confirm"
          }
        ],
        "key": "S17:4"
      },
      {
        "type": "dialogue",
        "location": "customs",
        "label": "Conversation — Two Shutters Open",
        "lines": [
          {
            "speaker": "VAN OWNER IRENE",
            "text": "Tank's full. Can't you just get it started for the drive over?"
          },
          {
            "speaker": "KAI",
            "text": "The engine's failed. Rosa's arranged transport. Fuel won't repair it."
          },
          {
            "speaker": "ROSA",
            "text": "Recovery price and destination are on the estimate. Do you authorise it?"
          },
          {
            "speaker": "IRENE",
            "text": "Yes. Keep me informed if the repair quote changes."
          },
          {
            "speaker": "KAI",
            "text": "Pay the shop for agreed work. I don't sell other people's appointment times."
          }
        ],
        "key": "S17:5"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Complete recovery paperwork",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S17:6"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Complete recovery paperwork",
        "actions": [
          {
            "id": "action-0",
            "label": "Confirm the correct bay",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Check no double billing",
            "kind": "confirm"
          }
        ],
        "key": "S17:7"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "ROSA",
            "text": "No customer paid twice. No mystery vehicle in the wrong yard."
          },
          {
            "speaker": "DARA",
            "text": "And the bike rider reached the night shift. Competence looks terribly ordinary when it works."
          },
          {
            "speaker": "KAI",
            "text": "You should put that on the sign."
          },
          {
            "speaker": "DARA",
            "text": "Nobody would buy a shirt."
          }
        ],
        "key": "S17:8"
      }
    ],
    "outcomes": {}
  },
  {
    "id": "S18",
    "title": "The Second Bay",
    "chapter": "Character Stories",
    "contact": "Rosa",
    "location": "workshop",
    "vehicle": "car",
    "reward": 350,
    "optional": true,
    "requires": [
      "S17"
    ],
    "summary": "Prepare the safe display area; return the completed vehicles to their owners; witness Milo's handover.",
    "stages": [
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Meet Rosa",
        "lines": [
          {
            "speaker": "MILO",
            "text": "You invited the whole quarter?"
          },
          {
            "speaker": "ROSA",
            "text": "Customers. They already know where the mistakes live."
          },
          {
            "speaker": "DARA",
            "text": "Today they see how we prevent the next ones."
          },
          {
            "speaker": "KAI",
            "text": "I'll keep the moving cars away from the tea table."
          }
        ],
        "key": "S18:0"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Prepare the safe display",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S18:1"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Prepare the safe display",
        "actions": [
          {
            "id": "action-0",
            "label": "Keep vehicles away from the tea table",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Match Jo’s key and receipt",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Match Irene’s recovery and repair receipts",
            "kind": "confirm"
          }
        ],
        "key": "S18:2"
      },
      {
        "type": "drive",
        "location": "customs",
        "label": "Confirm the shared-work arrangement",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S18:3"
      },
      {
        "type": "interact",
        "location": "customs",
        "label": "Confirm the shared-work arrangement",
        "actions": [
          {
            "id": "action-0",
            "label": "Read written rates and responsibility",
            "kind": "confirm"
          }
        ],
        "key": "S18:4"
      },
      {
        "type": "dialogue",
        "location": "customs",
        "label": "Conversation — The Second Bay",
        "lines": [
          {
            "speaker": "JO",
            "text": "Same car. Different working week."
          },
          {
            "speaker": "IRENE",
            "text": "Recovery and repair are separate on the receipt. Thank you for telling me before doing either."
          },
          {
            "speaker": "MILO",
            "text": "Tyres fitted and checked. Recheck date here. Tell us if anything feels wrong.",
            "delivery": "to the bike rider"
          },
          {
            "speaker": "ROSA",
            "text": "And what did we not do?"
          },
          {
            "speaker": "MILO",
            "text": "No unrelated upgrades. No fuel charge. No work you didn't authorise."
          }
        ],
        "key": "S18:5"
      },
      {
        "type": "drive",
        "location": "workshop",
        "label": "Witness Milo’s handover",
        "radius": 9,
        "holdSeconds": 2,
        "key": "S18:6"
      },
      {
        "type": "interact",
        "location": "workshop",
        "label": "Witness Milo’s handover",
        "actions": [
          {
            "id": "action-0",
            "label": "Explain only authorised work",
            "kind": "confirm"
          },
          {
            "id": "action-1",
            "label": "Confirm the owner’s signature",
            "kind": "confirm"
          },
          {
            "id": "action-2",
            "label": "Give Milo the second-bay checklist",
            "kind": "confirm"
          }
        ],
        "key": "S18:7"
      },
      {
        "type": "dialogue",
        "location": "workshop",
        "label": "Complete the handover",
        "lines": [
          {
            "speaker": "DARA",
            "text": "We keep our shops. Share the jobs we can do better together. Written rates, written responsibility."
          },
          {
            "speaker": "ROSA",
            "text": "No promises made in my name without calling me."
          },
          {
            "speaker": "DARA",
            "text": "Same rule both ways."
          },
          {
            "speaker": "KAI",
            "text": "I'll handle collections that are actually booked. No keys changing hands on a vague favour."
          },
          {
            "speaker": "MILO",
            "text": "Does this mean I run the second bay tomorrow?"
          },
          {
            "speaker": "ROSA",
            "text": "With the checklist. I'm still here when you need me."
          }
        ],
        "key": "S18:8"
      }
    ],
    "outcomes": {}
  }
];

export const campaignMission = id => CAMPAIGN_MISSIONS.find(m => m.id === id);
