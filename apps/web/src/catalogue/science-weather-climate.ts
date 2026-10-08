import type { CatalogueEntry } from "./types";

const weatherClimate: CatalogueEntry = {
  id: "science-weather-climate",
  title: "Weather and climate",
  summary: "Measure the weather, see how clouds, rain and wind form, and tell today's weather apart from a place's climate.",
  subject: "science",
  grade: "6",
  locale: "en",
  lessons: [
    {
      id: "weather-now",
      title: "What weather is",
      summary: "The parts of weather, the tools that measure them, and how to read a temperature.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Weather is the air right now",
          blocks: [
            {
              type: "text",
              text: "Weather is what the air is like at one place and one time. It happens in the troposphere, the lowest layer of the atmosphere.",
            },
            {
              type: "points",
              items: [
                "Temperature: how hot or cold the air is.",
                "Air pressure: how hard the air above pushes down.",
                "Humidity: how much water vapor is in the air.",
                "Wind: air moving from place to place, with a speed and a direction.",
                "Clouds and precipitation: rain, snow, sleet or hail falling from clouds.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Tools for measuring weather",
          blocks: [
            {
              type: "points",
              items: [
                "Thermometer: temperature.",
                "Barometer: air pressure.",
                "Anemometer: wind speed.",
                "Wind vane: wind direction.",
                "Rain gauge: how much rain falls.",
                "Hygrometer: humidity.",
              ],
            },
            {
              type: "text",
              text: "Weather stations keep thermometers in the shade, inside a box with slatted sides that let air flow through. In direct sunlight, a thermometer heats up and reads higher than the air around it.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "What does it measure?",
          prompt: "Sort each tool by what it measures.",
          widget: {
            kind: "sorter",
            categories: ["Temperature", "Air pressure", "Wind", "Rain and humidity"],
            items: [
              { id: "thermometer", text: "Thermometer", answer: 0 },
              { id: "barometer", text: "Barometer", answer: 1 },
              { id: "anemometer", text: "Anemometer", answer: 2 },
              { id: "vane", text: "Wind vane", answer: 2 },
              { id: "gauge", text: "Rain gauge", answer: 3 },
              { id: "hygrometer", text: "Hygrometer", answer: 3 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Reading temperature",
          blocks: [
            {
              type: "visual",
              visual: { kind: "number-line", min: -10, max: 30, marks: [-10, 0, 10, 20, 30], marker: 0 },
              alt: "A number line of temperatures from −10 °C to 30 °C. A dot marks 0 °C, where water freezes.",
            },
            {
              type: "text",
              text: "Scientists, and most countries, measure temperature in degrees Celsius (°C). Water freezes at 0 °C and boils at 100 °C at sea level.",
            },
            { type: "text", text: "Temperatures below freezing are negative numbers. −5 °C is colder than 0 °C, and −10 °C is colder still." },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "From morning to noon",
          prompt: "At 6 a.m. the thermometer reads −4 °C. By noon, the air has warmed by 10 degrees. Move the marker to the noon temperature.",
          widget: { kind: "number-line", min: -10, max: 20, step: 1, start: 0, target: 6 },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which tool measures air pressure?",
              choices: ["Thermometer", "Barometer", "Anemometer", "Rain gauge"],
              answer: 1,
              hint: "Its name starts with “baro,” from an old Greek word for weight.",
              explain:
                "A barometer measures air pressure, the weight of the air above pushing down. A thermometer measures temperature, an anemometer measures wind speed, and a rain gauge measures rainfall.",
            },
            {
              id: "q2",
              prompt: "Why do weather stations keep thermometers in the shade?",
              choices: [
                "Sunlight can break a thermometer.",
                "In direct sun, the thermometer heats up and reads warmer than the air.",
                "Shade makes the reading change faster.",
              ],
              answer: 1,
              hint: "What happens to a dark car seat that sits in the sun?",
              explain: "Sunlight warms the thermometer itself. In the shade, with air flowing past, it shows the temperature of the air.",
            },
            {
              id: "q3",
              prompt: "Which is colder: −8 °C or −3 °C?",
              choices: ["−8 °C", "−3 °C", "They are the same"],
              answer: 0,
              hint: "On a number line, colder temperatures are farther to the left.",
              explain: "−8 is farther below zero than −3, so −8 °C is colder.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Sun or shade?",
          brief: "Run a fair test: does a thermometer read differently in the sun and in the shade? You need two matching thermometers and a watch.",
          steps: [
            "Choose a sunny spot and a shady spot outside, close to each other.",
            "Put one thermometer in each spot, at the same height off the ground.",
            "Wait 10 minutes, then read both. Write down the two temperatures.",
            "Name your variables: what you changed, what you measured, and what you kept the same.",
            "Explain which reading is closer to the true air temperature, and why.",
          ],
        },
      ],
    },
    {
      id: "water-in-air",
      title: "Clouds, rain and snow",
      summary: "How water vapor gets into the air, how it turns into clouds, and what makes it fall.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Water vapor",
          blocks: [
            {
              type: "visual",
              visual: { kind: "particles", state: "gas" },
              alt: "Particles of a gas: few of them, spread far apart. Water vapor is water in this state.",
            },
            {
              type: "text",
              text: "Water vapor is water as a gas, and it is invisible. The white “steam” above a pot is really tiny droplets of liquid water that form when the vapor cools.",
            },
            {
              type: "text",
              text: "Water enters the air by evaporation, mostly from oceans, lakes and rivers. Plants also give off water vapor through their leaves.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "How clouds form",
          blocks: [
            {
              type: "text",
              text: "Warm, moist air rises, and as it rises it cools. Cooler air can hold less water vapor, so some of the vapor condenses into tiny droplets of liquid water.",
            },
            {
              type: "visual",
              visual: { kind: "particles", state: "liquid" },
              alt: "Particles of a liquid: packed close together but able to slide past each other. Cloud droplets are liquid water.",
            },
            {
              type: "text",
              text: "Each droplet forms around a speck of dust, sea salt or smoke. Billions of droplets together make a cloud. Fog is a cloud that forms at ground level.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "From cloud to precipitation",
          blocks: [
            {
              type: "text",
              text: "Cloud droplets are so small that they stay up in the air. They fall only after they grow much bigger, by joining together or by freezing onto ice crystals.",
            },
            {
              type: "points",
              items: [
                "Rain: drops of liquid water.",
                "Snow: ice crystals that form in the cloud and stay frozen all the way down.",
                "Sleet: raindrops that freeze into ice pellets as they fall through a layer of cold air.",
                "Hail: lumps of ice that grow inside thunderstorms, where strong rising winds carry them up through the cloud again and again.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Which part of the water cycle?",
          prompt: "Sort each event. Is it evaporation, condensation or precipitation?",
          widget: {
            kind: "sorter",
            categories: ["Evaporation", "Condensation", "Precipitation"],
            items: [
              { id: "puddle", text: "A puddle dries up on a sunny afternoon", answer: 0 },
              { id: "laundry", text: "Wet laundry dries on a line", answer: 0 },
              { id: "dew", text: "Dew forms on the grass overnight", answer: 1 },
              { id: "glass", text: "A glass of ice water gets wet on the outside", answer: 1 },
              { id: "mirror", text: "A mirror fogs up during a hot shower", answer: 1 },
              { id: "snow", text: "Snow falls on the mountains", answer: 2 },
              { id: "hail", text: "Hail bounces off a car roof", answer: 2 },
            ],
          },
        },
        {
          id: "s5",
          kind: "slide",
          title: "Humidity and dew point",
          blocks: [
            {
              type: "text",
              text: "Humidity is the amount of water vapor in the air. Relative humidity compares that amount with the most the air could hold at its temperature.",
            },
            {
              type: "text",
              text: "The dew point is the temperature at which the air becomes saturated, or full of water vapor, so vapor starts to condense.",
            },
            { type: "text", text: "On a clear night, grass cools below the dew point of the air touching it, so water vapor condenses on the blades as dew." },
          ],
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "What is a cloud made of?",
              choices: ["Water vapor, which is a gas", "Tiny droplets of liquid water or ice crystals", "Only smoke and dust"],
              answer: 1,
              hint: "You can see a cloud. Can you see water vapor?",
              explain:
                "Water vapor is invisible. A cloud is what you see after the vapor condenses into tiny droplets, or freezes into ice crystals, around specks of dust and salt.",
            },
            {
              id: "q2",
              prompt: "Why does rising air form clouds?",
              choices: [
                "Rising air cools, so some of its water vapor condenses.",
                "Rising air heats up until the water in it boils.",
                "Rising air gets closer to the Sun and dries out.",
              ],
              answer: 0,
              hint: "What happens to the air temperature as you climb a mountain?",
              explain: "Air cools as it rises. Cooler air can hold less water vapor, so some of it condenses into the droplets that make a cloud.",
            },
            {
              id: "q3",
              prompt: "A cold can of juice gets wet on the outside. Where does the water come from?",
              choices: ["It leaks through the can.", "Water vapor in the air condenses on the cold can.", "The metal makes water when it gets cold."],
              answer: 1,
              hint: "The can is cold. What happens to water vapor that touches something cold?",
              explain:
                "Air touching the can cools below its dew point, so water vapor from the air condenses on the metal. Dew and clouds form the same way.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "A cloud in a jar",
          brief: "Make evaporation and condensation happen where you can watch them. You need a clear glass jar, hot tap water, ice cubes, a small plate, and a grown-up.",
          steps: [
            "Ask a grown-up to pour about 3 centimeters of hot tap water into the jar. Use hot tap water, not boiling water.",
            "Set the plate on top of the jar and put a few ice cubes on the plate.",
            "Watch for 2 minutes. Look for mist inside the jar and for droplets forming under the plate.",
            "Ask your grown-up to lift the plate, add one quick puff of hairspray into the jar, and cover it again. Compare what you see.",
            "Explain where evaporation happened, where condensation happened, and why the hairspray helped a cloud form.",
          ],
        },
      ],
    },
    {
      id: "air-on-the-move",
      title: "Pressure, wind and fronts",
      summary: "Why air pushes down, why wind blows, and what happens when two air masses meet.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Air has weight",
          blocks: [
            {
              type: "text",
              text: "Air is made of gas molecules, and gravity pulls on them. The weight of all the air above you presses down on everything. That push is air pressure.",
            },
            { type: "text", text: "You don't feel it, because your body pushes back from the inside just as hard." },
            { type: "text", text: "Air pressure is lower high up. On a mountaintop there is less air above you pressing down." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Why wind blows",
          blocks: [
            {
              type: "text",
              text: "The Sun heats Earth unevenly. Air over warm ground warms up, spreads out and rises. That leaves lower pressure near the ground.",
            },
            {
              type: "text",
              text: "In other places, cooler air sinks and makes higher pressure. Air moves from high pressure toward low pressure. That moving air is wind.",
            },
            {
              type: "points",
              items: [
                "Sea breeze: on a sunny day, land warms faster than water. Air rises over the land, and cooler air flows in from the sea to replace it.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Highs and lows",
          blocks: [
            {
              type: "points",
              items: [
                "High pressure: air sinks and warms, so clouds tend to dry up. Highs usually bring clear, calm weather.",
                "Low pressure: air rises and cools, so clouds form. Lows often bring clouds, rain and storms.",
              ],
            },
            { type: "text", text: "A barometer reading that keeps falling often means a low is on its way, so clouds and rain are likely." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "High or low pressure?",
          prompt: "Sort each clue. Does it go with high pressure or low pressure?",
          widget: {
            kind: "sorter",
            categories: ["High pressure", "Low pressure"],
            items: [
              { id: "sinking", text: "Air sinking toward the ground", answer: 0 },
              { id: "rising", text: "Air rising and cooling", answer: 1 },
              { id: "clear", text: "Clear, sunny skies for days", answer: 0 },
              { id: "rain", text: "Thick clouds and steady rain", answer: 1 },
              { id: "calm", text: "Calm, settled weather", answer: 0 },
              { id: "falling", text: "A barometer reading that keeps falling", answer: 1 },
            ],
          },
        },
        {
          id: "s5",
          kind: "slide",
          title: "Air masses and fronts",
          blocks: [
            {
              type: "text",
              text: "An air mass is a huge body of air with about the same temperature and humidity all through it. It takes on the conditions where it formed: cold and dry over snowy land, warm and moist over a tropical ocean.",
            },
            { type: "text", text: "A front is the boundary where two air masses meet." },
            {
              type: "points",
              items: [
                "Cold front: cold air pushes under warm air and forces it up quickly. Expect tall clouds and heavy rain or thunderstorms, then cooler, drier air.",
                "Warm front: warm air slides slowly up over cold air. Expect wide layers of cloud and steady, lighter rain, then warmer air.",
              ],
            },
          ],
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which way does wind blow?",
              choices: ["From low pressure toward high pressure", "From high pressure toward low pressure", "Always from north to south"],
              answer: 1,
              hint: "Think of air rushing out of a balloon: from where it is squeezed to where it is not.",
              explain: "Air moves from areas of high pressure toward areas of low pressure. That moving air is wind.",
            },
            {
              id: "q2",
              prompt: "The barometer reading has been falling all morning. What weather is most likely coming?",
              choices: ["Clouds and rain", "Clear skies", "No change at all"],
              answer: 0,
              hint: "Falling pressure means a low is moving in. What does air do in a low?",
              explain: "Falling pressure often means a low is arriving. In a low, air rises and cools, so clouds and rain are likely.",
            },
            {
              id: "q3",
              prompt: "A cold front has just passed through town. What weather comes next?",
              choices: ["Warmer, more humid air", "Cooler, drier air", "A week of thick fog"],
              answer: 1,
              hint: "Once the front has passed, which air mass is sitting over the town?",
              explain: "A cold front often brings a short burst of heavy rain or storms. Behind it, the cold air mass moves in, so the air turns cooler and drier.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Catch a front",
          brief: "Keep a weather log for 5 days and look for a front passing through. You need a notebook and a weather forecast.",
          steps: [
            "Each day at the same time, record the temperature, the clouds you see, and whether it is windy or raining.",
            "Look up the air pressure in a weather forecast or app, and write it down too.",
            "Look for a day when the temperature drops or rises sharply, or the wind changes direction.",
            "Compare the pressure on that day with the days before. Did it fall before the change?",
            "Write a short weather report: what kind of front do you think passed, and what is your evidence?",
          ],
        },
      ],
    },
    {
      id: "climate",
      title: "Climate: weather over many years",
      summary: "What climate means, what makes one place's climate different from another's, and how Earth's climate is changing.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Weather is not climate",
          blocks: [
            {
              type: "text",
              text: "Weather is the air today. Climate is the usual pattern of weather in a place over many years. Scientists usually average 30 years of measurements.",
            },
            {
              type: "visual",
              visual: {
                kind: "line-graph",
                points: [[1, 2], [2, 3], [3, 7], [4, 12], [5, 17], [6, 21], [7, 24], [8, 23], [9, 19], [10, 13], [11, 7], [12, 3]],
                xLabel: "Month (1 = January)",
                yLabel: "Average temperature (°C)",
              },
              alt: "A line graph of average temperature by month for an example town in the Northern Hemisphere. It is coldest in January, about 2 °C, rises to about 24 °C in July, then falls again by December.",
            },
            { type: "text", text: "A graph like this one, for an example town, shows climate: not one day, but what each month is usually like." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "What shapes a climate",
          blocks: [
            {
              type: "points",
              items: [
                "Latitude: near the equator, sunlight strikes more directly all year, so it is warm. Near the poles, sunlight arrives at a low angle and spreads out, so it is cold.",
                "Distance from the ocean: water warms and cools slowly, so coastal places have milder summers and winters than places far inland.",
                "Elevation: air gets colder as you go up, on average about 6.5 °C for every 1,000 meters. Some mountains near the equator have snow on top.",
                "Mountains: moist air rises up one side and drops its rain there. The far side is often dry. That dry area is called a rain shadow.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Weather or climate?",
          prompt: "Sort each statement. Is it about weather or about climate?",
          widget: {
            kind: "sorter",
            categories: ["Weather", "Climate"],
            items: [
              { id: "snowing", text: "It is snowing this morning.", answer: 0 },
              { id: "summers", text: "Summers here are usually hot and dry.", answer: 1 },
              { id: "tomorrow", text: "Tomorrow's high will be 25 °C.", answer: 0 },
              { id: "storm", text: "A thunderstorm rolled in at 4 p.m.", answer: 0 },
              { id: "july", text: "Over the last 30 years, July has averaged 24 °C here.", answer: 1 },
              { id: "rainfall", text: "This region gets about 200 cm of rain in a typical year.", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Up the mountain",
          prompt:
            "At the foot of a mountain, the air is 20 °C. On average, air cools about 6.5 °C for every 1,000 meters you climb. About what temperature would you expect 2,000 meters higher? Move the marker.",
          widget: { kind: "number-line", min: -10, max: 30, step: 1, start: 20, target: 7 },
        },
        {
          id: "s5",
          kind: "slide",
          title: "A changing climate",
          blocks: [
            {
              type: "text",
              text: "Earth's climate has changed many times over its long history. Since the late 1800s, Earth's average surface temperature has risen by more than 1 °C.",
            },
            {
              type: "text",
              text: "The main cause is people burning coal, oil and gas. Burning them adds carbon dioxide to the air, and carbon dioxide traps heat near Earth's surface, a bit like a blanket.",
            },
            {
              type: "text",
              text: "One degree sounds small, but it is an average over the whole planet and every season. It already means more heat waves, melting ice and rising seas.",
            },
          ],
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which statement is about climate, not weather?",
              choices: ["It's raining right now.", "This city usually gets most of its rain in winter.", "The wind picked up an hour ago."],
              answer: 1,
              hint: "Climate describes the usual pattern over many years.",
              explain:
                "“Usually gets most of its rain in winter” describes a long-term pattern, so it is climate. The other two describe the air at one moment, so they are weather.",
            },
            {
              id: "q2",
              prompt: "Two towns are at the same latitude. One is on the coast and one is far inland. Which one probably has hotter summers?",
              choices: ["The coastal town", "The inland town", "They must be the same"],
              answer: 1,
              hint: "Water warms up slowly. Which town is next to a lot of water?",
              explain: "The ocean warms slowly, which keeps the coast cooler in summer and milder in winter. Places far inland heat up and cool down more.",
            },
            {
              id: "q3",
              prompt: "There was a very cold week this winter. Does that prove Earth's climate is not warming?",
              choices: [
                "Yes, a cold week proves it.",
                "No. Climate is about averages over many years and the whole planet, not one week in one place.",
                "Yes, if the week was colder than the same week last year.",
              ],
              answer: 1,
              hint: "Is one cold week weather or climate?",
              explain:
                "A cold week is weather in one place. Climate change shows up in averages over many years and the whole planet, and those averages have been rising.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Graph your climate",
          brief: "Find out what your climate is like and compare it with a place far away. You need a weather app or website and some graph paper.",
          steps: [
            "Look up the average high temperature for each month where you live. Many weather apps and websites list monthly averages.",
            "Draw a line graph: months along the bottom, temperature up the side.",
            "Pick a city much closer to the equator, or much farther from it, and graph its averages in another color.",
            "Compare the two lines. Which city has the bigger difference between summer and winter?",
            "Use latitude, the ocean or elevation to explain one difference you found.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). */
export const practice: Record<string, string[]> = {
  "weather-now": ["s.variables"],
  "water-in-air": ["s.water.cycle"],
};

export default weatherClimate;
