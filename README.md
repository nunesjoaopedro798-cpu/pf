# Painel Polícia Federal — Vercel + Supabase

## 1. Supabase
1. Crie um projeto em supabase.com.
2. SQL Editor → cole o conteúdo de `supabase.sql` → Run.
3. Authentication → Sign In / Providers → desative "Allow new users to sign up" (só você cria contas).
4. Authentication → Users → Add user → crie seu e-mail e senha (marque "Auto Confirm").
5. Torne-se admin: SQL Editor →
   `update profiles set role = 'admin', cargo = 'Diretor-Geral', nome = 'Seu Nome' where email = 'seu@email.com';`
6. Project Settings → API: copie a Project URL e a anon public key.

## 2. Configurar
Edite `config.js` com o nome da cidade, a URL e a anon key.
(A anon key pode ficar no site; a segurança é feita pelas regras do banco. NUNCA use a service_role key aqui.)

## 3. Vercel
1. Suba esta pasta num repositório do GitHub.
2. vercel.com → Add New → Project → importe o repositório.
3. Framework Preset: Other. Não precisa de build. Deploy.

## Novos agentes
Supabase → Authentication → Add user. Depois, no painel (aba Agentes), o admin define nome, cargo e permissão.
