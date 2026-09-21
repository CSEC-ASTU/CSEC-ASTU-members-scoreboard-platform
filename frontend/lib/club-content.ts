/** Public club facts sourced from LinkedIn (linkedin.com/company/csec-astu), Telegram, and GitHub. */

export const CLUB = {
  name: "CSEC ASTU",
  fullName: "Computer Science and Engineering Club",
  tagline: "Think · Create · Solve",
  university: "Adama Science and Technology University",
  city: "Adama, Ethiopia",
  department: "Department of Computer Science and Engineering",
  email: "astu.dev@astu.edu.et",
  quote: "Great communities don't just teach skills, they shape futures.",
  links: {
    linkedin: "https://www.linkedin.com/company/csec-astu",
    telegram: "https://t.me/CSEC_ASTU",
    github: "https://github.com/CSEC-ASTU",
    email: "mailto:astu.dev@astu.edu.et",
  },
} as const

export const DIVISIONS = [
  {
    name: "Competitive Programming",
    blurb: "Algorithms under pressure — contests, DSA drills, and Ethiopia's collegiate programming stage.",
  },
  {
    name: "Development",
    blurb: "Ship real software: full-stack builds, hackathons, and product showcases with mentors.",
  },
  {
    name: "Cyber Security",
    blurb: "Hands-on defense and offense — Active Directory labs, supply-chain risks, and Sunday deep dives.",
  },
  {
    name: "Data Science",
    blurb: "From embeddings to RAG — bootcamps and projects that turn data into working systems.",
  },
  {
    name: "Capacity Building",
    blurb: "Beginner pathways and free bootcamps so more students can start coding with confidence.",
  },
  {
    name: "Social Media",
    blurb: "Storytelling for the community — amplifying talks, wins, and open calls across campus.",
  },
] as const

export const FOCUS_AREAS = [
  {
    title: "ETCPC on our campus",
    body: "CSEC ASTU hosts the Ethiopian Collegiate Programming Contest — universities from across the country gather at ASTU for algorithms, speed, and teamwork.",
  },
  {
    title: "Sunday Tech Talks",
    body: "Weekly public explainers from every division: B-Trees, vector embeddings, supply-chain attacks, pathfinding, and more — short lessons you can use Monday morning.",
  },
  {
    title: "Bootcamps & hackathons",
    body: "Free Python and data science bootcamps, multi-day AI hackathons with LLMs and LangGraph, and development project showcases where teams ship under deadline.",
  },
  {
    title: "Learn by doing",
    body: "Six specialized divisions plus a Blockchain team. Members build software, compete, teach, and mentor — not just watch slides.",
  },
] as const
