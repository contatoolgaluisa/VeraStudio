import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// O jsdom (navegador simulado dos testes) não implementa rolagem de página.
window.scrollTo = () => {};

// Desmonta os componentes renderizados entre um teste e outro.
afterEach(() => {
  cleanup();
});
