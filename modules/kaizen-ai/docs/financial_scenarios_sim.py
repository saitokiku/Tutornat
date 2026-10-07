#!/usr/bin/env python3
"""Kaizen — year-1 scenario simulation (Sep -> Aug).

Monthly cohort model priced from web/lib/server/clubPricing.js. Four scenarios:
  A. worst_undisciplined — weak demand AND the full Mon-Thu x4 grid staffed
     regardless of fill (the expensive mistake)
  B. worst_disciplined   — same weak demand, rooms sized to actual seats
     (the seats-per-tutor-hour rule followed)
  C. minimum_goal        — the smallest funnel that reaches cash breakeven
  D. base                — the plan working modestly (not a hockey stick)

Monte Carlo (n=500) jitters conversion, churn, and fill so worst cases come
with bands, not point estimates. Founder salary: $0 throughout (that's what
"struggling startup" means). Output: per-scenario year table + summary.
"""

import random
import statistics as st

# ── Price book (dollars; prices mirror web/lib/server/clubPricing.js as of
#    2026-08-13 (the 2026-08-12 repricing) — clubPricing.js is the single
#    source of truth, update the two together) ──────────────────────────────
HALL_RETAIL = 14.0
HALL_OVERAGE = 8.0          # member extra visits, $9/$8/$7 blended at PLAN_MIX
CLINIC_RETAIL = 20.0
CLINIC_MEMBER = 14.0        # $16/$14/$12 blended at PLAN_MIX
P60_RETAIL, P30_RETAIL = 60.0, 35.0
P60_MEMBER = 47.0           # $50/$47/$44 blended at PLAN_MIX
PLANS = {"club": (45.0, 4), "plus": (79.0, 8), "max": (109.0, 12)}
PLAN_MIX = {"club": 0.20, "plus": 0.60, "max": 0.20}
AI_SOLO, AI_HALL = 11.99, 24.99  # AI ladder (launched 2026-08-12). NOT modeled
                                 # as revenue below — no year-1 volume evidence
                                 # yet; free-tier AI riders appear as COGS only.

TUTOR_HR = 25.0             # flat pay default (admin-set band $22-30)
VIDEO_GROUP = 2.2           # Daily.co ~9 participants x 60min
VIDEO_1ON1 = 0.6
VIDEO_COMMUNITY = 4.4       # ~18 participants (16 students + 2 staff) x 60min
STRIPE_PCT, STRIPE_FIX = 0.029, 0.30
AI_COGS_MEMBER = 1.50       # tokens/mo per active member (capped tiers)
AI_COGS_FREE = 0.40         # per active free family
FIXED = 370.0               # vercel 20 + supabase 25 + resend 20 + tools 30
                            # + insurance 175 + accounting/legal amortized 100
COMMUNITY_STAFF = 2         # capacity-16 free hall = two cleared staff
                            # (8 students per staff, clubPricing communityCapacity)
FREE_HALL_MONTHLY = 4.33 * (COMMUNITY_STAFF * TUTOR_HR + VIDEO_COMMUNITY)
FIRST_FREE_COST = 15.0      # blended 30/60-min tutor cost of the intro session

MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]
# Demand seasonality (Dec dip, spring exams bump, summer cliff)
SEASON = [1.0, 1.1, 1.1, 0.7, 1.0, 1.1, 1.15, 1.1, 1.0, 0.45, 0.35, 0.40]

SCENARIOS = {
    "A. worst, undisciplined": dict(
        new_families=6, growth=0.0, pay_conv=0.25, member_conv=0.06,
        churn=0.30, summer_churn_bump=0.20, util=0.55, fill_target=None,  # None => fixed grid
        grid_hours_wk=16, alacarte_halls=1.2, clinics_per_family=0.15,
        p1_sessions=4, jitter=0.25),
    "B. worst, disciplined": dict(
        new_families=6, growth=0.0, pay_conv=0.25, member_conv=0.06,
        churn=0.30, summer_churn_bump=0.20, util=0.55, fill_target=5,
        grid_hours_wk=None, alacarte_halls=1.2, clinics_per_family=0.15,
        p1_sessions=4, jitter=0.25),
    "C. minimum goal": dict(
        new_families=14, growth=0.02, pay_conv=0.45, member_conv=0.14,
        churn=0.12, summer_churn_bump=0.10, util=0.70, fill_target=5,
        grid_hours_wk=None, alacarte_halls=1.6, clinics_per_family=0.25,
        p1_sessions=10, jitter=0.15),
    "D. base (plan works)": dict(
        new_families=20, growth=0.08, pay_conv=0.50, member_conv=0.20,
        churn=0.08, summer_churn_bump=0.05, util=0.75, fill_target=5.5,
        grid_hours_wk=None, alacarte_halls=1.8, clinics_per_family=0.30,
        p1_sessions=16, jitter=0.12),
}


