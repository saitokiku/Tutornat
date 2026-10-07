# Chapter 2: Quadratic Functions & Equations

## 2.1 Quadratic Functions

A **quadratic function** has the form f(x) = ax^2 + bx + c, where a, b, and c are real
numbers and a ≠ 0. Its graph is a **parabola**. When a > 0 the parabola opens up and
has a lowest point; when a < 0 it opens down and has a highest point. That turning
point is the **vertex**.

Writing a quadratic in **vertex form** f(x) = a(x - h)^2 + k reveals the vertex (h, k)
directly. A **quadratic equation** is a quadratic set equal to zero, ax^2 + bx + c = 0,
and its solutions are the **roots** (also called zeros or x-intercepts). This chapter
gives four tools for finding those roots: factoring, completing the square, the
quadratic formula, and — for negative discriminants — complex numbers.

## 2.2 Solving by Factoring

Factoring relies on the **Zero Product Property**: if a product equals 0, then at least
one factor equals 0. To use it, first move everything to one side so the equation reads
"... = 0," factor, and then set each factor to 0.

### Worked Example 1 — Factoring

**Problem.** Solve x^2 - 5x + 6 = 0.

**Step 1 — Factor the trinomial.** We need two numbers that multiply to +6 and add to
-5. Those numbers are -2 and -3. So
x^2 - 5x + 6 = (x - 2)(x - 3).

**Step 2 — Apply the Zero Product Property.**
(x - 2)(x - 3) = 0 means x - 2 = 0 or x - 3 = 0.

**Step 3 — Solve each factor.** x = 2 or x = 3. **Roots: x = 2 and x = 3.**

**Check.** (2)^2 - 5(2) + 6 = 4 - 10 + 6 = 0. ✓

## 2.3 Completing the Square

Not every quadratic factors nicely. **Completing the square** rewrites x^2 + bx as a
perfect square by adding (b/2)^2. This both solves equations and converts to vertex
form.

### Worked Example 2 — Completing the Square

**Problem.** Solve x^2 + 6x - 7 = 0 by completing the square.

**Step 1 — Move the constant.** Add 7 to both sides:
x^2 + 6x = 7.

**Step 2 — Add (b/2)^2 to both sides.** Here b = 6, so (b/2)^2 = 3^2 = 9:
x^2 + 6x + 9 = 7 + 9.

**Step 3 — Write the left side as a perfect square.**
(x + 3)^2 = 16.

**Step 4 — Take the square root of both sides.** Remember the ± :
x + 3 = ±4.

**Step 5 — Solve.** x = -3 + 4 = 1 or x = -3 - 4 = -7. **Roots: x = 1 and x = -7.**

The same steps convert f(x) = x^2 + 6x - 7 into vertex form f(x) = (x + 3)^2 - 16,
which shows the vertex is (-3, -16).

## 2.4 The Quadratic Formula

Completing the square on the general equation ax^2 + bx + c = 0 produces a formula that
solves **every** quadratic:

**x = ( -b ± sqrt(b^2 - 4ac) ) / (2a).**

### Worked Example 3 — The Quadratic Formula

**Problem.** Solve 2x^2 + 3x - 2 = 0.

**Step 1 — Identify a, b, c.** a = 2, b = 3, c = -2.

**Step 2 — Compute the discriminant b^2 - 4ac.**
(3)^2 - 4(2)(-2) = 9 + 16 = 25.

**Step 3 — Substitute into the formula.**
x = ( -3 ± sqrt(25) ) / (2 · 2) = ( -3 ± 5 ) / 4.

**Step 4 — Split into two answers.**
x = (-3 + 5)/4 = 2/4 = 1/2, and x = (-3 - 5)/4 = -8/4 = -2.
**Roots: x = 1/2 and x = -2.**

## 2.5 The Discriminant

The quantity under the radical, **D = b^2 - 4ac**, is the **discriminant**. It tells
you the number and type of roots before you finish solving:

- **D > 0:** two distinct real roots (the parabola crosses the x-axis twice).
- **D = 0:** one repeated real root (the vertex sits on the x-axis).
- **D < 0:** no real roots — two **complex** roots.

## 2.6 Complex Roots

To handle a negative discriminant we introduce the **imaginary unit**
**i = sqrt(-1)**, so that **i^2 = -1**. A number of the form a + bi is a **complex
number**. When D < 0, the two roots are **complex conjugates** a + bi and a - bi.

### Worked Example 4 — Complex Roots

**Problem.** Solve x^2 + 4x + 13 = 0.

**Step 1 — Identify a, b, c and the discriminant.** a = 1, b = 4, c = 13, so
D = (4)^2 - 4(1)(13) = 16 - 52 = -36. Because D < 0, expect complex roots.

**Step 2 — Simplify the square root.** sqrt(-36) = sqrt(36) · sqrt(-1) = 6i.

**Step 3 — Apply the quadratic formula.**
x = ( -4 ± 6i ) / 2 = -2 ± 3i. **Roots: x = -2 + 3i and x = -2 - 3i.**

---

## Check Your Understanding

1. Solve by factoring: x^2 - x - 12 = 0.
2. Solve with the quadratic formula: x^2 - 4x + 1 = 0.
3. Find the discriminant of 3x^2 - 2x + 5 = 0 and describe the roots.

**Answers.**

1. x^2 - x - 12 = (x - 4)(x + 3) = 0, so **x = 4 or x = -3**.
2. D = (-4)^2 - 4(1)(1) = 12, so x = (4 ± sqrt(12)) / 2 = (4 ± 2·sqrt(3)) / 2 =
   **2 ± sqrt(3)**.
3. D = (-2)^2 - 4(3)(5) = 4 - 60 = **-56**. Since D < 0, the equation has **two complex
   conjugate roots** (no real roots).
