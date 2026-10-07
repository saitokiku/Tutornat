import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Homework help with an honest record.</h1>
      <p className="sub">Trellis helps tonight. The record shows what was practised with help and what was proven alone. They are never mixed.</p>
      <div className="card">
        <h2>Tonight</h2>
        <p style={{ margin: "0 0 12px" }}>Ada, 9 · Adding fractions with unlike denominators · 3 problems</p>
        <Link href="/learn" className="btn">Start with Trellis</Link>
      </div>
      <div className="card">
        <h2>For parents</h2>
        <p style={{ margin: "0 0 12px" }}>See each skill as practised or proven, the 48-hour clock, and where every claim comes from.</p>
        <Link href="/parent" className="btn quiet">Open the parent view</Link>
      </div>
    </main>
  );
}