def simulate(p, seed=None):
    rng = random.Random(seed)
    j = p["jitter"]
    def jit(x):  # multiplicative noise on the scary knobs
        return x * max(0.05, rng.gauss(1.0, j))

    members = {k: 0.0 for k in PLANS}
    alacarte_families = 0.0   # paying, non-member, still active
    free_families = 8.0       # community-hall regulars (AI free tier riders)
    new_base = p["new_families"]
    rows, cash = [], 0.0

    for m in range(12):
        s = SEASON[m]
        summer = m >= 9
        # ── Funnel ──
        new = jit(new_base) * s
        new_base *= (1 + p["growth"])
        paying_new = new * jit(p["pay_conv"])
        free_families = free_families * 0.85 + (new - paying_new) * 0.5
        # à-la-carte pool: adds, converts to member, lapses
        conv = (alacarte_families + paying_new) * jit(p["member_conv"])
        alacarte_families = max(0.0, (alacarte_families + paying_new - conv) * 0.72)
        churn = jit(p["churn"]) + (p["summer_churn_bump"] if summer else 0.0)
        for k in PLANS:
            members[k] = members[k] * (1 - min(0.9, churn)) + conv * PLAN_MIX[k]
        n_members = sum(members.values())

        # ── Usage ──
        util = min(1.0, jit(p["util"]) * (0.75 if summer else 1.0))
        included_visits = sum(members[k] * PLANS[k][1] for k in PLANS) * util
        overage_visits = n_members * (0.5 if not summer else 0.1)
        alacarte_seats = alacarte_families * p["alacarte_halls"] * s
        clinic_seats_m = n_members * p["clinics_per_family"] * s
        clinic_seats_r = alacarte_families * p["clinics_per_family"] * s
        p1 = jit(p["p1_sessions"]) * s
        p1_member = p1 * (n_members / max(1.0, n_members + alacarte_families))
        p1_retail = p1 - p1_member
        first_free = paying_new * 0.35

        # ── Revenue ──
        mrr = sum(members[k] * PLANS[k][0] for k in PLANS)
        rev_hall = alacarte_seats * HALL_RETAIL + overage_visits * HALL_OVERAGE
        rev_clinic = clinic_seats_m * CLINIC_MEMBER + clinic_seats_r * CLINIC_RETAIL
        rev_1on1 = (p1_member * P60_MEMBER + p1_retail * (0.6 * P60_RETAIL + 0.4 * P30_RETAIL))
        revenue = mrr + rev_hall + rev_clinic + rev_1on1

        # ── Costs ──
        group_seats = included_visits + overage_visits + alacarte_seats
        clinic_seats = clinic_seats_m + clinic_seats_r
        if p["fill_target"]:  # disciplined: rooms sized to demand (min 4/wk anchor)
            hall_rooms = max(4.33, group_seats / jit(p["fill_target"]))
            clinic_rooms = max(0.0, clinic_seats / 4.0)
        else:                  # undisciplined: the full grid runs regardless
            hall_rooms = p["grid_hours_wk"] * 4.33 * 0.75  # 75% of grid = halls
            clinic_rooms = p["grid_hours_wk"] * 4.33 * 0.25
        tutor_cost = (hall_rooms + clinic_rooms) * (TUTOR_HR + VIDEO_GROUP)
        tutor_cost += p1 * (0.8 * TUTOR_HR + VIDEO_1ON1)  # blended 30/60min pay
        tutor_cost += first_free * FIRST_FREE_COST + FREE_HALL_MONTHLY
        tx = n_members + alacarte_seats + clinic_seats + p1  # rough charge count
        stripe = revenue * STRIPE_PCT + tx * STRIPE_FIX
        ai = n_members * AI_COGS_MEMBER + free_families * AI_COGS_FREE
        costs = tutor_cost + stripe + ai + FIXED
        net = revenue - costs
        cash += net
        rows.append(dict(month=MONTHS[m], members=n_members, revenue=revenue,
                         costs=costs, net=net, cash=cash, mrr=mrr))
    return rows


def run(name, p, n=500):
    runs = [simulate(p, seed=i) for i in range(n)]
    def pct(vals, q):
        vals = sorted(vals); return vals[int(q * (len(vals) - 1))]
    year_rev = [sum(r["revenue"] for r in rr) for rr in runs]
    year_net = [sum(r["net"] for r in rr) for rr in runs]
    end_cash = [rr[-1]["cash"] for rr in runs]
    worst_mo = [min(r["net"] for r in rr) for rr in runs]
    m12 = [rr[-1]["members"] for rr in runs]
    mrr_peak = [max(r["mrr"] for r in rr) for rr in runs]
    be = []
    for rr in runs:
        hit = next((i for i, r in enumerate(rr) if r["net"] > 0 and i < 9), None)
        be.append(hit)
    be_share = sum(1 for b in be if b is not None) / len(be)

    print(f"\n=== {name} ===")
    med = simulate(p, seed=12345)
    print(f"{'':5}{'members':>8}{'revenue':>10}{'costs':>10}{'net':>10}{'cash':>11}")
    for r in med:
        print(f"{r['month']:5}{r['members']:8.1f}{r['revenue']:10.0f}{r['costs']:10.0f}"
              f"{r['net']:10.0f}{r['cash']:11.0f}")
    print(f"year revenue   p10/med/p90 : {pct(year_rev,.1):8.0f} {pct(year_rev,.5):8.0f} {pct(year_rev,.9):8.0f}")
    print(f"year net       p10/med/p90 : {pct(year_net,.1):8.0f} {pct(year_net,.5):8.0f} {pct(year_net,.9):8.0f}")
    print(f"worst month    p10/med     : {pct(worst_mo,.1):8.0f} {pct(worst_mo,.5):8.0f}")
    print(f"members @M12   med         : {pct(m12,.5):8.1f}")
    print(f"peak MRR       med         : {pct(mrr_peak,.5):8.0f}")
    print(f"school-yr breakeven reached: {be_share*100:5.0f}% of runs")


if __name__ == "__main__":
    for name, params in SCENARIOS.items():
        run(name, params)
