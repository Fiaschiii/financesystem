// Ícones simples em SVG (traço), sem biblioteca externa. Herdam a cor do texto.
const PATHS = {
  wallet: 'M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3M3 7.5V17a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7.5A1.5 1.5 0 0 0 4.5 9H19a1 1 0 0 1 1 1v3m0 0h-4a1.5 1.5 0 0 0 0 3h4',
  cart: 'M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.1M9.5 20h.01M17 20h.01',
  scale: 'M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0L5 8Zm14 0-2.5 6a3 3 0 0 0 5 0L19 8Z',
  pin: 'M12 17v4M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6Z',
  shuffle: 'M3 7h3.5a4 4 0 0 1 3.3 1.7l4.4 6.6A4 4 0 0 0 17.5 17H21m0 0-2.5-2.5M21 17l-2.5 2.5M3 17h3.5a4 4 0 0 0 3.3-1.7M14.2 8.7A4 4 0 0 1 17.5 7H21m0 0-2.5-2.5M21 7l-2.5 2.5',
  percent: 'M19 5 5 19M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm9 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  coins: 'M4 7c0 1.1 3.1 2 7 2s7-.9 7-2-3.1-2-7-2-7 .9-7 2Zm0 0v5c0 1.1 3.1 2 7 2s7-.9 7-2V7M4 12v5c0 1.1 3.1 2 7 2s7-.9 7-2v-5',
  creditCard: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 3h18M7 15h3',
  chart: 'M4 20h16M7 16v-5M12 16V6M17 16v-8',
  trendUp: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  trendDown: 'M3 7l6 6 4-4 8 8M15 17h6v-6',
  home: 'M3 11 12 4l9 7M5 10v10h5v-6h4v6h5V10',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm0 4h16M8 2v4M16 2v4',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  heart: 'M12 20s-7-4.4-9-8.6C1.6 8.3 3.6 5 6.8 5 9 5 10.6 6.3 12 8c1.4-1.7 3-3 5.2-3 3.2 0 5.2 3.3 3.8 6.4-2 4.2-9 8.6-9 8.6Z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  gift: 'M4 11h16v9H4v-9Zm-1-4h18v4H3V7Zm9 0v13m0-13S10.5 3 8 3.5 7.5 7 12 7Zm0 0s1.5-4 4-3.5S16.5 7 12 7Z',
  chevronUp: 'm18 15-6-6-6 6',
  chevronDown: 'm6 9 6 6 6-6',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronRight: 'm9 18 6-6-6-6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  shield: 'M12 3 5 6v5.5c0 4.3 2.9 8 7 9.5 4.1-1.5 7-5.2 7-9.5V6l-7-3Zm-3 9 2 2 4-4',
  logo: 'M4 17.5 10 11l4 4 6-8M15 7h5v5',
}

function Icon({ name, size = 18, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

export default Icon
