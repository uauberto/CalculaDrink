
// CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE)
// 1. Crie um projeto em https://supabase.com
// 2. Vá em Settings > API
// 3. Copie a "Project URL" e a "anon public key" e cole abaixo

export const SUPABASE_URL = "https://hddckdbulgklubqvfsdi.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGNrZGJ1bGdrbHVicXZmc2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NjMyNTcsImV4cCI6MjA3OTMzOTI1N30.QwlaVYETwcN91Nb1jlfXrZdkvhrUX0BfUL_x7bi1Dv4";

// Altere para true quando tiver configurado as chaves acima para o app tentar conectar
export const ENABLE_DATABASE = true;

// E-mail do Super Admin (Dono da Plataforma)
// Quando logado com este e-mail, o usuário terá acesso ao Painel Master
export const MASTER_EMAIL = "contato@d2am.com";
