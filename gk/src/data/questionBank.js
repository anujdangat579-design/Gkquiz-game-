// CATEGORIES / DIFFICULTIES here are the source of truth for the setup and
// admin dropdowns. QUESTION_BANK / getQuestionsFor below are NOT used by
// live matches anymore — those are graded server-side against the
// Firestore `questions` collection only (see functions/index.js
// assignQuestions/evaluateMatch), so the client never has to see (or be
// trusted with) a correctIndex. This array is now just the CommonJS-mirrored
// source for the admin's "Seed starter questions" button
// (functions/seedData.js) — kept here too so it's easy to eyeball/edit.
// Each question: { id, category, difficulty, question, options: [4], correctIndex, explanation }

export const CATEGORIES = [
  'General Knowledge',
  'Current Affairs',
  'History',
  'Geography',
  'Science',
  'Indian Polity',
  'Sports',
  'Technology',
  'SSC',
  'UPSC',
  'MPSC',
  'Banking',
  'Mixed GK',
]

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

let _id = 1
const q = (category, difficulty, question, options, correctIndex, explanation) => ({
  id: `q${_id++}`,
  category,
  difficulty,
  question,
  options,
  correctIndex,
  explanation,
})

export const QUESTION_BANK = [
  q('General Knowledge', 'Easy', 'Which is the capital of Maharashtra?', ['Mumbai', 'Pune', 'Nagpur', 'Nashik'], 0, 'Mumbai has been the capital of Maharashtra since the state was formed in 1960.'),
  q('General Knowledge', 'Easy', 'How many players are there in a cricket team?', ['9', '10', '11', '12'], 2, 'A cricket team fields 11 players at a time.'),
  q('General Knowledge', 'Medium', 'Who wrote the Indian National Anthem?', ['Bankim Chandra Chatterjee', 'Rabindranath Tagore', 'Sarojini Naidu', 'Muhammad Iqbal'], 1, 'Rabindranath Tagore wrote "Jana Gana Mana", adopted as the national anthem in 1950.'),
  q('General Knowledge', 'Hard', 'The Bhakra Nangal Dam is built on which river?', ['Ganga', 'Yamuna', 'Sutlej', 'Chenab'], 2, 'Bhakra Nangal Dam is built on the Sutlej river in Himachal Pradesh.'),
  q('Science', 'Easy', 'What is the chemical symbol for water?', ['H2O', 'CO2', 'O2', 'NaCl'], 0, 'Water is composed of two hydrogen atoms and one oxygen atom.'),
  q('Science', 'Easy', 'Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Saturn'], 1, 'Mars appears red due to iron oxide (rust) on its surface.'),
  q('Science', 'Medium', 'What is the powerhouse of the cell?', ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], 2, 'Mitochondria generate most of the cell\'s ATP energy supply.'),
  q('Science', 'Hard', 'Which gas is most abundant in Earth\'s atmosphere?', ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'], 2, 'Nitrogen makes up about 78% of Earth\'s atmosphere.'),
  q('History', 'Easy', 'Who was the first Prime Minister of India?', ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Sardar Patel', 'Dr. Rajendra Prasad'], 1, 'Jawaharlal Nehru served as India\'s first Prime Minister from 1947 to 1964.'),
  q('History', 'Medium', 'The Quit India Movement began in which year?', ['1940', '1942', '1945', '1947'], 1, 'The Quit India Movement was launched on 8 August 1942.'),
  q('History', 'Hard', 'Who founded the Maurya Empire?', ['Ashoka', 'Chandragupta Maurya', 'Bindusara', 'Samudragupta'], 1, 'Chandragupta Maurya founded the Maurya Empire around 322 BCE.'),
  q('Geography', 'Easy', 'Which is the longest river in India?', ['Yamuna', 'Godavari', 'Ganga', 'Brahmaputra'], 2, 'The Ganga is the longest river in India at about 2,525 km.'),
  q('Geography', 'Medium', 'Which state has the longest coastline in India?', ['Tamil Nadu', 'Gujarat', 'Andhra Pradesh', 'Kerala'], 1, 'Gujarat has India\'s longest coastline at roughly 1,600 km.'),
  q('Geography', 'Hard', 'Mount Kilimanjaro is located in which country?', ['Kenya', 'Tanzania', 'Uganda', 'Ethiopia'], 1, 'Mount Kilimanjaro, Africa\'s highest peak, is in Tanzania.'),
  q('Indian Polity', 'Easy', 'How many fundamental rights are guaranteed by the Indian Constitution?', ['5', '6', '7', '8'], 1, 'The Constitution guarantees 6 fundamental rights after the Right to Property was removed.'),
  q('Indian Polity', 'Medium', 'Who is known as the Father of the Indian Constitution?', ['Jawaharlal Nehru', 'B.R. Ambedkar', 'Rajendra Prasad', 'Sardar Patel'], 1, 'Dr. B.R. Ambedkar chaired the Drafting Committee of the Constitution.'),
  q('Indian Polity', 'Hard', 'Which article of the Constitution deals with the abolition of untouchability?', ['Article 15', 'Article 17', 'Article 21', 'Article 24'], 1, 'Article 17 abolishes untouchability and forbids its practice in any form.'),
  q('Sports', 'Easy', 'How many players are on the field for one football team?', ['9', '10', '11', '12'], 2, 'A football (soccer) team fields 11 players, including the goalkeeper.'),
  q('Sports', 'Medium', 'India won its first Cricket World Cup in which year?', ['1975', '1983', '1992', '2003'], 1, 'India won the Cricket World Cup in 1983 under Kapil Dev\'s captaincy.'),
  q('Sports', 'Hard', 'The term "Grand Slam" is associated with which sport?', ['Football', 'Cricket', 'Tennis', 'Hockey'], 2, 'Tennis\'s four majors — Australian Open, French Open, Wimbledon, US Open — form the Grand Slam.'),
  q('Technology', 'Easy', 'What does "CPU" stand for?', ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Central Processor Unifier'], 0, 'CPU stands for Central Processing Unit, the primary component that executes instructions.'),
  q('Technology', 'Medium', 'Which company developed the Android operating system?', ['Apple', 'Microsoft', 'Google', 'Samsung'], 2, 'Google acquired Android Inc. in 2005 and developed it into the Android OS.'),
  q('Technology', 'Hard', 'What does "HTTP" stand for?', ['HyperText Transfer Protocol', 'HighText Transfer Protocol', 'HyperText Technical Protocol', 'HyperTransfer Text Protocol'], 0, 'HTTP is the foundational protocol used for transferring web pages.'),
  q('Current Affairs', 'Medium', 'India\'s Chandrayaan-3 successfully landed near which region of the Moon?', ['North Pole', 'South Pole', 'Equator', 'Far Side'], 1, 'Chandrayaan-3 landed near the Moon\'s south pole in August 2023, a first for any nation.'),
  q('Banking', 'Easy', 'What does "RBI" stand for?', ['Reserve Bank of India', 'Regional Bank of India', 'Rural Bank of India', 'Registered Bank of India'], 0, 'RBI is India\'s central banking institution, established in 1935.'),
  q('Banking', 'Medium', 'What is the full form of "NEFT"?', ['National Electronic Funds Transfer', 'National Express Funds Transfer', 'National Electronic Finance Transfer', 'National Exchange Funds Transfer'], 0, 'NEFT allows one-to-one electronic fund transfers between bank accounts.'),
  q('SSC', 'Medium', 'Who is known as the "Missile Man of India"?', ['Homi Bhabha', 'A.P.J. Abdul Kalam', 'Vikram Sarabhai', 'C.V. Raman'], 1, 'Dr. A.P.J. Abdul Kalam led key missile and space programs and later became President of India.'),
  q('UPSC', 'Hard', 'The Directive Principles of State Policy are inspired by the constitution of which country?', ['USA', 'UK', 'Ireland', 'Canada'], 2, 'India\'s Directive Principles were inspired by the Irish Constitution.'),
  q('MPSC', 'Medium', 'Which is the largest district in Maharashtra by area?', ['Pune', 'Ahmednagar', 'Nashik', 'Nagpur'], 1, 'Ahmednagar is the largest district in Maharashtra by geographical area.'),
  q('Mixed GK', 'Easy', 'Which is the national bird of India?', ['Sparrow', 'Peacock', 'Parrot', 'Crow'], 1, 'The Indian Peacock (Pavo cristatus) was declared the national bird in 1963.'),
]

export function getQuestionsFor({ category, difficulty, count }) {
  const pool = QUESTION_BANK.filter(
    (item) => (category === 'Mixed GK' ? true : item.category === category) && item.difficulty === difficulty
  )
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  // If the bank doesn't have enough questions yet for this combo, top up
  // from the same difficulty across all categories so setup never blocks.
  if (shuffled.length < count) {
    const backfill = QUESTION_BANK.filter((item) => item.difficulty === difficulty && !shuffled.includes(item)).sort(
      () => Math.random() - 0.5
    )
    shuffled.push(...backfill)
  }
  return shuffled.slice(0, count)
}
