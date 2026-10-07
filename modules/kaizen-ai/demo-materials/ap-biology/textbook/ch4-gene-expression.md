# Chapter 4 — Gene Expression & Regulation

**Concept:** Gene Expression & Regulation · **Unit 6**

## The Central Dogma

The **central dogma** of molecular biology describes the flow of genetic information:

`DNA → (transcription) → RNA → (translation) → Protein`

DNA stores the instructions; RNA carries them; proteins carry out the work. Before any of
this, DNA must be copied so that each new cell receives a complete genome.

## DNA Replication

**DNA replication** is **semiconservative**: each new double helix contains one original
(parental) strand and one newly made strand. Key steps:

1. **Helicase** unwinds and separates the two strands at the **origin of replication**,
   forming a **replication fork**.
2. **DNA polymerase** adds new nucleotides to a growing strand, following complementary
   base pairing (A–T, G–C). It can only add to the 3′ end, so synthesis proceeds
   **5′ → 3′**.
3. Because the two template strands are **antiparallel**, one new strand (the **leading
   strand**) is made continuously toward the fork, while the other (the **lagging
   strand**) is made in short **Okazaki fragments** away from the fork.
4. **Primase** lays down RNA primers to start synthesis; **DNA ligase** seals the
   fragments of the lagging strand into a continuous strand.

Replication is remarkably accurate because DNA polymerase **proofreads** and repair
enzymes correct mismatches.

## Transcription: DNA → RNA

**Transcription** copies a gene from DNA into **messenger RNA (mRNA)**. It occurs in the
nucleus of eukaryotes.

1. **Initiation:** **RNA polymerase** binds to a **promoter** sequence upstream of the
   gene.
2. **Elongation:** RNA polymerase reads the template DNA strand 3′→5′ and builds mRNA
   5′→3′, inserting **uracil (U)** opposite adenine.
3. **Termination:** at a terminator sequence, RNA polymerase releases the mRNA.

### RNA Processing (Eukaryotes)
Before leaving the nucleus, the primary transcript (pre-mRNA) is modified:
- A **5′ cap** and a **poly-A tail** are added to protect the mRNA and aid export.
- **Introns** (non-coding regions) are removed and **exons** (coding regions) are joined
  by **splicing**. **Alternative splicing** lets one gene produce several proteins.

## Translation: RNA → Protein

**Translation** builds a polypeptide from the mRNA's coded instructions at the
**ribosome**. The message is read in three-base units called **codons**. The **genetic
code** maps 64 codons to 20 amino acids (plus a start and stop signals); it is
**redundant** (several codons per amino acid) and nearly universal.

Key players:
- **mRNA** — carries the codon sequence.
- **tRNA (transfer RNA)** — each carries a specific amino acid and has an **anticodon**
  complementary to an mRNA codon.
- **Ribosome** — made of rRNA and protein; has A, P, and E sites.

Steps:
1. **Initiation:** the ribosome assembles at the **start codon AUG** (codes for
   methionine).
2. **Elongation:** tRNAs bring amino acids whose anticodons match each codon; the
   ribosome forms peptide bonds and moves along the mRNA.
3. **Termination:** at a **stop codon** (UAA, UAG, or UGA), the finished polypeptide is
   released and folds into a functional protein.

### Labeled Example: From Gene to Protein
Suppose the template (antisense) DNA strand reads **3′-TAC GGC AAT-5′**.
1. **Transcription:** mRNA is complementary and antiparallel → **5′-AUG CCG UUA-3′**.
2. **Read codons:** AUG · CCG · UUA.
3. **Translation:** AUG = **Methionine (start)**, CCG = **Proline**, UUA = **Leucine**.
4. **Result:** the polypeptide begins Met–Pro–Leu. A single base change (a **point
   mutation**) could alter a codon: a **missense** mutation swaps one amino acid, a
   **nonsense** mutation creates a premature stop codon, and a **frameshift** (insertion
   or deletion not in multiples of three) shifts the reading frame and usually ruins the
   whole downstream sequence.

## Gene Regulation

All cells in an organism share the same DNA, yet a neuron and a skin cell differ because
they **express different genes**. Regulating which genes are on or off controls
development and lets cells respond to their environment.

### Prokaryotic Regulation: The *lac* Operon
Bacteria group related genes into **operons** controlled together. The **_lac_ operon**
controls the enzymes that digest lactose:

- A **promoter** (where RNA polymerase binds), an **operator** (a switch), and three
  structural genes.
- **When lactose is absent:** a **repressor** protein binds the operator, blocking
  transcription — the cell doesn't waste energy making enzymes it can't use. (*inducible,
  negative control*)
- **When lactose is present:** lactose (as allolactose) binds and inactivates the
  repressor, freeing the operator so RNA polymerase transcribes the genes.
- The *lac* operon is also under **positive control**: when glucose is scarce, **CAP**
  (bound to cAMP) enhances transcription so the cell uses lactose efficiently.

This is an **inducible** operon — normally off, turned on by a substrate. The **_trp_
operon** is the opposite: a **repressible** operon that is normally on but is switched off
when tryptophan is abundant.

### Eukaryotic Regulation
Eukaryotes regulate genes at many levels:
- **Chromatin structure / epigenetics:** DNA wrapped tightly around histones is
  inaccessible; **DNA methylation** and **histone modification** can silence or activate
  genes without changing the DNA sequence.
- **Transcriptional control:** **transcription factors** bind **enhancers** and promoters
  to turn genes on or off.
- **Post-transcriptional control:** alternative splicing and regulation by small RNAs
  (**microRNAs**) that block or degrade mRNA.
- **Translational and post-translational control:** controlling how much protein is made
  and modifying proteins after they are built.

Precise gene regulation underlies **cell differentiation** and development; master control
genes (such as **homeotic/Hox genes**) direct the body plan of an organism.

---

## Check Your Understanding

1. **What does "semiconservative" replication mean, and what is one piece of evidence
   for it?**
   *Answer:* Each daughter DNA molecule keeps one parental strand and one new strand.
   The Meselson–Stahl experiment, using heavy (¹⁵N) and light (¹⁴N) nitrogen isotopes,
   showed that after one round of replication all DNA was of intermediate density —
   consistent only with the semiconservative model.

2. **The template DNA strand reads 3′-TAC-AAA-GGG-5′. Give the mRNA and identify the
   first two amino acids** (AUG=Met, UUU=Phe, CCC=Pro).
   *Answer:* mRNA = **5′-AUG-UUU-CCC-3′**. Codons: AUG = **Methionine (start)**, UUU =
   **Phenylalanine**. The polypeptide begins Met–Phe.

3. **Why does the _lac_ operon transcribe its genes only when lactose is present?**
   *Answer:* Without lactose, a repressor binds the operator and blocks RNA polymerase.
   When lactose is present, allolactose binds and inactivates the repressor, so the
   operator is freed and the genes are transcribed. This lets the cell make
   lactose-digesting enzymes only when they are needed, conserving energy.
