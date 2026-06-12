export const PROJECT_COLORS = [
  '#ffb02e',
  '#ff6250',
  '#e14f8a',
  '#b05cff',
  '#5c7cff',
  '#2fb8ff',
  '#1fd3c2',
  '#41d97b',
  '#a8e03a',
  '#9a8c7a',
] as const

export function randomProjectColor(): string {
  return PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]
}
