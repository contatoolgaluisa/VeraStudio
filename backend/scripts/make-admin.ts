/**
 * Concede (ou remove) o papel de administrador.
 *
 * Uso, na raiz do projeto:
 *   npm run make-admin -w backend -- ana@exemplo.com
 *   npm run make-admin -w backend -- ana@exemplo.com --revoke
 *
 * A pessoa precisa ter feito login na loja pelo menos uma vez (é no primeiro
 * acesso que o perfil é criado). Este comando roda no servidor, com acesso
 * direto ao banco: não existe nenhuma tela ou rota pública que conceda ADMIN.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

try {
  process.loadEnvFile();
} catch {
  // sem .env: usa as variáveis do ambiente
}

const [email, flag] = process.argv.slice(2);
if (!email || !email.includes('@')) {
  console.error('Informe o e-mail: npm run make-admin -w backend -- pessoa@exemplo.com');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL não definida. Veja backend/.env.example.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const role = flag === '--revoke' ? Role.CUSTOMER : Role.ADMIN;

try {
  const profile = await prisma.userProfile.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!profile) {
    console.error(
      `Nenhum perfil com o e-mail ${email}. A pessoa precisa entrar na loja pelo menos uma vez.`,
    );
    process.exitCode = 1;
  } else {
    await prisma.userProfile.update({ where: { id: profile.id }, data: { role } });
    console.log(`${email} agora é ${role === Role.ADMIN ? 'administrador(a)' : 'cliente'}.`);
  }
} finally {
  await prisma.$disconnect();
}
