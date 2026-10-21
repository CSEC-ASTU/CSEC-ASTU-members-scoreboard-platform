/**
 * Community & Discipline History Milestones
 * Easily editable configuration for CSEC-ASTU foundation and division genesis.
 */
export interface TimelineMilestone {
  year: string
  tag: string
  title: string
  description: string
}

export const TIMELINE_MILESTONES: TimelineMilestone[] = [
  {
    year: "2018",
    tag: "FOUNDATION",
    title: "Inception of CSEC-ASTU",
    description:
      "Founded by students in the Department of Computer Science & Engineering to build a peer-mentored culture of practical software craftsmanship and competitive engineering at Adama Science and Technology University.",
  },
  {
    year: "2020",
    tag: "ALGORITHMS",
    title: "Competitive Programming Division Founded",
    description:
      "Formed to institutionalize weekly algorithm drills, mock contests, and data structure workshops—rapidly producing ASTU's first finalists in the Ethiopian Collegiate Programming Contest (ETCPC).",
  },
  {
    year: "2021",
    tag: "TRADITION",
    title: "Sunday Tech Talk Tradition Established",
    description:
      "Launched the signature club initiative: each week, one specialized division takes the lead to author and moderate an in-depth technical discussion post across community channels.",
  },
  {
    year: "2022",
    tag: "INFRASTRUCTURE & DEFENSE",
    title: "Software Development & Cybersecurity Tracks",
    description:
      "Split systems engineering into dedicated divisions: Software Development to build internal university products, and Cybersecurity to operate hands-on CTF war games and offensive security labs.",
  },
  {
    year: "2023",
    tag: "NATIONAL HOST",
    title: "ETCPC Host Campus & AI Division Genesis",
    description:
      "ASTU served as the national host institution for the Ethiopian Collegiate Programming Contest. Simultaneously established the Data Science & AI research division to explore machine learning and computer vision.",
  },
  {
    year: "2024",
    tag: "DISTRIBUTED LEDGERS",
    title: "Blockchain & Web3 Research Group",
    description:
      "Inaugurated the Blockchain team, focusing on decentralized protocol design, cryptography, smart contract security audits, and global Web3 hackathons.",
  },
  {
    year: "Present",
    tag: "GOVERNANCE",
    title: "Institutional Ledger & Scoreboard Platform",
    description:
      "Deployed the member accountability scoreboard engine with double-entry point ledgers, physical whiteboard presence verification, and cryptographic certificate issuance.",
  },
]
