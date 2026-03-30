
// CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE)
// 1. Crie um projeto em https://supabase.com
// 2. Vá em Settings > API
// 3. Copie a "Project URL" e a "anon public key" e cole abaixo

export const SUPABASE_URL = "https://qpidmarrrdiqjexhdayt.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwaWRtYXJycmRpcWpleGhkYXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzIzMzMsImV4cCI6MjA5MDQ0ODMzM30.EAK3rRAzzTELXJkE0jlXcT1kMqw6GSj9oeXhEwHOrhM";

// Altere para true quando tiver configurado as chaves acima para o app tentar conectar
export const ENABLE_DATABASE = true;

// E-mail do Super Admin (Dono da Plataforma)
// Quando logado com este e-mail, o usuário terá acesso ao Painel Master
export const MASTER_EMAIL = "contato@d2am.com";
