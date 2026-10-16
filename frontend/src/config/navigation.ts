/** Links principais da loja (cabeçalho e menu do celular). */
export const mainNavigation = [
  { label: 'Feminino', to: '/loja/feminino' },
  { label: 'Masculino', to: '/loja/masculino' },
  { label: 'Acessórios', to: '/loja/acessorios' },
  { label: 'Novidades', to: '/novidades' },
  { label: 'Promoções', to: '/promocoes' },
] as const;

/** Links institucionais (rodapé). */
export const infoNavigation = [
  { label: 'Contato', to: '/contato' },
  { label: 'Entrega', to: '/entrega' },
  { label: 'Trocas e devoluções', to: '/trocas-e-devolucoes' },
  { label: 'Privacidade', to: '/privacidade' },
  { label: 'Créditos das fotos', to: '/creditos' },
] as const;
