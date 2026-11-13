export function currentMonthYear(date = new Date()) {
  return { month: date.getMonth() + 1, year: date.getFullYear() }
}

const pad = (n) => String(n).padStart(2, '0')

// Primeiro e último dia de um mês, como "AAAA-MM-DD".
export function monthRange(month, year) {
  const lastDay = new Date(year, month, 0).getDate()
  return { min: `${year}-${pad(month)}-01`, max: `${year}-${pad(month)}-${pad(lastDay)}` }
}
