import { CATEGORIES, DIFFICULTIES } from '../data/questionBank'

export const CSV_TEMPLATE_HEADER = 'category,difficulty,question,optionA,optionB,optionC,optionD,correctAnswer,explanation'
export const CSV_TEMPLATE_EXAMPLE =
  'General Knowledge,Easy,What is the capital of India?,Mumbai,New Delhi,Kolkata,Chennai,B,New Delhi has been the capital since 1911.'

export function downloadCsvTemplate() {
  const blob = new Blob([`${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE}\n`], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'question-bank-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// Minimal RFC4180-ish CSV line splitter: handles quoted fields containing
// commas, and "" as an escaped quote inside a quoted field. Good enough for
// question text/options exported from Excel/Google Sheets/Notepad.
function splitCsvLine(line) {
  const cells = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells.map((c) => c.trim())
}

function correctIndexFromAnswer(raw) {
  const v = raw.trim().toUpperCase()
  if (['A', 'B', 'C', 'D'].includes(v)) return v.charCodeAt(0) - 65
  const n = Number(v)
  if ([0, 1, 2, 3].includes(n)) return n
  if ([1, 2, 3, 4].includes(n)) return n - 1
  return null
}

/**
 * Parses raw CSV text into { valid: [...questions], errors: [{row, message}] }.
 * Never throws — every problem row is collected so the admin can fix and
 * re-upload just the bad rows instead of guessing which one failed.
 */
export function parseQuestionsCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { valid: [], errors: [{ row: 0, message: 'File is empty.' }] }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const expected = ['category', 'difficulty', 'question', 'optiona', 'optionb', 'optionc', 'optiond', 'correctanswer']
  const hasHeader = expected.every((col) => header.includes(col))
  const dataLines = hasHeader ? lines.slice(1) : lines

  const valid = []
  const errors = []

  dataLines.forEach((line, i) => {
    const rowNum = i + (hasHeader ? 2 : 1)
    const cells = splitCsvLine(line)
    if (cells.length < 8) {
      errors.push({ row: rowNum, message: `Expected at least 8 columns, got ${cells.length}.` })
      return
    }
    const [category, difficulty, question, a, b, c, d, correctRaw, explanation = ''] = cells

    if (!CATEGORIES.includes(category)) {
      errors.push({ row: rowNum, message: `Unknown category "${category}". Must be one of: ${CATEGORIES.join(', ')}.` })
      return
    }
    if (!DIFFICULTIES.includes(difficulty)) {
      errors.push({ row: rowNum, message: `Unknown difficulty "${difficulty}". Must be one of: ${DIFFICULTIES.join(', ')}.` })
      return
    }
    if (!question.trim()) {
      errors.push({ row: rowNum, message: 'Question text is empty.' })
      return
    }
    const options = [a, b, c, d]
    if (options.some((o) => !o.trim())) {
      errors.push({ row: rowNum, message: 'All four options (optionA–optionD) are required.' })
      return
    }
    const correctIndex = correctIndexFromAnswer(correctRaw)
    if (correctIndex === null) {
      errors.push({ row: rowNum, message: `correctAnswer "${correctRaw}" must be A/B/C/D (or 1-4).` })
      return
    }

    valid.push({ category, difficulty, question: question.trim(), options: options.map((o) => o.trim()), correctIndex, explanation: explanation.trim() })
  })

  return { valid, errors }
}
