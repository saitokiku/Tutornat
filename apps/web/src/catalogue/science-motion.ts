import type { CatalogueEntry } from "./types";

const motion: CatalogueEntry = {
  id: "science-motion",
  title: "Motion: distance, speed and graphs",
  summary: "Describe motion with distance, time and speed, and read the story a distance–time graph tells.",
  subject: "science",
  grade: "9",
  locale: "en",
  lessons: [
    {
      id: "what-is-speed",
      title: "What speed means",
      summary: "Speed is the distance an object travels per unit of time.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Distance per time",
          blocks: [
            { type: "text", text: "Speed tells how much distance an object covers in each unit of time." },
            { type: "text", text: "speed = distance ÷ time" },
            {
              type: "points",
              items: [
                "A runner who covers 100 meters in 20 seconds has a speed of 100 ÷ 20 = 5 meters per second, written 5 m/s.",
                "Speed is always a distance unit per time unit: m/s, km/h or mph.",
                "Speed doesn't include direction. Speed in a given direction, such as 5 m/s north, is called velocity.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Position on a track",
          blocks: [
            { type: "text", text: "Picture a straight track, measured in meters from the starting line." },
            {
              type: "visual",
              visual: { kind: "number-line", min: 0, max: 30, marks: [0, 5, 10, 15, 20, 25, 30] },
              alt: "A number line from 0 to 30 meters with marks every 5 meters: 0, 5, 10, 15, 20, 25 and 30. The marks show where a runner at a steady 5 m/s is after each second.",
            },
            { type: "text", text: "At a steady 5 m/s, a runner is 5 m farther along each second. After 6 seconds, she's at the 30 m mark." },
            {
              type: "points",
              items: [
                "Position: where an object is, measured from a reference point such as a starting line.",
                "Distance traveled: how far the object has moved.",
                "If you start at the 0 mark and keep going forward, the two are the same number.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Where is the cyclist?",
          prompt: "A cyclist starts at the 0 m mark and rides at a steady 8 m/s. Where is she after 5 seconds? Move the marker to her position.",
          widget: { kind: "number-line", min: 0, max: 100, step: 5, start: 0, target: 40 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "A head start",
          prompt:
            "A walker starts at the 10 m mark and walks forward at a steady 1.5 m/s for 30 seconds. Where is he now? Move the marker to his position.",
          widget: { kind: "number-line", min: 0, max: 100, step: 5, start: 10, target: 55 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A train travels 240 km in 3 hours at a steady speed. What is its speed?",
              choices: ["80 km/h", "720 km/h", "243 km/h", "0.0125 km/h"],
              answer: 0,
              hint: "Which quantity goes on top, the distance or the time?",
              explain: "Speed = distance ÷ time = 240 km ÷ 3 h = 80 km/h.",
            },
            {
              id: "q2",
              prompt: "A sprinter runs 100 m in 10 s. A cyclist rides 300 m in 60 s. Who is faster?",
              choices: ["The sprinter", "The cyclist", "They're equally fast"],
              answer: 0,
              hint: "Find each speed in meters per second before you compare.",
              explain: "The sprinter's speed is 100 ÷ 10 = 10 m/s and the cyclist's is 300 ÷ 60 = 5 m/s. The cyclist went farther but took six times as long.",
            },
            {
              id: "q3",
              prompt: "You walk at a steady 1.5 m/s. How far do you go in 60 seconds?",
              choices: ["90 m", "40 m", "61.5 m", "0.025 m"],
              answer: 0,
              hint: "Rearrange the formula: distance = speed × time.",
              explain: "Distance = 1.5 m/s × 60 s = 90 m.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Time your own speed",
          brief: "Measure your walking speed with a tape measure and a stopwatch.",
          steps: [
            "Measure a straight 10-meter path in a hallway, driveway or sidewalk. Mark the start and finish with tape, chalk or a pair of shoes.",
            "Have a partner time you with a phone stopwatch as you walk the path at a normal pace.",
            "Walk it again as fast as you can without running, and time that too.",
            "Calculate each speed in m/s: 10 m ÷ your time in seconds. Round to one decimal place.",
            "A typical adult walking speed is about 1.4 m/s. Compare your results and explain whether they make sense.",
          ],
        },
      ],
    },
    {
      id: "distance-time-graphs",
      title: "Reading distance–time graphs",
      summary: "Read a distance–time graph to find how far an object is from its start at any moment.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Time across, distance up",
          blocks: [
            {
              type: "text",
              text: "A distance–time graph shows how far an object is from its starting point at each moment. Time goes on the horizontal axis, and distance goes on the vertical axis.",
            },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 2], [2, 4], [3, 6], [4, 8], [5, 10]], xLabel: "Time (s)", yLabel: "Distance (m)" },
              alt: "A distance–time graph of a rolling ball. The points (0, 0), (1, 2), (2, 4), (3, 6), (4, 8) and (5, 10) lie on a straight line rising to the right.",
            },
            {
              type: "text",
              text: "To read it, find a time on the horizontal axis, go up to the line, then across to the distance. At 3 s, the ball is 6 m from where it started.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "A walk from home",
          blocks: [
            {
              type: "visual",
              visual: {
                kind: "line-graph",
                points: [[0, 0], [1, 80], [2, 160], [3, 240], [4, 240], [5, 240], [6, 320], [7, 400], [8, 480]],
                xLabel: "Time (minutes)",
                yLabel: "Distance from home (m)",
              },
              alt: "A distance–time graph of a walk. The line rises straight from 0 m at 0 minutes to 240 m at 3 minutes, stays level at 240 m until 5 minutes, then rises straight again to 480 m at 8 minutes.",
            },
            { type: "text", text: "Read the story: she walks for 3 minutes, stays in one place for 2 minutes, then walks 3 more minutes." },
            {
              type: "points",
              items: [
                "At 2 minutes, she is 160 m from home.",
                "From 3 to 5 minutes, she stays 240 m from home.",
                "She ends 480 m from home, 8 minutes after she left.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Read between the points",
          prompt:
            "On the walk graph, the line runs straight from 240 m at 5 minutes to 480 m at 8 minutes. How far from home is she at 7 minutes? Move the marker to the distance.",
          widget: { kind: "number-line", min: 0, max: 480, step: 40, start: 0, target: 400 },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Going back",
          blocks: [
            {
              type: "visual",
              visual: {
                kind: "line-graph",
                points: [[0, 0], [1, 4], [2, 8], [3, 12], [4, 8], [5, 4], [6, 0]],
                xLabel: "Time (s)",
                yLabel: "Distance from owner (m)",
              },
              alt: "A distance–time graph of a dog fetching a ball. The line rises straight from (0, 0) to (3, 12), then falls straight back down to (6, 0).",
            },
            { type: "text", text: "A dog runs 12 m out to a ball in 3 seconds, then runs back to its owner." },
            {
              type: "text",
              text: "Here the vertical axis is distance from the starting point. When the line slopes down, the dog is heading back toward the start.",
            },
          ],
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A point on a distance–time graph is at (6 s, 18 m). What does it tell you?",
              choices: [
                "At 6 seconds, the object is 18 m from its start.",
                "The object's speed is 18 m/s.",
                "The object traveled for 18 seconds.",
              ],
              answer: 0,
              hint: "The first coordinate is on the time axis.",
              explain: "A single point pairs a time with a distance: at 6 s, the object is 18 m from its start. Speed comes from comparing two points.",
            },
            {
              id: "q2",
              prompt: "A runner's graph is a straight line from (0 s, 0 m) to (20 s, 100 m). How far from the start is she at 8 s?",
              choices: ["40 m", "8 m", "50 m", "20 m"],
              answer: 0,
              hint: "Find how many meters she covers each second, then multiply.",
              explain: "She covers 100 m in 20 s, which is 5 m each second. After 8 s, she has gone 5 × 8 = 40 m.",
            },
            {
              id: "q3",
              prompt: "On a graph of a dog's distance from its owner, the line slopes down for 3 seconds. What is the dog doing?",
              choices: ["Running back toward its owner", "Standing still", "Running away faster"],
              answer: 0,
              hint: "What is happening to the distance between the dog and its owner?",
              explain: "A falling line means the distance from the owner is shrinking, so the dog is coming back.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Graph your own walk",
          brief: "Make a distance–time graph of a real walk. You need a partner, a stopwatch, a tape measure and 8 small markers, like coins or bottle caps.",
          steps: [
            "Walk in a straight line from a starting mark. Every 5 seconds, your partner says “drop,” and you drop a marker without stopping.",
            "Partway through, stand still for 10 seconds, still dropping a marker at each call. Then walk on.",
            "Measure each marker's distance from the start. Make a table of time and distance.",
            "Plot the points on graph paper, with time across and distance up, and connect them.",
            "Show your graph to someone who didn't watch. Ask them to tell the story of your walk from the graph alone.",
          ],
        },
      ],
    },
    {
      id: "steep-and-flat",
      title: "Steeper means faster",
      summary: "On a distance–time graph, a steeper line means a higher speed, and a flat line means the object is stopped.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Slope is speed",
          blocks: [
            {
              type: "text",
              text: "On a distance–time graph, the slope of the line is the speed: the change in distance divided by the change in time.",
            },
            {
              type: "visual",
              visual: {
                kind: "line-graph",
                points: [[0, 0], [1, 200], [2, 400], [3, 600], [4, 600], [5, 600], [6, 700], [7, 800], [8, 900]],
                xLabel: "Time (minutes)",
                yLabel: "Distance (m)",
              },
              alt: "A distance–time graph of one trip. From 0 to 3 minutes the line rises steeply, from 0 m to 600 m. From 3 to 5 minutes it is flat at 600 m. From 5 to 8 minutes it rises more gently, to 900 m.",
            },
            {
              type: "text",
              text: "From 0 to 3 minutes: 600 m ÷ 3 min = 200 m per minute. From 5 to 8 minutes: 300 m ÷ 3 min = 100 m per minute.",
            },
            { type: "text", text: "The steeper part of the line is the faster part of the trip." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Flat means stopped",
          blocks: [
            {
              type: "text",
              text: "Between 3 and 5 minutes, the line is flat. Time passes, but the distance doesn't change, so the speed is 0.",
            },
            {
              type: "points",
              items: [
                "Steeper line: higher speed.",
                "Gentler line: lower speed.",
                "Flat line: stopped.",
                "Straight line: constant speed. Curved line: changing speed.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Curves mean changing speed",
          blocks: [
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 1], [2, 4], [3, 9], [4, 16]], xLabel: "Time (s)", yLabel: "Distance (m)" },
              alt: "A distance–time graph of a cart rolling down a ramp. The points (0, 0), (1, 1), (2, 4), (3, 9) and (4, 16) form a curve that gets steeper as time goes on.",
            },
            {
              type: "text",
              text: "Each second, the cart covers more distance than the second before: 1 m, then 3 m, then 5 m, then 7 m.",
            },
            { type: "text", text: "The graph keeps getting steeper, so the cart is speeding up." },
            { type: "text", text: "A curve that keeps getting flatter means the object is slowing down." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Read the shape",
          prompt: "Each item describes a distance–time graph. Sort it by what the object is doing.",
          widget: {
            kind: "sorter",
            categories: ["Speeding up", "Constant speed", "Stopped"],
            items: [
              { id: "straight", text: "A straight line rising to the right", answer: 1 },
              { id: "flat", text: "A flat, horizontal line", answer: 2 },
              { id: "curve", text: "A curve that keeps getting steeper", answer: 0 },
              { id: "through", text: "A straight line through (0, 0) and (5, 20)", answer: 1 },
              { id: "squares", text: "Points at (0, 0), (1, 1), (2, 4) and (3, 9)", answer: 0 },
              { id: "level", text: "Points at (2, 50), (3, 50) and (4, 50)", answer: 2 },
              { id: "threes", text: "0, 3, 6 and 9 m from the start after 0, 1, 2 and 3 s", answer: 1 },
              { id: "growing", text: "0, 2, 6 and 12 m from the start after 0, 1, 2 and 3 s", answer: 0 },
            ],
          },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "On the same distance–time graph, line A rises 30 m in 10 s and line B rises 30 m in 5 s. Which object is faster?",
              choices: ["A", "B", "They're equally fast"],
              answer: 1,
              hint: "Work out each speed, or ask which line is steeper.",
              explain: "B covers 30 m in 5 s (6 m/s), while A takes 10 s (3 m/s). B's line is steeper, so B is faster.",
            },
            {
              id: "q2",
              prompt: "A bus's distance–time graph is flat from 9:05 to 9:08. What was the bus doing?",
              choices: ["Stopped, for example at a bus stop", "Moving at a constant speed", "Speeding up"],
              answer: 0,
              hint: "During those minutes, does the distance change?",
              explain: "A flat line means the distance stays the same while time passes. The bus was stopped for 3 minutes.",
            },
            {
              id: "q3",
              prompt: "A sled's distance–time graph is a curve that gets flatter over time and ends in a horizontal line. What happened?",
              choices: ["The sled slowed down and stopped.", "The sled sped up.", "The sled moved at a constant speed the whole time."],
              answer: 0,
              hint: "Compare the slope at the start of the curve with the slope near the end.",
              explain:
                "The flattening curve means the sled covered less distance each second, so it was slowing down. The horizontal line at the end means it stopped.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Ramp run",
          brief: "Film a toy car leaving a ramp and graph how its speed changes.",
          steps: [
            "Prop a board or a large book on a few other books to make a ramp onto a hard floor.",
            "Put tape marks on the floor every 30 cm, starting at the bottom of the ramp.",
            "Film a toy car or a ball rolling down the ramp and across the marks. Play the video back in slow motion and note the time it passes each mark.",
            "Make a table and plot distance from the bottom of the ramp against time. Where is the graph steepest? Where does it flatten?",
            "Explain what the shape tells you about the car's speed, and what slowed it down on the floor.",
          ],
        },
      ],
    },
    {
      id: "average-speed",
      title: "Average speed",
      summary: "Find the average speed for a whole trip, even when the speed changes along the way.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Total distance over total time",
          blocks: [
            {
              type: "text",
              text: "Most trips don't happen at a constant speed. Average speed treats the whole trip as one piece.",
            },
            { type: "text", text: "average speed = total distance ÷ total time" },
            {
              type: "text",
              text: "A family drives 120 km in 2 hours, including a stop for gas. Their average speed is 120 ÷ 2 = 60 km/h, even though the speedometer showed 100 km/h at times and 0 at the gas station.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Average speed on a graph",
          blocks: [
            {
              type: "visual",
              visual: {
                kind: "line-graph",
                points: [[0, 0], [1, 150], [2, 300], [3, 300], [4, 300], [5, 450], [6, 600]],
                xLabel: "Time (minutes)",
                yLabel: "Distance (m)",
              },
              alt: "A distance–time graph of a trip. The line rises from 0 m at 0 minutes to 300 m at 2 minutes, stays flat at 300 m until 4 minutes, then rises to 600 m at 6 minutes.",
            },
            { type: "points", items: ["Total distance: 600 m.", "Total time: 6 minutes.", "Average speed: 600 ÷ 6 = 100 m per minute."] },
            { type: "text", text: "While moving, the speed was 150 m per minute. The 2-minute stop pulls the average down." },
            {
              type: "text",
              text: "On a distance–time graph, the average speed is the slope of a straight line from the first point to the last.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Don't average the speeds",
          blocks: [
            { type: "text", text: "You drive 60 km at 30 km/h, then 60 km back at 60 km/h. Your average speed is not 45 km/h." },
            {
              type: "text",
              text: "The first leg takes 2 hours and the second takes 1 hour. That's 120 km in 3 hours, so the average speed is 40 km/h.",
            },
            { type: "text", text: "You spend more time at the slower speed, so it counts for more in the average." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "A ride with a rest",
          prompt:
            "A cyclist rides 30 km in 1.5 hours, rests for 30 minutes, then rides 18 km in 1 hour. What is her average speed for the whole trip, in km/h? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 24, step: 1, start: 0, target: 16 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A bus travels 90 km in 2 hours, including its stops. What is its average speed?",
              choices: ["45 km/h", "180 km/h", "92 km/h", "It can't be found because of the stops"],
              answer: 0,
              hint: "Use the total distance and the total time, with the stops included.",
              explain: "Average speed = 90 km ÷ 2 h = 45 km/h. The stops are already counted in the 2 hours.",
            },
            {
              id: "q2",
              prompt: "You walk 1 km at 4 km/h, then run 1 km at 12 km/h. What is your average speed?",
              choices: ["8 km/h", "6 km/h", "16 km/h", "4 km/h"],
              answer: 1,
              hint: "Find how long each kilometer takes first.",
              explain:
                "Walking takes 1/4 h and running takes 1/12 h, which is 1/3 h in all. 2 km ÷ 1/3 h = 6 km/h, not the 8 km/h you'd get by averaging the two speeds.",
            },
            {
              id: "q3",
              prompt: "How can you see a trip's average speed on its distance–time graph?",
              choices: [
                "It's the slope of a straight line from the first point to the last point.",
                "It's the height of the highest point.",
                "It's the slope of the steepest part.",
              ],
              answer: 0,
              hint: "Average speed uses only the total distance and the total time. Which two points give you those?",
              explain: "A line from start to finish rises the total distance over the total time, so its slope is the average speed.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Average speed of a real trip",
          brief: "Work out the average speed of a trip you take anyway, by car, bus or bike.",
          steps: [
            "Write down the time when the trip starts and when it ends.",
            "Find the trip's distance from the car's trip odometer, a paper map or a route app.",
            "Compute the average speed: total distance ÷ total time, in km/h or mph.",
            "If you're a passenger, note a few speedometer readings along the way, and every stop or slowdown.",
            "Explain why your average speed is lower than the highest speed you saw.",
          ],
        },
      ],
    },
  ],
};

export default motion;
