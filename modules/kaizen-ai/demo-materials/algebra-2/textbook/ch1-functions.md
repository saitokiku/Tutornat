# Chapter 1: Functions & Their Graphs

## 1.1 What Is a Function?

A **relation** is any set of ordered pairs (x, y). A **function** is a special kind of
relation in which **each input x is paired with exactly one output y**. The set of all
allowed inputs is the **domain**; the set of all resulting outputs is the **range**.

The quickest graphical test is the **vertical line test**: if every vertical line
crosses a graph at most once, the graph represents a function. For example, the
parabola y = x^2 passes the test (each x gives one y), but the sideways parabola
x = y^2 fails it, because x = 4 corresponds to both y = 2 and y = -2.

## 1.2 Function Notation

We name functions with letters and write **f(x)**, read "f of x," for the output when
the input is x. The symbol f(x) does **not** mean f times x; it names a value. To
**evaluate** a function, substitute the input everywhere x appears and simplify.

If f(x) = 2x^2 - 3x + 1, then f(2) is found by replacing every x with 2:
f(2) = 2(2)^2 - 3(2) + 1 = 8 - 6 + 1 = 3.

## 1.3 Domain and Range

Unless a problem says otherwise, the domain is **every real number for which the rule
makes sense**. Two situations shrink the domain:

- **Division by zero is undefined.** For a rational rule, exclude any x that makes a
  denominator 0.
- **Even roots of negatives are not real.** For a square root (or any even root),
  require the expression inside the radical to be greater than or equal to 0.

The range is the set of outputs the function actually produces. It is often easiest to
read the range from a graph or from the shape of a parent function.

## 1.4 Worked Example 1 — Evaluating and Simplifying

**Problem.** Let f(x) = 2x^2 - 3x + 1. Find f(-2) and f(a + 1).

**Step 1 — Find f(-2).** Replace each x with -2:
f(-2) = 2(-2)^2 - 3(-2) + 1.

**Step 2 — Simplify.** (-2)^2 = 4, so
f(-2) = 2(4) + 6 + 1 = 8 + 6 + 1 = **15**.

**Step 3 — Find f(a + 1).** Replace each x with the quantity (a + 1):
f(a + 1) = 2(a + 1)^2 - 3(a + 1) + 1.

**Step 4 — Expand.** (a + 1)^2 = a^2 + 2a + 1, so
f(a + 1) = 2(a^2 + 2a + 1) - 3a - 3 + 1 = 2a^2 + 4a + 2 - 3a - 3 + 1.

**Step 5 — Combine like terms.**
f(a + 1) = 2a^2 + (4a - 3a) + (2 - 3 + 1) = **2a^2 + a**.

## 1.5 Worked Example 2 — Finding Domain and Range

**Problem.** Find the domain and range of g(x) = sqrt(x - 4).

**Step 1 — Set the radicand ≥ 0.** For a real square root we need what is inside to be
nonnegative: x - 4 >= 0.

**Step 2 — Solve.** Add 4 to both sides: x >= 4. So the **domain is [4, ∞)** — every
real number 4 or larger.

**Step 3 — Reason about outputs.** The square root symbol returns values that are 0 or
positive. The smallest output occurs at x = 4, where g(4) = sqrt(0) = 0, and outputs
grow without bound as x increases. So the **range is [0, ∞)**.

## 1.6 Parent Functions and Transformations

A **parent function** is the simplest form of a family. Four important parents are:

- Linear: f(x) = x
- Quadratic: f(x) = x^2
- Square root: f(x) = sqrt(x)
- Absolute value: f(x) = |x|

Starting from a parent f(x), we can shift, stretch, and reflect its graph. Let a, h,
and k be constants. Then for g(x) = a · f(x - h) + k:

- **h** shifts the graph **horizontally**: right when h > 0, left when h < 0.
  (The sign flips because x - h = 0 at x = h.)
- **k** shifts the graph **vertically**: up when k > 0, down when k < 0.
- **a** stretches vertically (by a factor of |a|) and, if a is negative, **reflects the
  graph across the x-axis**.

## 1.7 Worked Example 3 — Describing a Transformation

**Problem.** Describe how the graph of g(x) = -(x - 3)^2 + 5 is obtained from the
parent f(x) = x^2, and state the vertex.

**Step 1 — Match the form.** Write g(x) = a(x - h)^2 + k. Here a = -1, h = 3, k = 5.

**Step 2 — Interpret h = 3.** The graph shifts **right 3 units**.

**Step 3 — Interpret a = -1.** The graph is **reflected across the x-axis**, so the
parabola opens **downward** (there is no stretch since |a| = 1).

**Step 4 — Interpret k = 5.** The graph shifts **up 5 units**.

**Step 5 — State the vertex.** For a(x - h)^2 + k the vertex is (h, k), so the vertex
is **(3, 5)**, and it is a maximum because the parabola opens down.

## 1.8 Reading a Graph

From a graph you can often read a function's key features directly: the domain (which
x-values the graph covers), the range (which y-values it reaches), the intercepts
(where the graph crosses the axes), and where the function is increasing or decreasing.
These same features return again and again in every unit of this course.

---

## Check Your Understanding

1. Find the domain of f(x) = (x - 1) / (x^2 - 4).
2. If f(x) = 3x - 5, find f(4) and f(-1).
3. Describe the transformation from y = x^2 to y = (x + 4)^2 - 3, and give the vertex.

**Answers.**

1. The denominator x^2 - 4 = (x - 2)(x + 2) is 0 when x = 2 or x = -2, so exclude
   those. **Domain: all real numbers except x = 2 and x = -2.**
2. f(4) = 3(4) - 5 = 12 - 5 = **7**; f(-1) = 3(-1) - 5 = -3 - 5 = **-8**.
3. Shift **left 4 units** (because x + 4 = x - (-4), so h = -4) and **down 3 units**
   (k = -3). **Vertex: (-4, -3).**
