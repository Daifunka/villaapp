export function normalizeMenuSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim()
}

export function getMenuSearchKey(article) {
  return String(article?.id ?? `${article?.source ?? ''}:${article?.nom ?? ''}`)
}
